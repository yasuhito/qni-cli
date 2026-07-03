# プロジェクト命名メモ

## 決定

当面の公開呼称は `Qni CoResearcher` とする。

日本語の説明語は「量子回路AI共同研究者ハーネス」とする。公開説明では、初出で `Qni CoResearcher`（量子回路AI共同研究者ハーネス）と書き、以後は文脈に応じて `Qni CoResearcher` または Qni と短く呼んでよい。

`qni-cli` は、量子回路を決定論的に作成・実行・採点・研究ログ化する CLI として残す。

## README 書き換えで使える説明

Qni CoResearcher は、自然言語の量子回路課題、`.qni` 提出物、qni-cli の決定論的な採点、研究試行ログをリポジトリファイルとして束ねる量子回路AI共同研究者ハーネスです。

公平比較用の主経路では、中立回路 JSON を `blind-neutral-circuit-json-v1` として記録し、既存の `.qni` 直接提出は `qni-command-output-v0` の legacy protocol として分けて扱います。

通常の記録経路では、外部の AI または人間の共同研究者が作った成果物を `qni research record` で記録・採点し、再現可能に比較します。モデル別コストベンチマークでは、`qni research solve` が登録済みモデルを OpenAI互換 Chat Completions API で直接呼び出します。qni-cli は、共同研究者が使う決定論的な量子回路ツールを中心にした CLI であり、プロジェクト全体そのものではありません。

短い説明にする場合は、次のように書く。

> Qni CoResearcher は、AI または人間の共同研究者が作った量子回路提出物を、qni-cli の決定論的な採点とリポジトリファイルの研究ログで再現可能に扱うハーネスです。

## qni-cli との責務分離

| 呼称 | 指すもの | 指さないもの |
| --- | --- | --- |
| `Qni CoResearcher` | 量子回路課題、提出物、採点、研究試行ログ、モデル別コストベンチマークを束ねるプロジェクト全体 | qni-cli だけ、または複数エージェント処理を含む汎用 AI 研究基盤 |
| `qni-cli` | `qni` コマンド、npm package、GitHub repository、決定論的な量子回路 CLI、研究試行ログ、単一モデルの OpenAI互換 API の直接実行 | 共同研究者ハーネス全体、複数エージェント処理、プロバイダー抽象 |
| `qni` | 利用者が実行するコマンド名 | 公開プロジェクト名の完全表記 |

## 変更しない名前

| 対象 | 判断 | 理由 |
| --- | --- | --- |
| `qni` コマンド名 | 変更しない | CLI 利用者から見える互換性契約であり、短く安定しているため。 |
| npm package 名 `qni-cli` | 変更しない | まだ公開呼称の整理段階であり、破壊的なパッケージ名変更は別判断にすべきため。 |
| GitHub repository 名 `yasuhito/qni-cli` | 変更しない | 既存 issue、ブランチ、文書リンク、作業場所を壊す必要がないため。 |
| README 全体 | この issue では書き換えない | まず呼称と責務分離を決め、README はこの文書と ADR を根拠に別作業で更新するため。 |

## 候補の評価

| 候補 | 評価 |
| --- | --- |
| `Qni CoResearcher` | 採用。共同研究者としての位置づけを短く示せる。`Qni` との連続性も残る。 |
| `Qni Co-Researcher` | 不採用。ハイフンの有無で表記ゆれが起きやすく、npm package 名のハイフンとは別種の意味を持ってしまう。 |
| `Qni Research Collaborator` | 不採用。意味は明確だが長く、公開名としては説明語に寄りすぎる。 |

## PhysicsIntern から参考にする範囲

PhysicsIntern は、研究問題を扱う複数役割のエージェント、毎回新しい文脈での呼び出し、構造化された研究状態、git snapshot による復元性を中心に説明している。Qni CoResearcher でも、研究状態を会話履歴ではなくリポジトリファイルとして残し、後から比較できる形にする考え方は参考にする。

ただし、現時点の Qni CoResearcher は qni-cli の研究試行ログ、評価ランナー、単一モデルの OpenAI互換 API の直接実行を中心にした段階である。PhysicsIntern のような `multi-agent pipeline` や `provider abstraction` を実装済みのように書かない。複数エージェント処理、作業場所の自動準備、プロバイダー抽象は、将来の上位ハーネスまたは別課題として扱う。
