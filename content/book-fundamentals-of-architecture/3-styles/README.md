# Part 3 — Architecture styles

> Eight named ways to arrange a system. None is best; each is a different
> answer to "which characteristics do we want, and what will we pay?"

Every style below is described the same way: the shape, how it works, what it
is genuinely good at, where it hurts, and when to choose it. Ratings are the
book's qualitative scale flattened to **low / medium / high** — they are
comparisons between styles, not measurements.

| | |
| --- | --- |
| [Fundamentals and the fallacies](./01-fundamentals-and-fallacies.md) | Monolithic vs distributed, and the eight lies about networks |
| [Layered](./02-layered.md) | The default, and why it is still a reasonable one |
| [Pipeline and microkernel](./03-pipeline-and-microkernel.md) | Two simple monoliths that do specific jobs very well |
| [Service-based](./04-service-based.md) | The pragmatic middle: coarse services, one database |
| [Event-driven](./05-event-driven.md) | Asynchronous, reactive, and hard to debug |
| [Space-based](./06-space-based.md) | Remove the database from the request path |
| [SOA and microservices](./07-soa-and-microservices.md) | The one that failed, and the one that won |
| [Choosing a style](./08-choosing-a-style.md) | The decision procedure, and a comparison table |
