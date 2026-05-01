# Feature: qni bloch trajectory PNG

qni-cli のユーザとして
1 qubit の状態変化を静止画でも確認できるように
qni bloch --png --trajectory でブロッホ球 PNG に軌跡を描きたい。

## Scenario: qni bloch --png --trajectory は X ゲートのブロッホ球 PNG で成功する

- Given "qni add X --qubit 0 --step 0" を実行
- When "qni bloch --png --trajectory --light --output bloch-trajectory.png" を実行
- Then コマンドは成功

## Scenario: qni bloch --png --trajectory は X ゲートのブロッホ球 PNG を書き出す

- Given "qni add X --qubit 0 --step 0" を実行
- When "qni bloch --png --trajectory --light --output bloch-trajectory.png" を実行
- Then "bloch-trajectory.png" は PNG 画像である

## Scenario: qni bloch --png --trajectory は X ゲートのブロッホ球 PNG に軌跡色を描く

- Given "qni add X --qubit 0 --step 0" を実行
- When "qni bloch --png --trajectory --light --output bloch-trajectory.png" を実行
- Then "bloch-trajectory.png" は色 "#0f766e" のピクセルを含む

## Scenario: qni bloch --png --trajectory は X ゲートの通常 PNG とは異なるファイルを書き出す

- Given "qni add X --qubit 0 --step 0" を実行
- When "qni bloch --png --light --output bloch.png" を実行
- When "qni bloch --png --trajectory --light --output bloch-trajectory.png" を実行
- Then "bloch.png" と "bloch-trajectory.png" は異なるファイル内容である
