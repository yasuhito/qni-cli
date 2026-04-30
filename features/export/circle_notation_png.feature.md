# Feature: qni export circle-notation PNG

qni-cli のユーザとして
計算基底の振幅と位相を図で確認できるように
qni export --circle-notation --png を使いたい。

## Scenario: qni export --circle-notation --png は 1 qubit 状態で成功する

- Given "qni state set |+>" を実行
- When "qni export --circle-notation --png --output circles.png" を実行
- Then コマンドは成功

## Scenario: qni export --circle-notation --png は 1 qubit 状態の PNG を書き出す

- Given "qni state set |+>" を実行
- When "qni export --circle-notation --png --output circles.png" を実行
- Then "circles.png" は PNG 画像である

## Scenario: qni export --circle-notation --png は 1 qubit 状態の透過 PNG を書き出す

- Given "qni state set |+>" を実行
- When "qni export --circle-notation --png --output circles.png" を実行
- Then "circles.png" は透過 PNG 画像である

## Scenario: qni export --circle-notation --png は 2 qubit Bell 状態で成功する

- Given "qni state set |Φ+>" を実行
- When "qni export --circle-notation --png --output circles.png" を実行
- Then コマンドは成功

## Scenario: qni export --circle-notation --png は 2 qubit Bell 状態の PNG を書き出す

- Given "qni state set |Φ+>" を実行
- When "qni export --circle-notation --png --output circles.png" を実行
- Then "circles.png" は PNG 画像である

## Scenario: qni export --circle-notation --png は 2 qubit Bell 状態の透過 PNG を書き出す

- Given "qni state set |Φ+>" を実行
- When "qni export --circle-notation --png --output circles.png" を実行
- Then "circles.png" は透過 PNG 画像である

## Scenario: qni export --circle-notation は小さい振幅でも位相針を外円まで描く

- Given "qni state set '0.1|0> + 0.99498743710662|1>'" を実行
- When "qni export --circle-notation --png --light --output circles.png" を実行
- Then circle notation renderer では振幅 0.1 の位相針の長さは外円の半径に等しい

## Scenario: qni export --circle-notation は外円の輪郭線を内側へ食い込ませない

- Given "qni state set '0.1|0> + 0.99498743710662|1>'" を実行
- When "qni export --circle-notation --png --light --output circles.png" を実行
- Then circle notation renderer では外円の輪郭線は内側へ食い込まない

## Scenario: qni export --circle-notation は正の実数振幅の位相針を上向きに描く

- Given "qni state set '|+>'" を実行
- When "qni export --circle-notation --png --light --output circles.png" を実行
- Then circle notation renderer では正の実数振幅の位相針は上を向く

## Scenario: qni export --circle-notation は正の虚数振幅の位相針を左向きに描く

- Given "qni state set '|+>'" を実行
- When "qni export --circle-notation --png --light --output circles.png" を実行
- Then circle notation renderer では正の虚数振幅の位相針は左を向く

## Scenario: qni export --circle-notation は振幅が 0 のとき位相針を描かない

- Given 空の 1 qubit 回路がある
- When "qni export --circle-notation --png --light --output circles.png" を実行
- Then circle notation renderer では振幅 0 のとき位相針は描画されない

## Scenario: qni export --circle-notation は振幅が 0 のとき中心ドットを描かない

- Given 空の 1 qubit 回路がある
- When "qni export --circle-notation --png --light --output circles.png" を実行
- Then circle notation renderer では振幅 0 のとき中心ドットも描画されない

## Scenario: qni export --circle-notation --png は state-vector PNG と異なる画像を書き出す

- Given "qni state set |Φ+>" を実行
- When "qni export --circle-notation --png --output circles.png" を実行
- When "qni export --state-vector --png --output state.png" を実行
- Then "circles.png" と "state.png" は異なるファイル内容である
