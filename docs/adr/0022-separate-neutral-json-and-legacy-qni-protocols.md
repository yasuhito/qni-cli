# 中立回路 JSON と legacy .qni 直接提出を別プロトコルとして扱う

## 背景

初期の評価ランナーは `.qni` 提出物を直接採点する設計だった。これは qni-cli を使う人間や外部エージェントの成果物を決定論的に検証するには十分だが、モデル別コストベンチマークではモデルが qni-cli 固有語彙や許可コマンドを見てしまい、qni-cli を知らないモデルや外部共同研究者との公平比較に混ざり物が入る。

#357 では、公平比較用の主経路として `blind-neutral-circuit-json-v1` を導入し、`qni research solve` の既定動作と `qni research record --circuit-json-dir` を中立回路 JSON 提出にそろえた。一方、既存の `.qni` 採点器と `.qni` 直接提出経路は互換性のために残す必要がある。

## 判断

`blind-neutral-circuit-json-v1` と `qni-command-output-v0` を別の提出プロトコルとして扱う。

- `blind-neutral-circuit-json-v1` は公平比較用の研究プロトコルである。`qni research solve` と `qni research record --circuit-json-dir` は中立回路 JSON を保存し、採点前に `.qni` へ変換して既存評価ランナーへ渡す。
- `qni-command-output-v0` は既存の `.qni` 直接提出を記録する legacy protocol である。`qni benchmark run` / `run-all` は引き続き `.qni` 採点器であり、`qni research record --submissions` は `.qni` 提出物群をこのプロトコルとして研究試行に保存する。
- 研究試行の `metadata.json` と、`qni research solve` の `calls.json` には `submissionProtocol` を保存し、比較や集計では値を確認して結果を混ぜない。

## 理由

中立回路 JSON は、共同研究者に qni-cli の内部事情を見せず、量子回路としての解答だけを比較するための境界になる。`.qni` 直接提出は便利な採点器入力であり既存資産でもあるが、qni-cli のコマンド形式を知っていること自体が条件の一部になるため、公平比較用の結果と同じ順位表や散布図に入れると解釈が崩れる。

プロトコル名を研究試行メタデータに残すことで、後続のレポート、プロット、手動分析は「同じベンチマークスイートを解いた結果」だけでなく「同じ提出条件で解いた結果」も確認できる。既存の `.qni` 評価ランナーを残すため、中立 JSON 経路でも採点前に `.qni` へ変換する実装にして、採点器を二重化しない。

## 影響

README、`docs/benchmark.md`、`docs/model-cost-benchmark.md`、`benchmarks/prompts/qni-solution.md` では、評価ランナー、blind-neutral 研究プロトコル、legacy `.qni` 直接提出を分けて説明する。

`qni research solve` と `qni research record --circuit-json-dir` の研究試行は、`submissionProtocol: blind-neutral-circuit-json-v1` を持つ結果として比較する。`qni research record --submissions` の研究試行は、`submissionProtocol: qni-command-output-v0` を持つ legacy 結果として別枠で扱う。

既存研究試行の移行はしない。`qni benchmark run` / `run-all` は引き続き `.qni` 提出物だけを直接採点する。
