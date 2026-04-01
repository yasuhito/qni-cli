# qni CLI recipes

## Minimal state flip

```bash
bundle exec bin/qni clear
bundle exec bin/qni add X --qubit 0 --step 0
bundle exec bin/qni view
bundle exec bin/qni run --symbolic
bundle exec bin/qni bloch --png --trajectory --light --output bloch.png
```

## Start from an explicit 1-qubit state

```bash
bundle exec bin/qni clear
bundle exec bin/qni state set '0.6|0> + 0.8|1>'
bundle exec bin/qni add X --qubit 0 --step 0
bundle exec bin/qni run --symbolic
bundle exec bin/qni bloch --png --trajectory --light --output bloch.png
```

For a bare basis state, use an explicit coefficient:

```bash
bundle exec bin/qni state set '1|1>'
```

## Symbolic angle workflow

```bash
bundle exec bin/qni clear
bundle exec bin/qni add Ry --angle theta --qubit 0 --step 0
bundle exec bin/qni variable set theta π/4
bundle exec bin/qni view
bundle exec bin/qni run
bundle exec bin/qni run --symbolic
bundle exec bin/qni bloch --png --light --output ry.png
```

## Bloch-sphere visual explanation

Use a static PNG with a trail when you want one figure that explains the motion:

```bash
bundle exec bin/qni bloch --png --trajectory --light --output bloch.png
```

Use APNG when the animation itself matters:

```bash
bundle exec bin/qni bloch --apng --light --output bloch.png
```

Use inline output when the terminal supports Kitty graphics:

```bash
bundle exec bin/qni bloch --inline
bundle exec bin/qni bloch --inline --animate
```

## Circuit and state-vector figures

```bash
bundle exec bin/qni export --png --light --output circuit.png
bundle exec bin/qni export --state-vector --png --light --output state.png
```

## Bell-state style check

```bash
bundle exec bin/qni clear
bundle exec bin/qni add H --qubit 0 --step 0
bundle exec bin/qni add X --control 0 --qubit 1 --step 1
bundle exec bin/qni run --symbolic --basis bell
bundle exec bin/qni export --state-vector --png --light --output bell-state.png
```

## Scratch directory pattern

```bash
tmpdir=$(mktemp -d)
cd "$tmpdir"
export BUNDLE_GEMFILE=/home/yasuhito/Work/qni-cli/Gemfile
bundle exec /home/yasuhito/Work/qni-cli/bin/qni clear
bundle exec /home/yasuhito/Work/qni-cli/bin/qni state set '1|1>'
bundle exec /home/yasuhito/Work/qni-cli/bin/qni add X --qubit 0 --step 0
bundle exec /home/yasuhito/Work/qni-cli/bin/qni bloch --png --trajectory --light --output bloch.png
```

This keeps ad hoc `circuit.json` files and generated images out of the repo root.
