# 状態準備の採点だけグローバル位相を無視する

状態準備では同じ物理状態を表すグローバル位相の違いを許容する一方、ゲートの変換課題ではその位相自体が要件になる。すべての採点を緩める既定値や課題名による暗黙判定ではなく、各 `run` 検証の `up_to_global_phase: true` による明示指定を採用する。省略と `false` は従来どおり実部・虚部を厳密に比較し、`grading_cases` 内も同じ指定を使う。

期待ベクトルの最大振幅の成分を基準に、実測値との間の単位位相を求めて期待ベクトル全体に掛ける。その後は従来の成分別 `tolerance` で比較する。絶対値だけの比較や正規化は行わず、相対位相、振幅の大きさ、余分な基底成分の誤りを引き続き検出する。基準の期待値または実測値がゼロなら位相1で比較し、不一致の表示にも補正後の期待値を使う。

既存7状態準備課題 (PlusState、MinusState、AllBasisVectors_TwoQubits、AllBasisVectorWithPhaseFlip_TwoQubits、AllBasisVectorsWithPhases_TwoQubits、BellState、GHZState) に適用する。BellState は従来の `expect` による検証も位相非依存だったが、今回ほかの状態準備と同じ `run` の明示指定に統一する。basic-gates と single-qubit-gates は厳密比較を維持する。

この7課題の比較条件は過去の評価時点から変更される。[ADR 0019](0019-research-report-does-not-regrade.md) に従い、過去の研究試行や保存済み結果は再採点・書き換えしない。変更前後の結果を同じ条件の評価として単純比較せず、採点条件の差を明記する。
