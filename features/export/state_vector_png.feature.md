# Feature: qni export state-vector PNG

qni-cli のユーザとして
回路の最終状態を数式画像として保存できるように
qni export --state-vector --png を使いたい。

## Scenario: qni export --state-vector --png は成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --state-vector --png --output state.png" を実行
- Then コマンドは成功

## Scenario: qni export --state-vector --png は PNG ファイルを書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --state-vector --png --output state.png" を実行
- Then "state.png" は PNG 画像である

## Scenario: qni export --state-vector --png は透過 PNG ファイルを書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --state-vector --png --output state.png" を実行
- Then "state.png" は透過 PNG 画像である

## Scenario: qni export --state-vector --png は回路 PNG と異なる画像を書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --png --output circuit.png" を実行
- When "qni export --state-vector --png --output state.png" を実行
- Then "circuit.png" と "state.png" は異なるファイル内容である

## Scenario: qni export --state-vector --png は 3 qubit 回路の状態ベクトル画像を書き出す

- Given 空の 3 qubit 回路がある
- When "qni export --state-vector --png --output state.png" を実行
- Then "state.png" は PNG 画像である
