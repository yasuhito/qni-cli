# qni bloch PNG/GIF Design

**Problem:** Bloch-sphere explanations are useful for understanding 1-qubit states and gates, but today they have to be drawn manually outside `qni`. That makes repeated experiments slow, especially when animation would communicate the motion much better than a static formula.

**Goal:** Add a dedicated `qni bloch` command that renders the current 1-qubit state as a Bloch-sphere PNG or GIF.

## Decisions

- Add a new `qni bloch` command instead of extending `qni export`.
- Use Python + `matplotlib` for rendering.
- Do not adopt QuTiP or Qiskit in v1.
- Support only 1-qubit circuits in v1.
- Support only file output in v1: `--png` or `--gif`.
- Reuse the existing `--dark` / `--light` theme direction so rendered images fit the rest of `qni`.
- Use the numeric state vector, not symbolic output.
- Require all variables to be resolved before rendering.
- Fix the image size to a single square default in v1 instead of adding size controls immediately.

## Why Matplotlib

- `qni` already computes the state numerically, so the renderer only needs Bloch-vector coordinates and image output.
- `matplotlib` can write GIFs directly through Pillow-based writers, which is important for gate-motion explanations.
- The dependency surface is smaller than QuTiP and better aligned with `qni`'s current architecture.
- We keep full control over labels, colors, camera angle, and trajectory styling instead of adapting a larger quantum-visualization stack.

QuTiP remains a good fallback if we later want a faster path to richer quantum-visualization helpers, but it is not necessary for the first version.

## Command Shape

```text
qni bloch --png --output bloch.png
qni bloch --gif --output bloch.gif
qni bloch --png --light --output bloch.png
qni bloch --gif --dark --output ry.gif
```

Validation rules:

- exactly one of `--png` or `--gif` is required
- `--output=PATH` is required
- at most one of `--dark` or `--light`
- the loaded circuit must have exactly 1 qubit
- all variables used by the circuit must resolve to concrete values

## Rendering Model

- Add a Python helper dedicated to Bloch rendering, separate from the existing symbolic helper.
- Ruby computes the concrete state evolution and passes sampled Bloch vectors plus theme/output settings to the helper.
- The helper renders:
  - Bloch sphere wireframe
  - x / y / z axes
  - current state vector
  - optional trajectory path
  - compact labels for `|0>`, `|1>`, `|+>`, `|->`

Default appearance in v1:

- fixed square canvas, 512x512
- transparent background
- dark theme uses light lines/text
- light theme uses dark lines/text

## GIF Semantics

The GIF should show state evolution, not a camera spin.

Sampling policy in v1:

- include the initial state
- include the state after each circuit step
- for `P`, `Rx`, `Ry`, `Rz`, add evenly spaced intermediate samples inside the step so the motion looks smooth
- for fixed gates such as `H`, `X`, `Y`, `Z`, `S`, `T`, `√X`, use step-boundary frames only in v1

This keeps `Ry(2θ)` and similar rotations visually useful immediately, without forcing a full general-unitary interpolation feature into the first release.

## Ruby / Python Split

Ruby side responsibilities:

- CLI argument validation and help text
- load circuit and variables
- compute concrete state evolution for 1 qubit
- convert each sampled state into Bloch coordinates
- call the Python helper with a simple JSON payload

Python side responsibilities:

- read sampled coordinates and metadata
- render PNG or GIF with `matplotlib`
- return failures in a form Ruby can surface as CLI errors

## Non-Goals

- 2-qubit or multi-qubit Bloch-like visualizations
- HTML or interactive browser output
- symbolic Bloch-sphere rendering
- user-configurable camera angles, sizes, or label presets
- smooth interpolation for every possible fixed gate

## Validation

- feature coverage for `qni bloch --help`
- feature coverage for `--png` success on a 1-qubit circuit
- feature coverage for `--gif` success on a 1-qubit rotation circuit
- feature coverage that unresolved variables fail cleanly
- feature coverage that 2-qubit circuits fail with a clear message
- focused Ruby and Python lint / syntax verification
