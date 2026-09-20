# Failure models & the FLP impossibility

> Before you can build a system that *tolerates* failure, you must define **what counts as a
> failure**. A failure model is that definition — the menu of ways a node is allowed to
> misbehave — and it determines what's even possible. This doc's purpose: give you the
> vocabulary to say *what* you're protecting against, and one famous result on the limits.

## Top-down: where you already meet this
"This system tolerates one node failure" — but *what kind* of failure? A node that cleanly
stops is easy; a node that sends *wrong* answers is a different universe of hard (and cost).
You can't design or reason about fault tolerance until you pin down the failure model, because
every algorithm in this area assumes a specific one.

## Problem
"Handle failure" is meaningless until you say which failures. Tolerating a crashed node is
cheap; tolerating a *lying* node needs ~3× the hardware. Pick too weak a model and reality
breaks you; too strong and you overpay. So we name a small set of failure models and design
against the right one.

## Core concepts

**The failure models, weakest to strongest assumption-on-the-node:**

| Model | The node may… | Example cause | Cost to tolerate |
| --- | --- | --- | --- |
| **Crash-stop** | halt, and never come back | process killed, power loss | low |
| **Crash-recovery** | halt, then restart (losing memory, keeping disk) | reboot | low–medium |
| **Omission** | drop some messages (in or out) | overloaded queue, flaky link | medium |
| **Byzantine** | do *anything* — including send wrong/malicious data | bug, corruption, attacker | high (need ~3f+1 nodes) |

Most everyday systems ([Raft](../consensus/consensus-and-raft.md), etcd, databases) assume
**crash** failures — nodes stop but never lie. **Byzantine** tolerance is reserved for where
you can't trust the participants (blockchains, aerospace, adversarial settings) because it's
far more expensive.

**The other half: the *timing* model.** Failure models pair with how the network behaves —
**synchronous** (known bounds on message delay and clock drift) vs **asynchronous** (no
bounds, the realistic [worst case](./why-distributed-is-hard.md)). The async model is hard
precisely because of the [slow-vs-dead ambiguity](./why-distributed-is-hard.md).

**Failure detectors are imperfect — and that's fundamental.** How do you know a node failed?
You wait for a heartbeat and time out. But in an [asynchronous network](./why-distributed-is-hard.md)
a timeout can't distinguish *crashed* from *slow* — so every failure detector is either too
eager (declares live nodes dead) or too cautious (slow to react). You tune the timeout; you
never make it perfect.

**The FLP impossibility — the field's most famous "no".** Fischer, Lynch & Paterson (1985)
proved: *in an asynchronous system, no algorithm can guarantee [consensus](../consensus/consensus-and-raft.md)
if even one node may crash.* The intuition: because you can't tell a crashed node from a slow
one, a single silent node can stall any protocol forever — you can never safely "move on
without it."

**So why does consensus work in practice?** FLP says *guaranteed* agreement in *bounded time*
is impossible — it doesn't say consensus never happens. Real systems sidestep it by adding a
pinch of **timing** (timeouts to elect leaders) and settling for "agrees **whenever the network
is behaving**, and never *wrongly* agrees." [Raft](../consensus/consensus-and-raft.md) and
Paxos live exactly here: always **safe**, and **live** when the network cooperates. FLP is a
statement about the worst case, which we accept we can't beat.

## Essential terminology

| Term | Meaning |
| --- | --- |
| **Failure model** | The defined set of ways a node may misbehave. |
| **Crash (fail-stop)** | A node halts and stops responding. |
| **Byzantine fault** | A node behaves arbitrarily — wrong or malicious output. |
| **Omission fault** | A node drops messages it should send/receive. |
| **Synchronous / asynchronous** | Known / unknown bounds on delay & clock drift. |
| **Failure detector** | A mechanism (usually timeouts) that suspects failed nodes — necessarily imperfect. |
| **FLP impossibility** | No async algorithm guarantees consensus if one node can crash. |
| **Safety / liveness** | "Nothing bad happens" / "something good eventually happens." |

## Example
Why the timeout is always a guess:
```
Node A waits for B's heartbeat. Timeout = 5s.
  • Set it to 1s  → A often declares a merely-slow B "dead" → needless failovers, churn.
  • Set it to 30s → A is slow to notice a truly-dead B → 30s of downtime.
There is no "correct" value — only a trade-off, because A cannot tell slow from dead.
```
This is FLP in miniature: the impossibility of perfect detection is *why* fault-tolerant
algorithms must be designed to stay **safe** even when the detector is wrong (e.g. two nodes
both think they're leader — [Raft handles it with terms](../consensus/consensus-and-raft.md)).

## Trade-offs
- ✅ Naming the model lets you buy exactly the resilience you need — crash tolerance is cheap and
  covers most cases.
- ⚠️ **Byzantine** tolerance is powerful but costly (more nodes, heavier protocols) — use only
  when participants can't be trusted.
- ⚠️ **FLP** means you can't have guaranteed-fast consensus under arbitrary delays; you trade a
  little liveness (via timeouts) to keep safety.

## Real-world examples
- **etcd, ZooKeeper, most databases** assume crash faults — they don't defend against a node
  *lying*.
- **Blockchains & BFT systems** (PBFT, Tendermint) assume **Byzantine** faults because anyone can
  join and cheat.
- **Heartbeat timeouts** in Kubernetes, load balancers, and gossip protocols are failure detectors
  — tuned, never perfect.

## References
- Fischer, Lynch, Paterson (1985) — *Impossibility of Distributed Consensus with One Faulty Process* (FLP)
- *Designing Data-Intensive Applications* (Kleppmann) — Ch. 8
- Builds on [why distributed systems are hard](./why-distributed-is-hard.md); leads to [consensus & Raft](../consensus/consensus-and-raft.md)
