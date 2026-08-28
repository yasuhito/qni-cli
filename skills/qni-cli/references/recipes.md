# qni CLI recipes

In these examples, `<qni>` means the absolute path to `scripts/qni` beside the skill's `SKILL.md`. Run it from the directory where `circuit.json` should live.

## Create, display, run, and verify a Bell state

```bash
<qni> clear
<qni> add H --qubit 0 --step 0
<qni> add X --control 0 --qubit 1 --step 1
<qni> view
<qni> run --symbolic --basis bell
<qni> expect ZZ XX
```

## Measure a circuit

```bash
<qni> clear
<qni> add H --qubit 0 --step 0
<qni> add Measure --name result --qubit 0 --step 1
<qni> run --shots 100 --seed 42
<qni> run --shots 100 --seed 42 --json
```

Use a measurement name when a later gate needs `--if NAME`, or when the output needs a domain-specific label. A name can be written only once.

## Start from an explicit state

```bash
<qni> clear
<qni> state set '0.6|0> + 0.8|1>'
<qni> add X --qubit 0 --step 0
<qni> run --symbolic
```

For a bare basis state, use an explicit coefficient such as `1|1>`.

## Use a symbolic angle

```bash
<qni> clear
<qni> add Ry --angle theta --qubit 0 --step 0
<qni> variable set theta π/4
<qni> view
<qni> run --symbolic
```

## Render a circuit or state

```bash
<qni> export --png --light --output circuit.png
<qni> export --state-vector --png --light --output state.png
<qni> bloch --png --trajectory --light --output bloch.png
```

Use `export --latex-source` when PNG dependencies are unavailable or the drawing source must be inspected. Use `bloch` only for a fully resolved numeric one-qubit circuit.
