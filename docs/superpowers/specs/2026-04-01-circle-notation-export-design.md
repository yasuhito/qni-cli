# Circle Notation Export Design

## Problem

`qni-cli` は現在、

- 回路図の PNG 出力
- symbolic state vector の PNG 出力
- 1 qubit 用 Bloch 球出力

を持っているが、Qni 本家の tutorial で使っている circle notation を CLI から書き出す手段がない。

そのため、Task 1.8 以降の Bell 状態の説明では、

- 2 qubit の計算基底ごとの振幅
- 振幅の大きさと位相
- Bell 状態でどの基底成分に重みがあるか

を Obsidian へ貼りやすい静止画像として生成できない。

一方で [../qni](/home/yasuhito/Work/qni) には circle notation の既存実装と docs があり、Qni 全体としてはこの表現がすでにユーザーに馴染んでいる。

## Goal

- `qni-cli` に circle notation の PNG 書き出しを追加する
- CLI 形は既存の export 系に寄せる
- 1 qubit / 2 qubit の計算基底 state vector を circle notation に変換できるようにする
- Quantum Katas Task 1.8〜1.10 の説明図にそのまま使えるところまでを最初の到達点にする

## Non-Goals

- HTML / Web Component を直接再利用すること
- SVG, APNG, interactive popup まで同時に対応すること
- 3 qubit 以上を最初のスコープに含めること
- Bell 基底を別レイアウトで特別扱いすること

## Approaches Considered

### 1. `../qni` の Web Component を headless render する

- 見た目の互換性は高い
- 既存資産を使える
- ただし Node / browser rendering 依存が増え、`qni-cli` 単体としては重くなる

### 2. `qni-cli` で circle notation を再実装する

- Ruby / Python の既存 export pipeline に自然に乗せやすい
- 将来 `qni-cli` を Qni に統合する前提とも整合する
- 見た目の微差は出るが、notation 自体は比較的単純で再実装コストも抑えられる

### 3. 新コマンド `qni circle` を追加する

- コマンドの意味は明快
- ただし export まわりの責務が分かれ、既存の `qni export --state-vector` と並ばない

## Decision

Approach 2 を採用し、CLI 形は export 拡張にする。

具体的には:

- `qni export --circle-notation --png --output state.png`
- `--circle-notation` と `--state-vector` は排他的
- 最初は `--png` のみ
- 1 qubit / 2 qubit のみ対応

この形なら、

- 既存の `ExportCommand` に収まりがよい
- Obsidian 用の静止画像生成に直結する
- 将来 `qni-cli` の renderer を Qni 本体側へ寄せる余地も残る

## Rendering Model

circle notation renderer は simulator の最終 state vector を入力に取り、計算基底の各 basis state について次を描く。

- ket label
- 振幅の大きさ
- 位相

最初の実装では、Qni 本家と同じ概念を保ちながら、表現を必要最小限にする。

- 円の大きさ: 確率振幅の絶対値に対応
- 針または線分の向き: 位相に対応
- 1 qubit は 2 個の円、2 qubit は 4 個の円
- 1 行レイアウトで十分

## CLI Surface

期待する使用例:

```bash
qni export --circle-notation --png --output state.png
```

validation:

- `--circle-notation` は `--png` と一緒でなければならない
- `--circle-notation` と `--state-vector` は同時指定不可
- 最初は 1 qubit / 2 qubit のみ対応

## Acceptance Shape

先に `features/qni_export.feature` へ次を追加する。

1. `qni export --circle-notation --png` は PNG を書き出す
2. `|+>` の 1 qubit circle notation を書き出せる
3. `|Φ+>` の 2 qubit circle notation を書き出せる
4. 3 qubit 回路では失敗する
5. `--state-vector` との併用は失敗する

## Implementation Notes

- `lib/qni/cli/export_options.rb`
  - option validation を追加
- `lib/qni/cli/export_command.rb`
  - export 分岐を追加
- `lib/qni/export/`
  - circle notation renderer と PNG writer を追加
- 既存の simulator / state vector を再利用し、gate semantics には触れない

## Risks

- Qni 本家の円表示と完全一致しない可能性
- 2 qubit レイアウトの細部で将来調整が必要になる可能性

ただし、今回の目的は tutorial と Obsidian note 用の説明画像生成なので、まずは「意味が正しく、安定して出力できること」を優先する。
