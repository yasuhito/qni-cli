# qni export State Vector PNG Design

**Problem:** `qni run --symbolic` can print exact symbolic amplitudes, but there is no way to render the symbolic state vector as an image for terminal inline preview.

**Goal:** Add `qni export --state-vector --png --output ...` so 1-qubit and 2-qubit symbolic state vectors can be rendered to PNG using SymPy's LaTeX output and the existing local LaTeX toolchain.

## Decisions

- Extend `qni export`, not `qni run`.
- Support only PNG output for state vectors in the first version.
- Reuse the existing `--dark` / `--light` theme options.
- Reuse the same 1-qubit / 2-qubit limit as `qni run --symbolic`.
- Generate LaTeX from SymPy directly instead of translating plain-text symbolic output back into LaTeX.

## Rendering Approach

- Add a LaTeX mode to the Python symbolic helper.
- Have Ruby request either text output or LaTeX output from the helper.
- Wrap the helper's LaTeX formula in a small standalone LaTeX document with theme-aware text color.
- Convert that LaTeX document to PNG using the existing `pdflatex -> pdftocairo` pipeline.

## Validation

- Feature coverage for help text and `--state-vector --png`.
- Feature coverage that state-vector PNG differs from circuit PNG for the same circuit.
- Feature coverage that 3-qubit state-vector export fails with the existing symbolic support error.
- Focused cucumber, RuboCop, and Python syntax verification.
