# Residual Review Findings — feat-149-agent-friendly-site

Source: ce-code-review run `20260722-015752-0b68fc5b` (LFG pipeline, 2026-07-22), reviewing the agent-friendly-site branch against `staging` for plan `docs/plans/2026-07-22-001-feat-agent-friendly-site-plan.md`.

## Residual Review Findings

- **P3** — `public/llms.txt:7` — llms.txt omits the ?bar= capability this PR ships — filed as [#156](https://github.com/dancj/home-bartender/issues/156)

No failed or unsinkable findings. Validation dropped 2 findings as false positives (recipeUrl-extraction: premise wrong, dead helper; bar-wipe semantics: deliberate plan decision A3).
