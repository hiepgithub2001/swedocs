# Practice Lab: <Concept>

> What concept this lab proves and why it matters.

## Goal
The behavior you'll observe by the end.

## Prerequisites
- Docker / docker-compose (or other tools)

## Setup
```yaml
# docker-compose.yml or commands to bring the environment up
```

```bash
docker compose up -d
```

## Steps
1. Do X
2. Send traffic / run the command
3. Observe Y

```bash
# example: hit the endpoint and watch which node responds
for i in $(seq 1 6); do curl -s localhost:8080; done
```

## Expected result
What success looks like (sample output, metrics, behavior).

## Teardown
```bash
docker compose down -v
```

## Notes & references
- ...
