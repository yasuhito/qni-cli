# Feature: 超密度符号化を端から端まで実行する

qni-cli の利用者として、回路内で生成したランダムな2ビットを Bell 対へ符号化し、
受信側で復号した2ビットが各ショットで元の入力と一致することを確認したい。

## Background:

- Given リポジトリの qni コマンド列 "examples/superdense-coding/circuit.qni" を実行

## Scenario: 固定シードの通常出力で4種類の入力と一致する復号結果を確認できる

- When "qni run --shots 16 --seed 42" を実行
- Then 標準出力:

  ```text
  input_high | input_low | output_high | output_low | count
  0          | 0         | 0           | 0          | 4
  0          | 1         | 0           | 1          | 3
  1          | 0         | 1           | 0          | 6
  1          | 1         | 1           | 1          | 3
  ```

## Scenario: 固定シードの JSON 出力で4種類の入力と一致する復号結果を確認できる

- When "qni run --shots 16 --seed 42 --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "shots": 16,
    "seed": 42,
    "classicalBits": ["input_high", "input_low", "output_high", "output_low"],
    "results": [
      {
        "values": {"input_high": 0, "input_low": 0, "output_high": 0, "output_low": 0},
        "count": 4
      },
      {
        "values": {"input_high": 0, "input_low": 1, "output_high": 0, "output_low": 1},
        "count": 3
      },
      {
        "values": {"input_high": 1, "input_low": 0, "output_high": 1, "output_low": 0},
        "count": 6
      },
      {
        "values": {"input_high": 1, "input_low": 1, "output_high": 1, "output_low": 1},
        "count": 3
      }
    ]
  }
  ```

## Scenario: 回路表示で入力生成、もつれ、符号化、復号、測定を追える

- When "qni view" を実行
- Then 標準出力:

  ```text
      ┌───┐┌────────────────────┐
  q0: ┤ H ├┤ Measure>input_high ├──────────────────────────────────────────────────────────────────────────
      ├───┤├───────────────────┬┘
  q1: ┤ H ├┤ Measure>input_low ├───────────────────────────────────────────────────────────────────────────
      └───┘└───────────────────┘ ┌───┐     ┌──────────────┐┌─────────────┐     ┌───┐┌─────────────────────┐
  q2: ───────────────────────────┤ H ├──■──┤ Z<input_high ├┤ X<input_low ├──■──┤ H ├┤ Measure>output_high ├
                                 └───┘┌─┴─┐└──────────────┘└─────────────┘┌─┴─┐└───┘├────────────────────┬┘
  q3: ────────────────────────────────┤ X ├───────────────────────────────┤ X ├─────┤ Measure>output_low ├─
                                      └───┘                               └───┘     └────────────────────┘
  ```

## Scenario: 画像の描画元に名前付き測定を含む

- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  $>\mathrm{output\_high}$
  ```

## Scenario: 画像の描画元に古典条件付き符号化を含む

- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  \mathrm{Z}<\mathrm{input\_high}
  ```

## Scenario: 測定と古典制御を含む回路画像を生成できる

- When "qni export --png --light --output superdense-coding.png" を実行
- Then "superdense-coding.png" は PNG 画像である
