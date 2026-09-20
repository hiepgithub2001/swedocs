# Capacity Planning

> Estimating the resources (compute, memory, storage, bandwidth) a system needs to meet
> demand — now and as it grows — without over- or under-provisioning.

## Problem
Too little capacity → outages and slow responses under load. Too much → wasted money.
Capacity planning finds the right amount, and ensures you can scale before demand
outpaces supply (launches, seasonal peaks, viral spikes).

## Core concepts

**Start from the numbers** — use [estimation](../fundamentals/estimation.md): expected
QPS (peak, not average), data growth rate, payload sizes, and per-request resource cost.

**Headroom & peaks** — provision for **peak** load plus a safety margin (e.g. target
~60–70% utilization) so you can absorb spikes and lose a node without tipping over.

**Scaling approaches**
- **Vertical / horizontal** scaling (see [scalability](../fundamentals/scalability.md)).
- **Autoscaling** — add/remove instances automatically based on metrics (CPU, QPS,
  queue depth). Reactive autoscaling lags fast spikes; **predictive/scheduled** scaling
  helps for known patterns (Monday morning, Black Friday).

```mermaid
flowchart LR
    M[Metrics: CPU/QPS/queue] --> AS{Above threshold?}
    AS -->|yes| Up[Add instances]
    AS -->|below| Down[Remove instances]
```

**Load & stress testing** — measure real capacity: **load test** to expected peak,
**stress test** past it to find the breaking point, and run **soak tests** to catch
leaks over time. Tools: k6, JMeter, Locust, Gatling.

**Plan for growth** — track utilization trends and lead times (some resources take days
to provision); plan headroom for the next N months.

## Example — find the knee, then autoscale
You load-test one instance with **k6**: it holds p95 < 200 ms up to ~2,000 req/s, then
latency spikes (saturation). Expected peak is 8,000 req/s, so you need ~4 instances + headroom
→ run 5–6 and let an autoscaler add more on the CloudWatch latency/CPU alarm. Watch out: once
the app tier scales, the **single database** often becomes the next bottleneck (autoscaling
can't fix a write limit — you'd need replicas/sharding). Built in the
[autoscaling & load-testing project](../../3-practice/cross-autoscaling.md).

## Common tools
| Tool | Use it for |
| --- | --- |
| **k6 / JMeter / Locust / Gatling** | load, stress, and soak testing to find limits |
| **Kubernetes HPA**, **EC2 Auto Scaling**, **ECS autoscaling** | adding/removing capacity automatically |
| **CloudWatch alarms / Prometheus rules** | the scale-out/in signals |
| **Scheduled / predictive scaling** | pre-warming for known peaks (Black Friday) |

## Trade-offs
- Over-provision = reliability + cost; under-provision = savings + risk. Autoscaling
  balances this but has limits (cold starts, scaling lag, downstream bottlenecks like a
  single DB that can't autoscale writes).
- Load tests cost effort but are the only way to know real limits — guesses are often
  off by an order of magnitude.

## Real-world examples
- **Black Friday / ticket on-sales** — pre-scale and load-test ahead of known spikes.
- **Kubernetes HPA / cloud autoscaling groups** scale app tiers on CPU/custom metrics;
  the database tier usually needs separate, deliberate capacity planning.

## References
- *Site Reliability Engineering* — software engineering for capacity planning
- [k6 load testing](https://k6.io/)
