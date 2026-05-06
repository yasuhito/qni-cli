# ESM 移行判断仕様

## 背景

qni-cli の TypeScript 移行は `package.json` の `type: commonjs` を維持したまま始めた。現在の npm bin は `qni` から `./dist/bin/qni.js` を実行する形で、`tsconfig.json` は `module: Node16` と `moduleResolution: Node16` を使っている。

この仕様は、`package.json` を ESM へ切り替えるかどうかの判断基準と、切り替える場合に壊してはいけない互換性を定義する。現時点では CommonJS を維持し、ESM への切り替えはまだ実装しない。

## 判断

現時点の判断は CommonJS 維持とする。理由は次のとおり。

- npm CLI としての消費形態がまだ十分に固定されていない。
- Ruby fallback を含む移行期間中であり、subprocess の境界をできるだけ安定させる必要がある。
- ESM に切り替える直接の必要性がまだない。
- `require` 互換性を壊すリスクより、現状の CommonJS 継続で得られる運用上の安定性が大きい。

ESM 実装課題は現時点では作成しない。下記の移行開始条件がそろうか、ESM-only 依存関係の採用が自然に必要になった時点で、別課題として作成する。

## ESM 移行のきっかけ

ESM 移行を開始できるのは、次の条件がそろったときに限る。

- qni-cli が主に npm CLI として消費され、CommonJS ライブラリとしての `require` 利用を維持する必要がないと判断できる。
- 対象 Node.js LTS が明示され、その範囲で ESM の npm bin 実行と subprocess 境界に不安定要素がない。
- `qni` npm bin contract を direct `node` execution と installed package execution の両方で検証できる。
- Ruby fallback が残る場合でも、ESM の entrypoint から Ruby fallback へ cwd、argv、env、stdio、終了ステータスをそのまま渡せる。
- Cucumber と TypeScript unit tests の両方で、CommonJS 維持時と同じ CLI 振る舞いを検証できる。
- ESM-only 依存関係の採用、Node.js エコシステムとの整合、または配布形態の単純化など、移行コストを上回る具体的な利点がある。

## CommonJS 継続の利点とリスク

利点:

- 既存の `package.json`、`tsconfig.json`、Node dispatcher、Ruby fallback の組み合わせを維持できる。
- `require` 互換性と CommonJS 前提のテスト補助コードを壊しにくい。
- npm bin の配布確認を、モジュール形式変更とは独立して進められる。
- TypeScript 移行中の問題切り分けで、モジュール形式変更による差分を増やさずに済む。

リスク:

- ESM-only 依存関係を採用しづらい。
- 将来の Node.js CLI 実装例やツール連携が ESM 前提になった場合に追従コストが増える。
- CommonJS を長く残すほど、後日の ESM 切り替えで確認すべき履歴と互換性面が増える。

## ESM 移行の利点とリスク

利点:

- 現行の Node.js エコシステムに合わせやすく、ESM-only 依存関係を自然に使える。
- 将来の npm 配布やツール連携で、モジュール形式の説明を単純化できる。
- TypeScript の `Node16` 解決設定と package boundary の意味を、実行時の package 設定とそろえやすい。

リスク:

- `require` 互換性が壊れる可能性がある。
- `__dirname`、`__filename`、JSON 読み込み、拡張子付き import など、CommonJS 前提の実装差分が出る。
- npm bin の shebang、実行権限、Windows shim、subprocess 委譲の不具合が、モジュール形式変更と同時に表面化する可能性がある。
- Ruby fallback が残っている間は、ESM entrypoint と Ruby subprocess 境界の両方を検証する必要がある。

## 互換性方針

npm bin contract は `qni` コマンド名、shebang、引数、終了ステータス、標準出力、標準エラー、作業ディレクトリ、環境変数の引き継ぎを対象にする。

ESM へ移行する場合も、利用者から見える契約は次のように維持する。

- `qni` という bin 名を変えない。
- `qni ...`、`node dist/bin/qni.js ...`、installed package の `node_modules/.bin/qni ...` で同じ入力に同じ結果を返す。
- Ruby fallback が残るコマンドでは、CommonJS 維持時と同じ cwd、argv、env、stdio、終了ステータスを Ruby 側へ渡す。
- `QNI_USE_RUBY=1` は、ESM entrypoint でも Ruby fallback 強制として働く。
- ESM 移行の pull request では `package.json` の `type` 変更、生成された `dist`、Cucumber 実行経路、TypeScript unit tests を同じ差分で確認する。

## 試験方針

ESM 移行課題を作る場合は、実装前に次の試験を受け入れ条件へ入れる。

- direct `node` execution は `node dist/bin/qni.js ...` を使い、npm shim を通さない実行形を確認する。
- installed package execution は `npm pack` で作った tarball を一時プロジェクトに入れ、`node_modules/.bin/qni ...` から確認する。
- npm bin contract は、少なくとも help、TypeScript-backed command、Ruby fallback command、`QNI_USE_RUBY=1` の経路で確認する。
- Cucumber の既存機能は、通常の repository-local 実行に加えて installed package 実行で代表シナリオを通す。
- TypeScript unit tests は、direct `node` execution と installed package execution の argv 正規化、env 引き継ぎ、終了ステータス、stdio 転送を確認する。
- 変更後の fresh full check として `bundle exec rake check` を通す。

## ESM 実装課題を作る条件

次のどれかが発生したら、ESM 実装課題を別途作成する。

- 上記の移行開始条件がそろい、CommonJS 維持より ESM 移行の利点が大きいと判断できる。
- qni-cli の自然な機能拡張に ESM-only 依存関係が必要になる。
- npm CLI としての配布確認が安定し、CommonJS ライブラリ互換を維持しない判断ができる。

課題を作るときは、互換性方針と試験方針を受け入れ条件へ写し、`package.json` を変更する前に direct `node` execution と installed package execution の失敗が再現できる試験を追加する。
