# Case Study: Ride-Sharing Service (Uber / Lyft)

> Design a system that matches riders with nearby drivers in real time, tracks
> locations, and manages trips and pricing.

## 1. Requirements

**Clarifying questions**
- City-scale or global? Location freshness? ETA accuracy?
- Pooling/shared rides? Surge? Scheduled rides?
- Offer to one driver or broadcast to several?

**Functional requirements**
1. Rider requests a ride; system **matches the nearest suitable driver**.
2. **Real-time driver location** + live trip tracking.
3. Trip lifecycle: request → match → en-route → pickup → drop-off → payment.
4. **Fare calculation, ETAs, surge pricing**.

**Non-functional requirements** (with concrete targets)
| Requirement | Target | Why |
| --- | --- | --- |
| Matching latency | **a few seconds** | riders won't wait |
| Location write volume | **~250K writes/s** | millions of drivers, ping every ~4 s |
| Correctness | **never double-assign a driver** | hard invariant |
| Real-time updates | **< 1–2 s** | live map tracking |
| Availability | **99.99%**, region-isolated | outages strand riders |

**Scale assumptions** — 1M active drivers, location every ~4 s, dense urban hotspots, global
multi-region.

**Out of scope (or note)** — payments internals, maps/routing engine, fraud/onboarding.

**🎯 The dominant requirement:** **low-latency geospatial matching over a firehose of
ephemeral location data, with correct assignment.** The design centers on a fast spatial
index + an in-memory location store + a locked matching state machine.

## 2. Capacity estimation
- **1M drivers × (1 ping / 4 s)** ≈ **250K location writes/s** — high-volume, **ephemeral**.
- Ride requests far fewer, but each must query a dense geo index quickly.

## 3. High-level architecture
```mermaid
flowchart LR
    D[Driver app] -->|loc every 4s| LS[Location Service] --> Geo[(Geo index - in-memory)]
    R[Rider app] --> MS[Matching Service]
    MS --> Geo
    MS --> TS[Trip Service] --> TDB[(Trips DB)]
    TS <-->|real-time push| D
    TS <-->|real-time push| R
    TS --> Pricing[Pricing / Surge] --> Pay[Payments]
    LS --> Kafka[(Kafka: location/trip events)] --> Analytics
```

## 4. Data model & API
- `drivers`: `driver_id, status, vehicle, rating, cell_id`
- `trips`: `trip_id, rider_id, driver_id, status, pickup_geo, dropoff_geo, fare, timestamps`
- **Live location** in an **in-memory geo index** (Redis GEO / quadtree / H3).

**API** — `PATCH /v1/drivers/location`, `POST /v1/rides -> { trip_id }`, `WS /v1/trips/{id}`.

---

## 5. Deep analysis — biggest problems & solutions

Each problem follows the same walkthrough: **scenario → why it's hard → naive approach &
why it fails → solution → how it works → trade-offs → rule of thumb.**

### 🔴 Problem 1 — Finding nearby drivers fast (geospatial search)

**Scenario.** A rider in a busy downtown taps "request." You must find available drivers
within ~2 km and rank them by ETA — in well under a second — while millions of drivers move.

**Why it's hard.** "Within radius of a point" over a constantly-changing set of millions of
locations is expensive; a normal DB has no efficient 2D proximity query at this rate.

**Naive approach & why it fails.** *Store lat/long in a table and `WHERE` on a bounding box +
distance* → a full scan / range scan per request, far too slow at high request rates and
fleet sizes; indexes on lat and long separately don't compose well for proximity.

**Solution — a spatial index that buckets the map into cells.** Map locations to cells so
"nearby" becomes "look in this cell and its neighbors."
- **Geohash** — encode lat/long into a string; nearby points share prefixes (Redis GEO).
- **Quadtree** — recursively subdivide dense areas into smaller cells.
- **H3 (Uber's hex grid)** — uniform neighbor distances; great for proximity + surge zoning
  (see [Uber](./companies/uber.md)).

**How it works.**
```mermaid
flowchart LR
    Rider --> Cell[rider's cell + neighbor ring]
    Cell --> Cand[available drivers in those cells]
    Cand --> Rank[rank by ETA/rating] --> Offer[offer to best]
```
The matcher computes the rider's cell, gathers candidates from that cell + adjacent cells,
and ranks them — **bounded work regardless of total fleet size**.

**Trade-offs.** Cell size tunes precision vs result count (dense areas need finer cells;
quadtrees/H3 adapt). Indexing adds maintenance as drivers move between cells.

**💡 Rule of thumb:** turn "nearby" into "same/adjacent cell" with a spatial index — never
scan all points.

### 🔴 Problem 2 — Ingesting 250K location writes/sec

**Scenario.** A million drivers each send GPS every ~4 seconds → ~250K updates/sec, but only
the **latest** position matters for matching.

**Why it's hard.** Durably persisting every ping to a disk database at 250K/s is wasteful and
expensive for data that's obsolete in 4 seconds.

**Naive approach & why it fails.** *Write every GPS ping to the trips/drivers DB* → enormous
write load on a durable store for throwaway data; the DB becomes the bottleneck.

**Solution — keep current location in an in-memory store; stream raw pings to Kafka for
everything else.**

**How it works.** The Location Service updates an **in-memory geo store** (sharded/replicated
by region) with each driver's latest position (overwrite, not append). Raw pings are also
published to **Kafka** for ETA models, analytics, and surge — without durably writing each one.
Durable **trips** are stored separately.

**Trade-offs.** You trade durability of individual pings (acceptable — they're ephemeral) for
huge throughput and low latency; on a node failure the in-memory index is rebuilt from recent
pings.

**💡 Rule of thumb:** keep hot, ephemeral state in memory and stream the firehose for
downstream use — don't durably store data that's stale in seconds.

### 🔴 Problem 3 — Never assigning one driver to two riders

**Scenario.** Two riders a block apart request at the same moment. Both matching computations
see the same nearby available driver and both try to assign them.

**Why it's hard.** Matching is concurrent across requests; without coordination, two matches
can grab the same driver (a lost-update / double-booking race).

**Naive approach & why it fails.** *Read driver status = available, then assign* → between the
read and the write, another request does the same → the driver is double-assigned.

**Solution — a per-driver state machine with an atomic compare-and-set (optimistic lock).**

**How it works.** Driver status transitions `available → offered → assigned`. Moving a driver
out of `available` is a **conditional update** (`CAS status from available`) — only one request
can win; the loser falls back to the next candidate. The offer protocol is **offer → accept
within timeout → assign**; declines/timeouts release the driver.

**Trade-offs.** The lock + offer handshake adds a little latency, but it's required to uphold
the no-double-assign invariant. Timeouts prevent a stuck offer from blocking a driver.

**💡 Rule of thumb:** guard a uniqueness invariant with an atomic compare-and-set on a state
machine, not a read-then-write.

### 🔴 Problem 4 — Live trip tracking

**Scenario.** During pickup and the ride, both rider and driver need to see each other's live
position and trip-state changes (arriving, started, completed) within a second or two.

**Why it's hard.** It's continuous, bidirectional, real-time data to specific connected
clients — plain request/response polling is laggy and wasteful.

**Naive approach & why it fails.** *Have apps poll an endpoint every second* → high load,
laggy updates, and battery drain; HTTP can't push.

**Solution — persistent push channels (WebSocket).** Rider and driver hold a WebSocket to the
Trip Service, which streams position updates and coordinates state transitions.

**How it works.** The Trip Service subscribes each party to the trip's updates; driver
position (from the Location Service) and state changes are pushed down the sockets in real
time — the same connection-routing concerns as the [chat system](./chat-system.md) (find which
server holds the connection).

**Trade-offs.** Persistent connections are stateful (need routing/scaling), but give true
real-time updates efficiently.

**💡 Rule of thumb:** for live, server-initiated updates, push over a persistent connection —
don't poll.

### 🔴 Problem 5 — Surge pricing

**Scenario.** Rain hits downtown; ride requests spike while available drivers stay flat.
Prices should rise **in that area** to balance supply and demand, computed continuously.

**Why it's hard.** Surge must be computed per **area** in near real time from live supply and
demand, and applied consistently to fares in that area.

**Naive approach & why it fails.** *Compute a single global multiplier, or recompute per
request from the whole fleet* → not localized (wrong incentives) or too expensive per request.

**Solution — real-time supply/demand aggregation per geo-cell.** Use the same **H3 cells** as
matching; stream-process requests vs available drivers per cell and derive a surge multiplier.

**How it works.** Kafka carries request + driver-availability events; a stream processor
(Flink) maintains per-cell supply/demand over a sliding window; when demand ≫ supply in a
cell, a surge multiplier for that cell is published and applied to fares there.

**Trade-offs.** Surge is a hot, stateful real-time aggregation; results are slightly delayed
(windowed) but localized and responsive. Naturally reuses the spatial model.

**💡 Rule of thumb:** localize real-time economics to the same spatial cells you already use
for matching, computed with stream processing.

---

## 6. Trade-offs & bottlenecks (summary)
- In-memory geo index = fast matching but must be **sharded + replicated** by region.
- High-frequency location writes → **ephemeral store**; persist trips separately.
- Matching correctness needs locks → adds latency; balance speed vs the no-double-assign
  invariant.
- Surge is a hot real-time aggregation per cell.

## 7. References
- [Uber H3 geospatial index](https://www.uber.com/blog/h3/)
- [Uber Engineering Blog](https://www.uber.com/blog/engineering/)
- [Lyft engineering](https://eng.lyft.com/)
