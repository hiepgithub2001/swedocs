---
collection: Book summaries
---

# Operating Systems: Three Easy Pieces — Distilled

> Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau's explanation of how an operating system shares a machine, coordinates concurrent work and preserves data, rewritten in original prose for a working software engineer.

## What this is

A concise companion to *Operating Systems: Three Easy Pieces* (**version 0.90, March 2015**, Arpaci-Dusseau Books), based on the PDF supplied for this project. It preserves the source's substantive chapter order, vocabulary, mechanisms and trade-offs. Each chapter explains its purpose, develops the ideas with original examples, draws the mechanisms, and ends with actions to remember.

That edition label comes from the compilation's preface (PDF page 16). The compilation is not perfectly uniform: some individual chapter footers say **version 0.91**. This distillation follows the actual supplied pages, not an assumed homogeneous release.

The original is worth reading. Its incremental problem solving, executable examples, simulators, exercises and historical references do work a short explanation cannot replace. Use this distillation to establish a mental model, then return to the authors' [official book site](https://www.ostep.org/) for the original and its learning materials. The original's worked case studies, complete comparison tables, assignments and solutions are not reproduced here.

This is not a transcription, and no source passage is quoted. Each substantive chapter identifies its source chapter or appendix and the **PDF page range** used for checking. Those PDF page numbers are positions in the supplied compilation, not the printed chapter-local page labels. Definitions, algorithm rules, named lists and numerical examples were checked against the corresponding source; examples introduced here are identified as examples, not measurements from the book.

## Who it is for

You can ship features, read a small C program and follow a diagram, but have not studied operating-system internals. Terms such as process, address space, page fault, condition variable and inode are introduced before they are used to explain a mechanism.

Read straight through for the causal chain: executing a process leads to address translation; shared execution leads to synchronization; storage updates lead to recovery protocols. For a specific production symptom, start with the relevant chapter and follow its prerequisites backward.

## The original sequence, made navigable

The source's three main parts remain the conceptual structure: **Virtualization**, **Concurrency**, and **Persistence**. Two large parts are split into smaller navigation groups: Virtualization becomes CPU then memory; Persistence becomes local storage then its distributed-file-system extension. No substantive chapter is moved.

The numbered dialogues introduce or review those ideas rather than supplying separate mechanisms. Their lessons are folded into the introduction, part indices and nearby chapters; they are not reproduced as conversations. Source chapter numbers are retained in filenames and the indices, so missing numbers indicate absorbed dialogues, not omitted technical chapters.

The supplied PDF also has **appendices A–I after chapter 50**, although its opening table of contents does not list them. They are included here in that actual order: virtual-machine monitors, synchronization monitors, laboratory tools and projects, then flash SSDs. In particular, the SSD material is not silently moved into the main persistence sequence.

| Read | The question it answers |
| --- | --- |
| [Introduction](./02-introduction.md) | What does an OS promise, and why does that promise need hardware support? |
| [Virtualizing the CPU](./1-cpu/README.md) | How can programs execute directly while the OS retains control and shares processor time? |
| [Virtualizing memory](./2-memory/README.md) | How do private addresses map to shared RAM, and what happens when RAM is scarce? |
| [Concurrency](./3-concurrency/README.md) | How do execution streams share state and wait without races, lost wakeups or deadlock? |
| [Persistence](./4-persistence/README.md) | How do device behavior, allocation and recovery make files usable and durable? |
| [Distribution](./5-distribution/README.md) | What changes when a file operation crosses a network and caches can disagree? |
| [Appendices](./6-appendices/README.md) | How do virtual machines, monitors, practical labs and flash storage extend those mechanisms? |

## How to read it for everyday work

For a small set of high-leverage mechanisms, start here:

- [Process API](./1-cpu/05-process-api.md): understand a shell, child processes and replacement of a running program.
- [TLBs](./2-memory/19-tlbs.md): distinguish a missing translation from a missing resident page.
- [Condition variables](./3-concurrency/30-condition-variables.md): connect a shared predicate, mutex and wakeup protocol.
- [Crash consistency](./4-persistence/42-crash-consistency.md): distinguish consistent metadata from durable application data.
- [NFS](./5-distribution/48-nfs.md): recognize retries, duplicate requests and stale caches behind an apparently local API.
- [Flash SSDs](./6-appendices/I-flash-ssds.md): understand why overwrites can create hidden copying and cleaning work.

## Historical scope and current use

This is a specific older edition, not a summary of whatever chapters happen to be on the current website. Its VAX/VMS, mechanical-disk, software x86 virtualization and NFSv2/AFSv2 examples are retained as designs with explicit assumptions. They should not be mistaken for a description of every current kernel, drive or protocol version.

Modern-use caveats are kept separate from source claims. For example, a pedagogical load–increment–store trace explains a lost update, but the [C11 language model](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n1570.pdf) does not guarantee ordinary unsynchronized C accesses will behave as that trace suggests. Similarly, monitor signal semantics and persistence guarantees must be read as actual interface contracts, not inferred from a diagram.

The enduring engineering method is to state the abstraction, locate the boundary where it is enforced, identify the mechanism and policy separately, and follow the failure path. A private address is not private RAM; a lock is not a condition; a successful write is not automatically a durable transaction; a network timeout is not proof that an operation never happened.

## Connected reference material

- [Operating Systems](../operating-systems/README.md): topic-oriented reference and practical labs.
- [Computer Systems: A Programmer's Perspective — Distilled](../book-csapp/README.md): data representation, machine code and the memory hierarchy below the OS interfaces.
- [Computer Networks](../computer-networks/README.md): transport and network mechanisms underneath RPC.
- [Distributed Systems](../distributed-systems/README.md): deeper treatment of partial failure and coordination.
- [System Design](../system-design/README.md): using these constraints in application architecture.

---

Next: [The operating system makes promises](./02-introduction.md)
