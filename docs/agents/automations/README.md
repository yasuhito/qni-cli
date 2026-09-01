# Orca automation の定義

`qni-cli issue coordinator` と `qni-cli PR reviewer` は Orca の automation として登録されている。このディレクトリは prompt と precheck の原本である。Orca 側を更新するときは、先に原本を編集し、レビューと commit を済ませてから反映する。

| automation | id | prompt | precheck |
| --- | --- | --- | --- |
| qni-cli issue coordinator | `1c20e813-8150-4f46-a44a-46cea275af4c` | `issue-coordinator.md` | `issue-coordinator.precheck.sh` |
| qni-cli PR reviewer | `b467ad1d-295a-4146-ab47-b1fe2636ddc3` | `pr-reviewer.md` | `pr-reviewer.precheck.sh` |

両方とも10分おき（`*/10 * * * *`、Asia/Tokyo）に、既存 workspace `/home/yasuhito/Work/qni-cli` で agent `pi` を起動する。precheck の終了コードが0のときだけ prompt を実行し、それ以外は skip として記録する。precheck の timeout は60秒である。

## 反映

issue coordinator:

```bash
orca-ide automations edit 1c20e813-8150-4f46-a44a-46cea275af4c \
  --prompt "$(cat docs/agents/automations/issue-coordinator.md)" --json
orca-ide automations edit 1c20e813-8150-4f46-a44a-46cea275af4c \
  --precheck "$(cat docs/agents/automations/issue-coordinator.precheck.sh)" \
  --precheck-timeout 60 --json
```

PR reviewer:

```bash
orca-ide automations edit b467ad1d-295a-4146-ab47-b1fe2636ddc3 \
  --prompt "$(cat docs/agents/automations/pr-reviewer.md)" --json
orca-ide automations edit b467ad1d-295a-4146-ab47-b1fe2636ddc3 \
  --precheck "$(cat docs/agents/automations/pr-reviewer.precheck.sh)" \
  --precheck-timeout 60 --json
```

反映後は `orca-ide automations show <id> --json` で内容を取得し、原本との差が末尾改行だけであることを確認する。

## 有効化と停止

```bash
orca-ide automations edit <id> --enabled --json
orca-ide automations edit <id> --disabled --json
orca-ide automations runs --id <id> --json
```

## 動かすための前提

- `/home/yasuhito/Work/qni-cli` が Orca の既存 workspace として登録され、GitHub repository `yasuhito/qni-cli` と Orca repo id `1da4f9d4-b46c-458b-baf9-7889bf345f72` に対応していること。
- `orca-ide`、`gh`、`git`、`jq`、`python3`、Node.js、npm を利用でき、Orca と GitHub の認証が済んでいること。
- `main` に `npm run check` と `.github/workflows/ci.yml` があること。worker worktree は `origin/main` から作られ、PR reviewer は1件以上の CI check が成功しない限りマージしない。
- 自動実装に渡す issue には `ready-for-agent` と `agent:implement` の両方を付けること。本文は `## Agent Brief`、`## Acceptance criteria` または `## 受け入れ条件`、`## Out of scope` または `## 対象外` の3項目を必須とする。依存関係は GitHub Relationships の `blockedBy` に入れる。
- automation が使う GitHub label と、worker 用モデル `openai-codex/gpt-5.6-sol` を利用できること。
