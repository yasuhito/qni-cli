---
name: qni-cli
description: Use when working in the qni-cli repository or using the local qni command to build, simulate, visualize, or explain quantum circuits stored in ./circuit.json, especially for Quantum Katas, Bloch-sphere images, symbolic ket states, or angle variables.
---

# qni CLI

Use the repo-local CLI as `bundle exec bin/qni` unless the user explicitly wants a globally installed `qni`.
Outside the repo root, use `BUNDLE_GEMFILE=/home/yasuhito/Work/qni-cli/Gemfile bundle exec /home/yasuhito/Work/qni-cli/bin/qni`.

## Core model

- `qni` reads and writes `./circuit.json` in the current directory.
- Most commands mutate that file, so use a temp dir for throwaway experiments and visual assets.
- `qni bloch` is for fully resolved numeric 1-qubit circuits.
- `qni run --symbolic` can also show named bases such as `x`, `y`, and `bell`.

## Preferred loop

1. Start clean with `bundle exec bin/qni clear`, or work in a temp directory.
2. Set an initial state only when needed with `bundle exec bin/qni state set "..."`.
3. Build the circuit with `bundle exec bin/qni add ...`.
4. Inspect with `bundle exec bin/qni view` and `bundle exec bin/qni run --symbolic`.
5. Render visuals with `bundle exec bin/qni bloch ...` or `bundle exec bin/qni export ...`.

## High-value commands

- `bundle exec bin/qni add` for gates such as `H`, `X`, `S`, `T`, `Rx`, `Ry`, `Rz`, and controlled `X`
- `bundle exec bin/qni state set/show/clear` for explicit initial states
- `bundle exec bin/qni run --symbolic` for readable ket output
- `bundle exec bin/qni bloch --png --trajectory --light --output ...` for static Bloch-sphere explanations with a sampled trail
- `bundle exec bin/qni bloch --apng --light --output ...` for animated 1-qubit evolution
- `bundle exec bin/qni export --png --light --output ...` for circuit figures
- `bundle exec bin/qni export --state-vector --png --light --output ...` for symbolic state-vector figures
- `bundle exec bin/qni variable set` when gates use symbolic angles such as `theta`
- `bundle exec bin/qni expect` for Pauli-string expectation values

## Guardrails

- Prefer `bundle exec bin/qni ...` in this repo so the checked-out code is what runs.
- In a temp dir outside the repo, keep Bundler pointed at this checkout with `BUNDLE_GEMFILE=/home/yasuhito/Work/qni-cli/Gemfile bundle exec /home/yasuhito/Work/qni-cli/bin/qni ...`.
- For a bare basis ket, `qni state set` expects an explicit coefficient such as `1|1>`, not `|1>`.
- `qni bloch --trajectory` is the right default when the task is to explain how a 1-qubit state moves on the Bloch sphere.
- `qni bloch --apng` is for animation; `--trajectory` on `--png` gives a single static figure with the path drawn in.
- When the task is explanatory rather than numeric, prefer `qni run --symbolic` over raw amplitude output.
- If a render command would clutter the repo root, create a temp dir and copy back only the artifact you need.

## References

Open only what you need:

- Common command recipes: `references/recipes.md`
- Live command surface: `bundle exec bin/qni`, `bundle exec bin/qni COMMAND --help`
