# Feature: qni bloch APNG

qni-cli のユーザとして
1 qubit の状態変化をアニメーションで確認できるように
qni bloch --apng でブロッホ球 APNG を書き出したい。

## Scenario: qni bloch --apng は回転ゲートを含む 1 qubit 回路で成功する

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- When "qni bloch --apng --output bloch.png" を実行
- Then コマンドは成功

## Scenario: qni bloch --apng は回転ゲートを含む 1 qubit 回路の APNG を書き出す

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- When "qni bloch --apng --output bloch.png" を実行
- Then "bloch.png" は APNG 画像である

## Scenario: qni bloch --apng は回転ゲートを含む 1 qubit 回路を複数フレームで書き出す

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- When "qni bloch --apng --output bloch.png" を実行
- Then "bloch.png" は 2 フレーム以上の APNG 画像である

## Scenario: qni bloch --apng は S ゲートの位相回転で成功する

- Given "qni state set \"|+>\"" を実行
- Given "qni add S --qubit 0 --step 0" を実行
- When "qni bloch --apng --output bloch-s.png" を実行
- Then コマンドは成功

## Scenario: qni bloch --apng は S ゲートの位相回転を APNG で書き出す

- Given "qni state set \"|+>\"" を実行
- Given "qni add S --qubit 0 --step 0" を実行
- When "qni bloch --apng --output bloch-s.png" を実行
- Then "bloch-s.png" は APNG 画像である

## Scenario: qni bloch --apng は S ゲートの位相回転も段階的にアニメーションする

- Given "qni state set \"|+>\"" を実行
- Given "qni add S --qubit 0 --step 0" を実行
- When "qni bloch --apng --output bloch-s.png" を実行
- Then "bloch-s.png" は 3 フレーム以上の APNG 画像である
