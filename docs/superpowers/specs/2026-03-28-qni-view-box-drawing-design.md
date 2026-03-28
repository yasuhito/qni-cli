# qni View Box Drawing Design

## Goal

`qni view` を Qiskit 風の box-drawing 形式へ置き換え、各 step を将来パースしやすい 3 行セル表現で描画する。

## Approach

- qni の既存モデルを活かし、`1 step = 1 text layer` とする。
- 各 qubit wire は `top/mid/bot` の 3 行で描く。
- 単一ゲートは箱で囲み、control は `■`、swap は `X` を接続線付きで描く。
- 空セルも固定幅セルで描き、出力が決定的になるようにする。

## Constraints

- 現在の `cols` 形式は step 内の完全なゲート構造を保存していない。
- そのため renderer は現行の qni 制約に合わせて、単純な単一ゲート、control + target、swap、独立単一ゲートを優先対応とする。
- 将来の逆パースを見据えて、セル境界と記号体系は安定化する。

## Testing

- 先に `features/qni_view.feature` を Qiskit 風の期待値へ更新する。
- 代表的な `add_*.feature` にも `qni view` 比較を追加し、見た目から結果が分かる feature にする。
- 代表ケースは H, X, angled gate, CNOT, SWAP, 複数同時単一ゲートを含める。
