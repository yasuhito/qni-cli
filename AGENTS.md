# AGENTS.md

## Feature Development Rule

- `features/*.feature` のない機能は存在しないのと同じ。
- 機能を追加するときには、先に `features/*.feature` を追加する。

## Reek Rule

- `.reek.yml` で警告を安易に無視しない。
- まずコードをリファクタリングして smell を解消する。
- ignore を追加・維持するのは、コード側で直すと責務や可読性がむしろ悪化する場合だけにする。

## qni CLI Growth Rule

- qni CLI にまだ無い機能が必要になったときは、既存機能でごまかす前に機能追加を検討する。
- Quantum Katas など既知のユースケースで自然に必要な機能は、feature-first で qni CLI に追加することを優先する。
- 元の task や回路の意図を崩して回避するのではなく、qni CLI 自体を成長させる方向をまず考える。
