# REST API Design

> REST (Representational State Transfer) is an architectural style for web APIs built
> on HTTP: resources identified by URLs, manipulated with standard HTTP methods.

## Problem
Services need a clear, predictable contract to talk over the network. REST gives a
widely understood convention so clients and servers can integrate without bespoke
protocols.

## Core concepts

**Resources & methods** — model nouns as resources; use HTTP verbs for actions:
| Method | Meaning | Idempotent? |
| --- | --- | --- |
| GET | read | yes |
| POST | create | no |
| PUT | replace | yes |
| PATCH | partial update | no* |
| DELETE | remove | yes |

```
GET    /users            list users
POST   /users            create a user
GET    /users/123        get user 123
PUT    /users/123        replace user 123
DELETE /users/123        delete user 123
GET    /users/123/orders nested resource
```

**Status codes** — use them meaningfully: 2xx success, 3xx redirect, **4xx client
error** (400 bad request, 401 unauthenticated, 403 forbidden, 404 not found, 429 rate
limited), **5xx server error**.

**Design principles**
- **Statelessness** — each request carries everything needed; no server session state
  (scales horizontally).
- **Nouns, not verbs** in URLs (`/orders`, not `/getOrders`).
- **Versioning** — `/v1/...` or a header, so you can evolve without breaking clients.
- **Pagination, filtering, sorting** — `?page=2&limit=20&sort=-created`.
- **HATEOAS** (links in responses) — the purist level of REST; often skipped in
  practice.

## Trade-offs
- ✅ Simple, ubiquitous, cacheable (HTTP caching), great tooling, human-readable.
- ⚠️ **Over-fetching / under-fetching** (fixed responses) → GraphQL addresses this.
- ⚠️ Multiple round trips for related data; text/JSON is heavier than binary (gRPC).
- Great default for public APIs and CRUD; consider gRPC for internal high-performance
  calls, GraphQL for flexible client-driven queries.

## Real-world examples
- **Stripe, GitHub, Twilio** expose clean, well-documented REST APIs that are
  considered design references.

## References
- [REST API Tutorial](https://restfulapi.net/)
- [Stripe API reference](https://stripe.com/docs/api) (a model REST design)
