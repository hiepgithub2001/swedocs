# Laboratory tools: build an environment you can explain

> Systems programming is easier when compilation, linking, debugging, and documentation are visible processes rather than rituals. Learn these tools alongside the operating-system concepts, not after them.

Source: Appendix E, “A Dialogue on Labs,” PDF pp. 635–636; Appendix F, “Laboratory: Tutorial,” PDF pp. 637–648.

## Reading becomes understanding through construction

The lab dialogue separates two kinds of practice. **Systems programming** writes C programs on Linux that interact with the kernel through its interfaces. **xv6 projects** change a teaching kernel itself. Either path can stand alone, or a course can begin with user-space programs and move into kernel changes. The common lesson is to implement while studying: reading about a process boundary is not the same experience as making a shell cross it correctly.

The tutorial's three foundations are tools, libraries, and documentation. Knowing C syntax is not enough if you cannot explain which executable you built, which library supplies a symbol, or what a failed call returns.

## From a C source file to a process

A header such as `stdio.h` supplies declarations used by the compiler; including it does not itself copy the corresponding library implementation into the program. The preprocessor expands `#include` and other directives before compilation.

A conventional `main(int argc, char *argv[])` receives a count and an array of argument strings. The array includes the invocation name and ends with a null pointer after its counted entries. Returning an integer from `main` produces an exit status that the invoking shell can inspect. For a small argument-reporting utility, this is already an interface: inputs arrive as strings, output goes to standard output, and the exit status indicates success or failure.

`gcc` is a **compiler driver** coordinating several tools, rather than just the C-to-machine-code step:

```mermaid
flowchart LR
    C["C source and headers"] -->|cpp expands directives| PP["Preprocessed C"]
    PP -->|Compiler emits assembly| A["Assembly"]
    A -->|Assembler emits machine code| O["Object files"]
    O -->|ld resolves symbols with libraries| E["Executable"]
    E -->|Loader starts process| R["Running program"]
```

Without an output option, the simple example produces `a.out`; `./a.out` invokes the executable in the current directory. Use `-o` to name it, `-Wall` to enable useful warnings, `-g` for debugger information, and `-O` for optimization. Warnings are evidence to investigate and fix, not noise to suppress. During an initial debugging session, the tutorial recommends avoiding optimization because the resulting execution can be harder to relate to source lines.

## Declarations, libraries, and separate compilation

The manual page tells you which headers an interface needs and whether extra linking is required. Many C library routines and system-call wrappers are available through the default C library. A wrapper such as `fork()` still crosses into the kernel; being callable from C does not make it ordinary user-space computation.

Other libraries need an explicit link option. For example, a mathematical routine may require `math.h` and `-lm`. The `-l` option identifies a library, while `-I` changes header search paths and `-L` changes library search paths. Header lookup belongs to compilation; symbol resolution belongs to linking.

A **static library** contributes needed object code to the executable. A **dynamic library** is referenced by the executable and linked into the process at load time. Dynamic linking reduces repeated code on disk and can share library code in memory; static linking makes a larger, more self-contained executable. The tutorial also notes possible dynamic-linking performance costs.

Use `-c` to compile a source file into an object without linking. A utility split into `scan.c` and `report.c` can rebuild only the changed object and then relink both. Recompiling every source after each edit wastes work.

## Make dependencies executable

A Makefile expresses a target, its prerequisites, and the commands that create it. An executable depends on object files; an object depends on its source and the headers that affect it. `make` rebuilds a missing target or one older than a prerequisite, then propagates that change to dependent targets.

Traditional recipe lines begin with a tab. A `clean` target is an explicit housekeeping action rather than a source transformation. Variables centralize compiler flags and source lists; pattern rules express repeated compilation steps without duplicating each command. The tutorial mentions `makedepend` for discovering dependencies: omitting an included header from the dependency graph can leave an apparently successful incremental build stale.

## Use the debugger and read the interface contract

Compile with `-g`, then use `gdb` to run the executable. `run` begins execution, `break` stops at a chosen location, `print` inspects values, and `next` or `step` advances execution. A segmentation fault at a dereference identifies where invalid memory was used; inspecting the pointer helps explain why. GDB can also inspect a core dump or attach to an existing process. Its interactive `help` is part of the workflow.

Manual pages are divided into sections. A command and a system call may share a name: `man 2 kill` selects the system-call interface, while `man -a kill` visits matching pages. `man -k` searches by keyword. Read the synopsis, return values, and errors, not just the function name. For example, a failed `open()` returns an error indication and sets `errno`; the caller must distinguish that result from a usable descriptor.

When a structure definition is hidden behind nested headers, inspect the installed headers or use `gcc -E` to see expanded source. GNU `info` manuals explain the richer behavior of GCC, Make, and GDB. The source recommends deeper references on C, Make, GDB, UNIX programming, and compiler pitfalls; these supplement experimentation rather than replace it.

Related foundation: [operating systems](../../operating-systems/README.md).

## What to take away

- Keep compilation, linking, loading, and execution distinct when diagnosing a failure.
- Enable warnings and debugger information during development; inspect failures instead of guessing.
- Model header dependencies as well as source dependencies in incremental builds.
- Read return-value and error contracts before using a system interface.

---

Previous: [Monitors](D-monitors.md) · Next: [Systems projects](G-systems-projects.md)
