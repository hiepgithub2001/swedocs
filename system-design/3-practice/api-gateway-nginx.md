# Practice Lab: API Gateway with Nginx (Routing + Rate Limit)

> Use Nginx as an API gateway that routes paths to different backend services and
> applies a rate limit at the edge.

## Goal
Send requests to one gateway endpoint and watch `/users` and `/orders` route to
different services, while a per-IP rate limit returns `503` when you exceed it.

## Prerequisites
- Docker + Docker Compose.

## Setup
Create `nginx.conf`:
```nginx
events {}
http {
  limit_req_zone $binary_remote_addr zone=api:10m rate=2r/s;

  upstream users  { server users:80; }
  upstream orders { server orders:80; }

  server {
    listen 80;
    location /users  { limit_req zone=api burst=2 nodelay; proxy_pass http://users; }
    location /orders { limit_req zone=api burst=2 nodelay; proxy_pass http://orders; }
  }
}
```

Create `docker-compose.yml`:
```yaml
services:
  users:  { image: traefik/whoami }
  orders: { image: traefik/whoami }
  gateway:
    image: nginx:alpine
    volumes: [ "./nginx.conf:/etc/nginx/nginx.conf:ro" ]
    ports: [ "8080:80" ]
    depends_on: [ users, orders ]
```

```bash
docker compose up -d
```

## Steps
```bash
# Routing: each path hits a different backend
curl -s localhost:8080/users  | grep Hostname
curl -s localhost:8080/orders | grep Hostname

# Rate limit: hammer the endpoint; excess requests get 503
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/users
done
```

## Expected result
- `/users` and `/orders` report **different** container hostnames — the gateway routes
  by path.
- The burst loop shows a mix of `200` then `503 Service Temporarily Unavailable` once
  you exceed ~2 req/s + burst — the gateway shed excess load at the edge.

## Teardown
```bash
docker compose down
```

## Notes
- This is the gateway pattern: one front door doing routing + cross-cutting policy
  (here rate limiting; real gateways add auth, logging, TLS).
- Related knowledge: [Reverse proxies & API gateways](../1-knowledge/building-blocks/proxies-gateways.md).
