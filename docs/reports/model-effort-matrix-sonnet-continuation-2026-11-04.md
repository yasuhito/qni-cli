# Sonnet/max の継続と3,600秒上限の実行案

実施日: 2026-11-04 (UTC)

人間の承認に基づき、1課題の上限を600秒から3,600秒 (1時間) へ変更する。無期限にはしない。変更する実装は `PI_TIMEOUT_MS` だけであり、既存の `harness.piTaskTimeoutMs` にも同じ定数から `3600000` を保存する。課題、プロンプト、文法、採点器、思考量、モデル、認証経路、再試行と代替経路の禁止は変えない。

この文書は実行前のレビュー用である。3,600秒条件のモデル呼び出しはまだ行っていない。

## 変更しない原記録

すでに15条件について63回答がそろっている。Luna/max は、人間の承認した継続により元の34回答と新しい29回答を集計した分析結果である。これを含め、完了済みの測定は一つも再実行しない。

Sonnet/max の元の600秒試行は、30課題で最終応答を得た後、31課題目 `preparing-states/three-states-two-qubits` が `ETIMEDOUT` となった。元の部分記録は `/tmp/qni-research-solve-PIFogg`、保存したコピーと生ログは `/tmp/qni-model-effort-matrix-evidence/matrix-conditions/effort-matrix-v2-claude-bridge-claude-sonnet-5-5-max-600s/` にある。30回答、失敗した31課題目、未知の利用量と料金を変更しない。

## 新しく呼ぶのは33課題だけ

新しい研究試行の slug は `effort-matrix-v3-claude-bridge-claude-sonnet-5-5-max-tail33-3600s` とする。既存 CLI に次の固定条件を渡す。

```text
--provider claude-bridge
--model claude-sonnet-5-5
--thinking max
--claude-bridge-extension /tmp/qni-model-effort-matrix-evidence/bridge/src/index.ts
--benchmark benchmarks/quantum-katas
```

次の33課題をそれぞれ `--task` で指定する。先頭30課題との重複がなく、元の課題順の31番目から63番目と一致することを呼び出し前に確認する。

```text
preparing-states/three-states-two-qubits
preparing-states/two-bitstrings
preparing-states/unequal-superposition
preparing-states/wstate-arbitrary
preparing-states/wstate-power-of-two
preparing-states/zero-and-bitstring
qft/all-basis-vectors
qft/all-even-vectors
qft/alternating-amplitudes
qft/binary-fraction-classical
qft/binary-fraction-inplace
qft/binary-fraction-quantum
qft/periodic-state
qft/qft
qft/rotation-gate
qft/signal-frequency
qft/single-qubit
qft/square-wave
single-qubit-gates/amplitude-change
single-qubit-gates/global-phase-i
single-qubit-gates/prepare-arbitrary-state
single-qubit-gates/prepare-minus
single-qubit-gates/prepare-rotated-state
single-qubit-gates/sign-flip-on-zero
single-qubit-gates/three-quarters-pi-phase
single-qubit-gates/y-gate
superposition/all-basis-vector-with-phase-flip-two-qubits
superposition/all-basis-vectors-two-qubits
superposition/all-basis-vectors-with-phases-two-qubits
superposition/bell-state
superposition/ghz-state
superposition/minus-state
superposition/plus-state
```

時間切れの31課題目をもう一度呼ぶ承認は、この1回だけである。それ以外の新しい32課題はまだ呼んでいない。3,600秒でも時間切れになった場合や、新しい Pi 実行・認証・上限・応答元・利用量のエラーが出た場合は、その場で停止する。さらに待ち時間を延ばしたり、別モデルを使ったり、自動で呼び直したりしない。

## 採点と集計

元の30回答は中断時点でまだ採点していない。修正のレビュー後、保存済み課題と提出物を読み取り専用で使い、既存の `qni benchmark run <task.md> <submission.qni> --json` でそれぞれ初回採点する。結果は別ファイルへ保存する。完了済み条件や保存済み結果の再採点はしない。

新しい33課題は別の正式な研究試行として保存する。元の30回答と合わせた63回答は、Luna/max と同様に、出典を持つ分析ファイルとして保存する。単一の63課題研究試行を作ったようには見せない。

各回答に、課題 ID、原記録パス、呼び出し番号、回答・提出物・プロンプト・採点結果・生ログのハッシュを付ける。元の30回答には600秒、新しい33回答には3,600秒の上限を記録する。課題 ID が重複せず、固定63課題と完全一致することを検証する。

合格率の分母は63。failed、disallowed、採点器エラーを除外しない。既知の空操作列による採点器エラーは error のまま記載し、新しい原因なら調査してから続行する。

最終的な63回答の出力トークン小計は、元の30回答と新しい33回答の記録から求める。最初の時間切れ試行の利用量は不明なので、失敗試行を含む総出力と総費用は `null` のままとする。回答の小計を総消費量や請求額として示さない。実行時間も、失敗した600秒待ちを含む旧試行と新しい試行を分けて記載する。

## 起動経路と外側の時間上限

起動スクリプトは既存の `/tmp/qni-model-effort-matrix-evidence/matrix-bin/pi` と `pi-raw-launcher.mjs` を変えずに使う。毎条件、PATH の先頭、起動スクリプトのハッシュ、固定版 Pi 1.5.0、Bridge のパッチ済みソース、SDK 0.3.293、同梱 Claude Code 2.1.293 を確認する。生の JSONL、実行条件、実際の課題上限も別途保存する。引数、終了コード、子プロセス群へのシグナル転送を維持し、機密情報を公開しない。

33課題は最大118,800秒、63課題は最大226,800秒のモデル待ちがあり得る。前景で完了を待てる外側の予算として、たとえば Sonnet の33課題は122,400秒、Opus の63課題は230,400秒を要求し、内部のコマンド上限はそれぞれ120,000秒と229,000秒とする。準備確認と採点の余裕を確保し、外側の上限を内部より長くする。

使用中のツール定義には数値上限が示されていない。外部要求のない短いコマンドで230,400秒の引数が受理されることは確認したが、64時間の実行を試したわけではない。実際の呼び出しでこの予算が受理されなければ開始せず、制約を報告する。短い上限へ黙って変更したり、背景実行して監視したりしない。

## 残りの Opus と図

未開始の `claude-bridge/claude-opus-5-5` の low、medium、high、xhigh、max は各63課題を3,600秒上限で1回だけ実行する。古い Opus ベースラインを新系列へ流用しない。

Sonnet/max は、63回答だけの出力小計を使う別マーカー `max‡` とし、通常の点を結ぶ線から分ける。30回答は600秒、33回答は3,600秒であることと、失敗試行の出力・費用が不明でマーカーの値に含まれないことを、図とそのデータへ保存する。Luna/max の `max†` も同じ方針を維持する。

全体の上限は、Luna の完了済み5条件が300秒、Sol と Sonnet の通常点が600秒、Opus が3,600秒、継続した2点が混在条件となる。全条件が同じ上限だったとは記載しない。追加の失敗がなければ、比較に使う計1,323回答に対して、既存の時間切れ2件を含む呼び出し数は計1,325件になる。

この修正の HEAD、対象テストと全体チェック、33課題の選択と回答ごとの出典計画を監督者が確認するまで、実モデル呼び出しを再開しない。
