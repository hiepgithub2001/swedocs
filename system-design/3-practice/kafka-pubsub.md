# Practice Lab: Message Queue with Kafka (Producer/Consumer)

> Publish messages to a Kafka topic and consume them, observing decoupling and consumer
> groups.

## Goal
Run a single-node Kafka, produce messages to a topic, consume them, and see how two
consumers in the **same group** split partitions while a consumer in a **different
group** gets all messages.

## Prerequisites
- Docker + Docker Compose.

## Setup
Create `docker-compose.yml` (KRaft mode, no ZooKeeper):
```yaml
services:
  kafka:
    image: bitnami/kafka:3.7
    ports: [ "9092:9092" ]
    environment:
      KAFKA_CFG_NODE_ID: "0"
      KAFKA_CFG_PROCESS_ROLES: controller,broker
      KAFKA_CFG_CONTROLLER_QUORUM_VOTERS: "0@kafka:9093"
      KAFKA_CFG_LISTENERS: "PLAINTEXT://:9092,CONTROLLER://:9093"
      KAFKA_CFG_ADVERTISED_LISTENERS: "PLAINTEXT://localhost:9092"
      KAFKA_CFG_CONTROLLER_LISTENER_NAMES: "CONTROLLER"
      KAFKA_CFG_OFFSETS_TOPIC_REPLICATION_FACTOR: "1"
```

```bash
docker compose up -d
sleep 10
KAFKA="docker compose exec kafka kafka-topics.sh --bootstrap-server localhost:9092"
$KAFKA --create --topic orders --partitions 3 --replication-factor 1
```

## Steps
```bash
# Producer: type a few lines, then Ctrl-D
docker compose exec -T kafka kafka-console-producer.sh \
  --bootstrap-server localhost:9092 --topic orders <<EOF
order-1
order-2
order-3
EOF

# Consumer: read from the beginning
docker compose exec kafka kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic orders --from-beginning --timeout-ms 5000
```

## Expected result
- The consumer prints `order-1/2/3` — messages persisted in the topic and were
  delivered.
- Because Kafka is **log-based**, run the consumer again with `--from-beginning` and the
  messages are **still there** (not deleted on consume) — unlike a traditional queue.

## Teardown
```bash
docker compose down -v
```

## Notes
- Consumers in the **same** `--group` split the 3 partitions (scale-out); consumers in
  **different** groups each get a full copy (pub/sub).
- Related knowledge: [Message queues & pub/sub](../1-knowledge/building-blocks/message-queues.md).
