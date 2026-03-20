# Quantum Katas 検証設計

## 概要

アーカイブ済みの `QuantumKatas` リポジトリを、課題と期待される振る舞いの読み取り専用ソースとして使い、その課題群を通じて `qni-cli` を実務で使える道具に鍛える。

進め方は次のとおり。

1. 最初の Kata の最初の番号付き Task を選ぶ。
2. その Task の解法を `qni-cli` のコマンド列として表現する。
3. 元の Task テストの意図を、Q# を使わずに `qni-cli` 側のテストとして再現する。
4. Task を自然に表現できない、または十分に厳密に検証できない場合は、不足している `qni-cli` の機能を追加する。
5. 再現した Task を回帰テストとして残す。

主目的は Kata を消化すること自体ではない。主目的は、Kata を現実的な要件の連続入力として使い、`qni-cli` を改善することである。

## 背景

- 開発対象リポジトリ: `qni-cli`
- 外部の読み取り専用参照先: `../oss/QuantumKatas`
- `QuantumKatas` はアーカイブ済みであり、追従対象ではなく固定入力として扱う。
- `qni-cli` は feature 駆動で開発する。
  新しい振る舞いは、実装前に必ず `features/*.feature` で定義する。

## 目標

- まず `BasicGates Task 1.1` を、`qni-cli` で表現できるか検証する。
- 元の Kata テストの意図を、Q# を使わず `qni-cli` 側で再現する。
- 実際に Kata が要求した不足に対してのみ、`qni-cli` の機能を追加する。
- Kata 由来の回帰テストを蓄積し、実務的なワークフローを保護する。

## 非目標

- 元の Q# テストハーネスを動かすこと。
- Q# 互換性を維持すること、または Q# 専用ツール群を復活させること。
- 検証基盤を作る前に、すべての Kata を先に解くこと。
- 具体的な必要性が出る前に、重いシンボリック処理系や外部シミュレータ依存を導入すること。

## 参照元

- Task の説明は `../oss/QuantumKatas/<Kata>/Tasks.qs` を参照する。
- 元テストの意図は `../oss/QuantumKatas/<Kata>/Tests.qs` を参照する。
- `qni-cli` の振る舞い自体の仕様は、このリポジトリ内の feature ファイルを正とする。

Kata の元実装言語と、`qni-cli` で実現したいワークフローに差がある場合は、Q# の表面構文ではなく Task の振る舞い上の意図を保存する。

## Kata Feature の分割方針

Kata 由来の feature は、Kata 単位の 1 ファイルにまとめ続けるのではなく、Task 名ごとの file に分割する。

ディレクトリ構成は次のようにする。

- `features/katas/<kata_name>/`

ファイル名は Task 番号ではなく Task 名を使う。

例:

- `features/katas/basic_gates/state_flip.feature`
- `features/katas/basic_gates/basis_change.feature`

理由は次のとおり。

- file 名だけで内容が分かる
- Task ごとの進捗と未完了が見やすい
- 将来の追加時に diff が小さくなる
- Task 番号が将来変わっても意味が残る

Task 番号は file 名ではなく feature 本文に保持する。
たとえば `機能:` や冒頭説明で `Task 1.1 StateFlip` のように明示する。

既存の `BasicGates` では、少なくとも `Task 1.1` と `Task 1.2` を別 file に分割し、その後の Task も最初からこの方針で追加する。

## 今回の対象

今回の設計対象は `BasicGates Task 1.1` のみとする。

- Kata: `BasicGates`
- Task: `Task 1.1`
- 名前: `StateFlip`

Task 1.1 の内容は次のように要約できる。

- 入力: 1 量子ビットの状態 `α|0⟩ + β|1⟩`
- 目標: 状態を `α|1⟩ + β|0⟩` に変える
- 具体例:
  - `|0⟩` を `|1⟩` に変える
  - `|1⟩` を `|0⟩` に変える
- 性質: この操作は self-adjoint であり、2 回適用すると元に戻る

`QuantumKatas` の元の解法意図としては、Pauli-X による状態反転である。

## 検証戦略

検証は 2 層に分ける。

### 第 1 層: CLI 表現テスト

この層は「その Task を `qni-cli` で自然に表現できるか」を検証する。

- Kata 向けの feature ファイルを `features/` 配下に追加する。
- 各シナリオには次を含める。
  - `Task 1.1` のような Task 識別子
  - 入力状態の準備方法
  - 解法を表現する `qni` コマンド列
  - 観測可能な期待結果
- これらのシナリオは、CLI のユーザ向けワークフローを保護する。

### 第 2 層: 振る舞い等価性テスト

この層は「`qni-cli` で表現した解法が、元の Kata の意図した量子操作と等価か」を検証する。

- 常に最も軽い十分条件から始める。
- `qni run` と `qni expect` の出力だけで足りるなら、それを優先する。
- 単一の状態ベクトル比較では弱い場合にのみ、補助テストコードを追加する。
- Python や Qiskit のような外部ツールは、より単純な検証で足りない場合に限って導入する。
- シンボリック演算ライブラリは、数値比較だけでは扱いにくい具体的な Task が出た時点で導入する。

これにより、標準経路は単純に保ちつつ、難しい Task ではより強い検証に拡張できる。

## 検証レベル

各 Task には、技術的に十分な最小の検証レベルを適用する。今回の `Task 1.1` では、まず Level A から始める。

### Level A: 直接出力比較

次の場合は `qni run` または `qni expect` を使う。

- 代表的な 1 つまたは少数の入力状態で十分な場合
- Task が微妙な位相差に依存しない場合
- 最終状態の直接比較で十分に強い場合

### Level B: パラメータまたは入力の走査

次の場合は `qni-cli` を呼び出す補助テストを使う。

- 角度のようなパラメータに依存する場合
- 複数の入力状態で成立することを確認すべき場合
- 1 つの例だけでは誤実装を取りこぼす場合

### Level C: 相対位相またはより強い等価性確認

次の場合は、より強い補助検証を使う。

- 元の Kata テストが、制御付き適用によってグローバル位相の問題を露出させている場合
- 単純な最終状態比較では、誤ったが見かけ上似ている実装を見逃す場合
- 実務上の正しさの基準として、1 回のスナップショット以上が必要な場合

## Task 1.1 の検証方針

`Task 1.1` は現在の `qni-cli` の能力で最初に試す対象として適している。

- 解法は `X` ゲート 1 つで表現できるはずである
- `|0⟩ -> |1⟩` と `|1⟩ -> |0⟩` は `qni run` の状態ベクトル比較で確認しやすい
- 最初の追加検証では、Kata の `DumpDiffOnOneQubit` と同じく非自明な振幅ケースを見る
- 具体的には `Ry(2 * arccos(0.6))|0⟩ = 0.6|0⟩ + 0.8|1⟩` を基準ケースとして使う

元の Q# テストは制御付き版での等価性も見ているが、今回は最初の一歩として、まず `qni-cli` で自然に表現できることと、代表的な基底状態に対して正しい出力を返すことを固定する。

`Task 1.1` の今後の強化順は次のとおりとする。

1. 非自明な振幅ケースを feature に追加する
2. controlled 等価性を、既存 CLI で書ける検証回路として追加する
3. `qni run` のシンボリック表示オプションは、その後に別 feature として検討する

この順番にする理由は、1 と 2 が correctness の強化であり、3 は可観測性と UX の改善だからである。

## Task 1.1 の controlled 検証方針

`Task 1.1` の 2 段目では、新しい検証専用コマンドは追加しない。
代わりに、Kata の確認フェーズに相当する検証回路そのものを、既存の `qni-cli` コマンドで記述できるかを確認する。

基本方針は次のとおり。

- control qubit を `H` で重ね合わせにする
- target qubit を `Ry(2 * arccos(0.6))` で `0.6|0⟩ + 0.8|1⟩` にする
- candidate の controlled-`X` を適用する
- reference の adjoint に相当する controlled-`X` を適用する
- control qubit に再び `H` をかける
- 最後に `qni expect` を使い、control 側が `|0⟩` に戻ることを確認する

`Task 1.1` では `X` が self-adjoint なので、reference の adjoint は同じ controlled-`X` で表現できる。
そのため、まずは既存の `qni add ... --control` と `qni expect` の範囲で controlled 検証回路を組める可能性が高い。

この段階で重要なのは、

- 解答回路を `qni-cli` で書けること
- 検証回路も `qni-cli` で書けること
- 新しいコマンド追加は、本当に表現できない不足が出た場合に限ること

という 3 点である。

## Task 1.1 のシンボリック表示方針

`Task 1.1` の 3 段目では、`qni run` に読みやすい別表示を追加する。
既定の CSV 数値出力は変えず、明示オプションでのみシンボリック表示を有効にする。

最初のスコープは次のとおり。

- コマンドは `qni run --symbolic`
- 対象は最初は 1 qubit 回路のみ
- 既定の `qni run` は従来どおり数値 CSV を返す
- `qni run --symbolic` は `α|0> + β|1>` の形で状態を返す

具体例:

- `|0⟩` は `1.0|0>`
- `X|0⟩` は `1.0|1>`
- `H|0⟩` は `0.7071067811865475|0> + 0.7071067811865475|1>`
- `Ry(theta)|0⟩` は `cos(theta/2)|0> + sin(theta/2)|1>`

出力の基本ルールは次のとおり。

- 0 係数の項は省略する
- 項の順序は `|0>`, `|1>` とする
- 後続項は ` + ` または ` - ` で結合する
- 数値係数は既存 formatter に近い文字列を使う
- 記号係数は SymPy の自然な文字列表現を許容する

このオプションは、未束縛の角度変数があるときの可観測性改善も目的に含む。
そのため、数値 `qni run` は未束縛変数で従来どおり失敗させる一方、`qni run --symbolic` は変数を残したまま成功できるようにする。

例:

- `qni add Ry --angle theta --qubit 0 --step 0`
- `qni run` は `unresolved angle variable: theta` で失敗
- `qni run --symbolic` は `cos(theta/2)|0> + sin(theta/2)|1>` を返す

`Task 1.1` に対しては、この表示を kata feature にも 1 本だけ取り込む。
目的は correctness の強化ではなく、問題文の一般式 `α|0⟩ + β|1⟩ -> α|1⟩ + β|0⟩` を `qni-cli` だけで直接読めるようにすることである。

追加するシナリオは次の性質を持つ。

- `features/katas/basic_gates.feature` に置く
- `qni add Ry --angle theta --qubit 0 --step 0` で一般状態を作る
- `qni add X --qubit 0 --step 1` を適用する
- `qni run --symbolic` により `sin(theta/2)|0> + cos(theta/2)|1>` を期待する

この symbolic シナリオは説明用の回帰ケースであり、既存の数値シナリオと controlled 検証シナリオは残す。

## Task 1.2 の検証方針

`Task 1.2 BasisChange` は `Task 1.1` に続く次の対象とし、同じ 3 段構成で進める。

- 数値シナリオ
- controlled 検証シナリオ
- symbolic 説明シナリオ

`Task 1.2` の内容は次のように要約できる。

- 入力: 1 量子ビットの状態 `α|0⟩ + β|1⟩`
- 目標:
  - `|0⟩ -> |+⟩ = (|0⟩ + |1⟩) / sqrt(2)`
  - `|1⟩ -> |-⟩ = (|0⟩ - |1⟩) / sqrt(2)`
  - 重ね合わせ状態でも基底ベクトルへの作用に従って変換する
- 解法意図: Hadamard gate

数値シナリオでは、少なくとも次の 2 つを固定する。

- `|0⟩` から開始し、`qni add H --qubit 0 --step 0` の後に `qni run` で `|+⟩` に対応する数値出力になること
- `|1⟩` から開始し、`qni add H --qubit 0 --step 1` の後に `qni run` で `|-⟩` に対応する数値出力になること

加えて、Quantum Katas 側の `DumpDiffOnOneQubit` に対応する一般状態の数値シナリオも持つ。
入力状態は `Ry(2 * ArcCos(0.6))|0⟩ = 0.6|0⟩ + 0.8|1⟩` とし、`H` 適用後の数値出力を固定する。
これにより、`Task 1.2` も `Task 1.1` および `Task 1.3` と同様に、
Katas の「非自明な入力状態で差分を表示する」確認フェーズを feature 上で再現する。

controlled 検証では、`Task 1.1` と同じ検証回路パターンを使う。

- control qubit を `H` で重ね合わせにする
- target qubit を `Ry(2 * arccos(0.6))` で非自明状態にする
- candidate の controlled-`H` を適用する
- reference の adjoint に相当する controlled-`H` を適用する
- control qubit に再び `H` をかける
- `qni expect ZI` により control 側が `|0⟩` に戻ることを確認する

`H` は self-adjoint なので、reference の adjoint も同じ controlled-`H` で表現できる。

symbolic 説明シナリオでは、`qni run --symbolic` を使って `BasisChange` が一般状態にも線形に作用することを見せる。
ここで期待するのは `Task 1.1` のような単純な係数の入れ替えではなく、`H * Ry(theta)|0⟩` に対応する式そのものを `qni-cli` だけで読めることだ。

## Task 1.3 の検証方針

`Task 1.3 SignFlip` も `Task 1.1` と `Task 1.2` に続けて、同じ 3 段構成で進める。

- 数値シナリオ
- controlled 検証シナリオ
- symbolic 説明シナリオ

`Task 1.3` の内容は次のように要約できる。

- 入力: 1 量子ビットの状態 `α|0⟩ + β|1⟩`
- 目標: `α|0⟩ - β|1⟩`
- 問題文での典型例: `|+⟩ -> |-⟩` と `|-⟩ -> |+⟩`
- 解法意図: Pauli `Z` gate

新しい kata feature は次の path に置く。

- `features/katas/basic_gates/sign_flip.feature`

数値シナリオでは、少なくとも次の 3 つを固定する。

- `|+⟩` を入力にして `qni add Z --qubit 0 --step ...` の後に `qni run` で `|-⟩` に対応する数値出力になること
- `|-⟩` を入力にして `qni add Z --qubit 0 --step ...` の後に `qni run` で `|+⟩` に対応する数値出力になること
- `0.6|0⟩ + 0.8|1⟩` を入力にして `qni add Z --qubit 0 --step ...` の後に `qni run` で `0.6|0⟩ - 0.8|1⟩` に対応する数値出力になること

このうち 3 つ目は、[Tests.qs](/home/yasuhito/Work/oss/QuantumKatas/BasicGates/Tests.qs) の `DumpDiffOnOneQubit` が `Ry(2 * ArcCos(0.6))` による非自明状態を使って差分表示していることに対応する。

controlled 検証では、`Task 1.1` と `Task 1.2` と同じ検証回路パターンを使う。

- control qubit を `H` で重ね合わせにする
- target qubit を `Ry(2 * arccos(0.6))` で非自明状態にする
- candidate の controlled-`Z` を適用する
- reference の adjoint に相当する controlled-`Z` を適用する
- control qubit に再び `H` をかける
- `qni expect ZI` により control 側が `|0⟩` に戻ることを確認する

`Z` は self-adjoint なので、reference の adjoint も同じ controlled-`Z` で表現できる。
これは Quantum Katas 側の `T103_SignFlip` が controlled 版で等価性を見ている方針にも一致する。

symbolic 説明シナリオでは、`qni run --symbolic` を使って `SignFlip` が一般状態の `|1⟩` 成分にだけ負号を導入することを直接読めるようにする。

例:

- `qni add Ry --angle theta --qubit 0 --step 0`
- `qni add Z --qubit 0 --step 1`
- `qni run --symbolic`
- 期待する式は `cos(theta/2)|0> - sin(theta/2)|1>` に近い形

この task では、現時点の見立てとして新機能追加は必須ではない。
まずは既存の `Z`、controlled-`Z`、`qni run --symbolic`、`qni expect` で feature を先に書き、本当に不足が出た場合だけ追加提案を行う。

## Task 1.4 の検証方針

`Task 1.4 AmplitudeChange` は、`Task 1.1` から `Task 1.3` までと同じ 3 段構成を維持しつつ、最初の「角度付きかつ self-adjoint でない task」として扱う。

- 数値シナリオ
- controlled 検証シナリオ
- symbolic 説明シナリオ

`Task 1.4` の内容は次のように要約できる。

- 入力:
  - 角度 `alpha`
  - 1 量子ビットの状態 `β|0⟩ + γ|1⟩`
- 目標:
  - `|0⟩ -> cos(alpha)|0⟩ + sin(alpha)|1⟩`
  - `|1⟩ -> -sin(alpha)|0⟩ + cos(alpha)|1⟩`
  - 重ね合わせ状態でも基底ベクトルへの作用に従って変換する
- 解法意図: `Ry(2 * alpha)`

新しい kata feature は次の path に置く。

- `features/katas/basic_gates/amplitude_change.feature`

数値シナリオでは、Quantum Katas 側の [T104_AmplitudeChange](/home/yasuhito/Work/oss/QuantumKatas/BasicGates/Tests.qs) に合わせて
`0 .. 36` の角度走査を `Scenario Outline` で再現する。

- `i = 0 .. 36`
- `alpha = 2π * i / 36`
- `Ry` に渡す角度は `2 * alpha`

feature 上では、`Task 1.4` の問題文と `qni add Ry` の実装都合を混同しにくくするため、
例テーブルの列名は `double_alpha` ではなく `ry_angle` などの実装角を示す名前にする。

この数値シナリオ群は、Katas の controlled 等価性ループそのものではないが、
`alpha` の全走査に対応する回帰として feature 上に見える形で保持する。

controlled 検証では、Kata の dump 用角度 `dumpAlpha = 2π * 6 / 36 = π/3` を代表角度として使う。
ここでは `Task 1.1` から `Task 1.3` と違い、candidate のあとに同じ回路をもう一度つなぐことはできない。
`AmplitudeChange` は self-adjoint ではないため、検証には逆操作が必要になる。

したがって controlled 検証回路では、少なくとも次を表現できる必要がある。

- candidate: `Ry(2 * alpha)`
- reference の adjoint: `Ry(-2 * alpha)`

この task で最初に現れる不足候補は、`qni-cli` が次のような角度式を受け付けられるかどうかである。

- `2*alpha`
- `-2*alpha`

もし現在の `AngleExpression` がこの種の式を扱えない場合、それは `Task 1.4` を通すための正当なプロダクト不足として扱う。
その場合でも、先に feature を書いて赤を確認し、不足が実在することを確かめてから機能追加を提案する。

symbolic 説明シナリオでは、`qni run --symbolic` を使って `AmplitudeChange(alpha)` が一般式としてどう作用するかを直接読めるようにする。

例:

- `qni add Ry --angle 2*alpha --qubit 0 --step 0`
- `qni run --symbolic`
- 期待する式は `cos(alpha)|0> + sin(alpha)|1>` に近い形

この task では、`qni variable set alpha ...` と angle expression の組み合わせも検証対象に含める。
つまり `alpha` を変数として保持しつつ、

- 数値 `run` / `expect` では concrete value に解決できること
- symbolic `run` では未束縛のままでも式を表示できること

の両方を確認する。

## Task 1.5 の検証方針

`Task 1.5 PhaseFlip` は、`Task 1.2` から `Task 1.4` と同様に、Quantum Katas のテスト構造を再現することを優先して進める。

- `DumpDiffOnOneQubit` 相当の人間向けシナリオ
- controlled 版の等価性検証シナリオ
- `qni run --symbolic` による補助説明シナリオ

`Task 1.5` の内容は次のように要約できる。

- 入力: 1 量子ビットの状態 `α|0⟩ + β|1⟩`
- 目標: `α|0⟩ + iβ|1⟩`
- 解法意図: `S` gate

新しい kata feature は次の path に置く。

- `features/katas/basic_gates/phase_flip.feature`

人間向けの `DumpDiffOnOneQubit` 相当シナリオでは、Quantum Katas 側の単純な基底状態ではなく、既存 task と同じ非自明入力 `0.6|0⟩ + 0.8|1⟩` を使う。

- 入力状態は `Ry(2 * ArcCos(0.6))|0⟩ = 0.6|0⟩ + 0.8|1⟩`
- `qni add S --qubit 0 --step ...` を適用する
- `qni run` により `0.6|0⟩ + 0.8i|1⟩` に対応する出力を確認する

これにより、`PhaseFlip` が `|1⟩` 成分にだけ複素位相 `i` を導入することを、人間が読める 1 本のシナリオとして固定する。

controlled 検証では、Katas の `AssertOperationsEqualReferenced` に対応する回路を既存 CLI コマンドだけで記述する。

- control qubit を `H` で重ね合わせにする
- target qubit を `Ry(2 * arccos(0.6))` で非自明状態にする
- candidate の controlled-`S` を適用する
- reference の adjoint に相当する controlled-`S†` を適用する
- control qubit に再び `H` をかける
- `qni expect ZI` により control 側が `|0⟩` に戻ることを確認する

ここで重要なのは、`S` は self-adjoint ではないという点である。
そのため `Task 1.1` から `Task 1.3` のように同じ gate を 2 回並べるのではなく、

- candidate: `S`
- inverse/reference 側: `S†`

という組み合わせを取る必要がある。

symbolic 説明シナリオは Katas の本体検証ではなく補助として扱う。
目的は、`PhaseFlip` の作用を `qni-cli` だけで一発で読めるようにすることだ。

最初のスコープでは、少なくとも次のようなシナリオを持てば十分である。

- `Given 1 qubit の初期状態が "0.6|0> + 0.8|1>" である`
- `And "qni add S --qubit 0 --step 1" を実行`
- `When "qni run --symbolic" を実行`
- `Then 標準出力:` で `0.6|0> + 0.8i|1>` に相当する式を確認する

この task では、まず既存の `S`、`S†`、controlled 指定、`qni run --symbolic`、`qni expect` で通るかを先に試す。
feature を先に書いたうえで、不足が実在すると確認できた場合だけ、機能追加を提案する。

## シンボリック実装方針

シンボリック表示では、Ruby 本体に重い記号計算器を直接組み込まず、Python helper を subprocess として呼び出す。

理由は次のとおり。

- Ruby 側の既存 simulator は数値状態ベクトル用として維持したい
- SymPy は記号式、複素数、三角関数、簡約に十分強い
- Ruby と Python の境界を subprocess にすると、依存と責務を明確に分離できる
- Ruby-Python bridge を常駐させるより、運用が単純で壊れにくい

責務分担は次のとおり。

### Ruby 側

- `qni run --symbolic` オプションの受理
- `circuit.json` の読み込み
- Python helper への JSON 入力の受け渡し
- helper の stdout をそのまま CLI 出力に使う
- helper 失敗時のエラーメッセージ整形

### Python 側

- 1 qubit 回路のシンボリック状態ベクトル計算
- `H`, `X`, `Y`, `Z`, `S`, `S†`, `T`, `T†`, `√X`, `P`, `Rx`, `Ry`, `Rz` の symbolic 表現
- 束縛済み / 未束縛の角度変数を SymPy 式として扱う
- `α|0> + β|1>` 形式の文字列表現生成

配置場所は、補助スクリプトではなく本体機能の一部として `libexec/` を想定する。

## シンボリック表示の不足分類

`qni run --symbolic` の追加で失敗した場合は、次のように扱う。

### プロダクト不足

- `run` が `--symbolic` オプションを受け取れない
- 1 qubit 回路でも symbolic 表示ができない
- 束縛済み / 未束縛の角度変数を state expression に変換できない

### スコープ外として明示的に失敗

- 2 qubit 以上の回路
- symbolic helper が未導入、または実行環境に Python / SymPy がない場合

最初のエラーメッセージは利用者が原因をすぐ判断できることを優先し、たとえば `symbolic run currently supports only 1-qubit circuits` のように具体的にする。

## 最初の実装スライス

最初のスライスでは、`Task 1.1` だけについて Kata 由来の回帰パスを 1 本 end-to-end で成立させる。

### Step 1: Kata feature を追加する

最初の Kata 用に新しい feature ファイルを追加する。候補は次のとおり。

- `features/katas/basic_gates.feature`

最初のシナリオ群は `Task 1.1` のみを対象にする。

各シナリオには次を含める。

- 初期状態の準備方法
- 解法を表す `qni add ...` コマンド列
- 正しさを示す `qni run` または `qni expect` の期待出力

最初に入れる具体的なシナリオ候補は次のとおり。

- `|0⟩` から開始し、`qni add X --qubit 0 --step 0` の後に `qni run` で `|1⟩` になること
- `|1⟩` から開始し、`qni add X --qubit 0 --step 1` の後に `qni run` で `|0⟩` になること

次の強化シナリオ候補は次のとおり。

- `0.6|0⟩ + 0.8|1⟩` から開始し、`qni add X --qubit 0 --step 1` の後に `qni run` で `0.8|0⟩ + 0.6|1⟩` に対応する数値出力になること
- control qubit を含む 2 qubit 回路で、candidate の controlled-`X` のあとに reference の controlled-`X` を重ね、最後に `qni expect` で control 側が `|0⟩` に戻ること

### Step 2: 必要なテスト step 定義を追加する

Kata 形式のシナリオに必要な最小限の範囲でのみ、Cucumber の support を拡張する。

例:

- 基底状態や重ね合わせ状態を準備するための step
- 状態ベクトルの数値比較を行う step
- Task スクリプト向けに複数コマンドを実行する step

非自明な振幅ケースでは、まず汎用パーサは作らず、Kata に必要な最小限の状態準備 step を test support に追加する。
たとえば `1 qubit の初期状態が "0.6|0> + 0.8|1>" である` のような専用 step を想定する。

controlled 検証では、必要なら 2 qubit の専用状態準備 step も同じ方針で追加する。
ただし、まずは既存の `空の 2 qubit 回路がある` と `qni add H` / `qni add Ry` / `qni add X --control ...` / `qni expect` の組み合わせだけで書けるかを優先して確認する。

### Step 3: まず現行 CLI のまま試す

まずは `qni-cli` の振る舞いを変えずに、`Task 1.1` を通す。

既存 CLI のままで Task が通るなら、実装は変えずに回帰テストだけを追加して残す。

### Step 4: 詰まった時だけ機能を追加する

`Task 1.1` を十分に表現または検証できない場合は、次の順で進める。

- 不足している振る舞いを feature として追加する
- 必要最小限の機能を実装する
- Kata 由来のシナリオを再実行する

## 不足分類ルール

変更前に、失敗を分類する。

### プロダクト不足

次の場合は `qni-cli` 自体の機能不足として扱う。

- Task を自然な CLI コマンド列として表現できない
- 回路モデルに、その Task に必要な操作が存在しない
- 現在のインターフェースでは、現実的な Task 表現が不自然または誤りやすい

### 検証不足

次の場合は検証基盤の不足として扱う。

- Task 自体は表現できるが、十分な確信を持って正しさを示せない
- より強い比較や、より広い走査が必要
- 足りないものが CLI 表面ではなくテスト側に属する

### 不足なし

`Task 1.1` をすでに表現でき、十分に検証もできるなら、回帰テストだけを追加する。

## 依存追加ポリシー

既存の `qni-cli` 出力と、軽量なローカル補助テストコードを基本とする。

依存の段階的拡張順は次のとおり。

1. `qni run`
2. `qni expect`
3. このリポジトリ内の軽量な補助テストコード
4. 必要であれば Python ベースの補助コード
5. 特定 Task が正当化する場合に限り Qiskit やシンボリック演算ライブラリ

この順序により、基盤の肥大化を防ぐ。

## リポジトリ統合ルール

- `../oss/QuantumKatas` は編集せず、読み取り専用の参照データとして扱う。
- `qni-cli` の新しい振る舞いは、必ず新規または更新された `features/*.feature` から始める。
- Kata 由来のテストはこのリポジトリ内に置き、このリポジトリのテストフローで実行できるようにする。
- Kata 統合作業の一環として、既存の無関係な作業ツリー変更を巻き戻してはならない。

## 成功条件

次の状態になれば、このアプローチは機能しているとみなせる。

- `Task 1.1` が `qni-cli` の安定した回帰ケースになる
- 新しい CLI 機能が、実際に Task で露出した圧力に対してのみ追加される
- 難しい Task でのみ、必要に応じて検証強度が上がる
- 結果として CLI が、現実的な回路記述と検証により有用になる

## 直近の次ステップ

`BasicGates` の `Task 1.1` に対して、candidate の controlled-`X` と reference の controlled-`X` を重ねた検証回路を `qni-cli` で記述し、`qni expect` で control 側が `|0⟩` に戻ることを確認する feature を追加する。
