# qni bloch APNG Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace animated Bloch-sphere GIF export with native APNG export and remove `--gif` from `qni bloch`.

**Architecture:** Keep the existing Bloch sampling and inline Kitty rendering model, but change file-output animation to native APNG. Ruby will switch the CLI surface from `--gif` to `--apng`, and Python will write animated PNG directly from RGBA frame images instead of palette-reduced GIF frames.

**Tech Stack:** Ruby, Thor, Cucumber, Minitest, Python, matplotlib, Pillow, existing `BlochSampler` / `BlochRenderer` infrastructure

---

### Task 1: Rewrite the acceptance surface from GIF to APNG

**Files:**
- Modify: `features/qni_bloch.feature`
- Modify: `features/qni_cli.feature`
- Modify: `features/step_definitions/cli_steps.rb`

- [ ] **Step 1: Replace GIF scenarios with APNG scenarios**

In `features/qni_bloch.feature`, rewrite the animated file-output coverage so it uses:

```text
qni bloch --apng --output bloch.png
```

Cover:
- APNG export succeeds for a rotation circuit
- the output file is an animated PNG
- the animated PNG has 2 frames or more
- `--png` and `--apng` together fail
- `--animate` without `--inline` still fails if paired with `--apng`

- [ ] **Step 2: Update CLI help expectations**

In `features/qni_cli.feature`, replace all `--gif` mentions with `--apng`, including:
- `qni bloch --help`
- top-level command summaries if needed
- usage/examples/options text

- [ ] **Step 3: Add APNG assertion helpers**

Extend `features/step_definitions/cli_steps.rb` with steps like:

```ruby
Then('{string} は APNG 画像である') do |path|
  output = `file #{Shellwords.escape(actual_path)}`
  raise unless output.include?('animated')
end
```

and:

```ruby
Then('{string} は {int} フレーム以上の APNG 画像である') do |path, minimum_frames|
  # inspect with Pillow or a tiny Python helper
end
```

Keep the implementation parallel to the existing PNG/GIF helpers.

- [ ] **Step 4: Run cucumber and confirm RED**

Run: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature`

Expected: FAIL because the CLI still speaks `--gif`.

- [ ] **Step 5: Commit the red tests**

```bash
git add features/qni_bloch.feature features/qni_cli.feature features/step_definitions/cli_steps.rb
git commit -m "test: switch bloch acceptance from gif to apng"
```

### Task 2: Change the CLI and help surface to `--apng`

**Files:**
- Modify: `lib/qni/cli.rb`
- Modify: `lib/qni/cli/bloch_command.rb`
- Modify: `lib/qni/cli/bloch_help.rb`

- [ ] **Step 1: Replace the Thor option**

In `lib/qni/cli.rb`, remove:

```ruby
method_option :gif, ...
```

and add:

```ruby
method_option :apng, type: :boolean, default: false, desc: 'Write a Bloch sphere APNG'
```

- [ ] **Step 2: Update format validation**

In `lib/qni/cli/bloch_command.rb`:
- replace `:gif` with `:apng` in `FILE_FORMATS`
- update the mutually-exclusive format error text to:

```text
choose exactly one of --png, --apng, or --inline
```

- [ ] **Step 3: Update format selection**

Make file output choose:

```ruby
option_enabled?(:apng) ? 'apng' : 'png'
```

No GIF fallback should remain.

- [ ] **Step 4: Rewrite help text**

In `lib/qni/cli/bloch_help.rb`, replace every GIF mention with APNG:
- usage
- overview
- options
- examples

- [ ] **Step 5: Run focused cucumber and get GREEN on CLI/help**

Run: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature`

Expected: CLI/help scenarios pass, but APNG file rendering may still fail until the renderer is updated.

- [ ] **Step 6: Commit the CLI rename**

```bash
git add lib/qni/cli.rb lib/qni/cli/bloch_command.rb lib/qni/cli/bloch_help.rb
git commit -m "feat: replace bloch gif option with apng"
```

### Task 3: Write native APNG from RGBA Bloch frames

**Files:**
- Modify: `lib/qni/bloch_renderer.rb`
- Modify: `libexec/qni_bloch_render.py`
- Modify: `test/qni/bloch_renderer_test.rb`
- Test: `features/qni_bloch.feature`

- [ ] **Step 1: Add a failing renderer test for APNG**

In `test/qni/bloch_renderer_test.rb`, add coverage that:
- `format: 'apng'` is accepted
- the renderer writes an animated PNG payload or file

Keep the test small and contract-focused.

- [ ] **Step 2: Update Ruby-side renderer format handling**

In `lib/qni/bloch_renderer.rb`:
- treat `apng` as a file-rendered format
- stop mentioning `gif`
- preserve `inline_png` and `inline_frames` as-is

- [ ] **Step 3: Replace GIF writing with native APNG writing in Python**

In `libexec/qni_bloch_render.py`:
- remove the `gif` branch
- add an `apng` branch
- render all RGBA frames with `render_frame_image(...)`
- save them directly as animated PNG with Pillow using `save_all=True`
- keep the static `png` and inline paths unchanged

The target shape is:

```python
if format_name == "apng":
    images = [render_frame_image(...) ...]
    images[0].save(
        output_path,
        format="PNG",
        save_all=True,
        append_images=images[1:],
        duration=[90] * len(images),
        loop=0,
        default_image=False,
    )
```

Use the full RGBA frames directly; do not route through GIF or indexed-color conversion.

- [ ] **Step 4: Verify renderer tests**

Run: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/bloch_renderer_test.rb`

Expected: PASS

- [ ] **Step 5: Verify bloch acceptance**

Run: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature`

Expected: PASS

- [ ] **Step 6: Run the full check**

Run: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check`

Expected:
- RuboCop clean
- Reek clean
- full Cucumber suite green

- [ ] **Step 7: Commit the native APNG renderer**

```bash
git add lib/qni/bloch_renderer.rb libexec/qni_bloch_render.py test/qni/bloch_renderer_test.rb
git commit -m "feat: export bloch animations as apng"
```
