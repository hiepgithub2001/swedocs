# Lab: Find & Fix the Vulnerabilities

> **Goal:** exploit three textbook [OWASP](../1-knowledge/security/secure-coding.md) bugs in a small
> Python script — **SQL injection, command injection, a hardcoded secret** — then fix each and prove
> the exploit no longer works.
>
> **Builds:** [Secure coding](../1-knowledge/security/secure-coding.md). Pure Python 3 (built-in
> `sqlite3`, `subprocess` — no install). *Run only against this local sandbox.*

## Setup
```bash
mkdir vuln-lab && cd vuln-lab
```

## Step 1 — SQL injection: see it dump the table
Create `vuln_sql.py`:
```python
import sqlite3
db = sqlite3.connect(":memory:")
db.executescript("CREATE TABLE users(name, secret);"
                 "INSERT INTO users VALUES ('alice','a-token'),('bob','b-token');")

def find_user(name):
    q = f"SELECT name FROM users WHERE name = '{name}'"   # ❌ input concatenated into SQL
    return db.execute(q).fetchall()

print("normal :", find_user("alice"))
print("ATTACK :", find_user("x' OR '1'='1"))             # leaks everyone
```
```bash
python3 vuln_sql.py
```
Expected — the attack input subverts the query and returns **all** rows:
```
normal : [('alice',)]
ATTACK : [('alice',), ('bob',)]
```
The string `x' OR '1'='1` turned the `WHERE` into always-true. **Data became code.**

### Fix — parameterize
Change `find_user` to let the driver separate data from query:
```python
def find_user(name):
    return db.execute("SELECT name FROM users WHERE name = ?", (name,)).fetchall()
```
Re-run: the attack now returns `[]` — the whole string is treated as a *name to match*, not SQL.

## Step 2 — Command injection: see it run arbitrary commands
Create `vuln_cmd.py`:
```python
import subprocess

def ping_unsafe(host):
    subprocess.run(f"echo pinging {host}", shell=True)   # ❌ shell=True + input = injection

ping_unsafe("example.com")
print("--- attack ---")
ping_unsafe("example.com; echo PWNED > hacked.txt")      # runs a SECOND command
```
```bash
python3 vuln_cmd.py && ls
```
Expected — the `;` lets the attacker chain a command; `hacked.txt` appears:
```
pinging example.com
--- attack ---
pinging example.com
hacked.txt        ← attacker wrote a file
```

### Fix — no shell, pass args as a list
```python
def ping_safe(host):
    subprocess.run(["echo", "pinging", host])    # arg list: host can never be parsed as a command
```
Re-run with the attack input: `; echo PWNED ...` is now just a literal argument to `echo`, no file
is created. (`rm hacked.txt` to clean up.)

## Step 3 — Hardcoded secret: find it like a bot would
Create `vuln_secret.py`:
```python
API_KEY = "sk_live_1234567890abcdef"      # ❌ secret in source — and in git history forever
def call_api(): return f"Authorizing with {API_KEY}"
```
Scan for it the way leaked-credential bots scan public repos:
```bash
grep -rnE "sk_live_|AKIA|password\s*=|secret\s*=" . --include=*.py
```
Expected — your secret is trivially discoverable:
```
./vuln_secret.py:1:API_KEY = "sk_live_1234567890abcdef"
```

### Fix — read from the environment, never commit it
```python
import os
API_KEY = os.environ["API_KEY"]           # injected at runtime; not in source or history
```
```bash
API_KEY=sk_test_local python3 -c "import vuln_secret; print(vuln_secret.call_api())"
```
And remember: a secret committed *once* lives in git history — the real fix also **rotates the key**.

## Step 4 — Add a guard test (catch regressions)
Lock in the SQL fix so it can't regress — create `test_security.py`:
```python
import unittest, vuln_sql
class TestNoSqli(unittest.TestCase):
    def test_injection_returns_nothing(self):
        self.assertEqual(vuln_sql.find_user("x' OR '1'='1"), [])   # fails if someone un-fixes it
if __name__ == "__main__": unittest.main()
```
```bash
python3 -m unittest test_security.py    # green = the fix holds
```

## Exercises
1. In `vuln_sql.py`, try a `UNION SELECT` attack to also leak the `secret` column — then confirm the
   parameterized version blocks it.
2. Why is an **allow-list** (`if host not in KNOWN_HOSTS: reject`) even stronger than escaping for
   Step 2?
3. Add `bob`'s order lookup with an ownership check (authorization) — the IDOR fix from the
   [OWASP case study](../2-case-studies/preventing-owasp-top-bugs.md).
4. Run `pip install pip-audit && pip-audit` (if network allows) to see dependency-CVE scanning.

## What you proved
- **Injection** (SQL & command) comes from mixing input with code — parameterized queries and arg
  lists keep data ≠ code.
- **Secrets in source** are found instantly — they belong in env/vaults, and a leak means rotate.
- A **regression test** turns a one-time fix into a permanent guarantee — security + [testing](../1-knowledge/testing/testing-fundamentals.md)
  together.

## References
- [Secure coding](../1-knowledge/security/secure-coding.md) · [Preventing OWASP top bugs](../2-case-studies/preventing-owasp-top-bugs.md) · [OWASP Top 10](https://owasp.org/www-project-top-ten/)
