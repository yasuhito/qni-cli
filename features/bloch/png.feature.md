# Feature: qni bloch PNG

qni-cli のユーザとして
1 qubit の状態を画像として確認するために
qni bloch --png でブロッホ球 PNG を書き出したい。

## Scenario: qni bloch --png は成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni bloch --png --output bloch.png" を実行
- Then コマンドは成功

## Scenario: qni bloch --png は PNG ファイルを書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni bloch --png --output bloch.png" を実行
- Then "bloch.png" は PNG 画像である

## Scenario: qni bloch --png は透過 PNG ファイルを書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni bloch --png --output bloch.png" を実行
- Then "bloch.png" は透過 PNG 画像である

## Scenario: qni bloch --png は 512x512 の PNG ファイルを書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni bloch --png --output bloch.png" を実行
- Then "bloch.png" の画像サイズは 512x512 である

## Scenario: qni bloch --png --light は成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni bloch --png --light --output bloch-light.png" を実行
- Then コマンドは成功

## Scenario: qni bloch --png --light は PNG ファイルを書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni bloch --png --light --output bloch-light.png" を実行
- Then "bloch-light.png" は PNG 画像である
