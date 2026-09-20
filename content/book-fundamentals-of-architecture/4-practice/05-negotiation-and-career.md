# Negotiation, leadership, and a career path

> Architecture is a social role with a technical foundation. The last chapters
> of the book are about the half that no compiler checks.

## Negotiating with business stakeholders

The classic case: a stakeholder demands **five nines** — 99.999% availability,
about five minutes of downtime per year. Arguing that it is unnecessary loses;
arguing about numbers loses; what works is making the cost visible and letting
them choose.

1. **Find out what they actually mean.** "Never down" usually means "not down
   during business hours in our main market", which is a completely different
   and much cheaper requirement.
2. **Translate the ask into cost.** Five nines needs multi-region redundancy,
   automated failover, no manual deploy steps, and 24/7 on-call — quantify it,
   roughly, in money and calendar time.
3. **Offer the alternatives with their prices.** Four nines is 52 minutes a
   year and perhaps a fifth of the cost. Now it is a business decision, which
   is where it belonged.
4. **Save the demonstration for when it is needed.** Numbers on a slide beat
   opinions; a graph of what the current architecture does beats numbers.

The generalisation: **never negotiate against a requirement, negotiate with
its cost.**

## Negotiating with other architects

Two architects arguing are usually both right about their own concern. What
works: avoid personal conflict and demonstration-over-assertion — a small
prototype, a benchmark, or a worked failure scenario ends an argument that
opinions cannot. Where it is genuinely a tie, the tiebreaker is the ranked
characteristic list: which of our top three does each option serve?

## Negotiating with developers

Developers resist decisions they do not understand, which is a healthy
instinct. Two techniques:

- **Provide justification, not authority.** The second law again: telling a
  developer *why* converts an order into a shared decision. "Because I'm the
  architect" is the most expensive sentence available.
- **Let them arrive at it.** Asking "how would you handle a partial failure
  here?" gets you the same conclusion with an owner attached.

## The four C's

Communication, collaboration, clarity, conciseness. Stated baldly it sounds
like a poster, but it is the actual competency list: a good architectural idea
that is not communicated clearly, collaborated on, and stated concisely does
not become an architecture.

## Leading by example

- **Be pragmatic yet visionary.** See where the industry and the business are
  going, and then choose for the team you actually have.
- **Lead by example, not by title.** The architect who joins the on-call
  rotation, fixes bugs, and does code reviews has authority that no org chart
  grants.
- **Integrate with the team.** Sit with them, attend their stand-ups, hear the
  complaints early. Most architectural decay is visible in a stand-up months
  before it is visible in a diagram.

## Developing the career path

**The 20-minute rule.** Spend twenty minutes a day on something you do not
know — before work, when it cannot be eaten by an incident. Twenty minutes is
small enough to sustain and large enough to compound. The target is the middle
of the [knowledge pyramid](../1-foundations/02-architectural-thinking.md):
turning "don't know you don't know" into "know it exists".

**Build a personal radar.** Borrow the structure of the ThoughtWorks Technology
Radar: place each technology you encounter in a ring —

| Ring | Meaning |
| --- | --- |
| **Hold** | Do not start anything new with this |
| **Assess** | Worth understanding; not worth betting on yet |
| **Trial** | Try it on something low-risk |
| **Adopt** | We should use this by default |

Revisit it every few months. The discipline is the value: it forces an explicit
judgement instead of drifting with whatever is loudest.

**Practise.** Architecture decisions are rare in a career, so the reps have to
come from somewhere else: **architecture katas** — a fictional system, a set of
requirements, an hour to pick characteristics and a style, then defend it to
someone who will argue. It is the only training available for the part of the
job that is actually hard.

## What to take away

- Negotiate with cost, not against requirements.
- Justify rather than instruct; demonstrate rather than assert.
- Twenty minutes a day, a personal radar, and deliberate practice — because
  the real decisions are too rare to learn from alone.

---

Previous: [Making teams effective](./04-teams-and-effectiveness.md) ·
Back to: [the book's contents](../README.md)
