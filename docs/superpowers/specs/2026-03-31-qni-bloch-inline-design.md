# qni bloch Inline Terminal Design

**Problem:** `qni bloch` can now render Bloch-sphere PNG and GIF files, but that still forces the user to leave the terminal to inspect them. For Ghostty-based interactive work, the better experience is to show the Bloch sphere inline where the experiment is being run.

**Goal:** Add `qni bloch --inline` for Kitty-graphics-compatible terminals such as Ghostty so 1-qubit Bloch spheres can be previewed directly in the terminal, with optional inline animation for state evolution.

## Decisions

- Extend `qni bloch` with a new `--inline` output mode.
- Use the Kitty graphics protocol for inline display.
- Do not use APNG or animated WebP for terminal inline display.
- Keep `--png` and `--gif` as file-output modes; they remain unchanged.
- Support only Kitty-graphics-compatible terminals in v1, with Ghostty as the explicit target.
- Support only 1-qubit circuits in v1, matching the existing `qni bloch` limitation.
- Require all parameters to resolve numerically before rendering.
- Default `--inline` to a static final-state preview.
- Add `--animate` as an explicit opt-in for inline animation.
- Reuse the existing `--dark` / `--light` theme direction.

## Why Kitty Graphics Protocol

Ghostty already supports the Kitty graphics protocol, so the terminal can display image data directly without asking `qni` to guess which animated file formats a terminal understands.

This is a better fit than APNG or animated WebP because:

- terminal support is defined by the protocol, not by the image viewer behavior of the host environment
- static PNG bytes and animated frame sequences can both be transmitted directly
- crisp thin lines and transparent overlays survive better than they do through GIF-style palette reduction
- `qni` can keep the same Bloch renderer and only change the final delivery path

APNG is still a good future candidate for higher-fidelity animated file export, but it is not the right abstraction for inline terminal display.

## Command Shape

```text
qni bloch --inline
qni bloch --inline --light
qni bloch --inline --animate
qni bloch --inline --animate --dark
```

Validation rules:

- exactly one of `--png`, `--gif`, or `--inline` is required
- `--output=PATH` is required for `--png` and `--gif`
- `--output=PATH` is forbidden for `--inline`
- `--animate` is valid only with `--inline`
- at most one of `--dark` or `--light`
- the loaded circuit must have exactly 1 qubit
- all variables used by the circuit must resolve to concrete numeric values
- inline display requires a Kitty-graphics-compatible TTY; otherwise `qni` fails with a clear error

## User Experience

Static mode:

- `qni bloch --inline` renders the final Bloch sphere frame directly in the terminal
- the command returns after the image has been emitted

Animated mode:

- `qni bloch --inline --animate` renders the same state-evolution frames already used for GIF output
- the animation plays inline in the terminal instead of writing a `.gif` file
- the first release does not add playback controls, looping options, or timing knobs

This keeps the command simple:

- file output when the user wants an artifact
- inline output when the user wants a live terminal explanation

## Rendering Model

The existing Bloch rendering pipeline should stay conceptually the same:

- Ruby loads the circuit, validates options, and samples Bloch vectors
- Python renders visual frames using `matplotlib`

The new part is the delivery layer:

- `--png` writes one PNG file
- `--gif` writes one GIF file
- `--inline` emits Kitty graphics protocol escape sequences to the terminal

For static inline display:

- render a single PNG frame in memory
- send that image to the terminal through Kitty graphics protocol

For animated inline display:

- render the sampled PNG frames in memory
- send them as Kitty animation frames rather than encoding APNG/WebP/GIF first

This keeps terminal output independent from file-format concerns.

## Capability Boundary

The first release should be deliberately strict.

Supported:

- Ghostty and other terminals that implement Kitty graphics protocol
- local interactive terminal sessions
- 1-qubit concrete states and their sampled trajectories

Rejected in v1:

- non-TTY stdout
- terminals without Kitty graphics support
- tmux/screen compatibility workarounds
- multi-qubit Bloch-like views
- symbolic inline rendering

When inline display is not supported, `qni` should fail and tell the user to use `--png` or `--gif` instead.

## Ruby / Python Split

Ruby side responsibilities:

- parse and validate `--inline` / `--animate`
- reject unsupported option combinations
- detect whether inline output is being requested on a usable terminal
- compute Bloch samples using the existing numeric path
- invoke the Python helper in a mode that returns image bytes or frame bytes
- write the Kitty protocol envelope to the terminal

Python side responsibilities:

- reuse the existing Bloch drawing code
- return in-memory PNG payloads for either one frame or multiple frames
- stay ignorant of terminal escape-sequence details

This keeps protocol formatting on the Ruby side and pure image generation on the Python side.

## Non-Goals

- APNG export
- animated WebP export
- browser or HTML Bloch previews
- inline display for state-vector LaTeX exports
- configurable animation speed, looping policy, or viewport sizing
- terminal capability negotiation beyond the Kitty-compatible happy path

## Validation

- feature coverage for `qni bloch --help` mentioning `--inline` and `--animate`
- feature coverage for `qni bloch --inline` success through a test seam that captures emitted escape sequences
- feature coverage for `qni bloch --inline --animate` success on a rotation circuit
- feature coverage that `--inline` rejects `--output`
- feature coverage that `--animate` rejects non-inline modes
- feature coverage that unsupported terminals fail with a clear message
- regression coverage that `--png` and `--gif` still behave as before
