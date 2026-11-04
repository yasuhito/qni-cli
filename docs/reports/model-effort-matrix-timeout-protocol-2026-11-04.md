# 思考量比較の600秒上限と Luna/max の継続案

実施日: 2026-11-04 (UTC)

1課題の待ち時間を300秒から600秒へ変更する承認を受けた。実装は `cfaa9d7747c1f3789e2b43ca1791c4aa94f636a5`。`PI_TIMEOUT_MS` と、新規研究試行の `harness.piTaskTimeoutMs` の記録だけを変更した。課題、プロンプト、提出プロトコル、採点器、モデル指定、再試行・代替経路の禁止、実行エラーでの停止は変えない。Cucumber の時間上限も変更していない。

その後、人間は gpt-6-luna/max の先頭34回答を再利用し、時間切れの35課題目だけを600秒上限で再度呼び出して、残り28課題を続けることを明示的に承認した。全63課題を新しく呼ぶ旧提案は撤回する。

この文書は再開前の確認用であり、600秒条件のモデル呼び出しはまだ実行していない。自動再試行や汎用的な再開機能は追加しない。

## 変更しない原記録

`cd885fbb7e5b01d2687896fec82aac52f3f9207d` の300秒上限で、gpt-6-luna の off、low、medium、high、xhigh を各63課題で完了した。元の研究試行と生ログは変更しない。それぞれの `execution-envelope.json` が指す固定コミットの実装は300秒上限である。外部の条件ディレクトリの `started.json` にも `maximumPerTaskSeconds: 300` がある。過去の `metadata.json` に600秒の値を追記しない。

| 思考量         | passed | failed | disallowed | 採点器エラー | Pi 実行エラー | 出力トークン |
| -------------- | -----: | -----: | ---------: | -----------: | ------------: | -----------: |
| off (実効none) |     37 |     19 |          4 |            3 |             0 |        2,736 |
| low            |     51 |      3 |          7 |            2 |             0 |       10,416 |
| medium         |     54 |      4 |          5 |            0 |             0 |       14,304 |
| high           |     55 |      4 |          4 |            0 |             0 |       17,178 |
| xhigh          |     57 |      2 |          4 |            0 |             0 |       31,788 |

採点器エラーの5件は、すべて既知の空操作列による `circuit.json does not exist` である。分類を変更せず、分母63の未合格に含める。

元の max は34課題で最終応答を得た後、35課題目 `preparing-states/wstate-power-of-two` が300秒で `ETIMEDOUT` となった。元の部分記録は `/tmp/qni-research-solve-Rvsq3k`。コピーと実行条件、生ログは `/tmp/qni-model-effort-matrix-evidence/matrix-conditions/effort-matrix-v1-openai-codex-gpt-6-luna-max/` に保存している。35件の呼び出し索引、34回答、失敗した35課題目、未知の利用量をすべてそのまま保持する。

## 実行するのは新しい29課題試行だけ

新しい研究試行の slug は `effort-matrix-v2-openai-codex-gpt-6-luna-max-tail29-600s` とする。既存の `qni research solve` に `--provider openai-codex --model gpt-6-luna --thinking max` と、次の29個の `--task` を明示する。選択順が元の63課題の35番目から63番目と一致することを呼び出し前に確認する。

```text
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

先頭34課題をこのコマンドに含めない。29課題の正式な研究試行は新しいディレクトリにそのまま保存し、元の部分記録には追記しない。再び Pi 実行・認証・上限・応答元・利用量のエラーが出ればその場で停止し、追加の再試行はしない。

## 63回答の集計方法

1. 元の部分記録の先頭34回答、提出物、プロンプト、呼び出し索引と生ログのハッシュを固定する。
2. 先頭34回答は中断時点でまだ採点していないため、固定採点器の既存 CLI `qni benchmark run <original-task.md> <original-submission.qni> --json` でそれぞれ初回採点する。新しい JSON 出力は外部の別ディレクトリに保存する。元の課題・提出物は読み取り専用で使い、完了済みの5研究試行や原記録は再採点しない。
3. 新しい29課題試行について、課題集合、応答元、実効思考量、上限600秒、トークン数と料金を生ログまで照合する。
4. 元の34回答と新しい29回答の課題 ID が重複せず、合わせて固定63課題と完全一致することを確認する。
5. 別の分析用ファイルに、課題ごとの原記録パス、呼び出し番号、回答・提出物・プロンプト・採点結果・生ログのハッシュ、適用した上限300秒または600秒を保存する。分析ファイルは「継続した63回答の集計」と明記し、CLI が保存した単一の63課題研究試行があるように見せない。

合格率はこの63回答の採点結果から求める。failed、disallowed、採点器エラーも除外せず、分母は63とする。新しい原因の採点器エラーがあれば調査してから続行する。既知の空操作列の問題は error のまま明示する。

## 利用量と時間の意味

先頭34回答の既知の出力は18,125トークンである。これに新しい29回答の出力を足せば、最終的に使う63回答の出力トークン数を求められる。入力、キャッシュ、料金の既知の小計も、同じ63回答の記録から集計する。

ただし、最初に時間切れになった35課題目の利用量と費用は不明である。失敗試行を含む全試行の出力トークン数と費用は `null` のままとし、63回答の小計を全試行の消費量や請求額として示さない。完了すれば Luna/max は64呼び出しで63回答を得た条件となり、最初の34回答は300秒上限、後半29回答は600秒上限になる。

実行時間は旧 max の実行時間と新しい29課題の実行時間を別々に記録し、その和を示す場合は300秒の失敗待ちも含むことを明記する。指示待ちの時間をモデル実行時間に含めない。

## 残り15条件と図への記載

まだ開始していない gpt-6.1-sol、claude-sonnet-5-5、claude-opus-5-5 の low、medium、high、xhigh、max は各63課題、600秒上限で1回だけ実行する。各コマンドは明示的な `--provider openai-codex` または `--provider claude-bridge` を使う。モデル ID は変更しない。

この計画がすべて完了すれば、21条件の計1,323回答を得るための呼び出しは、最初の時間切れ1件を加えて計1,324件になる。これは新しい失敗がない場合の見込みであり、追加の再試行を許可するものではない。

図は通常の点の出力トークン合計を横軸に使う。継続した Luna/max は、失敗試行を除いた「最終63回答の出力トークン小計」を使う別マーカーとし、通常の点を結ぶ線とは分ける。同じモデルの色で `max†` と表示し、「34回答は300秒、29回答は600秒。時間切れ1件の出力・費用は不明で、この点には含まれない」と注記する。図のデータにも、集計対象、上限の混在、全試行の利用量が不明であることを保存する。

最初の5条件は300秒、残り15条件は600秒であり、全点の上限が同じとは記載しない。1条件の前景実行の外側の予算も、63回の600秒待ちと準備確認・採点を収める値にする。たとえば内部の上限を39,100秒、外側を40,000秒とし、実行中の呼び出しを短いツール上限で失わない。

この計画と修正後の HEAD を監督者が確認するまで、600秒条件のモデル呼び出しは行わない。
