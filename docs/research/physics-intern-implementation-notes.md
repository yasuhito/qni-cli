# PhysicsIntern 実装確認メモ

## 参照元

- Blog: https://huggingface.co/blog/dlouapre/physics-intern
- Space: https://huggingface.co/spaces/huggingface/physics-intern
- GitHub: https://github.com/huggingface/physics-intern-skills
- Dataset: https://huggingface.co/datasets/introvoyz041/physics-intern-skills

## 確認した実装の要点

PhysicsIntern は、AI coding harness の上に研究方法論を載せる設計になっている。Claude Code、Pi、Codex CLI、OpenCode などの host が、ツール実行、サブエージェント、Web検索、Python 実行を提供し、PhysicsIntern 側は workspace の文書、役割プロンプト、skill workflow、研究ログの規律を提供する。

重要な設計要素は次のとおり。

- workspace は git repository として作る。
- `problem.md` が研究質問の入口になる。
- `research_log.md` と `plan.md` が durable state で、会話セッションは捨てられる。
- main agent は coordinator であり、実質的な調査、導出、計算、レビュー、批評は fresh-context sub-agent に渡す。
- sub-agent の結果を main agent が統合し、`research_log.md`、`plan.md`、`notes/flags.md` を更新して、1 logical step ごとに commit する。
- Working Claim を Established Result に上げるには、典型的には2つ以上の独立した文脈による証拠が必要になる。
- `/research-plan` は計画を作り、人間の承認を待ってから次に進む。
- `/autoresearch` はあるが、既定では human-in-the-loop を重視する。
- 研究成果物は `derivations/`、`computations/`、`critiques/`、`references/`、`data/` などの plain file として残す。

## Qni への示唆

Qni の研究試行ログMVPでは、PhysicsIntern の全ワークスペース方法論をすぐには再実装しない。ただし、次の考え方はそのまま採用する価値がある。

- files are durable state, session is ephemeral。
- 研究試行は、プロンプト、AI回答、提出物、採点結果を plain file として残す。
- qni-cli は共同研究者が使う決定論的ツールであり、プロジェクト全体は CLI だけではない。
- 初期MVPでは AI 呼び出しや sub-agent orchestration を持たず、外部 harness が作った成果物を `qni research record` で記録する。
- 将来、研究ログを単なる採点結果から、仮説、検証、批評、修正履歴まで含む共同研究者 workspace へ広げられる。

## 初期MVPではまだ採用しないもの

- fresh-context sub-agent の役割分担を qni-cli 内に実装すること。
- 研究計画、導出、計算、レビュー、批評のワークフローを qni-cli の skill として持つこと。
- 各研究ステップごとの git commit を qni-cli が自動で作ること。
- Established Result 昇格規則を機械的に実装すること。

これらは、研究試行ログが安定し、Qni CoResearcher としての範囲が固まった後に検討する。
