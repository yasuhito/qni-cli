# qni-cli

`qni-cli` is a TypeScript CLI for editing, viewing, simulating, and exporting quantum circuits stored in `./circuit.json`.

## What It Can Do

- Add gates with `qni add`
- Read a gate at a specific step and qubit with `qni gate`
- Remove a gate operation with `qni rm`
- Render the circuit as ASCII art with `qni view`
- Inspect the state vector with `qni run`
- Show small circuits as ket expressions with `qni run --symbolic`
- Compute Pauli-string expectation values with `qni expect`
- Export circuit diagrams as PNG with `qni export --png`
- Export symbolic state vectors as PNG with `qni export --state-vector --png`
- Export the final state as circle-notation PNG with `qni export --circle-notation --png`
- Render a 1-qubit state on the Bloch sphere with `qni bloch --png`, `--apng`, or `--inline`

## Setup

### 1. Install JavaScript dependencies

Use Node.js 22 or another Node.js version supported by `@cucumber/cucumber`.

```bash
npm install
```

### 2. Build the TypeScript CLI

```bash
npm run build
```

### 3. Set up the Python runtime for symbolic and image features

Run this before using `qni run --symbolic`, `qni bloch`, or `qni export --circle-notation --png`.

```bash
scripts/setup_symbolic_python.sh
```

### 4. Install external tools for circuit PNG export

`qni export --png` and `qni export --state-vector --png` require:

- `pdflatex`
- `pdftocairo`

## Quick Start

Inside this repository, use the checked-out implementation via `node dist/bin/qni.js` after `npm run build`.

```bash
node dist/bin/qni.js add H --qubit 0 --step 0
node dist/bin/qni.js gate --qubit 0 --step 0
node dist/bin/qni.js add X --control 0 --qubit 1 --step 1
node dist/bin/qni.js rm --qubit 1 --step 1
node dist/bin/qni.js view
node dist/bin/qni.js run --symbolic --basis bell
```

`qni` always reads and writes `./circuit.json` in the current directory. `qni add` creates the smallest circuit that can hold the requested gate when the file does not exist.

## Common Commands

### Build a circuit

```bash
node dist/bin/qni.js add H --qubit 0 --step 0
node dist/bin/qni.js add X --control 0 --qubit 1 --step 1
node dist/bin/qni.js add Rx --angle π/2 --qubit 0 --step 2
node dist/bin/qni.js add SWAP --qubit 0,1 --step 3
```

- `step` and `qubit` are 0-based
- Supported gates are `H`, `X`, `Y`, `Z`, `S`, `S†`, `T`, `T†`, `√X`, `P`, `Rx`, `Ry`, `Rz`, and `SWAP`

### Read one gate

```bash
node dist/bin/qni.js gate --qubit 0 --step 0
```

`qni gate` prints the serialized `circuit.json` cell value, such as `H`.

### Remove one gate operation

```bash
node dist/bin/qni.js rm --qubit 0 --step 0
```

`qni rm` removes the operation at the specified slot. For controlled gates, selecting either a control or target removes the whole controlled operation. For `SWAP`, selecting either `Swap` slot removes both `Swap` cells.

### View the circuit

```bash
node dist/bin/qni.js view
```

### Manage the initial state

```bash
node dist/bin/qni.js state set "alpha|0> + beta|1>"
node dist/bin/qni.js state show
node dist/bin/qni.js state clear
```

### Inspect the state vector and expectation values

```bash
node dist/bin/qni.js run
node dist/bin/qni.js run --symbolic
node dist/bin/qni.js run --symbolic --basis x
node dist/bin/qni.js expect ZZ XX
```

### Run benchmark submissions

`qni benchmark run` evaluates `.qni` submissions against benchmark task files. See `docs/benchmark.md` for the MVP smoke-set prompt and examples.

```bash
node dist/bin/qni.js benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni
```

## Export Images

If ASCII output is not enough, use `export` or `bloch` to generate images.

### Export the circuit diagram as PNG

```bash
node dist/bin/qni.js export --png --light --output circuit.png
```

Add a caption for notes, slides, or documentation. Use `--no-transparent` when the image should keep a white background in dark note themes:

```bash
node dist/bin/qni.js export --png --light --no-transparent \
  --caption "CNOT before cut" \
  --caption-position bottom \
  --output circuit.png
```

### Export the symbolic state vector as PNG

```bash
node dist/bin/qni.js export --state-vector --png --light --output state.png
```

### Export the final state as circle notation PNG

```bash
node dist/bin/qni.js export --circle-notation --png --light --output circles.png
```

### Export the Bloch sphere for a 1-qubit state

```bash
node dist/bin/qni.js bloch --png --trajectory --light --output bloch.png
node dist/bin/qni.js bloch --apng --light --output bloch.png
node dist/bin/qni.js bloch --inline
```

`qni bloch` currently supports only 1-qubit circuits with fully resolved numeric parameters.

## Development

Run the normal Node check:

```bash
scripts/setup_symbolic_python.sh
npm run check
```

`npm run check` runs the TypeScript tests, cucumber-js Markdown features, and the npm package smoke test.
Run `npm install` and `scripts/setup_symbolic_python.sh` first so the JavaScript BDD runner and image-related tests have the runtimes they need.

Run individual checks:

```bash
npm run build
npm run test:ts
npm run cucumber
npm run smoke:package
```

The package smoke test builds the project, packs the npm tarball, installs it into a temporary project, and verifies representative `qni` commands from the installed package.

## Notes

- `qni view` can appear misaligned depending on the terminal and font rendering
- If you want a stable visual layout, `qni export --png` is the safest option
- See `SPEC.md` for the detailed specification
