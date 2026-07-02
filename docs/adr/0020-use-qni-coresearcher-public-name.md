# Qni CoResearcher を当面の公開呼称にする

Qni は、量子回路を決定論的に作成・実行・採点・研究ログ化する `qni-cli` から出発した。一方で、研究試行ログ、外部共同研究者の提出物、ベンチマーク採点、将来の共同研究者ワークフローまで含めると、プロジェクト全体は CLI だけでは説明しにくくなる。

PhysicsIntern は、複数役割のエージェント、毎回新しい文脈での呼び出し、構造化された研究状態、git snapshot による復元性を中心に、研究支援ハーネスとして説明されている。Qni もこの方向性を参考にするが、現時点では AI 呼び出し、複数エージェント処理、作業場所の自動準備、プロバイダー抽象を qni-cli 内に持っていない。

## 判断

当面の公開呼称は `Qni CoResearcher` とする。日本語の説明語は「量子回路AI共同研究者ハーネス」とする。

`qni` コマンド名は変更しない。

npm package 名 `qni-cli` は変更しない。

GitHub repository 名 `yasuhito/qni-cli` は変更しない。

README を後で書き換える場合は、`Qni CoResearcher` をプロジェクト全体の呼称、`qni-cli` を決定論的な量子回路 CLI として分けて説明する。

## 理由

`Qni CoResearcher` は、共同研究者としての目的を名前に含めつつ、既存の Qni との連続性を残せる。`Qni Co-Researcher` は表記ゆれを招きやすく、`Qni Research Collaborator` は説明としては明確だが公開名として長い。

`qni` コマンド名、npm package 名、GitHub repository 名は、利用者と開発者から見える互換性契約である。公開説明上の呼称整理だけでこれらを変えると、文書リンク、既存 issue、npm bin、ローカル作業手順を壊す割に得られる利点が小さい。

## 未実装範囲の扱い

Qni CoResearcher の現状説明では、PhysicsIntern のような `multi-agent pipeline` や `provider abstraction` を実装済みのように書かない。AI 呼び出し、複数エージェント処理、作業場所の自動準備、プロバイダー抽象は、この ADR では名前だけを決め、実装対象にしない。

qni-cli は引き続き、外部の AI または人間の共同研究者が作ったプロンプト、回答、`.qni` 提出物を受け取り、決定論的な採点と研究試行ログを作る CLI として扱う。

後続の ADR 0021 では、`qni research record` を AI を呼ばない記録経路として維持しつつ、`qni research solve` をモデル別コストベンチマーク向けの上位自動化として扱う判断を追加した。この追加後も、複数エージェント処理やプロバイダー抽象を実装済みとは書かない。

## 影響

`CONTEXT.md` と `docs/research/project-naming.md` は、`Qni CoResearcher` と `qni-cli` の責務分離に合わせて更新する。README 全体の書き換え、GitHub repository 名の変更、npm package 名の変更、`qni` コマンド名の変更は別課題として扱う。
