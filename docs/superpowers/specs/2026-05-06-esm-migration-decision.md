# ESM 移行判断仕様

## 背景

qni-cli の TypeScript 移行は `package.json` の `type: commonjs` を維持したまま始めた。現在の npm bin は `qni` から `./dist/bin/qni.js` を実行する形で、`tsconfig.json` は `module: Node16` と `moduleResolution: Node16` を使っている。

この仕様は、`package.json` を ESM へ切り替えるかどうかの判断基準と、切り替える場合に壊してはいけない互換性を定義する。現時点では CommonJS を維持し、ESM への切り替えはまだ実装しない。

## 判断

現時点の判断は CommonJS 維持とする。理由は次のとおり。

- npm CLI としての消費形態がまだ十分に固定されていない。
- Ruby fallback を含む移行期間中であり、子プロセス境界をできるだけ安定させる必要がある。
- ESM に切り替える直接の必要性がまだない。
- `require` 互換性を壊すリスクより、現状の CommonJS 継続で得られる運用上の安定性が大きい。

ESM 実装課題は現時点では作成しない。下記の移行開始条件がそろうか、ESM-only 依存関係の採用が自然に必要になった時点で、別課題として作成する。

## ESM 移行のきっかけ

ESM 移行を開始できるのは、次の条件がそろったときに限る。

- qni-cli が主に npm CLI として消費され、CommonJS ライブラリとしての `require` 利用を維持する必要がないと判断できる。
- 対象 Node.js LTS が明示され、その範囲で ESM の npm bin 実行と子プロセス境界に不安定要素がない。
- `qni` npm bin の契約を直接 `node` 実行とインストール済みパッケージでの実行の両方で検証できる。
- Ruby fallback が残る場合でも、ESM のエントリーポイントから Ruby fallback へ cwd、argv、env、stdio、終了ステータスをそのまま渡せる。
- Cucumber と TypeScript の単体テストの両方で、CommonJS 維持時と同じ CLI 振る舞いを検証できる。
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
- npm bin の shebang、実行権限、Windows shim、子プロセス委譲の不具合が、モジュール形式変更と同時に表面化する可能性がある。
- Ruby fallback が残っている間は、ESM エントリーポイントと Ruby 子プロセス境界の両方を検証する必要がある。

## 互換性方針

npm bin の契約は `qni` コマンド名、shebang、引数、終了ステータス、標準出力、標準エラー、作業ディレクトリ、環境変数の引き継ぎを対象にする。

ESM へ移行する場合も、利用者から見える契約は次のように維持する。

- `qni` という bin 名を変えない。
- `qni ...`、`node dist/bin/qni.js ...`、インストール済みパッケージの `node_modules/.bin/qni ...` で同じ入力に同じ結果を返す。
- Ruby fallback が残るコマンドでは、CommonJS 維持時と同じ cwd、argv、env、stdio、終了ステータスを Ruby 側へ渡す。
- `QNI_USE_RUBY=1` は、ESM エントリーポイントでも Ruby fallback 強制として働く。
- ESM 移行のプルリクエストでは `package.json` の `type` 変更、生成された `dist`、Cucumber 実行経路、TypeScript の単体テストを同じ差分で確認する。

## 互換性確認手順

ESM へ移行するプルリクエストでは、`package.json` の `type` を変更する前に CommonJS の現状で次の確認を実行し、ESM 切り替え後にも同じ確認を実行する。終了ステータス、標準出力、標準エラー、生成される `circuit.json` に差分が出た場合は、npm bin の契約の破壊として扱う。

```bash
repo="$(pwd)"
workdir="$(mktemp -d)"
npm run build

(
  cd "$workdir"
  node "$repo/dist/bin/qni.js" add H --qubit 0 --step 0
  node "$repo/dist/bin/qni.js" view
  QNI_USE_RUBY=1 node "$repo/dist/bin/qni.js" view
)
```

インストール済みパッケージでの実行は、同じ生成物を `npm pack` で tarball にし、一時プロジェクトへインストールして確認する。

```bash
repo="$(pwd)"
workdir="$(mktemp -d)"
npm run build
npm pack --pack-destination "$workdir"

mkdir "$workdir/consumer"
(
  cd "$workdir/consumer"
  npm init -y >/dev/null
  npm install "$workdir"/qni-cli-*.tgz
  ./node_modules/.bin/qni add H --qubit 0 --step 0
  ./node_modules/.bin/qni view
  QNI_USE_RUBY=1 ./node_modules/.bin/qni view
)
```

この手順は代表的なスモークテストであり、ESM 移行課題では Cucumber と TypeScript の単体テストに同等の確認を追加する。

## 試験方針

ESM 移行課題を作る場合は、実装前に次の試験を受け入れ条件へ入れる。

- 直接 `node` 実行は `node dist/bin/qni.js ...` を使い、npm shim を通さない実行形を確認する。
- インストール済みパッケージでの実行は `npm pack` で作った tarball を一時プロジェクトに入れ、`node_modules/.bin/qni ...` から確認する。
- npm bin の契約は、少なくともヘルプ表示、TypeScript 実装コマンド、Ruby fallback コマンド、`QNI_USE_RUBY=1` の経路で確認する。
- Cucumber の既存機能は、通常のリポジトリ内実行に加えてインストール済みパッケージでの実行で代表シナリオを通す。
- TypeScript の単体テストは、直接 `node` 実行とインストール済みパッケージでの実行の argv 正規化、env 引き継ぎ、終了ステータス、stdio 転送を確認する。
- 変更後の最新の全体チェックとして `bundle exec rake check` を通す。

## ESM 実装課題を作る条件

次のどれかが発生したら、ESM 実装課題を別途作成する。

- 上記の移行開始条件がそろい、CommonJS 維持より ESM 移行の利点が大きいと判断できる。
- qni-cli の自然な機能拡張に ESM-only 依存関係が必要になる。
- npm CLI としての配布確認が安定し、CommonJS ライブラリ互換を維持しない判断ができる。

課題を作るときは、互換性方針と試験方針を受け入れ条件へ写し、`package.json` を変更する前に直接 `node` 実行とインストール済みパッケージでの実行の失敗が再現できる試験を追加する。
