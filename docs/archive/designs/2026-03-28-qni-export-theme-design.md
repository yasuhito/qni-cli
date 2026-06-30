# qni export Theme Option Design

**Problem:** `qni export --png` currently emits a single black-on-transparent rendering, which is awkward in dark terminal environments where white circuit lines are easier to read.

**Goal:** Add `--dark` and `--light` options to `qni export`, defaulting to dark mode, so exported LaTeX and PNG renderings use white or black circuit strokes while preserving the same transparent background.

## Decisions

- Add `--dark` and `--light` to both `qni export --latex-source` and `qni export --png`.
- Default to `--dark` when neither option is supplied.
- Reject `--dark --light` when both are supplied together.
- Keep the PNG background transparent in both modes.
- Apply the theme at the LaTeX layer so `--latex-source` and `--png` stay consistent.

## Rendering Approach

- Extend the qcircuit LaTeX generator with a `theme` parameter.
- Add `xcolor` to the generated LaTeX and wrap the qcircuit body in `\color{white}` or `\color{black}`.
- Convert the themed LaTeX to PNG with `pdflatex` and `pdftocairo`, preserving transparency.

## Impacted Areas

- `features/qni_export.feature`
- `lib/qni/cli.rb`
- `lib/qni/cli/export_help.rb`
- `lib/qni/cli/export_command.rb`
- `lib/qni/export/qcircuit_latex.rb`

## Validation

- Feature coverage for help text, default dark mode, explicit light mode, conflicting mode flags, and PNG export.
- Focused cucumber run for `features/qni_export.feature` and `features/qni_cli.feature`.
- Focused RuboCop run for touched Ruby files.
