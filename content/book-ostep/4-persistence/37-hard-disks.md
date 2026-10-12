# Hard Disks: Positioning Dominates Small I/O

> A disk looks like an array of blocks, but access time depends on moving a head and waiting for rotation. That mismatch explains why layout, batching, and scheduling matter so much.

Source: Chapter 37, “Hard Disk Drives,” PDF pp. 423–439.

## The block interface hides important behavior

A hard drive exports numbered sectors that software can read or write. The chapter models 512-byte sectors and larger file-system operations assembled from them. In its model, one sector write is atomic; a larger write may be **torn**, with only some sectors reaching storage before power loss. Treat that as the model's hardware assumption, not a guarantee to apply blindly to every present-day device.

The interface also has an **unwritten contract**: nearby logical blocks usually cost less to access than distant ones, and a long contiguous transfer is generally the fastest pattern. The interface does not expose enough geometry to make these statements exact in every case, but file systems exploit them.

## Geometry produces three stages of service

Data resides magnetically on rotating **platters**. Each surface contains concentric **tracks**, divided into sectors. The spindle rotates the platters, while an arm positions a read/write head over the desired track.

An I/O first pays **seek time** to reach the track. Movement includes acceleration, travel, deceleration, and precise settling; seek time is not simply proportional to distance. It then pays **rotational delay** until the sector arrives under the head. Finally, **transfer time** moves the requested bytes.

```mermaid
flowchart LR
    Q["Request logical blocks"] -->|"Choose physical location"| S["Seek to track"]
    S -->|"Head settles"| R["Wait for sector rotation"]
    R -->|"Sector under head"| T["Transfer bytes"]
    T -->|"Report completion"| D["Request complete"]
    Q -.->|"Cache hit can avoid surface access"| D
```

A 12,000-RPM drive completes a revolution in `60,000 / 12,000 = 5 ms`. For uniformly distributed rotational positions, the average wait is half a revolution, or 2.5 ms. A closer track is not necessarily a faster request if its sector has just passed the head.

**Track skew** offsets the starting positions of neighboring tracks so that, after switching tracks, a sequential reader has not already missed its next sector. **Zoned** layouts put more sectors on outer tracks because their circumference is larger. These details complicate any simplistic mapping from logical block number to exact geometry.

Drive caches add another distinction. A **write-through** acknowledgment follows persistence to the medium; a **write-back** acknowledgment may only mean that the bytes are in volatile device memory. The latter can improve apparent latency while undermining durability and ordering unless the storage stack uses the necessary controls.

## Calculate time before quoting bandwidth

The basic model is:

`I/O time = seek time + rotational delay + transfer size / transfer rate`

Effective bandwidth is the transfer size divided by that total time. Use consistent units rather than mixing decimal megabytes and binary kibibytes.

Consider a hypothetical drive with a 6-ms average seek, the 2.5-ms average rotation above, and a transfer rate of 160 MiB/s. An 8-KiB random read spends about 0.0488 ms transferring, for a total of 8.5488 ms. Its effective bandwidth is only about 0.914 MiB/s, despite the much larger surface-transfer rate.

A single contiguous 64-MiB transfer pays the same 8.5-ms positioning cost plus 400 ms of transfer. Effective bandwidth becomes about 156.7 MiB/s. This is why replacing many small random requests with one large sequential request can outweigh modest improvements in the drive itself.

The chapter also derives an average seek *distance* of one-third of the full span in a continuous uniform model. That is not an exact average seek *time*: arm acceleration and settling break the assumption of linear time per unit distance.

## Scheduling trades throughput against waiting

A disk scheduler chooses which queued request to issue next. Because positions give clues about service time, it can approximate shortest-job-first more directly than a CPU scheduler can.

**Shortest seek time first**, or **SSTF**, selects the nearest requested track. When the OS cannot see tracks, **nearest block first** approximates it using logical addresses. Both can starve distant requests if nearby work keeps arriving.

**SCAN**, the elevator policy, services requests while sweeping in one direction, then reverses. Requests behind the sweep wait for a later pass. **F-SCAN** freezes the current batch so new nearby arrivals cannot keep extending it. **C-SCAN** serves requests in one direction and returns to start another sweep, avoiding the special advantage that middle tracks receive with back-and-forth service.

These policies ignore rotation. **Shortest positioning time first**, or **SPTF**, includes both seek and rotational delay. A further track can win if its sector will reach the head sooner. Drive firmware is usually better placed than the OS to estimate this because it knows the real layout and current head position.

## The scheduler is not only an ordering policy

Modern drives accept multiple outstanding requests, so scheduling can be split: the OS selects a useful set and the drive reorders that set with its internal knowledge. The OS also **merges** adjacent requests; reading blocks 80 and 81 together reduces command overhead and encourages sequential transfer.

A work-conserving scheduler issues available work immediately. An **anticipatory**, non-work-conserving scheduler may wait briefly for a nearby follow-up request instead of rushing to a distant one. That wait can improve throughput but is a workload-dependent gamble, not a universal latency improvement.

See [disk scheduling](../../operating-systems/1-knowledge/storage-fs/disk-scheduling.md) for the policy perspective.

## What to take away

- Model random I/O using positioning costs, not the advertised transfer bandwidth.
- Batch contiguous work when possible, while measuring the extra waiting that batching introduces.
- Distinguish a completed host request from a durably persisted device write.
- Evaluate scheduler fairness as well as throughput; greedy proximity can starve work.

---

Previous: [I/O devices](./36-io-devices.md) · Next: [RAID](./38-raid.md)
