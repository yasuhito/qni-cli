# qni bloch APNG Export Design

**Problem:** `qni bloch` currently offers animated file output as GIF, but the actual Bloch-sphere drawings look cleaner as animated PNG. In this project, preserving a simpler and higher-fidelity output set matters more than keeping GIF compatibility.

**Goal:** Replace animated Bloch-sphere GIF export with native APNG export so `qni bloch` produces cleaner animated artifacts while keeping the command surface small and easy to understand.

## Decisions

- Remove `--gif` from `qni bloch`.
- Add `--apng` as the only animated file-output mode.
- Keep `--png` for static file output.
- Keep `--inline` and `--inline --animate` unchanged for Kitty-compatible terminals.
- Treat APNG as the canonical animated artifact format for the Codex app.
- Do not preserve backward compatibility for `--gif`.
- Generate APNG directly from RGBA frame images; do not convert from GIF.

## Why APNG

APNG fits this project better than GIF because Bloch-sphere drawings are:

- thin-line diagrams rather than photo-like images
- often transparent
- sensitive to palette reduction and edge artifacts

Compared with GIF, APNG keeps:

- full RGBA color
- smooth anti-aliased lines
- cleaner labels and wireframes
- better visual continuity for Bloch trajectories

The recent experiment with the `S`-gate Bloch animation showed that APNG looks meaningfully better in the Codex app than GIF. Since this project is intentionally willing to drop backward compatibility, the simplest path is to promote APNG and delete GIF support.

## Command Shape

```text
qni bloch --png --output bloch.png
qni bloch --apng --output bloch.png
qni bloch --inline
qni bloch --inline --animate
```

Validation rules:

- exactly one of `--png`, `--apng`, or `--inline` is required
- `--output=PATH` is required for `--png` and `--apng`
- `--output=PATH` is forbidden for `--inline`
- `--animate` is valid only with `--inline`
- at most one of `--dark` or `--light`
- the loaded circuit must have exactly 1 qubit
- all variables used by the circuit must resolve to concrete numeric values

## User Experience

Static mode:

- `qni bloch --png --output bloch.png` writes a static PNG

Animated artifact mode:

- `qni bloch --apng --output bloch.png` writes an animated PNG
- the file extension remains `.png`, but the file is animated
- animated output should look visually closer to the in-memory RGBA frames than the old GIF output

Inline mode:

- `qni bloch --inline` and `qni bloch --inline --animate` remain unchanged
- inline animation is still sent through Kitty graphics protocol frames, not APNG

## Rendering Model

The high-level pipeline stays the same:

- Ruby loads the circuit and samples Bloch vectors
- Python renders visual frames with `matplotlib`

The file-output split becomes:

- `--png`: render the final frame and save one static PNG
- `--apng`: render all frames and save one native APNG

For APNG:

- render each animation frame as RGBA
- save the frame sequence directly as animated PNG
- do not pass through GIF, palette conversion, or indexed-color intermediate steps

This design keeps animation quality high and avoids the left/right edge flicker that can appear when APNG is produced through ad-hoc GIF conversion.

## CLI and Help Changes

`qni bloch --help` and `qni help` output should be updated so that:

- `--gif` disappears completely
- `--apng` appears anywhere animated file output is mentioned
- error messages refer to `--png`, `--apng`, and `--inline`

Examples should become:

```text
qni bloch --png --output bloch.png
qni bloch --apng --output bloch.png
qni bloch --inline
qni bloch --inline --animate
```

## Capability Boundary

Supported in this change:

- 1-qubit static PNG export
- 1-qubit animated APNG export
- Kitty-compatible inline static output
- Kitty-compatible inline animated output

Not included:

- GIF output
- animated WebP output
- APNG-specific playback knobs
- browser previews
- multi-qubit Bloch views

## Validation

- feature coverage for `qni bloch --apng` success
- feature coverage that animated file output is now APNG, not GIF
- feature coverage that `--png` / `--apng` / `--inline` are the only valid format selectors
- feature coverage that `qni bloch --help` mentions `--apng` and no longer mentions `--gif`
- regression coverage that inline Bloch output still works
- regression coverage that APNG animation still has multiple frames for rotation-style circuits
