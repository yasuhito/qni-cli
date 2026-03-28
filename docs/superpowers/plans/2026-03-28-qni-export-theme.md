# qni export Theme Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add default-dark `--dark` and `--light` theme options to `qni export` so LaTeX and PNG outputs render readable circuit lines in dark or light environments.

**Architecture:** Keep theme selection in the CLI layer, pass a normalized theme symbol into the qcircuit LaTeX generator, and let PNG export simply render the already-themed LaTeX. This keeps `--latex-source` and `--png` behavior aligned and avoids post-processing image colors.

**Tech Stack:** Ruby, Thor, Cucumber, RuboCop, qcircuit LaTeX, `pdflatex`, `pdftocairo`

---

### Task 1: Add failing feature coverage for export themes

**Files:**
- Modify: `features/qni_export.feature`
- Test: `features/qni_export.feature`

- [ ] **Step 1: Write the failing feature scenarios**

Add scenarios for:
- `qni export --help` showing `--dark` and `--light`
- default dark LaTeX output containing white color selection
- explicit light LaTeX output containing black color selection
- `--dark --light` conflict error
- PNG export still succeeding with an explicit theme

- [ ] **Step 2: Run the focused feature command to verify it fails**

Run: `bundle exec cucumber features/qni_export.feature features/qni_cli.feature`
Expected: FAIL because the CLI does not yet accept or document the theme options.

### Task 2: Implement theme-aware export behavior

**Files:**
- Modify: `lib/qni/cli.rb`
- Modify: `lib/qni/cli/export_help.rb`
- Modify: `lib/qni/cli/export_command.rb`
- Modify: `lib/qni/export/qcircuit_latex.rb`

- [ ] **Step 1: Add the CLI options**

Add `method_option :dark` and `method_option :light` to `qni export`, keeping dark as the default when neither flag is passed.

- [ ] **Step 2: Normalize and validate the theme**

Teach `ExportCommand` to:
- reject simultaneous `--dark` and `--light`
- return `:dark` by default
- pass the normalized theme into the LaTeX generator

- [ ] **Step 3: Theme the generated LaTeX**

Update `QCircuitLatex` to accept `theme:` and emit:
- `\usepackage{xcolor}`
- `\color{white}` for dark mode
- `\color{black}` for light mode

- [ ] **Step 4: Keep PNG export behavior aligned**

Make sure `--png` renders the already-themed LaTeX with no extra color post-processing.

- [ ] **Step 5: Run the focused feature command to verify it passes**

Run: `bundle exec cucumber features/qni_export.feature features/qni_cli.feature`
Expected: PASS

### Task 3: Clean up and verify

**Files:**
- Modify: touched files only if needed for lint cleanup

- [ ] **Step 1: Run focused RuboCop**

Run: `bundle exec rubocop lib/qni/cli.rb lib/qni/cli/export_help.rb lib/qni/cli/export_command.rb lib/qni/export/qcircuit_latex.rb`
Expected: no offenses

- [ ] **Step 2: Re-run focused cucumber**

Run: `bundle exec cucumber features/qni_export.feature features/qni_cli.feature`
Expected: PASS
