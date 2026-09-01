# Feature: 共同研究者が qni の数式結果を引用する

共同研究者（量子回路AIエージェント）として
計算結果を書き換えず研究者へ見せるために
専用ツールの LaTeX 出力を数式として引用したい

## Scenario: 量子アルゴリズムの英語による解説依頼で qni スキルを使う

- Then リポジトリファイル "skills/qni-cli/SKILL.md" の frontmatter description は "quantum algorithms such as QFT (quantum Fourier transform), Grover, Shor, and quantum teleportation" を含む

## Scenario: 量子アルゴリズムの日本語による解説依頼で qni スキルを使う

- Then リポジトリファイル "skills/qni-cli/SKILL.md" の frontmatter description は "量子アルゴリズムの解説、量子フーリエ変換" を含む

## Scenario: 行列と状態の数値検証依頼で qni スキルを使う

- Then リポジトリファイル "skills/qni-cli/SKILL.md" の frontmatter description は "unitary-matrix verification and state-vector calculation" を含む

## Scenario: 既存の回路課題を qni スキルの対象に保つ

- Then リポジトリファイル "skills/qni-cli/SKILL.md" の frontmatter description は "Quantum Katas, superdense coding, state vectors, expectation values, circuit diagrams, and Bloch-sphere images" を含む

## Scenario: 量子系の数値計算と検証には qni コマンドを使う

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "NumPy などの使い捨てスクリプトではなく qni コマンド" を含む

## Scenario: 専用 qni ツールを優先する

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "専用の `qni` ツールを優先する" を含む

## Scenario: 作業場所を選んでいない場合は一時作業場所を使う

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "`workdir` を省略する" を含む

## Scenario: 利用者が選んだ作業場所だけを指定する

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "利用者が作業場所を選んだ場合だけ `workdir`" を含む

## Scenario: 依存するコマンド列を一括実行する

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "依存するコマンド列は `commands`" を含む

## Scenario: 一括実行の失敗後は残りだけを呼び直す

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "失敗したら修正して残りだけを呼び直す" を含む

## Scenario: 一括実行の成功分は作業場所に残る

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "成功分の変更は作業場所に残っている" を含む

## Scenario: 画像対応端末では回路図を画像で見せる

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "画像を表示できる端末では `qni export --png` で回路図を画像にして見せる" を含む

## Scenario: 画像を使えない端末では ASCII 回路図へ戻す

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "画像を使えない場合だけ `qni view` の ASCII 回路図を見せる" を含む

## Scenario: 状態ベクトルと期待値を LaTeX で引用する

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "`--latex` の出力を `$$...$$` でそのまま引用する" を含む

## Scenario: 量子状態を ket 記法で書く

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "数式は `$...$` または `$$...$$` で囲み、量子状態は `\ket{}` で書く" を含む
