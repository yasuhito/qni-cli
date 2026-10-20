# Feature: 折りたたみ時は回路図だけを表示する

Pi で回路の説明を読む人として
組み立てコマンドや画像にならない数式に邪魔されずに
回路図だけを見たい

## Scenario: 折りたたみ時は view を含む一括実行を回路図の画像だけで描く

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで初期状態、ゲート追加、回路表示、LaTeX 実行を一括実行する
- Then 折りたたみ表示は回路図の Image 部品である

## Scenario: 折りたたみ時は初期状態の設定行を描かない

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで初期状態、ゲート追加、回路表示、LaTeX 実行を一括実行する
- Then 折りたたみ表示に初期状態の設定行は無い

## Scenario: 折りたたみ時はゲート追加行を描かない

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで初期状態、ゲート追加、回路表示、LaTeX 実行を一括実行する
- Then 折りたたみ表示にゲート追加行は無い

## Scenario: 折りたたみ時は画像にならない LaTeX を描かない

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで初期状態、ゲート追加、回路表示、LaTeX 実行を一括実行する
- Then 折りたたみ表示に LaTeX のソースは無い

## Scenario: 展開時は初期状態の設定行を描く

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで初期状態、ゲート追加、回路表示、LaTeX 実行を一括実行する
- Then 展開表示に初期状態の設定行がある

## Scenario: 展開時はゲート追加行を描く

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで初期状態、ゲート追加、回路表示、LaTeX 実行を一括実行する
- Then 展開表示にゲート追加行がある

## Scenario: 展開時は画像にならない LaTeX を描く

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで初期状態、ゲート追加、回路表示、LaTeX 実行を一括実行する
- Then 展開表示に LaTeX のソースがある

## Scenario: モデルへ返す本文は実行したコマンド列のままである

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで初期状態、ゲート追加、回路表示、LaTeX 実行を一括実行する
- Then モデルへ返す本文の見出しは実行したコマンド列である

## Scenario: view が無い折りたたみ時もゲート追加行を描く

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで回路追加と LaTeX 実行を一括実行する
- Then 折りたたみ表示にゲート追加行がある

## Scenario: view が無い折りたたみ時は画像にならない LaTeX を描かない

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで回路追加と LaTeX 実行を一括実行する
- Then 折りたたみ表示に LaTeX のソースは無い

## Scenario: view が無い展開時は画像にならない LaTeX を描く

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで回路追加と LaTeX 実行を一括実行する
- Then 展開表示に LaTeX のソースがある

## Scenario: view が無い一括実行でもモデルへ返す本文に LaTeX がある

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで回路追加と LaTeX 実行を一括実行する
- Then モデルへ返す本文に LaTeX のソースがある

## Scenario: 単一実行の折りたたみ時は画像にならない LaTeX を描かない

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールに `["run", "--latex"]` を渡す
- Then 折りたたみ表示に LaTeX のソースは無い

## Scenario: 単一実行の展開時は画像にならない LaTeX を描く

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールに `["run", "--latex"]` を渡す
- Then 展開表示に LaTeX のソースがある

## Scenario: 単一実行でもモデルへ返す本文に LaTeX がある

- Given 画像を返さない pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールに `["run", "--latex"]` を渡す
- Then モデルへ返す本文に LaTeX のソースがある

## Scenario: テキスト経路の折りたたみ時は view の ASCII 図を描く

- Given テキスト経路の pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで初期状態、ゲート追加、回路表示、LaTeX 実行を一括実行する
- Then 折りたたみ表示に回路の ASCII 図がある

## Scenario: テキスト経路の折りたたみ時はゲート追加行を描かない

- Given テキスト経路の pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで初期状態、ゲート追加、回路表示、LaTeX 実行を一括実行する
- Then 折りたたみ表示にゲート追加行は無い

## Scenario: テキスト経路の展開時はゲート追加行を描く

- Given テキスト経路の pi-formula を返す偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When qni ツールで初期状態、ゲート追加、回路表示、LaTeX 実行を一括実行する
- Then 展開表示にゲート追加行がある

## Scenario: 折りたたみ時の呼び出し表示は commands の中身を出さない

- Given 偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When view を含む qni ツールの呼び出し引数を用意する
- Then 折りたたみ時の呼び出し表示は空である

## Scenario: 展開時の呼び出し表示は commands の中身を残す

- Given 偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When view を含む qni ツールの呼び出し引数を用意する
- Then 展開時の呼び出し表示に commands の中身がある

## Scenario: view を含まない折りたたみ時の呼び出し表示は qni だけである

- Given 偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When view を含まない qni ツールの呼び出し引数を用意する
- Then view を含まない折りたたみ時の呼び出し表示は qni だけである
