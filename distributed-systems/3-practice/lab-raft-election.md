# Lab — Build a Raft leader election

> **Builds:** [consensus & Raft](../1-knowledge/consensus/consensus-and-raft.md) — terms, votes,
> election timeouts, and **why split-brain can't happen** (majority + one vote per term). **Tools:**
> Python 3 (stdlib). **Time:** ~30 min. **Purpose:** *see* a majority election produce exactly one
> leader, and a minority partition fail to.

## Goal
Implement the **election** half of Raft for 5 simulated nodes (skip log replication). Prove the
core safety property: **at most one leader per term**, and a minority can't elect one.

## 1. The node
```python
class Node:
    def __init__(self, i, peers):
        self.i, self.peers = i, peers
        self.term = 0
        self.state = "follower"
        self.voted_for = {}          # term -> candidate it voted for

    def request_vote(self, term, candidate):
        # grant at most ONE vote per term, and only for a term >= ours
        if term < self.term: return False
        if term > self.term:
            self.term, self.state = term, "follower"
        if self.voted_for.get(term) in (None, candidate):
            self.voted_for[term] = candidate
            return True
        return False                 # already voted this term → deny
```
The two rules that prevent split-brain: **one vote per term** and **a majority is required to win**.

## 2. An election
```python
def start_election(nodes, candidate, reachable):
    cand = nodes[candidate]
    cand.term += 1; cand.state = "candidate"
    term = cand.term
    cand.voted_for[term] = candidate          # vote for self
    votes = 1
    for p in reachable:                        # only nodes it can reach (simulate partition)
        if p != candidate and nodes[p].request_vote(term, candidate):
            votes += 1
    majority = len(nodes) // 2 + 1
    if votes >= majority:
        cand.state = "leader"
        print(f"node {candidate} is LEADER for term {term} ({votes}/{len(nodes)} votes)")
    else:
        print(f"node {candidate} FAILED ({votes}/{len(nodes)}, need {majority})")
```

## 3. Run it — healthy cluster, then a partition
```python
nodes = {i: Node(i, [0,1,2,3,4]) for i in range(5)}

# Healthy: candidate 0 can reach everyone
start_election(nodes, 0, reachable=[0,1,2,3,4])
#   → node 0 is LEADER for term 1 (5/5 votes)

# Partition: nodes {3,4} are split off; node 3 tries to become leader on its side
start_election(nodes, 3, reachable=[3,4])
#   → node 3 FAILED (2/5, need 3)   ← the minority CANNOT elect a leader ✅
```
The minority side **cannot** reach a majority, so it gets **no leader** and would stop accepting
writes — exactly how Raft [prevents split-brain](../1-knowledge/consensus/consensus-and-raft.md)
during a [partition](../1-knowledge/fundamentals/why-distributed-is-hard.md).

## 4. Prove the safety property
```python
# Try to elect TWO leaders in the same term → impossible
start_election(nodes, 1, reachable=[0,1,2,3,4])   # term 2, succeeds
start_election(nodes, 2, reachable=[0,1,2,3,4])   # term 3 — note term BUMPS; can't share term 2
```
You can never get two leaders in the *same* term: each node grants one vote per term, and you need
a majority, so two candidates can't both collect majorities for the same term.

## Exercises
1. Add **random election timeouts** so split votes (two candidates at once) resolve on retry — the
   real Raft liveness trick.
2. Simulate the leader "dying" (stop responding) and a follower timing out to start a new term.
3. Extend to 3 nodes and confirm it tolerates exactly 1 failure (2f+1).

## What you proved
- A Raft election elects **exactly one leader per term** via majority + one-vote-per-term.
- A **minority partition cannot elect a leader** → no split-brain, at the cost of availability on
  that side ([the CP choice](../../system-design/1-knowledge/fundamentals/cap-theorem.md)).

## References
- [Consensus & Raft (knowledge)](../1-knowledge/consensus/consensus-and-raft.md)
- [Raft visualization](https://raft.github.io/) · [The Secret Lives of Data — Raft](https://thesecretlivesofdata.com/raft/)
