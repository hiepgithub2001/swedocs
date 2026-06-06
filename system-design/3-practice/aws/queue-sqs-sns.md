# AWS Lab: Queues & Pub/Sub with SQS + SNS

> Use SQS for a point-to-point work queue and SNS for fan-out pub/sub — the managed
> version of the [Kafka lab](../kafka-pubsub.md), entirely Free-Tier-friendly.

> ⚠️ Costs: SQS/SNS have generous always-free tiers; this lab is effectively free. Still
> delete the resources.

## Goal
1. Send/receive a message through an SQS queue (work queue).
2. Publish to an SNS topic that **fans out** to two SQS queues (pub/sub).

## Prerequisites
- AWS CLI configured.

## Part A — SQS work queue
```bash
QURL=$(aws sqs create-queue --queue-name lab-queue --query QueueUrl --output text)

# Producer
aws sqs send-message --queue-url $QURL --message-body "order-1"

# Consumer
aws sqs receive-message --queue-url $QURL --query "Messages[0].Body" --output text
```
**Expected:** the consumer receives `order-1`. (Delete it with `delete-message` using
its receipt handle; until then it's invisible for the *visibility timeout*, then
redelivered — that's at-least-once delivery.)

## Part B — SNS fan-out to two queues
```bash
TOPIC=$(aws sns create-topic --name lab-topic --query TopicArn --output text)
Q1=$(aws sqs create-queue --queue-name sub1 --query QueueUrl --output text)
Q2=$(aws sqs create-queue --queue-name sub2 --query QueueUrl --output text)
# (grab each queue's ARN via get-queue-attributes, allow SNS to send, then:)
aws sns subscribe --topic-arn $TOPIC --protocol sqs --notification-endpoint <q1-arn>
aws sns subscribe --topic-arn $TOPIC --protocol sqs --notification-endpoint <q2-arn>

# Publish ONE message
aws sns publish --topic-arn $TOPIC --message "OrderPlaced:42"

# Both queues receive a copy
aws sqs receive-message --queue-url $Q1 --query "Messages[0].Body"
aws sqs receive-message --queue-url $Q2 --query "Messages[0].Body"
```

## Expected result
- Part A: one consumer gets the message (point-to-point).
- Part B: **both** sub1 and sub2 receive the single published message — SNS fanned it
  out to every subscriber (pub/sub), just like Kafka consumer groups vs separate groups.

## Teardown
```bash
aws sqs delete-queue --queue-url $QURL
aws sqs delete-queue --queue-url $Q1
aws sqs delete-queue --queue-url $Q2
aws sns delete-topic --topic-arn $TOPIC
```

## Notes
- Add a **Dead-Letter Queue** + redrive policy to see failed-message handling.
- SQS FIFO queues give ordering + exactly-once; standard queues are at-least-once.
- This is the [notification-system](../../2-case-studies/notification-system.md) fan-out
  pattern. Related: [Message queues](../../1-knowledge/building-blocks/message-queues.md).
