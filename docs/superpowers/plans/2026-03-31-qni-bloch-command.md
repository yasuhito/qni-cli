# qni bloch PNG/GIF Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `qni bloch` so the current 1-qubit state can be exported as a Bloch-sphere PNG or GIF.

**Architecture:** Add a dedicated `qni bloch` command rather than extending `qni export`. Ruby will validate CLI options, load the circuit, numerically sample 1-qubit state evolution, convert those samples into Bloch coordinates via expectation values, and pass a compact JSON payload to a new Python renderer. Python will use `matplotlib` to render either a single PNG frame or an animated GIF.

**Tech Stack:** Ruby, Thor, Cucumber, Minitest, Python, matplotlib, Pillow, existing `StateVector` / `Simulator` infrastructure

---

### Task 1: Add failing acceptance coverage for the new command

**Files:**
- Create: `features/qni_bloch.feature`
- Modify: `features/qni_cli.feature`
- Modify: `features/step_definitions/cli_steps.rb`

- [ ] **Step 1: Add `qni bloch` help coverage**

Add a new scenario to `features/qni_cli.feature` that expects the top-level `qni` help to list:

```text
qni bloch    # Render the current 1-qubit state on the Bloch sphere
```

and a scenario for `qni bloch --help` that expects usage along these lines:

```text
Usage:
  qni bloch --png --output bloch.png
  qni bloch --gif --output bloch.gif
```

- [ ] **Step 2: Add behavior scenarios to `features/qni_bloch.feature`**

Add scenarios for:
- `qni bloch --png --output bloch.png` succeeds for a 1-qubit circuit and writes a PNG
- `qni bloch --gif --output bloch.gif` succeeds for a 1-qubit rotation circuit and writes a GIF
- `qni bloch --light` also writes an image successfully
- 2-qubit circuits fail with a clear `bloch currently supports only 1-qubit circuits` message
- unresolved angle variables fail with a clear numeric-resolution error
- `--png` and `--gif` together fail

- [ ] **Step 3: Add a GIF assertion helper**

Extend `features/step_definitions/cli_steps.rb` with a step like:

```ruby
Then('{string} は GIF 画像である') do |path|
  signature = File.binread(actual_path, 6)
  expect(signature).to eq("GIF89a".b).or eq("GIF87a".b)
end
```

Keep it parallel to the existing PNG assertions.

- [ ] **Step 4: Run focused cucumber and confirm failure**

Run: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature`

Expected: FAIL because the `qni bloch` command and GIF support do not exist yet.

### Task 2: Add the CLI surface for `qni bloch`

**Files:**
- Modify: `lib/qni/cli.rb`
- Create: `lib/qni/cli/bloch_command.rb`
- Create: `lib/qni/cli/bloch_help.rb`

- [ ] **Step 1: Add the Thor entrypoint**

In `lib/qni/cli.rb`, add:

```ruby
desc 'bloch', 'Render the current 1-qubit state on the Bloch sphere'
method_option :png, type: :boolean, default: false, desc: 'Write a Bloch sphere PNG'
method_option :gif, type: :boolean, default: false, desc: 'Write a Bloch sphere GIF'
method_option :dark, type: :boolean, default: false, desc: 'Draw light content for dark backgrounds'
method_option :light, type: :boolean, default: false, desc: 'Draw dark content for light backgrounds'
method_option :output, type: :string, desc: 'Write to this path'
def bloch
  output = BlochCommand.new(circuit_file: current_circuit_file, bloch_options: options).execute
  write_output(output)
end
```

- [ ] **Step 2: Add shared help text**

Create `lib/qni/cli/bloch_help.rb` mirroring `export_help.rb` / `state_help.rb`, with:
- usage
- overview
- options
- examples for both PNG and GIF

- [ ] **Step 3: Add option validation**

Create `lib/qni/cli/bloch_command.rb` with validation rules:
- exactly one of `--png` / `--gif`
- `--output` is required
- at most one of `--dark` / `--light`

Raise `Thor::Error` messages that match the feature text exactly.

- [ ] **Step 4: Return a clear placeholder failure for unimplemented rendering**

For now, make `BlochCommand#execute` fail with a temporary message like:

```ruby
raise Thor::Error, 'bloch rendering is not implemented yet'
```

This keeps the CLI shape stable while the next tasks fill in the renderer.

- [ ] **Step 5: Run focused cucumber again**

Run: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature`

Expected: help scenarios pass; rendering scenarios still fail on the placeholder.

### Task 3: Add Ruby-side Bloch sampling for 1-qubit circuits

**Files:**
- Create: `lib/qni/bloch_sampler.rb`
- Modify: `lib/qni/simulator.rb`
- Modify: `lib/qni/state_vector.rb`
- Test: `test/qni/bloch_sampler_test.rb`

- [ ] **Step 1: Add a failing unit test for static sampling**

Create `test/qni/bloch_sampler_test.rb` with tests such as:

```ruby
def test_zero_state_maps_to_positive_z
  sampler = Qni::BlochSampler.new(circuit_hash_for('|0>'))
  frames = sampler.frames
  assert_equal [0.0, 0.0, 1.0], frames.first.fetch('vector')
end
```

and:

```ruby
def test_h_gate_ends_at_positive_x
  sampler = Qni::BlochSampler.new(circuit_hash_for_h)
  assert_equal [1.0, 0.0, 0.0], sampler.frames.last.fetch('vector')
end
```

- [ ] **Step 2: Add a failing unit test for rotation interpolation**

Add a test that `Ry(theta)` or `Ry(pi/2)` produces more than two frames and that the final vector matches the expected endpoint.

- [ ] **Step 3: Expose the state data needed for Bloch coordinates**

Choose the smallest change that keeps `StateVector` encapsulated. Prefer adding a focused helper like:

```ruby
def bloch_coordinates
  [
    expectation('X'),
    expectation('Y'),
    expectation('Z')
  ]
end
```

instead of exposing raw amplitudes broadly.

- [ ] **Step 4: Implement `Qni::BlochSampler`**

`BlochSampler` should:
- reject non-1-qubit circuits
- build the starting numeric `StateVector`
- sample the initial state
- sample each step result
- for angled gates `P`, `Rx`, `Ry`, `Rz`, add intermediate states by subdividing the gate angle into a small fixed number of samples, such as 12

Keep the first version simple:
- fixed gates only contribute step-boundary frames
- one-qubit circuits only
- use the same numeric angle resolution rules as `Simulator`

- [ ] **Step 5: Run the unit test and make it pass**

Run: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/bloch_sampler_test.rb`

Expected: PASS

### Task 4: Add the Python renderer and dependency setup

**Files:**
- Create: `libexec/qni_bloch_render.py`
- Modify: `scripts/setup_symbolic_python.sh`
- Test: `test/qni/bloch_sampler_test.rb`

- [ ] **Step 1: Extend the Python environment bootstrap**

Modify `scripts/setup_symbolic_python.sh` so the venv ensures:

```text
sympy==1.14.0
matplotlib==<pinned version>
pillow==<pinned version>
```

Keep the script idempotent, just like today.

- [ ] **Step 2: Add a small renderer contract test on the Ruby side**

Extend `test/qni/bloch_sampler_test.rb` or add a new test file that verifies the JSON payload shape sent to Python, for example:

```ruby
assert_equal 'png', payload.fetch('format')
assert_equal [0.0, 0.0, 1.0], payload.fetch('frames').first.fetch('vector')
```

This keeps the Ruby/Python boundary explicit.

- [ ] **Step 3: Implement `libexec/qni_bloch_render.py`**

The script should:
- read a JSON payload from stdin
- render a Bloch sphere with `matplotlib`
- write either PNG or GIF to the requested output path
- use transparent background
- theme labels/axes based on `dark` vs `light`

For GIF:
- reuse the provided frame list
- animate the state vector and optional trail
- save with Pillow-based animation support

- [ ] **Step 4: Verify Python syntax**

Run: `python3 -m py_compile libexec/qni_bloch_render.py`

Expected: exit 0

### Task 5: Wire the command to the renderer

**Files:**
- Modify: `lib/qni/cli/bloch_command.rb`
- Create: `lib/qni/bloch_renderer.rb`
- Modify: `lib/qni/cli.rb`

- [ ] **Step 1: Add a dedicated Ruby renderer wrapper**

Create `lib/qni/bloch_renderer.rb` responsible only for:
- choosing the Python executable from `.python-symbolic`
- serializing the payload
- calling `libexec/qni_bloch_render.py`
- surfacing stdout/stderr failures as Ruby errors

- [ ] **Step 2: Finish `BlochCommand#execute`**

Replace the placeholder with real behavior:
- load `circuit.json`
- build frames through `Qni::BlochSampler`
- pass theme / format / output path into `Qni::BlochRenderer`

- [ ] **Step 3: Ensure unresolved variables fail clearly**

If numeric resolution fails, surface the same underlying angle-resolution error rather than inventing a second wording. Keep the feature text aligned to the existing error if practical.

- [ ] **Step 4: Re-run focused cucumber**

Run: `bash scripts/setup_symbolic_python.sh`

Then run: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature`

Expected: PASS

### Task 6: Tighten image assertions and regression coverage

**Files:**
- Modify: `features/qni_bloch.feature`
- Modify: `features/step_definitions/cli_steps.rb`
- Modify: touched files only if cleanup is needed

- [ ] **Step 1: Add at least one stronger PNG assertion**

Add one more acceptance check beyond file existence, such as:
- PNG size is `512x512`
- GIF file differs from a PNG file for the same circuit

Reuse `identify`-based assertions where possible.

- [ ] **Step 2: Add at least one stronger GIF assertion**

Add a small helper that checks multi-frame GIFs with ImageMagick, for example:

```ruby
output, status = Open3.capture2('identify', '-format', '%n', actual_path)
```

and assert the frame count is greater than 1 for a rotation GIF.

- [ ] **Step 3: Re-run the focused feature set**

Run: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature`

Expected: PASS

### Task 7: Run the full affected verification set

**Files:**
- Modify: touched files only if cleanup is needed

- [ ] **Step 1: Run focused Ruby lint**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rubocop \
  lib/qni/cli.rb \
  lib/qni/cli/bloch_command.rb \
  lib/qni/cli/bloch_help.rb \
  lib/qni/bloch_sampler.rb \
  lib/qni/bloch_renderer.rb \
  lib/qni/state_vector.rb \
  lib/qni/simulator.rb \
  features/step_definitions/cli_steps.rb \
  test/qni/bloch_sampler_test.rb
```

Expected: no offenses

- [ ] **Step 2: Run focused tests**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/bloch_sampler_test.rb
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_bloch.feature \
  features/qni_cli.feature \
  features/qni_export.feature \
  features/qni_run.feature \
  features/katas/basic_gates/amplitude_change.feature
```

Expected: PASS

- [ ] **Step 3: Run the full project check**

Run:

```bash
bash scripts/setup_symbolic_python.sh
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add features/qni_bloch.feature features/qni_cli.feature features/step_definitions/cli_steps.rb \
  lib/qni/cli.rb lib/qni/cli/bloch_command.rb lib/qni/cli/bloch_help.rb \
  lib/qni/bloch_sampler.rb lib/qni/bloch_renderer.rb lib/qni/state_vector.rb lib/qni/simulator.rb \
  libexec/qni_bloch_render.py scripts/setup_symbolic_python.sh test/qni/bloch_sampler_test.rb
git commit -m "feat: add qni bloch PNG and GIF export"
```
