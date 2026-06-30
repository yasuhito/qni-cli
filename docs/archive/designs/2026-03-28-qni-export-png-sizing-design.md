# qni export PNG Sizing Design

**Problem:** `qni export --png` currently relies on the natural qcircuit PDF size, so very small circuits can render larger than expected in terminal image viewers.

**Goal:** Make PNG size scale predictably with circuit size by treating each logical circuit cell as a fixed `64x64` pixel area.

## Decisions

- Keep the CLI interface unchanged.
- Apply the sizing rule only to PNG export.
- Define one logical cell as one `(step, qubit)` slot in `circuit.json`.
- Set PNG width to `step_count * 64`.
- Set PNG height to `qubit_count * 64`.
- Preserve transparent backgrounds and theme colors.

## Rendering Approach

- Continue generating themed qcircuit LaTeX and compiling it to PDF.
- When converting PDF to PNG, pass explicit target width and height to `pdftocairo`.
- Use the circuit's serialized `cols` length and `qubits` count to compute the target dimensions.

## Validation

- Add feature coverage for `1x1 -> 64x64` PNG output.
- Add feature coverage showing a larger circuit grows to `128x128`.
- Re-run focused cucumber and RuboCop on touched files.
