# Part I-B — Virtualizing memory

> Give a process its own address space while sharing physical memory and handling the times its data is elsewhere.

This continues the original *Virtualization* part in its original order. Dialogues 12 and 24 frame the same central question: how can application addresses remain useful while the OS relocates, shares and protects physical storage?

An address space is an abstraction, not a dedicated RAM allocation. Translation hardware, page tables and the OS cooperate to implement it. The progression matters: base and bounds expose protection; segmentation exposes variable-size allocation; paging changes the allocation unit; TLBs and multi-level tables address the costs introduced by paging; replacement policies address scarcity.

| Source chapter | Read here |
| --- | --- |
| 13 | [Address spaces](./13-address-spaces.md) |
| 14 | [Memory allocation API](./14-memory-api.md) |
| 15 | [Address translation](./15-address-translation.md) |
| 16 | [Segmentation](./16-segmentation.md) |
| 17 | [Free-space management](./17-free-space.md) |
| 18 | [Paging](./18-paging.md) |
| 19 | [Translation-lookaside buffers](./19-tlbs.md) |
| 20 | [Smaller page tables](./20-smaller-page-tables.md) |
| 21 | [Swapping mechanisms](./21-swapping-mechanisms.md) |
| 22 | [Replacement policies](./22-replacement-policies.md) |
| 23 | [VAX/VMS as a design synthesis](./23-vax-vms.md) |

The VAX/VMS chapter is a historical synthesis, not a prescription for today's exact hardware. Its enduring value is seeing multiple techniques assembled around real constraints. The closing dialogue returns to that engineering lesson: efficient abstractions depend on coordinated hardware and software.

---

Previous: [Multiprocessor scheduling](../1-cpu/10-multiprocessor-scheduling.md) · Next: [Address spaces](./13-address-spaces.md)
