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

**Scale assumptions** — 1M active drivers, location every ~4 s, dense urban hotspots,
global multi-region.

**Out of scope (or note)** — payments processing internals, maps/routing engine,
fraud/driver onboarding.

**🎯 The dominant requirement:** **low-latency geospatial matching over a firehose of
ephemeral location data, with correct assignment.** The design centers on a fast spatial
index + an in-memory location store + a locked matching state machine.

## 2. Capacity estimation
- **1M drivers × (1 ping / 4 s)** ≈ **250K location writes/s** — high-volume, **ephemeral**
  (latest wins).
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
- `trips`: `trip_id, rider_id, driver_id, status, pickup_geo, dropoff_geo, fare,
  timestamps`
- **Live location** in an **in-memory geo index** (Redis GEO / quadtree / H3).

**API** — `PATCH /v1/drivers/location`, `POST /v1/rides -> { trip_id }`, `WS
/v1/trips/{id}`.

---

## 5. Deep analysis — biggest problems & solutions

### 🔴 Problem 1 — Finding nearby drivers fast (geospatial search)
**Why it's hard:** "available drivers within 2 km of this rider" can't scan millions of
drivers per request; lat/long range scans on a normal DB are slow at this rate.

**Solution — a spatial index that buckets the map into cells.**
- **Geohash** — encode lat/long into a string; nearby points share prefixes → prefix
  query finds neighbors (Redis GEO).
- **Quadtree** — recursively subdivide dense areas.
- **H3 (Uber's hex grid)** — uniform neighbor distances; great for "nearby" + surge
  zoning (see [Uber](./companies/uber.md)).

**How it works:** the matcher computes the rider's cell, queries that cell + adjacent
cells for available drivers, and ranks candidates by ETA/rating — bounded work regardless
of fleet size.

```mermaid
flowchart LR
    Rider --> Cell[rider's cell + neighbors]
    Cell --> Cand[available drivers]
    Cand --> Rank[rank by ETA/rating] --> Offer[offer to best]
```

### 🔴 Problem 2 — Ingesting 250K location writes/sec
**Why it's hard:** durably persisting every GPS ping to a disk DB at 250K/s is wasteful —
the data is short-lived (only the latest matters for matching).

**Solution — in-memory store for current location + Kafka for the stream.** Keep current
positions in an **in-memory geo store** (sharded/replicated by region); stream raw pings
to **Kafka** for ETA models, analytics, and surge — without durably writing each ping.
Trips (durable) are stored separately.

### 🔴 Problem 3 — Never assigning one driver to two riders
**Why it's hard:** two riders' matches could both pick the same nearby available driver
concurrently → double-booking.

**Solution — a per-driver state machine with locking.** Driver status transitions
(`available → offered → assigned`) use a **compare-and-set** (optimistic lock) so only one
match can move a driver out of `available`. The offer protocol is **offer → accept within
timeout → assign**; on decline/timeout, fall back to the next candidate.

### 🔴 Problem 4 — Live trip tracking
**Why it's hard:** rider and driver need each other's live position and trip-state changes
in near real time.

**Solution — persistent push channels (WebSocket).** Both apps hold a WebSocket to the
Trip Service, which streams position updates and coordinates state transitions. Same
connection-routing concerns as the [chat system](./chat-system.md).

### 🔴 Problem 5 — Surge pricing
**Why it's hard:** prices must rise where demand outstrips supply, computed continuously
per area from live data.

**Solution — real-time supply/demand aggregation per geo-cell.** Stream-process requests
vs available drivers per **H3 cell** (Kafka + Flink); when demand ≫ supply, apply a surge
multiplier to fares in that cell. Naturally fits the hex-cell spatial model.

---

## 6. Trade-offs & bottlenecks (summary)
- In-memory geo index = fast matching but must be **sharded + replicated** by region.
- High-frequency location writes → **ephemeral store** (durability traded for
  throughput); persist trips separately.
- Matching correctness needs locks → adds latency; balance speed vs the no-double-assign
  invariant.
- Surge is a hot real-time aggregation per cell.

## 7. References
- [Uber H3 geospatial index](https://www.uber.com/blog/h3/)
- [Uber Engineering Blog](https://www.uber.com/blog/engineering/)
- [Lyft engineering](https://eng.lyft.com/)
