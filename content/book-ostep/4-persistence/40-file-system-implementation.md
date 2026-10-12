# File-System Implementation: Follow the Metadata

> A file-system call becomes a traversal and update of persistent data structures. Understanding both the layout and the access path explains I/O amplification, allocation limits, and the value of caching.

Source: Chapter 40, “File System Implementation,” PDF pp. 478–495.

## Two questions define the implementation

The chapter develops **VSFS**, the Very Simple File System, as a model of a Unix-style implementation. Ask two separate questions: what structures exist on disk, and which of those structures does each operation access? A diagram of the layout alone cannot explain the cost of opening a file; a system-call trace alone cannot explain why an allocation bitmap changes.

The disk is divided into fixed-size file-system blocks. A **data region** holds file contents, while an **inode table** holds per-object metadata. Allocation structures track free inodes and blocks. A **superblock** describes the volume's organization, including sizes, locations, and a file-system identifier. Mounting reads that information before normal path traversal begins.

For an original small example, take 96 blocks of 4 KiB. Place the superblock at block 0, inode and data bitmaps at blocks 1 and 2, an eight-block inode table at blocks 3–10, and the data region at blocks 11–95. With 128-byte inodes, the table holds `8 × 4096 / 128 = 256` objects, while the data region contains 85 blocks. A free data block does not help if no free inode remains.

A bitmap needs one bit per tracked resource. Even a single 4-KiB bitmap represents 32,768 resources, so this tiny example wastes bitmap space for simplicity. Production layouts can organize these structures differently.

## The inode locates the file's blocks

An inode stores metadata such as length, permissions, ownership, link count, timestamps, and block addresses. Its inode number indexes the table. In the example above, inode 70 is in table block `floor(70 / 32) = 2`, hence file-system block 5, at byte offset `6 × 128 = 768` within that block. If sectors are 512 bytes, the block's starting sector is 40. Keep a block's base address distinct from an individual inode's byte position.

**Direct pointers** in an inode point straight to file data. They make small files cheap but impose a size limit if used alone. An **indirect pointer** instead points to a block of addresses. A **double-indirect pointer** adds another address-block level; triple indirection can extend the range further.

With eight direct pointers, 4-KiB blocks, and 4-byte addresses, direct access covers 32 KiB. One indirect block holds 1,024 addresses and adds 4 MiB of data capacity. This deliberately unbalanced tree makes small files inexpensive while permitting large ones, at the cost of extra metadata reads for some offsets.

An **extent** stores a starting block and a length rather than a pointer for every block. It is compact for contiguous allocations, but requires finding suitable runs of free space; multiple extents accommodate fragmentation. A linked-block scheme is simpler but expensive for random access because it follows predecessors. FAT improves that scheme by keeping next-block links in a table that can be cached in memory. It does not use the same inode-centered organization.

The source's workload studies motivate these trade-offs: many files are small, while a few large files hold much of the stored data. Optimize neither solely for object count nor solely for byte count.

## Directories and allocation are ordinary structures

A directory has an inode and data blocks, but its contents are structured name-to-inode mappings. Variable-length records allow different name lengths and reuse of space left by deletion. A simple linear list works for small directories; indexed structures such as B-trees avoid scanning every entry in large ones.

Allocation bitmaps are consulted when creating objects or acquiring new blocks, not merely when reading an existing file. An inode's pointers already locate allocated data. Alternatives include free lists and tree-based descriptions of free regions. **Pre-allocation** reserves a run of blocks for anticipated growth, trading earlier commitment of space for a more contiguous file.

## A pathname becomes a chain of reads

Suppose `/team/log` is uncached, except for the mounted volume's superblock. The root inode has a known identity. Reading it locates root directory data; looking up `team` yields that directory's inode number. Reading its inode and data yields `log`'s inode number. Reading the final inode provides permissions and block locations, after which the OS can return a descriptor.

```mermaid
flowchart LR
    RI["Known root inode"] -->|"Block pointers"| RD["Root directory data"]
    RD -->|"team inode number"| TI["Team directory inode"]
    TI -->|"Block pointers"| TD["Team directory data"]
    TD -->|"log inode number"| FI["File inode"]
    FI -->|"Offset selects block pointer"| FD["File data block"]
```

A subsequent read follows the file's pointers and advances its in-memory offset. It may also cause an access-time metadata update. Longer paths and larger linear directories increase the uncached work. Closing releases descriptor state; it does not inherently require another disk access in this model.

An allocating write additionally finds a free block, updates the bitmap and inode, and writes the data. The chapter's uncached accounting gives five logical I/Os: bitmap read/write, inode read/write, and data write. Creation adds inode allocation and a parent-directory update; parent growth may allocate still more storage. These are model costs, not a fixed count for every real system call.

## Cache reads; buffer and eventually persist writes

Caching turns repeated directory and inode lookups into memory accesses. A **unified page cache** shares memory dynamically with virtual-memory needs instead of reserving a fixed, potentially idle file-cache fraction.

Buffered writes can merge repeated metadata changes, reorder work for better disk service, or avoid storage traffic for an object created and deleted before flushing. But required durable bytes must eventually reach storage. Longer buffering improves opportunities for batching while increasing the amount that a crash can lose. Applications needing stronger guarantees use explicit synchronization and appropriate storage interfaces; bypassing a cache is a separate concern from obtaining durability.

## What to take away

- Draw both the disk layout and the read/write path when investigating a file-system cost.
- Check inode exhaustion separately from data-space exhaustion.
- Do not include allocation-bitmap reads in a normal nonallocating read path.
- Treat uncached I/O counts as explanatory models, then account for caching and buffering.

---

Previous: [Files and directories](./39-files-directories.md) · Next: [FFS and locality](./41-ffs.md)
