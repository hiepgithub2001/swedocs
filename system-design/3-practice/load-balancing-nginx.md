# Practice Lab: Load Balancing with Nginx

> Prove how a load balancer spreads requests across multiple backend servers, and how
> it routes around a failed one.

## Goal
Send repeated requests to a single Nginx endpoint and watch them get distributed
across 3 backend containers (round-robin). Then kill a backend and see traffic continue.

## Prerequisites
- Docker + Docker Compose.

## Setup
Create `nginx.conf`:
```nginx
events {}
http {
  upstream backend {
    server web1:80;
    server web2:80;
    server web3:80;
  }
  server {
    listen 80;
    location / { proxy_pass http://backend; }
  }
}
```

Create `docker-compose.yml`:
```yaml
services:
  web1: { image: traefik/whoami }
  web2: { image: traefik/whoami }
  web3: { image: traefik/whoami }
  lb:
    image: nginx:alpine
    volumes: [ "./nginx.conf:/etc/nginx/nginx.conf:ro" ]
    ports: [ "8080:80" ]
    depends_on: [ web1, web2, web3 ]
```

```bash
docker compose up -d
```

## Steps
1. Fire 6 requests and watch the `Hostname` line rotate across web1/2/3:
```bash
for i in $(seq 1 6); do curl -s localhost:8080 | grep Hostname; done
```
2. Now simulate a failure — kill one backend:
```bash
docker compose stop web2
for i in $(seq 1 6); do curl -s localhost:8080 | grep Hostname; done
```

## Expected result
- Step 1: hostnames cycle through all three backends (round-robin).
- Step 2: requests still succeed, now only across web1 and web3 — Nginx skips the dead
  node. No errors to the client.

## Teardown
```bash
docker compose down
```

## Notes
- Try `least_conn;` inside the `upstream` block to switch algorithms.
- Related knowledge: [Load balancers](../1-knowledge/building-blocks/load-balancers.md).
