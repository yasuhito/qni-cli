# Qni Export Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `qni export` so users can emit qcircuit LaTeX or a PNG rendered from that LaTeX.

**Architecture:** Add a small CLI command layer for argument validation and help text, then introduce a qcircuit-oriented exporter that reads the existing serialized circuit columns while honoring qni's one-step constraints. PNG export will shell out to `pdflatex` and `pdftocairo`, using temporary files under the hood.

**Tech Stack:** Ruby, Thor, Cucumber, qcircuit LaTeX, `pdflatex`, `pdftocairo`

---

### Task 1: Lock CLI behavior with Cucumber

**Files:**
- Create: `features/qni_export.feature`
- Modify: `features/qni_cli.feature`
- Modify: `features/step_definitions/cli_steps.rb`

- [ ] **Step 1: Write the failing feature scenarios**

Add scenarios for:
- `qni` command list including `export`
- `qni export --help`
- `qni export --latex-source`
- `qni export --png --output circuit.png`

- [ ] **Step 2: Add the missing test step for PNG verification**

Add a binary-file assertion step that checks for the PNG signature.

- [ ] **Step 3: Run the focused Cucumber features and confirm failure**

Run: `bundle exec cucumber features/qni_export.feature features/qni_cli.feature`

Expected: failure because `qni export` does not exist yet.

### Task 2: Implement the export command

**Files:**
- Create: `lib/qni/cli/export_help.rb`
- Create: `lib/qni/cli/export_command.rb`
- Create: `lib/qni/export/qcircuit_latex.rb`
- Create: `lib/qni/export/png_exporter.rb`
- Modify: `lib/qni/cli.rb`
- Modify: `lib/qni/cli/routing.rb`

- [ ] **Step 1: Add the CLI help wiring**

Expose `qni export` in the command list and in custom `--help` routing.

- [ ] **Step 2: Implement minimal argument validation**

Support:
- `qni export --latex-source`
- `qni export --latex-source --output PATH`
- `qni export --png --output PATH`

- [ ] **Step 3: Implement qcircuit LaTeX generation**

Render simple gates, controlled gates, and 2-qubit swaps from the existing column format.

- [ ] **Step 4: Implement PNG export**

Write temporary `.tex`, compile with `pdflatex`, convert with `pdftocairo`, and move the resulting PNG to `--output`.

### Task 3: Verify the finished slice

**Files:**
- Verify: `features/qni_export.feature`
- Verify: `features/qni_cli.feature`

- [ ] **Step 1: Re-run focused Cucumber coverage**

Run: `bundle exec cucumber features/qni_export.feature features/qni_cli.feature`

Expected: pass.

- [ ] **Step 2: Run targeted style checks on touched Ruby files**

Run: `bundle exec rubocop lib/qni/cli.rb lib/qni/cli/routing.rb lib/qni/cli/export_help.rb lib/qni/cli/export_command.rb lib/qni/export/qcircuit_latex.rb lib/qni/export/png_exporter.rb features/step_definitions/cli_steps.rb`

Expected: no offenses.
