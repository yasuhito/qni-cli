# qni-cli

`qni-cli` is a Ruby CLI for editing, viewing, simulating, and exporting quantum circuits stored in `./circuit.json`.

## What It Can Do

- Add gates with `qni add`
- Render the circuit as ASCII art with `qni view`
- Inspect the state vector with `qni run`
- Show small circuits as ket expressions with `qni run --symbolic`
- Compute Pauli-string expectation values with `qni expect`
- Export circuit diagrams as PNG with `qni export --png`
- Export symbolic state vectors as PNG with `qni export --state-vector --png`
- Export the final state as circle-notation PNG with `qni export --circle-notation --png`
- Render a 1-qubit state on the Bloch sphere with `qni bloch --png`, `--apng`, or `--inline`

## Setup

### 1. Install Ruby dependencies

```bash
bundle install
```

### 2. Set up the Python runtime for symbolic and image features

Run this before using `qni run --symbolic`, `qni bloch`, or `qni export --circle-notation --png`.

```bash
scripts/setup_symbolic_python.sh
```

### 3. Install external tools for circuit PNG export

`qni export --png` and `qni export --state-vector --png` require:

- `pdflatex`
- `pdftocairo`

## Quick Start

Inside this repository, use the checked-out implementation via `bundle exec bin/qni`.

```bash
bundle exec bin/qni add H --qubit 0 --step 0
bundle exec bin/qni add X --control 0 --qubit 1 --step 1
bundle exec bin/qni view
bundle exec bin/qni run --symbolic --basis bell
```

`qni` always reads and writes `./circuit.json` in the current directory. If the file does not exist, it creates the smallest circuit that can hold the requested gate.

## Common Commands

### Build a circuit

```bash
bundle exec bin/qni add H --qubit 0 --step 0
bundle exec bin/qni add X --control 0 --qubit 1 --step 1
bundle exec bin/qni add Rx --angle π/2 --qubit 0 --step 2
bundle exec bin/qni add SWAP --qubit 0,1 --step 3
```

- `step` and `qubit` are 0-based
- Supported gates are `H`, `X`, `Y`, `Z`, `S`, `S†`, `T`, `T†`, `√X`, `P`, `Rx`, `Ry`, `Rz`, and `SWAP`

### View the circuit

```bash
bundle exec bin/qni view
```

### Manage the initial state

```bash
bundle exec bin/qni state set "alpha|0> + beta|1>"
bundle exec bin/qni state show
bundle exec bin/qni state clear
```

### Inspect the state vector and expectation values

```bash
bundle exec bin/qni run
bundle exec bin/qni run --symbolic
bundle exec bin/qni run --symbolic --basis x
bundle exec bin/qni expect ZZ XX
```

## Export Images

If ASCII output is not enough, use `export` or `bloch` to generate images.

### Export the circuit diagram as PNG

```bash
bundle exec bin/qni export --png --light --output circuit.png
```

### Export the symbolic state vector as PNG

```bash
bundle exec bin/qni export --state-vector --png --light --output state.png
```

### Export the final state as circle notation PNG

```bash
bundle exec bin/qni export --circle-notation --png --light --output circles.png
```

### Export the Bloch sphere for a 1-qubit state

```bash
bundle exec bin/qni bloch --png --trajectory --light --output bloch.png
bundle exec bin/qni bloch --apng --light --output bloch.png
bundle exec bin/qni bloch --inline
```

`qni bloch` currently supports only 1-qubit circuits with fully resolved numeric parameters.

## Development

Run all checks:

```bash
bundle exec rake check
```

Run individual checks:

```bash
bundle exec rake cucumber
bundle exec rake rubocop
bundle exec rake flog
bundle exec rake flay
bundle exec rake reek
```

## Notes

- `qni view` can appear misaligned depending on the terminal and font rendering
- If you want a stable visual layout, `qni export --png` is the safest option
- See `SPEC.md` for the detailed specification
