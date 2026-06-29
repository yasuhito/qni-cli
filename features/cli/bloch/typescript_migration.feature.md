# Feature: qni bloch TypeScript 移行

qni-cli の保守者として
Bloch PNG / APNG / inline の移行で Ruby 実装との差分を見落とさないように
TypeScript route と Ruby oracle の安定した性質を比較したい。

## Scenario: TypeScript route の qni bloch --png は Ruby oracle と同じ終了ステータスを返す

- Given "qni add H --qubit 0 --step 0" を実行
- When TypeScript route と Ruby oracle で "qni bloch --png --output bloch.png" を比較実行
- Then TypeScript route の終了ステータスは Ruby oracle と同じ

## Scenario: TypeScript route の qni bloch --png は Ruby oracle と同じ標準出力を返す

- Given "qni add H --qubit 0 --step 0" を実行
- When TypeScript route と Ruby oracle で "qni bloch --png --output bloch.png" を比較実行
- Then TypeScript route の標準出力は Ruby oracle と同じ

## Scenario: TypeScript route の qni bloch --png は Ruby oracle と同じ標準エラーを返す

- Given "qni add H --qubit 0 --step 0" を実行
- When TypeScript route と Ruby oracle で "qni bloch --png --output bloch.png" を比較実行
- Then TypeScript route の標準エラーは Ruby oracle と同じ

## Scenario: TypeScript route の qni bloch --png は Ruby oracle と同じ画像サイズを書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When TypeScript route と Ruby oracle で "qni bloch --png --output bloch.png" を比較実行
- Then TypeScript route の "bloch.png" の画像サイズは Ruby oracle と同じ

## Scenario: TypeScript route の qni bloch --png は Ruby oracle と同じ透過属性を書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When TypeScript route と Ruby oracle で "qni bloch --png --output bloch.png" を比較実行
- Then TypeScript route の "bloch.png" の透過属性は Ruby oracle と同じ

## Scenario: TypeScript route の qni bloch --png --trajectory は Ruby oracle と同じ軌跡色を書き出す

- Given "qni add X --qubit 0 --step 0" を実行
- When TypeScript route と Ruby oracle で "qni bloch --png --trajectory --light --output bloch-trajectory.png" を比較実行
- Then TypeScript route の "bloch-trajectory.png" の色 "#0f766e" の有無は Ruby oracle と同じ

## Scenario: TypeScript route の qni bloch --apng は Ruby oracle と同じ APNG フレーム数を書き出す

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- When TypeScript route と Ruby oracle で "qni bloch --apng --output bloch.png" を比較実行
- Then TypeScript route の "bloch.png" の APNG フレーム数は Ruby oracle と同じ

## Scenario: TypeScript route の qni bloch --inline は Ruby oracle と同じ Kitty graphics escape sequence を返す

- Given "qni add H --qubit 0 --step 0" を実行
- Given 環境変数 "QNI_TEST_FORCE_INLINE" を "1" に設定する
- When TypeScript route と Ruby oracle で "qni bloch --inline" を TTY 比較実行
- Then TypeScript route の Kitty graphics escape sequence 数は Ruby oracle と同じ

## Scenario: TypeScript route の qni bloch エラーは Ruby oracle と同じエラーメッセージを返す

- Given 空の 2 qubit 回路がある
- When TypeScript route と Ruby oracle で "qni bloch --png --output bloch.png" を比較実行
- Then TypeScript route の標準エラーは Ruby oracle と同じ

## Scenario: QNI_USE_RUBY=1 の qni bloch は Ruby fallback で PNG を書き出す

- Given 環境変数 "QNI_USE_RUBY" を "1" に設定する
- Given "qni add H --qubit 0 --step 0" を実行
- When "qni bloch --png --output bloch.png" を実行
- Then "bloch.png" は PNG 画像である
