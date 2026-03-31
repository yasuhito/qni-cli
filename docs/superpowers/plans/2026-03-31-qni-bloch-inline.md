# qni bloch Inline Terminal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `qni bloch --inline` so Ghostty and other Kitty-graphics-compatible terminals can preview 1-qubit Bloch spheres directly in the terminal, with optional inline animation.

**Architecture:** Keep the existing `qni bloch` numeric sampling pipeline. Ruby will extend the CLI surface, validate `--inline` and `--animate`, detect whether the current terminal is suitable for Kitty graphics, and format the actual Kitty protocol escape sequences. Python will continue to own image generation through `matplotlib`, but it will gain in-memory PNG output modes so Ruby can either write files or stream frames inline without going through GIF/APNG/WebP first.

**Tech Stack:** Ruby, Thor, Cucumber, Minitest, Python, matplotlib, Pillow, Kitty graphics protocol, existing `Qni::BlochSampler` / `Qni::BlochRenderer`

---

## File Structure

- Modify: `features/qni_bloch.feature`
  - Add acceptance coverage for `--inline`, `--inline --animate`, invalid option combinations, and unsupported-terminal failure.
- Modify: `features/qni_cli.feature`
  - Extend top-level help and `qni bloch --help` expectations with inline options.
- Modify: `features/step_definitions/cli_steps.rb`
  - Add helpers for capturing inline escape sequences and injecting terminal-capability test seams.
- Modify: `lib/qni/cli.rb`
  - Expose `--inline` and `--animate` on the `bloch` command.
- Modify: `lib/qni/cli/bloch_command.rb`
  - Validate the new option matrix and dispatch either file rendering or inline rendering.
- Modify: `lib/qni/cli/bloch_help.rb`
  - Document the new inline usage and constraints.
- Modify: `lib/qni/bloch_renderer.rb`
  - Refactor the Python bridge so it can request either file output or in-memory PNG frame payloads.
- Create: `lib/qni/bloch_inline_renderer.rb`
  - Own the Ruby-side inline workflow: request rendered frames, enforce terminal support, and send Kitty graphics protocol sequences to the terminal.
- Create: `lib/qni/kitty_graphics_emitter.rb`
  - Format and emit Kitty graphics protocol escape sequences for static images and frame-by-frame animation.
- Modify: `libexec/qni_bloch_render.py`
  - Add modes that return PNG bytes for one frame or many frames instead of always writing files.
- Test: `test/qni/kitty_graphics_emitter_test.rb`
  - Unit-test protocol formatting independently from the CLI.
- Test: `test/qni/bloch_renderer_test.rb`
  - Unit-test the Ruby/Python payload boundary for the new inline modes.

### Task 1: Add failing acceptance coverage for inline Bloch output

**Files:**
- Modify: `features/qni_bloch.feature`
- Modify: `features/qni_cli.feature`
- Modify: `features/step_definitions/cli_steps.rb`

- [ ] **Step 1: Extend CLI help expectations**

Add help coverage to `features/qni_cli.feature` so `qni bloch --help` now includes lines along these lines:

```text
Usage:
  qni bloch --inline
  qni bloch --inline --animate
```

and options like:

```text
--inline        # render a Bloch sphere inline in a Kitty-compatible terminal
--animate       # animate inline Bloch output; valid only with --inline
```

- [ ] **Step 2: Add behavior scenarios to `features/qni_bloch.feature`**

Add scenarios for:
- `qni bloch --inline` succeeding on a 1-qubit circuit and emitting Kitty graphics escape sequences
- `qni bloch --inline --animate` succeeding on a 1-qubit rotation circuit and emitting multiple inline frames
- `qni bloch --inline --output bloch.png` failing with a clear `--output is not supported with --inline` message
- `qni bloch --gif --animate --output bloch.gif` failing with a clear `--animate is supported only with --inline` message
- `qni bloch --inline` failing on unsupported terminals with a clear fallback message such as `inline bloch rendering requires a Kitty-compatible terminal; use --png or --gif instead`

Keep the existing PNG/GIF scenarios untouched.

- [ ] **Step 3: Add inline-capture helpers in `cli_steps.rb`**

Extend `features/step_definitions/cli_steps.rb` with helpers that can:
- run `qni` under a controlled environment like `QNI_TEST_FORCE_INLINE=1`
- capture stdout as binary rather than treating it as ordinary text output
- assert that inline output contains Kitty APC framing such as `ESC _ G`

Add a step like:

```ruby
Then('標準出力は Kitty graphics escape sequence を含む') do
  expect(@stdout).to include("\e_G")
end
```

and another one to assert multiple inline frames by counting escape-sequence occurrences.

- [ ] **Step 4: Run focused cucumber and verify failure**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature
```

Expected: FAIL because the new help text, options, and inline rendering path do not exist yet.

### Task 2: Add the CLI surface and validation for inline mode

**Files:**
- Modify: `lib/qni/cli.rb`
- Modify: `lib/qni/cli/bloch_command.rb`
- Modify: `lib/qni/cli/bloch_help.rb`

- [ ] **Step 1: Add `--inline` and `--animate` to the Thor command**

Update `lib/qni/cli.rb` so `qni bloch` declares:

```ruby
method_option :inline, type: :boolean, default: false, desc: 'Render inline in a Kitty-compatible terminal'
method_option :animate, type: :boolean, default: false, desc: 'Animate inline Bloch output'
```

without disturbing the existing `--png`, `--gif`, `--dark`, `--light`, and `--output`.

- [ ] **Step 2: Update shared help text**

Extend `lib/qni/cli/bloch_help.rb` to document:
- inline usage examples
- that `--output` is for file modes only
- that `--animate` is meaningful only with `--inline`
- that Ghostty / Kitty-compatible terminals are required

- [ ] **Step 3: Expand option validation in `BlochCommand`**

Refactor the validation logic in `lib/qni/cli/bloch_command.rb` so it enforces:
- exactly one of `--png`, `--gif`, `--inline`
- `--output` required for `--png` / `--gif`
- `--output` forbidden for `--inline`
- `--animate` allowed only with `--inline`
- still at most one of `--dark` / `--light`

Use exact error strings that match the feature text.

- [ ] **Step 4: Leave a temporary inline placeholder**

Before wiring the real renderer, make the `--inline` branch fail with a temporary explicit message such as:

```ruby
raise Thor::Error, 'inline bloch rendering is not implemented yet'
```

This should let help and validation scenarios turn green while rendering scenarios stay red in a controlled way.

- [ ] **Step 5: Run focused cucumber again**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature
```

Expected: help and validation scenarios pass; inline rendering scenarios still fail on the placeholder.

### Task 3: Add a focused Ruby unit for Kitty graphics emission

**Files:**
- Create: `test/qni/kitty_graphics_emitter_test.rb`
- Create: `lib/qni/kitty_graphics_emitter.rb`

- [ ] **Step 1: Write the failing emitter tests**

Create `test/qni/kitty_graphics_emitter_test.rb` with small, protocol-focused tests such as:

```ruby
def test_static_image_emits_single_kitty_graphics_payload
  io = StringIO.new
  emitter = Qni::KittyGraphicsEmitter.new(io: io)
  emitter.emit_png_frame("png-bytes")

  output = io.string
  assert_includes output, "\e_G"
  assert_includes output, "\e\\"
end
```

and:

```ruby
def test_animation_emits_multiple_frames
  io = StringIO.new
  emitter = Qni::KittyGraphicsEmitter.new(io: io)
  emitter.emit_animation(["frame-1", "frame-2"])

  assert_operator io.string.scan("\e_G").length, :>=, 2
end
```

Keep the tests at the string/protocol level; do not make them depend on a real terminal.

- [ ] **Step 2: Run the new unit test and confirm failure**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/kitty_graphics_emitter_test.rb
```

Expected: FAIL because the emitter class does not exist yet.

- [ ] **Step 3: Implement `Qni::KittyGraphicsEmitter`**

Create `lib/qni/kitty_graphics_emitter.rb` with a narrow API:
- initialize with a writable `io:`
- `emit_png_frame(png_bytes)`
- `emit_animation(png_frames)`

Implementation notes:
- base64-encode the PNG bytes
- wrap payloads in Kitty APC framing (`\e_G ... \e\\`)
- chunk large payloads so very long base64 strings are not written as one giant escape sequence
- keep protocol details isolated in this file so CLI code never hand-builds escape strings

- [ ] **Step 4: Run the unit test and make it pass**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/kitty_graphics_emitter_test.rb
```

Expected: PASS

- [ ] **Step 5: Commit the emitter slice**

```bash
git add test/qni/kitty_graphics_emitter_test.rb lib/qni/kitty_graphics_emitter.rb
git commit -m "feat: add kitty graphics emitter"
```

### Task 4: Refactor the Bloch Python bridge for in-memory frame output

**Files:**
- Test: `test/qni/bloch_renderer_test.rb`
- Modify: `lib/qni/bloch_renderer.rb`
- Modify: `libexec/qni_bloch_render.py`

- [ ] **Step 1: Add a failing Ruby-side renderer contract test**

Create `test/qni/bloch_renderer_test.rb` with tests that pin the new modes, for example:

```ruby
def test_png_bytes_mode_returns_binary_png_data
  renderer = Qni::BlochRenderer.new(format: 'inline_png', output_path: nil, frames: sample_frames, theme: :dark)
  png_bytes = renderer.render
  assert_equal "\x89PNG".b, png_bytes.byteslice(0, 4)
end
```

and:

```ruby
def test_inline_animation_mode_returns_multiple_png_frames
  renderer = Qni::BlochRenderer.new(format: 'inline_frames', output_path: nil, frames: sample_frames, theme: :dark)
  frames = renderer.render
  assert_operator frames.length, :>=, 2
end
```

If direct helper invocation is awkward in unit tests, add a seam that stubs the helper result while still pinning the Ruby API.

- [ ] **Step 2: Run the new unit test and confirm failure**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/bloch_renderer_test.rb
```

Expected: FAIL because `BlochRenderer` only writes files today.

- [ ] **Step 3: Extend `libexec/qni_bloch_render.py`**

Add helper modes that:
- keep the existing `png` and `gif` file-writing behavior intact
- add a mode that writes one PNG image to stdout
- add a mode that writes a framed JSON payload describing multiple PNG frames, with each frame base64-encoded

Do not teach the Python helper Kitty protocol details.

- [ ] **Step 4: Refactor `Qni::BlochRenderer`**

Change `lib/qni/bloch_renderer.rb` so it can:
- keep the existing file-output API for `png` and `gif`
- return PNG bytes for static inline mode
- return an array of PNG byte strings for animated inline mode

Keep Python invocation, JSON payload construction, and helper error handling in this class so the rest of the code still sees one Ruby abstraction for Bloch-image generation.

- [ ] **Step 5: Verify the helper boundary**

Run:

```bash
python3 -m py_compile libexec/qni_bloch_render.py
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/bloch_renderer_test.rb
```

Expected: both pass

- [ ] **Step 6: Commit the renderer refactor**

```bash
git add test/qni/bloch_renderer_test.rb lib/qni/bloch_renderer.rb libexec/qni_bloch_render.py
git commit -m "feat: add in-memory bloch frame rendering"
```

### Task 5: Wire `qni bloch --inline` end to end

**Files:**
- Create: `lib/qni/bloch_inline_renderer.rb`
- Modify: `lib/qni/cli/bloch_command.rb`
- Modify: `features/step_definitions/cli_steps.rb`

- [ ] **Step 1: Add a narrow inline renderer class**

Create `lib/qni/bloch_inline_renderer.rb` that owns:
- checking whether inline output is being attempted on a usable terminal
- deciding between static and animated inline modes
- asking `Qni::BlochRenderer` for PNG bytes or frame arrays
- passing those bytes to `Qni::KittyGraphicsEmitter`

Keep the CLI command thin by moving all inline-specific orchestration here.

- [ ] **Step 2: Add terminal capability policy**

Implement the first-release support check in `Qni::BlochInlineRenderer` with a deliberately strict policy:
- stdout must be a TTY, unless the test seam explicitly forces inline mode
- environment must indicate a Kitty-compatible terminal, with Ghostty treated as supported
- otherwise raise:

```text
inline bloch rendering requires a Kitty-compatible terminal; use --png or --gif instead
```

Use a small helper method so this logic can be unit-tested and adjusted later.

- [ ] **Step 3: Replace the placeholder in `BlochCommand`**

In `lib/qni/cli/bloch_command.rb`, route:
- `--png` / `--gif` to the existing file path
- `--inline` to `Qni::BlochInlineRenderer`
- `--inline --animate` to the animated branch

Keep sampling in one place by reusing the already-built `frames = BlochSampler.new(...).frames`.

- [ ] **Step 4: Run focused cucumber and make the inline scenarios pass**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature
```

Expected: PASS

- [ ] **Step 5: Commit the end-to-end inline path**

```bash
git add lib/qni/bloch_inline_renderer.rb lib/qni/cli/bloch_command.rb features/qni_bloch.feature features/qni_cli.feature features/step_definitions/cli_steps.rb
git commit -m "feat: add inline bloch rendering"
```

### Task 6: Run regression checks and polish the help text

**Files:**
- Modify: `lib/qni/cli/bloch_help.rb`
- Modify: `features/qni_cli.feature`
- Modify: `features/qni_bloch.feature`

- [ ] **Step 1: Re-read the final user-facing help**

Check `lib/qni/cli/bloch_help.rb` and `features/qni_cli.feature` together and make sure they clearly communicate:
- `--inline` for terminal preview
- `--animate` only with `--inline`
- `--png` / `--gif` still require `--output`

Keep wording short and parallel with the existing CLI tone.

- [ ] **Step 2: Run the focused Bloch regression set**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature features/qni_run.feature features/qni_export.feature
```

Expected: PASS

- [ ] **Step 3: Run targeted Ruby quality checks**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rubocop lib/qni/cli/bloch_command.rb lib/qni/cli/bloch_help.rb lib/qni/bloch_renderer.rb lib/qni/bloch_inline_renderer.rb lib/qni/kitty_graphics_emitter.rb test/qni/kitty_graphics_emitter_test.rb test/qni/bloch_renderer_test.rb
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec reek lib/qni/cli/bloch_command.rb lib/qni/bloch_renderer.rb lib/qni/bloch_inline_renderer.rb lib/qni/kitty_graphics_emitter.rb
```

Expected: PASS

- [ ] **Step 4: Run the full project check**

Run:

```bash
bash scripts/setup_symbolic_python.sh
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

Expected: PASS

- [ ] **Step 5: Commit the verification pass**

```bash
git add features/qni_bloch.feature features/qni_cli.feature lib/qni/cli/bloch_help.rb
git commit -m "test: verify inline bloch terminal flow"
```
