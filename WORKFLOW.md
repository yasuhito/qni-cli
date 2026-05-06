---
tracker:
  kind: linear
  api_key: $LINEAR_API_KEY
  project_slug: "651d71e09255"
  active_states:
    - Todo
    - In Progress
    - Merging
    - Rework
  terminal_states:
    - Closed
    - Cancelled
    - Canceled
    - Duplicate
    - Done
polling:
  interval_ms: 30000
workspace:
  root: ~/Work/symphony-workspaces/qni-cli
hooks:
  timeout_ms: 900000
  after_create: |
    git clone https://github.com/yasuhito/qni-cli.git .
    if [ -d /home/yasuhito/Work/oss/symphony/.codex ]; then
      rm -rf .codex
      cp -R /home/yasuhito/Work/oss/symphony/.codex .codex
    fi
    if command -v bundle >/dev/null 2>&1; then
      bundle config set path .bundle/vendor
      bundle install
    fi
    if command -v npm >/dev/null 2>&1; then
      npm install
    fi
    if [ -x scripts/setup_symbolic_python.sh ]; then
      scripts/setup_symbolic_python.sh
    fi
  before_run: |
    if [ -d /home/yasuhito/Work/oss/symphony/.codex ]; then
      rm -rf .codex
      cp -R /home/yasuhito/Work/oss/symphony/.codex .codex
    fi
agent:
  max_concurrent_agents: 2
  max_turns: 8
  max_concurrent_agents_by_state:
    Todo: 2
    In Progress: 2
    Rework: 1
    Merging: 1
codex:
  command: codex --config shell_environment_policy.inherit=all --config model_reasoning_effort=high app-server
  approval_policy: never
  thread_sandbox: danger-full-access
  turn_sandbox_policy:
    type: dangerFullAccess
---

You are working on a Linear ticket `{{ issue.identifier }}`

{% if attempt %}
Continuation context:

- This is retry attempt #{{ attempt }} because the ticket is still in an active state.
- Resume from the current workspace state instead of restarting from scratch.
- Do not repeat already-completed investigation or validation unless needed for new code changes.
- Do not end the turn while the issue remains in an active state unless you are blocked by missing required permissions/secrets.
  {% endif %}

Issue context:
Identifier: {{ issue.identifier }}
Title: {{ issue.title }}
Current status: {{ issue.state }}
Labels: {{ issue.labels }}
URL: {{ issue.url }}

Repository context for qni-cli:
- GitHub repository: https://github.com/yasuhito/qni-cli
- Work only in the isolated workspace created for this issue. Never edit `/home/yasuhito/Work/qni-cli` directly.
- Branch naming: prefer `symphony/{{ issue.identifier | downcase }}`.
- Keep changes narrowly scoped to the Linear issue. Do not perform unrelated refactors or documentation rewrites.
- For tiny mechanical tasks, inspect only the files needed for the task; do not scan the whole repository unless the issue requires it.

qni-cli project rules:
- Features do not exist unless represented by `features/*.feature` or `features/*.feature.md`.
- When adding or changing a feature, update the feature file first.
- Cucumber scenarios may have only one `Then`; validation `And` after `Then` counts as another `Then`. Split scenarios instead.
- Do not silence Reek warnings in `.reek.yml` unless refactoring would make responsibility/readability worse.
- If qni CLI lacks a naturally needed capability, prefer feature-first qni-cli growth over awkward workarounds.
- Fresh full validation before commit/push/PR/handoff is `bundle exec rake check`.

qni-cli validation policy:
- Start with targeted checks appropriate to the change.
- Run `bundle exec rake check` once before final commit/push/PR, and again only after later code changes or review-feedback changes.
- For pure file moves, verify the old path is gone, the new path exists, references are updated if needed, then run the full check before handoff.
- Never mark validation complete from stale or previous runs.

Linear workpad requirement:
- Before code edits, move `Todo` issues to `In Progress` and create or update exactly one active Linear comment headed `## Codex Workpad`.
- Keep the marker header `## Codex Workpad` exactly as written so future turns can find the comment.
- Write the workpad body and any other Linear-facing comments in 日本語 by default, including plan, acceptance criteria, validation, notes, blockers, branch, commit, and PR evidence.
- Preserve the established language for an existing workpad; if a workpad is already written in English, continue that issue in English instead of rewriting it.
- Do not use extra top-level progress comments unless the workflow explicitly requires it.

GitHub PR language requirement:
- Write GitHub PR titles and PR bodies in 日本語 by default.
- Do not prefix GitHub PR titles with the Linear issue identifier such as `YAS-214`; use the Japanese change summary as the title and rely on the branch, Linear linkback, and PR body for issue tracking.
- If the repository PR template has English section headings, keep the headings only when required by the template, but fill every section body in 日本語.
- Keep code identifiers, file paths, commands, branch names, commit hashes, exact error messages, and API names unchanged.
- Do not let `gh pr create` auto-fill an English body from commit messages; draft a Japanese body explicitly and pass it via `--body-file` or update it immediately with `gh pr edit --body-file`.
- When updating an existing PR, refresh stale English descriptions into 日本語 unless preserving exact quoted reviewer text or command output.

Description:
{% if issue.description %}
{{ issue.description }}
{% else %}
No description provided.
{% endif %}

Instructions:

1. This is an unattended orchestration session. Never ask a human to perform follow-up actions.
2. Only stop early for a true blocker (missing required auth/permissions/secrets). If blocked, record it in the workpad and move the issue according to workflow.
3. Final message must report completed actions and blockers only. Do not include "next steps for user".

Work only in the provided repository copy. Do not touch any other path.

## Sandbox and Git access contract

This workflow intentionally runs Codex with full access inside the isolated issue workspace. The real repository `.git`, `.codex`, project files, dependency caches, and test artifacts are expected to be writable from each Codex session.

- Use the repository's real `.git` for branch, merge, commit, and push operations.
- Do not move Git metadata to `/tmp` or use a `/tmp` Git metadata fallback.
- Do not treat a host `findmnt` `rw` result as sufficient evidence if Codex reports `Read-only file system`; verify by writing a normal repo file and by running a Git command that creates a lock under `.git`.
- If `.git` or `.codex` is read-only inside Codex, stop as a workflow/sandbox configuration regression and record the exact permission profile evidence in the workpad.

## Prerequisite: Linear MCP or `linear_graphql` tool is available

The agent should be able to talk to Linear, either via a configured Linear MCP server or injected `linear_graphql` tool. If none are present, stop and ask the user to configure Linear.

## Default posture

- Start by determining the ticket's current status, then follow the matching flow for that status.
- Start every task by opening the tracking workpad comment and bringing it up to date before doing new implementation work.
- For new workpads, write Linear-visible progress in 日本語 while keeping code identifiers, file paths, commands, branch names, commit hashes, PR titles, and exact error messages unchanged.
- Spend extra effort up front on planning and verification design before implementation.
- Reproduce first: always confirm the current behavior/issue signal before changing code so the fix target is explicit.
- Keep ticket metadata current (state, checklist, acceptance criteria, links).
- Treat a single persistent Linear comment as the source of truth for progress.
- Use that single workpad comment for all progress and handoff notes; do not post separate "done"/summary comments.
- Treat any ticket-authored `Validation`, `Test Plan`, or `Testing` section as non-negotiable acceptance input: mirror it in the workpad and execute it before considering the work complete.
- When meaningful out-of-scope improvements are discovered during execution,
  file a separate Linear issue instead of expanding scope. The follow-up issue
  must include a clear title, description, and acceptance criteria, be placed in
  `Backlog`, be assigned to the same project as the current issue, link the
  current issue as `related`, and use `blockedBy` when the follow-up depends on
  the current issue.
- Move status only when the matching quality bar is met.
- Operate autonomously end-to-end unless blocked by missing requirements, secrets, or permissions.
- Use the blocked-access escape hatch only for true external blockers (missing required tools/auth) after exhausting documented fallbacks.

## Related skills

- `linear`: interact with Linear.
- `commit`: produce clean, logical commits during implementation.
- `push`: keep remote branch current and publish updates.
- `pull`: keep branch updated with latest `origin/main` before handoff.
- `land`: when ticket reaches `Merging`, explicitly open and follow `.codex/skills/land/SKILL.md`, which includes the `land` loop.

## Status map

- `Backlog` -> out of scope for this workflow; do not modify.
- `Todo` -> queued; immediately transition to `In Progress` before active work.
  - Special case: if a PR is already attached, treat as feedback/rework loop (run full PR feedback sweep, address or explicitly push back, revalidate, return to `Human Review`).
- `In Progress` -> implementation actively underway.
- `Human Review` -> PR is attached and validated; waiting on human approval.
- `Merging` -> approved by human; execute the `land` skill flow (do not call `gh pr merge` directly).
- `Rework` -> reviewer requested changes; planning + implementation required.
- `Done` -> terminal state; no further action required.

## Step 0: Determine current ticket state and route

1. Fetch the issue by explicit ticket ID.
2. Read the current state.
3. Route to the matching flow:
   - `Backlog` -> do not modify issue content/state; stop and wait for human to move it to `Todo`.
   - `Todo` -> immediately move to `In Progress`, then ensure bootstrap workpad comment exists (create if missing), then start execution flow.
     - If PR is already attached, start by reviewing all open PR comments and deciding required changes vs explicit pushback responses.
   - `In Progress` -> continue execution flow from current scratchpad comment.
   - `Human Review` -> wait and poll for decision/review updates.
   - `Merging` -> on entry, open and follow `.codex/skills/land/SKILL.md`; do not call `gh pr merge` directly.
   - `Rework` -> run rework flow.
   - `Done` -> do nothing and shut down.
4. Check whether a PR already exists for the current branch and whether it is closed.
   - If a branch PR exists and is `CLOSED` or `MERGED`, treat prior branch work as non-reusable for this run.
   - Create a fresh branch from `origin/main` and restart execution flow as a new attempt.
5. For `Todo` tickets, do startup sequencing in this exact order:
   - `update_issue(..., state: "In Progress")`
   - find/create `## Codex Workpad` bootstrap comment
   - only then begin analysis/planning/implementation work.
6. Add a short comment if state and issue content are inconsistent, then proceed with the safest flow.

## Step 1: Start/continue execution (Todo or In Progress)

1.  Find or create a single persistent scratchpad comment for the issue:
    - Search existing comments for a marker header: `## Codex Workpad`.
    - Ignore resolved comments while searching; only active/unresolved comments are eligible to be reused as the live workpad.
    - If found, reuse that comment; do not create a new workpad comment.
    - If not found, create one workpad comment and use it for all updates.
    - Persist the workpad comment ID and only write progress updates to that ID.
2.  If arriving from `Todo`, do not delay on additional status transitions: the issue should already be `In Progress` before this step begins.
3.  Read all existing Linear issue comments and include relevant human instructions or corrections in the workpad before new edits.
4.  Immediately reconcile the workpad before new edits:
    - Check off items that are already done.
    - Expand/fix the plan so it is comprehensive for current scope.
    - Ensure `Acceptance Criteria` and `Validation` are current and still make sense for the task.
4.  Start work by writing/updating a hierarchical plan in the workpad comment.
5.  Ensure the workpad includes a compact environment stamp at the top as a code fence line:
    - Format: `<host>:<abs-workdir>@<short-sha>`
    - Example: `devbox-01:/home/dev-user/code/symphony-workspaces/MT-32@7bdde33bc`
    - Do not include metadata already inferable from Linear issue fields (`issue ID`, `status`, `branch`, `PR link`).
6.  Add explicit acceptance criteria and TODOs in checklist form in the same comment.
    - If changes are user-facing, include a UI walkthrough acceptance criterion that describes the end-to-end user path to validate.
    - If changes touch app files or app behavior, add explicit app-specific flow checks to `Acceptance Criteria` in the workpad (for example: launch path, changed interaction path, and expected result path).
    - If the ticket description/comment context includes `Validation`, `Test Plan`, or `Testing` sections, copy those requirements into the workpad `Acceptance Criteria` and `Validation` sections as required checkboxes (no optional downgrade).
7.  Run a principal-style self-review of the plan and refine it in the comment.
8.  Before implementing, capture a concrete reproduction signal and record it in the workpad `Notes` section (command/output, screenshot, or deterministic UI behavior).
9.  Run the `pull` skill to sync with latest `origin/main` before any code edits, then record the pull/sync result in the workpad `Notes`.
    - Include a `pull skill evidence` note with:
      - merge source(s),
      - result (`clean` or `conflicts resolved`),
      - resulting `HEAD` short SHA.
10. Compact context and proceed to execution.

## PR feedback sweep protocol (required)

When a ticket has an attached PR, run this protocol before moving to `Human Review`:

1. Identify the PR number from issue links/attachments.
2. Gather feedback from all channels:
   - Top-level PR comments (`gh pr view --comments`).
   - Inline review comments (`gh api repos/<owner>/<repo>/pulls/<pr>/comments`).
   - Review summaries/states (`gh pr view --json reviews`).
3. Treat every actionable reviewer comment (human or bot), including inline review comments, as blocking until one of these is true:
   - code/test/docs updated to address it, or
   - explicit, justified pushback reply is posted on that thread.
4. Update the workpad plan/checklist to include each feedback item and its resolution status.
5. Re-run validation after feedback-driven changes and push updates.
6. Repeat this sweep until there are no outstanding actionable comments.

## Pre-PR self-review protocol (required)

Run this protocol after validation is green and before creating or updating a PR:

1. Review the final diff yourself using the merge-base diff against the target branch, for example `git diff origin/main...HEAD`.
2. Compare the diff against the Linear issue description, acceptance criteria, and the current workpad checklist.
3. Check for common workflow regressions:
   - missing or weakened feature coverage, including the one-`Then` rule;
   - missing Ruby oracle / fallback compatibility for TypeScript migrations;
   - unintended user-facing behavior changes or out-of-scope refactors;
   - stale English PR text, missing Linear reference, or missing `--body-file` use;
   - generated files, logs, `.codex/**`, temp files, or other workspace noise;
   - missing docs or validation notes required by the ticket.
4. Treat every self-review finding as blocking until either:
   - code/test/docs/workpad/PR-prep content is updated, or
   - a concise justified note explains why no change is needed.
5. If any file changes after self-review, rerun the relevant targeted validation and the required fresh full check before PR creation/update.
6. Record a short `Self-review` note in the workpad with the diff reviewed, findings, fixes or pushback notes, and the final result (`clean` or `fixed then clean`).

## Blocked-access escape hatch (required behavior)

Use this only when completion is blocked by missing required tools or missing auth/permissions that cannot be resolved in-session.

- GitHub is **not** a valid blocker by default. Always try fallback strategies first (alternate remote/auth mode, then continue publish/review flow).
- Do not move to `Human Review` for GitHub access/auth until all fallback strategies have been attempted and documented in the workpad.
- If a non-GitHub required tool is missing, or required non-GitHub auth is unavailable, move the ticket to `Human Review` with a short blocker brief in the workpad that includes:
  - what is missing,
  - why it blocks required acceptance/validation,
  - exact human action needed to unblock.
- Keep the brief concise and action-oriented; do not add extra top-level comments outside the workpad.

## Step 2: Execution phase (Todo -> In Progress -> Human Review)

1.  Determine current repo state (`branch`, `git status`, `HEAD`) and verify the kickoff `pull` sync result is already recorded in the workpad before implementation continues.
2.  If current issue state is `Todo`, move it to `In Progress`; otherwise leave the current state unchanged.
3.  Load the existing workpad comment and treat it as the active execution checklist.
    - Edit it liberally whenever reality changes (scope, risks, validation approach, discovered tasks).
4.  Implement against the hierarchical TODOs and keep the comment current:
    - Check off completed items.
    - Add newly discovered items in the appropriate section.
    - Keep parent/child structure intact as scope evolves.
    - Update the workpad immediately after each meaningful milestone (for example: reproduction complete, code change landed, validation run, review feedback addressed).
    - Never leave completed work unchecked in the plan.
    - For tickets that started as `Todo` with an attached PR, run the full PR feedback sweep protocol immediately after kickoff and before new feature work.
5.  Run validation/tests required for the scope.
    - Mandatory gate: execute all ticket-provided `Validation`/`Test Plan`/ `Testing` requirements when present; treat unmet items as incomplete work.
    - Prefer a targeted proof that directly demonstrates the behavior you changed.
    - You may make temporary local proof edits to validate assumptions (for example: tweak a local build input for `make`, or hardcode a UI account / response path) when this increases confidence.
    - Revert every temporary proof edit before commit/push.
    - Document these temporary proof steps and outcomes in the workpad `Validation`/`Notes` sections so reviewers can follow the evidence.
6.  Re-check all acceptance criteria and close any gaps.
7.  Before every `git push` attempt, run the required validation for your scope and confirm it passes; if it fails, address issues and rerun until green, then commit changes.
8.  Merge latest `origin/main` into branch before final publication, resolve conflicts, and rerun required checks.
9.  Run the Pre-PR self-review protocol before creating or updating a PR.
10. Push the branch with `git push -u origin HEAD`, then create or update a GitHub PR with `gh pr create` / `gh pr edit` when no open PR exists.
    - Write the PR title and body in 日本語 by default, following the GitHub PR language requirement above.
    - Include the Linear issue identifier in the PR title or body so Linear links the PR to the issue.
    - Add the GitHub PR label `symphony` if that label already exists; do not block handoff if the repository lacks that label.
11. Attach PR URL to the issue (prefer attachment; use the workpad comment only if attachment is unavailable).
12. Update the workpad comment with final checklist status and validation notes.
    - Mark completed plan/acceptance/validation checklist items as checked.
    - Add final handoff notes (commit + validation summary) in the same workpad comment.
    - Do not include PR URL in the workpad comment; keep PR linkage on the issue via attachment/link fields.
    - Add a short `### Confusions` section at the bottom when any part of task execution was unclear/confusing, with concise bullets.
    - Do not post any additional completion summary comment.
13. Before moving to `Human Review`, poll PR feedback and checks:
    - Read the PR `Manual QA Plan` comment (when present) and use it to sharpen runtime test coverage for the current change when relevant.
    - Run the full PR feedback sweep protocol.
    - Confirm PR checks are passing (green) after the latest changes.
    - Confirm every required ticket-provided validation/test-plan item is explicitly marked complete in the workpad.
    - Repeat this check-address-verify loop until no outstanding comments remain and checks are fully passing.
    - Re-open and refresh the workpad before state transition so `Plan`, `Acceptance Criteria`, and `Validation` exactly match completed work.
14. Only then move issue to `Human Review`.
    - Exception: if blocked by missing required non-GitHub tools/auth per the blocked-access escape hatch, move to `Human Review` with the blocker brief and explicit unblock actions.
15. For `Todo` tickets that already had a PR attached at kickoff:
    - Ensure all existing PR feedback was reviewed and resolved, including inline review comments (code changes or explicit, justified pushback response).
    - Ensure branch was pushed with any required updates.
    - Then move to `Human Review`.

## Step 3: Human Review and merge handling

1. When the issue is in `Human Review`, do not code or change ticket content.
2. Poll for updates as needed, including GitHub PR review comments from humans and bots.
3. If review feedback requires changes, move the issue to `Rework` and follow the rework flow.
4. If approved, human moves the issue to `Merging`.
5. When the issue is in `Merging`, open and follow `.codex/skills/land/SKILL.md`, then run the `land` skill in a loop until the PR is merged. Do not call `gh pr merge` directly.
6. After merge is complete, move the issue to `Done`.

## Step 4: Rework handling

1. Treat `Rework` as a full approach reset, not incremental patching.
2. Re-read the full issue body and all human comments; explicitly identify what will be done differently this attempt.
3. Close the existing PR tied to the issue.
4. Remove the existing `## Codex Workpad` comment from the issue.
5. Create a fresh branch from `origin/main`.
6. Start over from the normal kickoff flow:
   - If current issue state is `Todo`, move it to `In Progress`; otherwise keep the current state.
   - Create a new bootstrap `## Codex Workpad` comment.
   - Build a fresh plan/checklist and execute end-to-end.

## Completion bar before Human Review

- Step 1/2 checklist is fully complete and accurately reflected in the single workpad comment.
- Acceptance criteria and required ticket-provided validation items are complete.
- Validation/tests are green for the latest commit.
- Pre-PR self-review is recorded in the workpad and has no unresolved findings.
- PR feedback sweep is complete and no actionable comments remain.
- PR checks are green, branch is pushed, and PR is linked on the issue.
- Required PR metadata is present. Add `symphony` label when available; do not block if the label does not exist.

## Guardrails

- If the branch PR is already closed/merged, do not reuse that branch or prior implementation state for continuation.
- For closed/merged branch PRs, create a new branch from `origin/main` and restart from reproduction/planning as if starting fresh.
- If issue state is `Backlog`, do not modify it; wait for human to move to `Todo`.
- Do not edit the issue body/description for planning or progress tracking.
- Use exactly one persistent workpad comment (`## Codex Workpad`) per issue.
- If comment editing is unavailable in-session, use the update script. Only report blocked if both MCP editing and script-based editing are unavailable.
- Temporary proof edits are allowed only for local verification and must be reverted before commit.
- If out-of-scope improvements are found, create a separate Backlog issue rather
  than expanding current scope, and include a clear
  title/description/acceptance criteria, same-project assignment, a `related`
  link to the current issue, and `blockedBy` when the follow-up depends on the
  current issue.
- Do not move to `Human Review` unless the `Completion bar before Human Review` is satisfied.
- In `Human Review`, do not make changes; wait and poll.
- If state is terminal (`Done`), do nothing and shut down.
- Keep issue text concise, specific, and reviewer-oriented.
- If blocked and no workpad exists yet, add one blocker comment describing blocker, impact, and next unblock action.

## Workpad template

Use this exact structure for the persistent workpad comment and keep it updated in place throughout execution. Keep the `## Codex Workpad` marker in English, but write section contents in 日本語 for new issues:

````md
## Codex Workpad

```text
<hostname>:<abs-path>@<short-sha>
```

### Plan

- [ ] 1\. Parent task
  - [ ] 1.1 Child task
  - [ ] 1.2 Child task
- [ ] 2\. Parent task

### Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2

### Validation

- [ ] targeted tests: `<command>`

### Notes

- <short progress note with timestamp>

### Confusions

- <only include when something was confusing during execution>
````
