# qni export PNG Sizing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `qni export --png` produce predictably sized images by mapping each logical circuit cell to `64x64` pixels.

**Architecture:** Compute PNG target dimensions from serialized circuit dimensions in the CLI/export layer, then let `pdftocairo` render the themed PDF into an explicit pixel box. This keeps LaTeX generation unchanged while making raster output consistent.

**Tech Stack:** Ruby, Thor, Cucumber, RuboCop, qcircuit LaTeX, `pdflatex`, `pdftocairo`

---

### Task 1: Add failing size expectations

**Files:**
- Modify: `features/qni_export.feature`
- Modify: `features/step_definitions/cli_steps.rb`

- [ ] **Step 1: Add PNG dimension assertions**

Add step coverage for exact image dimensions and use it in new scenarios for:
- `1 qubit x 1 step => 64x64`
- `2 qubits x 2 steps => 128x128`

- [ ] **Step 2: Run focused cucumber and confirm failure**

Run: `bundle exec cucumber features/qni_export.feature features/qni_cli.feature`
Expected: FAIL because PNG export still uses the natural qcircuit output size.

### Task 2: Implement fixed logical cell sizing

**Files:**
- Modify: `lib/qni/cli/export_command.rb`
- Modify: `lib/qni/export/png_exporter.rb`

- [ ] **Step 1: Pass circuit dimensions into the PNG exporter**

Load the circuit once, then derive:
- `step_count = circuit.to_h["cols"].length`
- `qubit_count = circuit.to_h["qubits"]`

- [ ] **Step 2: Scale PDF->PNG conversion to target dimensions**

Update `PngExporter` to:
- accept `step_count` and `qubit_count`
- compute width and height with a `64px` cell constant
- pass those values to `pdftocairo`

- [ ] **Step 3: Re-run focused cucumber and confirm pass**

Run: `bundle exec cucumber features/qni_export.feature features/qni_cli.feature`
Expected: PASS

### Task 3: Verify and clean up

**Files:**
- Modify: touched files only if lint cleanup is needed

- [ ] **Step 1: Run focused RuboCop**

Run: `bundle exec rubocop lib/qni/cli/export_command.rb lib/qni/export/png_exporter.rb features/step_definitions/cli_steps.rb`
Expected: no offenses

- [ ] **Step 2: Re-run focused cucumber**

Run: `bundle exec cucumber features/qni_export.feature features/qni_cli.feature`
Expected: PASS
