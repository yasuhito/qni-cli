# qni View Box Drawing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `qni view` with a Qiskit-style box-drawing renderer and update features to validate the rendered circuit directly.

**Architecture:** Keep qni's existing step-based circuit model and introduce a dedicated text renderer that emits deterministic `top/mid/bot` cells per wire per step. Infer simple wire connections from each step while keeping renderer boundaries clear for a future ASCII parser.

**Tech Stack:** Ruby, Cucumber, Thor CLI

---

### Task 1: Lock the expected output in features

**Files:**
- Modify: `/home/yasuhito/Work/qni-cli/features/qni_view.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/add_h_gate.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/add/add_x_gate.feature.md`
- Modify: `/home/yasuhito/Work/qni-cli/features/add_y_gate.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/add/add_z_gate.feature.md`
- Modify: `/home/yasuhito/Work/qni-cli/features/add_s_gate.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/add_s_dagger_gate.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/add/add_t_gate.feature.md`
- Modify: `/home/yasuhito/Work/qni-cli/features/add_t_dagger_gate.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/add_sqrt_x_gate.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/add/add_phase_gate.feature.md`
- Modify: `/home/yasuhito/Work/qni-cli/features/add_rx_gate.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/add_ry_gate.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/add_rz_gate.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/add_swap_gate.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/add_cnot.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb`

- [ ] Write failing feature expectations for Qiskit-style box drawing.
- [ ] Run targeted cucumber for view/add features and confirm failure.

### Task 2: Implement the renderer

**Files:**
- Modify: `/home/yasuhito/Work/qni-cli/lib/qni/circuit.rb`
- Modify: `/home/yasuhito/Work/qni-cli/lib/qni/cli.rb`
- Create: `/home/yasuhito/Work/qni-cli/lib/qni/view/text_renderer.rb`
- Create: `/home/yasuhito/Work/qni-cli/lib/qni/view/cell.rb`

- [ ] Add a dedicated renderer with fixed-width top/mid/bot cells.
- [ ] Support empty wire, boxed single gates, control links, swap links, and parallel independent gates.
- [ ] Keep the public `qni view` entry simple and route through the renderer.

### Task 3: Verify and refactor

**Files:**
- Modify as needed based on failing tests

- [ ] Run targeted cucumber until green.
- [ ] Run `bundle exec rake check`.
- [ ] Refactor naming and structure only if tests stay green.
