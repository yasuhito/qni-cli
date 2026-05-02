# qni-cli

`qni-cli` is a Ruby CLI for editing, viewing, simulating, and exporting quantum circuits stored in `./circuit.json`.

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

### 1. Install Ruby dependencies

```bash
bundle install
```

### 2. Install JavaScript test dependencies

Use Node.js 22 or another Node.js version supported by `@cucumber/cucumber`.

```bash
npm install
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

Inside this repository, use the checked-out implementation via `bundle exec bin/qni`.

```bash
bundle exec bin/qni add H --qubit 0 --step 0
bundle exec bin/qni gate --qubit 0 --step 0
bundle exec bin/qni add X --control 0 --qubit 1 --step 1
bundle exec bin/qni rm --qubit 1 --step 1
bundle exec bin/qni view
bundle exec bin/qni run --symbolic --basis bell
```

`qni` always reads and writes `./circuit.json` in the current directory. `qni add` creates the smallest circuit that can hold the requested gate when the file does not exist.

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

### Read one gate

```bash
bundle exec bin/qni gate --qubit 0 --step 0
```

`qni gate` prints the serialized `circuit.json` cell value, such as `H`.

### Remove one gate operation

```bash
bundle exec bin/qni rm --qubit 0 --step 0
```

`qni rm` removes the operation at the specified slot. For controlled gates, selecting either a control or target removes the whole controlled operation. For `SWAP`, selecting either `Swap` slot removes both `Swap` cells.

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

Add a caption for notes, slides, or documentation. Use `--no-transparent` when the image should keep a white background in dark note themes:

```bash
bundle exec bin/qni export --png --light --no-transparent \
  --caption "CNOT before cut" \
  --caption-position bottom \
  --output circuit.png
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
scripts/setup_symbolic_python.sh
bundle exec rake check
```

`bundle exec rake check` runs RuboCop, Flog, Flay, Reek, cucumber-js Markdown features, and Minitest.
Run `npm install` and `scripts/setup_symbolic_python.sh` first so the JavaScript BDD runner and image-related tests have the runtimes they need.

Run individual checks:

```bash
bundle exec rake test
bundle exec rake cucumber
npm run cucumber
bundle exec rake rubocop
bundle exec rake flog
bundle exec rake flay
bundle exec rake reek
```

### TypeScript migration Ruby override

`QNI_USE_RUBY=1` is an operational override for the TypeScript migration period.
It exists for emergency rollback and release difference analysis while the
TypeScript dispatcher and Ruby fallback are both present.

When it is set, the dispatcher must bypass TypeScript routing and execute the Ruby fallback path for every `qni` command.
This is meant to preserve the current Ruby behavior when comparing a release or temporarily avoiding a TypeScript-backed command regression.

Use it by prefixing one command:

```bash
QNI_USE_RUBY=1 qni run --symbolic
QNI_USE_RUBY=1 qni export --png --output circuit.png
```

For a longer comparison session, export it in the shell and unset it as soon as
the comparison is complete:

```bash
export QNI_USE_RUBY=1
qni view
qni run
unset QNI_USE_RUBY
```

Do not use this override in normal TypeScript regression checks.
It can hide TypeScript regressions by forcing every command through Ruby.
The TypeScript compatibility lane in CI must fail fast if `QNI_USE_RUBY` is set.

Keep this section until the final Ruby fallback removal issue deletes the dispatcher fallback and Ruby runtime dependency.

## Notes

- `qni view` can appear misaligned depending on the terminal and font rendering
- If you want a stable visual layout, `qni export --png` is the safest option
- See `SPEC.md` for the detailed specification
