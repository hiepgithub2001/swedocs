# AWS Lab: Replication with RDS (Read Replica & Multi-AZ)

> Create a managed PostgreSQL on RDS, add a **read replica**, and see writes propagate —
> the managed version of the [Postgres replication lab](../postgres-replication.md).

> ⚠️ Costs: RDS bills per hour even when idle; use `db.t3.micro` (Free-Tier eligible)
> and **delete promptly**. A read replica is a second billable instance.

## Goal
Write to the primary RDS instance, read the same data from its read replica, and
understand Multi-AZ failover vs read replicas.

## Prerequisites
- AWS CLI; a VPC; an EC2 client in the same VPC (RDS isn't public by default).

## Setup
1. **Create the primary DB:**
```bash
aws rds create-db-instance \
  --db-instance-identifier lab-primary \
  --engine postgres --db-instance-class db.t3.micro \
  --allocated-storage 20 \
  --master-username app --master-user-password 'ChangeMe123!' \
  --db-name appdb --no-publicly-accessible
```
2. Wait until `available`, then **create a read replica:**
```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier lab-replica \
  --source-db-instance-identifier lab-primary
```
3. Get both endpoints:
```bash
aws rds describe-db-instances \
  --query "DBInstances[].[DBInstanceIdentifier,Endpoint.Address]" --output text
```

## Steps
From the EC2 client (`psql` installed):
```bash
PRIMARY=<primary-endpoint>; REPLICA=<replica-endpoint>

# Write on the primary
PGPASSWORD='ChangeMe123!' psql -h $PRIMARY -U app -d appdb \
  -c "CREATE TABLE t(id int); INSERT INTO t VALUES (1),(2),(3);"

# Read from the replica (give it a few seconds to catch up)
sleep 5
PGPASSWORD='ChangeMe123!' psql -h $REPLICA -U app -d appdb -c "SELECT * FROM t;"

# Writes on the replica are rejected
PGPASSWORD='ChangeMe123!' psql -h $REPLICA -U app -d appdb -c "INSERT INTO t VALUES (4);"
```

## Expected result
- The replica returns rows 1, 2, 3 — asynchronously replicated.
- Writing to the replica fails (read-only) — direct reads there to scale read traffic.

## Teardown
```bash
aws rds delete-db-instance --db-instance-identifier lab-replica --skip-final-snapshot
aws rds delete-db-instance --db-instance-identifier lab-primary --skip-final-snapshot
```

## Notes
- **Read replicas** scale reads (async, may lag). **Multi-AZ** keeps a *synchronous*
  standby for automatic **failover** (availability), not for read scaling — different
  goals. Enable Multi-AZ with `--multi-az` on create.
- Related: [Replication](../../1-knowledge/data-storage/replication.md) ·
  [Redundancy & failover](../../1-knowledge/reliability/redundancy-failover.md).
