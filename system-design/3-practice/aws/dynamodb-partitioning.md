# AWS Lab: Partitioning with DynamoDB

> Use DynamoDB to see how a **partition key** distributes data, and how single-digit-ms
> key-value access works — a managed, Dynamo-style key-value store with no servers to
> run.

> ⚠️ Costs: DynamoDB **on-demand** has a generous always-free tier; this lab is
> effectively free. Delete the table at the end anyway.

## Goal
Create a table, write items under different partition keys, and query by key. Understand
how the partition key drives distribution (and how a bad key creates hot partitions).

## Prerequisites
- AWS CLI configured.

## Setup
Create a table with a composite primary key — **partition key** `pk` + **sort key** `sk`
— in on-demand (pay-per-request) mode:
```bash
aws dynamodb create-table \
  --table-name lab-orders \
  --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
aws dynamodb wait table-exists --table-name lab-orders
```

## Steps
```bash
# Write items: partition by user, sort by order id
aws dynamodb put-item --table-name lab-orders \
  --item '{"pk":{"S":"user#1"},"sk":{"S":"order#100"},"total":{"N":"42"}}'
aws dynamodb put-item --table-name lab-orders \
  --item '{"pk":{"S":"user#1"},"sk":{"S":"order#101"},"total":{"N":"99"}}'
aws dynamodb put-item --table-name lab-orders \
  --item '{"pk":{"S":"user#2"},"sk":{"S":"order#200"},"total":{"N":"10"}}'

# Query: all orders for user#1 (single partition, fast)
aws dynamodb query --table-name lab-orders \
  --key-condition-expression "pk = :u" \
  --expression-attribute-values '{":u":{"S":"user#1"}}'

# Get a single item by full key
aws dynamodb get-item --table-name lab-orders \
  --key '{"pk":{"S":"user#2"},"sk":{"S":"order#200"}}'
```

## Expected result
- The query returns both of user#1's orders (items sharing a partition key live
  together, sorted by `sk`).
- `get-item` returns user#2's single order. Access by key is O(1)-ish and very fast.

## Teardown
```bash
aws dynamodb delete-table --table-name lab-orders
```

## Notes
- DynamoDB **partitions by `hash(pk)`** internally (consistent hashing under the hood) —
  choose a **high-cardinality** partition key to spread load. A low-cardinality or
  celebrity key creates a **hot partition** (the same problem from the
  [key-value store](../../2-case-studies/key-value-store.md) and
  [sharding](../../1-knowledge/data-storage/sharding.md) docs).
- Reads can be **eventually** (default, cheaper) or **strongly** consistent (`
  --consistent-read`) — the [consistency models](../../1-knowledge/fundamentals/consistency-models.md)
  trade-off, exposed as a per-request choice.
