# Feature: qni bloch help

qni-cli のユーザとして
ブロッホ球出力の使い方を迷わず選べるように
qni bloch の help で利用できる出力形式と option を確認したい。

## Scenario: qni bloch --help は成功する

- When "qni bloch --help" を実行
- Then コマンドは成功

## Scenario: qni bloch --help は bloch コマンドの使い方を表示

- When "qni bloch --help" を実行
- Then 標準出力:

  ```text
  Usage:
    qni bloch --png --output bloch.png
    qni bloch --png --trajectory --output bloch.png
    qni bloch --apng --output bloch.png
    qni bloch --inline
    qni bloch --inline --animate

  Overview:
    Render the current 1-qubit state on the Bloch sphere.
    --png writes a static Bloch sphere image.
    --apng writes an animated Bloch sphere showing state evolution.
    --inline draws the Bloch sphere directly in a Kitty-compatible terminal.
    The first release supports only 1-qubit circuits with fully resolved numeric parameters.

  Options:
    --png           # write a Bloch sphere PNG
    --apng          # write a Bloch sphere APNG
    --inline        # render a Bloch sphere inline in a Kitty-compatible terminal
    --animate       # animate inline Bloch output; valid only with --inline
    --trajectory    # draw the sampled state-evolution trail on the Bloch sphere
    --dark          # draw light content for dark backgrounds (default)
    --light         # draw dark content for light backgrounds
    [--output=PATH] # output file path; required for --png and --apng

  Examples:
    qni bloch --png --output bloch.png
    qni bloch --png --trajectory --output bloch.png
    qni bloch --apng --output bloch.png
    qni bloch --png --light --output bloch.png
    qni bloch --inline
    qni bloch --inline --animate
  ```

## Scenario: qni bloch は成功する

- When "qni bloch" を実行
- Then コマンドは成功

## Scenario: qni bloch は bare command help を表示

- When "qni bloch" を実行
- Then 標準出力:

  ```text
  Usage:
    qni bloch --png --output bloch.png
    qni bloch --png --trajectory --output bloch.png
    qni bloch --apng --output bloch.png
    qni bloch --inline
    qni bloch --inline --animate

  Overview:
    Render the current 1-qubit state on the Bloch sphere.
    --png writes a static Bloch sphere image.
    --apng writes an animated Bloch sphere showing state evolution.
    --inline draws the Bloch sphere directly in a Kitty-compatible terminal.
    The first release supports only 1-qubit circuits with fully resolved numeric parameters.

  Options:
    --png           # write a Bloch sphere PNG
    --apng          # write a Bloch sphere APNG
    --inline        # render a Bloch sphere inline in a Kitty-compatible terminal
    --animate       # animate inline Bloch output; valid only with --inline
    --trajectory    # draw the sampled state-evolution trail on the Bloch sphere
    --dark          # draw light content for dark backgrounds (default)
    --light         # draw dark content for light backgrounds
    [--output=PATH] # output file path; required for --png and --apng

  Examples:
    qni bloch --png --output bloch.png
    qni bloch --png --trajectory --output bloch.png
    qni bloch --apng --output bloch.png
    qni bloch --png --light --output bloch.png
    qni bloch --inline
    qni bloch --inline --animate
  ```
