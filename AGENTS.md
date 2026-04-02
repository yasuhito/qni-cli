# AGENTS.md

## Feature Development Rule

- `features/*.feature` のない機能は存在しないのと同じ。
- 機能を追加するときには、先に `features/*.feature` を追加する。

## Reek Rule

- `.reek.yml` で警告を安易に無視しない。
- まずコードをリファクタリングして smell を解消する。
- ignore を追加・維持するのは、コード側で直すと責務や可読性がむしろ悪化する場合だけにする。
