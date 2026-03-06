---
name: verify
description: "Discipline skill — verification before completion. Use when about to claim work is complete, fixed, or passing, before committing or creating PRs."
user-invocable: true
---

# Verification Before Completion

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

## Usage

`/verify`

Invoke this skill before claiming any work is done, before committing, and before creating PRs.

## When to use

**ALWAYS before:**

- Any success or completion claim
- Committing, pushing, or creating PRs
- Moving to the next task
- Expressing satisfaction about work state

## The Iron Law

```text
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this step, you cannot claim it passes.

## The Gate Function

```text
BEFORE claiming any status:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

## What Each Claim Requires

| Claim            | Requires                        | Not Sufficient                 |
| ---------------- | ------------------------------- | ------------------------------ |
| Tests pass       | Test command output: 0 failures | Previous run, "should pass"    |
| Linter clean     | Linter output: 0 errors         | Partial check, extrapolation   |
| Build succeeds   | Build command: exit 0           | Linter passing, logs look good |
| Bug fixed        | Test original symptom: passes   | Code changed, assumed fixed    |
| Regression test  | Red-green cycle verified        | Test passes once               |
| Requirements met | Line-by-line checklist          | Tests passing                  |

## Red Flags - STOP

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!")
- About to commit/push/PR without verification
- Relying on partial verification
- Thinking "just this once"
- ANY wording implying success without having run verification

## Common Rationalizations

| Excuse                       | Reality                        |
| ---------------------------- | ------------------------------ |
| "Should work now"            | RUN the verification           |
| "I'm confident"              | Confidence is not evidence     |
| "Just this once"             | No exceptions                  |
| "Linter passed"              | Linter is not compiler         |
| "Partial check is enough"    | Partial proves nothing         |

## Verification Patterns

**Tests:**

```text
OK:  [Run test command] [See: 34/34 pass] "All tests pass"
BAD: "Should pass now" / "Looks correct"
```

**Build:**

```text
OK:  [Run build] [See: exit 0] "Build passes"
BAD: "Linter passed" (linter doesn't check compilation)
```

**Requirements:**

```text
OK:  Re-read plan -> Create checklist -> Verify each -> Report gaps or completion
BAD: "Tests pass, phase complete"
```

## The Bottom Line

Run the command. Read the output. THEN claim the result.

No shortcuts. Non-negotiable.

## Related Skills

- `/tdd` — TDD ensures tests exist before claiming code works
- `/debug` — systematic debugging when verification reveals failures
