---
name: qni-cli
description: Build, run, measure, visualize, verify, and explain quantum circuits with the bundled qni CLI. Use for quantum-circuit tasks, including Quantum Katas, superdense coding, state vectors, expectation values, circuit diagrams, and Bloch-sphere images.
license: MIT
compatibility: Requires Node.js 22 or later. PNG export also requires pdflatex and pdftocairo; symbolic output and Bloch-sphere rendering require Python helpers.
---

# qni CLI

Use `scripts/qni`, resolved from this skill directory, for every command. Invoke it by absolute path while keeping the command's working directory in the user's workspace. The wrapper runs the TypeScript CLI bundled in the same package, so do not search for a repository checkout or depend on a globally installed `qni`.

`qni` reads and writes `./circuit.json` in the command's working directory. Use a temporary directory for experiments unless the user chose a workspace.

## Preferred loop

1. Create the circuit with `scripts/qni add ...`. Set an initial state first with `scripts/qni state set "..."` only when needed.
2. Inspect the circuit with `scripts/qni view`.
3. Execute it with `scripts/qni run`. Use `--symbolic` for an explanatory ket state or `--shots N --seed N --json` for reproducible measurement data.
4. Verify the result with measured values, `scripts/qni expect ...`, or both. Fix and rerun the circuit when the evidence disagrees with the requested behavior.
5. Render a circuit with `scripts/qni export --png ...` or a one-qubit trajectory with `scripts/qni bloch --png --trajectory ...` when a visual helps.
6. Explain the gate sequence and cite the execution or verification result. Distinguish observed results from theoretical expectations.

Use `scripts/qni --help` and `scripts/qni COMMAND --help` as the live command reference.

## References

Open only the branch needed:

- Measurement, verification, visualization, and state-vector recipes: [references/recipes.md](references/recipes.md)
- End-to-end superdense coding: [references/superdense-coding.md](references/superdense-coding.md)
