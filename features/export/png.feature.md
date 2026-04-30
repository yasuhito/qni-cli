# Feature: qni export PNG

qni-cli のユーザとして
回路図を画像として保存できるように
qni export --png で通常回路 PNG を書き出したい。

## Scenario: qni export --png --light は成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --png --light --output circuit.png" を実行
- Then コマンドは成功

## Scenario: qni export --png --light は標準出力を空にする

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --png --light --output circuit.png" を実行
- Then 標準出力は空

## Scenario: qni export --png --light は PNG ファイルを書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --png --light --output circuit.png" を実行
- Then "circuit.png" は PNG 画像である

## Scenario: qni export --png は透過 PNG ファイルを書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --png --output circuit.png" を実行
- Then "circuit.png" は透過 PNG 画像である

## Scenario: qni export --png --no-transparent は不透過 PNG ファイルを書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --png --light --no-transparent --output circuit.png" を実行
- Then "circuit.png" は不透過 PNG 画像である

## Scenario: qni export --png は 1x1 回路を 64x64 で書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --png --output circuit.png" を実行
- Then "circuit.png" の画像サイズは 64x64 である

## Scenario: qni export --png は 2x2 回路を 128x128 で書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- Given "qni add H --qubit 1 --step 1" を実行
- When "qni export --png --output circuit.png" を実行
- Then "circuit.png" の画像サイズは 128x128 である
