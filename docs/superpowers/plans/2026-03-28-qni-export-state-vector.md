# qni export State Vector PNG Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `qni export --state-vector --png --output ...` so symbolic state vectors can be exported as themed PNG images.

**Architecture:** Keep symbolic math in the Python helper and add a LaTeX output mode there. Ruby will choose between circuit export and state-vector export, wrap the helper's LaTeX formula in a standalone document, and reuse the existing local PNG conversion pipeline.

**Tech Stack:** Ruby, Thor, Cucumber, RuboCop, Python, SymPy, `pdflatex`, `pdftocairo`

---

### Task 1: Add failing feature coverage

**Files:**
- Modify: `features/qni_export.feature`
- Modify: `features/step_definitions/cli_steps.rb`

- [ ] **Step 1: Add help and behavior scenarios**

Add scenarios for:
- help text mentioning `--state-vector`
- successful `--state-vector --png` export
- state-vector PNG differing from circuit PNG
- 3-qubit state-vector export failing with the symbolic support message

- [ ] **Step 2: Run focused cucumber and confirm failure**

Run: `bundle exec cucumber features/qni_export.feature features/qni_cli.feature`
Expected: FAIL because the state-vector export option and behavior do not exist yet.

### Task 2: Implement state-vector PNG export

**Files:**
- Modify: `lib/qni/cli.rb`
- Modify: `lib/qni/cli/export_help.rb`
- Modify: `lib/qni/cli/export_command.rb`
- Modify: `lib/qni/symbolic_state_renderer.rb`
- Modify: `lib/qni/export/png_exporter.rb`
- Create: `lib/qni/export/state_vector_latex.rb`
- Modify: `libexec/qni_symbolic_run.py`

- [ ] **Step 1: Add the CLI selector**

Add `--state-vector` to `qni export` and validate that the first version only supports `--png`.

- [ ] **Step 2: Add helper LaTeX output**

Teach the Python symbolic helper to render LaTeX formulas directly from SymPy expressions.

- [ ] **Step 3: Wrap the formula in a standalone LaTeX document**

Create a small exporter that applies the current light/dark theme to the symbolic formula.

- [ ] **Step 4: Reuse PNG conversion**

Render the state-vector LaTeX document to PNG using the existing exporter without circuit cell sizing.

- [ ] **Step 5: Re-run focused cucumber and confirm pass**

Run: `bundle exec cucumber features/qni_export.feature features/qni_cli.feature`
Expected: PASS

### Task 3: Verify the full affected surface

**Files:**
- Modify: touched files only if cleanup is needed

- [ ] **Step 1: Run focused RuboCop**

Run: `bundle exec rubocop lib/qni/cli.rb lib/qni/cli/export_help.rb lib/qni/cli/export_command.rb lib/qni/symbolic_state_renderer.rb lib/qni/export/png_exporter.rb lib/qni/export/state_vector_latex.rb features/step_definitions/cli_steps.rb`
Expected: no offenses

- [ ] **Step 2: Run focused cucumber including symbolic regressions**

Run: `bundle exec cucumber features/qni_export.feature features/qni_run.feature features/katas/basic_gates/basis_change.feature features/katas/basic_gates/bell_state_change_1.feature features/katas/basic_gates/bell_state_change_2.feature features/katas/basic_gates/bell_state_change_3.feature`
Expected: PASS

- [ ] **Step 3: Verify Python syntax**

Run: `python3 -m py_compile libexec/qni_symbolic_run.py`
Expected: exit 0
