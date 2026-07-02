# Fresh Pi blind 22-task research trial prompt

Goal: Solve the 22 qni-cli benchmark tasks in this blind workspace.

You are in `/tmp/qni-fresh-pi-blind-22q`. Use only files under this current workspace: `README.md`, `docs/cli.md`, `benchmarks/qni-solution-prompt.md`, and `benchmarks/quantum-katas/**/*.md`.

Hard constraints:

- Do not read or inspect any files outside this workspace.
- Do not inspect any `benchmarks/solutions` directory or `research/runs` directory anywhere.
- Do not use prior benchmark solutions. Treat this as a fresh blind attempt.
- Do not modify source/project files outside this workspace.

Task:

1. Read the benchmark prompt rules and the task files under `benchmarks/quantum-katas/`.
2. For every task `.md` file, create the corresponding `.qni` submission under `out/submissions/quantum-katas/` with the same relative path and `.qni` extension. Example: `benchmarks/quantum-katas/basic-gates/state-flip.md` -> `out/submissions/quantum-katas/basic-gates/state-flip.qni`.
3. Each `.qni` file must contain only `qni` commands, one command per line. Do not include `qni run` or `qni expect`.
4. Use only commands allowed by each task's `allowed_commands`.
5. Also write `out/response.md` summarizing your approach, any uncertainty, and the list of created files.

You may use normal shell/file tools inside this workspace, but the final answer should only summarize what you created and any uncertainties. Do not paste every submission inline.
