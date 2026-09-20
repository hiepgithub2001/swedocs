# Lab — Instrument an app with Prometheus metrics

> **Builds:** [observability](../1-knowledge/observability/observability.md) — metrics, scraping,
> the [golden signals](../1-knowledge/observability/observability.md), and how
> [SLOs](../1-knowledge/observability/sre-reliability.md) are computed. **Tools:** Docker +
> [Prometheus](https://prometheus.io/) + a tiny instrumented app. **Time:** ~30 min.

## Goal
Make an app *emit* metrics, run Prometheus to **scrape** them, and query them — turning a running
service from a black box into something you can [observe](../1-knowledge/observability/observability.md).
You'll compute a real [golden signal](../1-knowledge/observability/observability.md) and see the
basis of an [error budget](../1-knowledge/observability/sre-reliability.md).

## 1. An instrumented app
`app.py` — a web app that exposes a `/metrics` endpoint (Python + `prometheus_client`):
```python
from prometheus_client import Counter, Histogram, start_http_server, make_wsgi_app
from wsgiref.simple_server import make_server
import random, time

REQS = Counter("http_requests_total", "All requests", ["status"])
LAT  = Histogram("http_request_duration_seconds", "Latency")

def app(environ, start_response):
    with LAT.time():
        time.sleep(random.uniform(0, 0.3))            # fake work
        status = "500" if random.random() < 0.1 else "200"   # ~10% errors
        REQS.labels(status=status).inc()              # count by status
    start_response(f"{status} OK", [("Content-Type","text/plain")])
    return [b"ok"]

start_http_server(8000)                                # exposes /metrics on :8000
make_server("", 8080, app).serve_forever()             # the app on :8080
```
Hit `http://localhost:8080` a few times, then look at `http://localhost:8000/metrics` — you'll see
raw counters like `http_requests_total{status="200"} 47`. That's [telemetry](../1-knowledge/observability/observability.md),
emitted by your code.

## 2. Run Prometheus to scrape it
`prometheus.yml`:
```yaml
global: { scrape_interval: 5s }
scrape_configs:
  - job_name: myapp
    static_configs:
      - targets: ['host.docker.internal:8000']   # scrape the app's /metrics every 5s
```
```console
$ docker run -p 9090:9090 -v $PWD/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus
```
Open `http://localhost:9090` → **Status → Targets** → your `myapp` target should be **UP**.
Prometheus is now **pulling** metrics from your app every 5 seconds and storing the time series.

## 3. Query the golden signals (PromQL)
Generate some traffic (`for i in {1..200}; do curl -s localhost:8080 >/dev/null; done`), then in
the Prometheus UI query box:
```promql
# TRAFFIC — requests per second:
rate(http_requests_total[1m])

# ERRORS — error ratio (a golden signal → the basis of an SLO):
sum(rate(http_requests_total{status="500"}[5m]))
  / sum(rate(http_requests_total[5m]))

# LATENCY — p95 (what slow users feel, not the average):
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```
The error ratio (~0.1) is exactly the number an [SLO](../1-knowledge/observability/sre-reliability.md)
is set against: if your SLO is 99.9% success, this 10% error rate is **blowing the error budget** —
you'd alert and freeze features.

## 4. Graph it
Switch the query to the **Graph** tab and watch the metrics move as you send traffic. (For real
dashboards you'd point [Grafana](../1-knowledge/observability/observability.md) at Prometheus — try
adding it as an exercise.)

## Exercises
1. Add a Grafana container, add Prometheus as a data source, and build a 4-panel
   [golden-signals](../1-knowledge/observability/observability.md) dashboard.
2. Write an **alert rule**: error ratio > 1% for 5 min → firing. That's an
   [SLO-based alert](../1-knowledge/observability/sre-reliability.md).
3. Lower the app's fake error rate to 1% and watch the error-ratio query drop — your "deploy
   fixed it" signal.
4. Add a label like `endpoint` to the counter and explore how
   [cardinality](../1-knowledge/observability/observability.md) grows the number of time series.

## What you proved
- Code must be **instrumented** to be observable — metrics don't appear by magic.
- Prometheus **pulls/scrapes** metrics on an interval and stores time series.
- You can compute the [golden signals](../1-knowledge/observability/observability.md) — and an
  error rate *is* the input to an [error budget](../1-knowledge/observability/sre-reliability.md).

## References
- [Observability](../1-knowledge/observability/observability.md) · [SRE / SLOs](../1-knowledge/observability/sre-reliability.md)
- [Prometheus — Getting started](https://prometheus.io/docs/prometheus/latest/getting_started/)
