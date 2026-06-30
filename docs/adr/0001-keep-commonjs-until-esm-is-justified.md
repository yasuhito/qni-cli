# CommonJS を維持し、ESM 移行は根拠がそろうまで遅らせる

qni-cli は npm CLI として配布する Node.js / TypeScript プロジェクトである。現時点では CommonJS を維持し、ESM への切り替えはまだ実装しない。ESM 移行は、npm bin の互換性確認を十分に用意し、移行コストを上回る具体的な利点が出た時点で別課題として扱う。

## 判断

現時点の判断は CommonJS 維持とする。理由は次のとおり。

- `qni` は CLI として使われるため、利用者から見える npm bin の契約を最優先で安定させたい。
- ESM に切り替える直接の必要性がまだない。
- `require` 互換性を壊すリスクより、現状の CommonJS 継続で得られる運用上の安定性が大きい。
- TypeScript 移行と Ruby fallback 削除は完了しており、次の大きな移行ではモジュール形式以外の差分を増やさずに検証したい。

ESM 実装課題は現時点では作成しない。下記の移行開始条件がそろうか、ESM-only 依存関係の採用が自然に必要になった時点で、別課題として作成する。

## ESM 移行のきっかけ

ESM 移行を開始できるのは、次の条件がそろったときに限る。

- qni-cli が主に npm CLI として消費され、CommonJS ライブラリとしての `require` 利用を維持する必要がないと判断できる。
- 対象 Node.js LTS が明示され、その範囲で ESM の npm bin 実行と子プロセス境界に不安定要素がない。
- `qni` npm bin の契約を直接 `node` 実行とインストール済みパッケージでの実行の両方で検証できる。
- Cucumber と TypeScript の単体テストの両方で、CommonJS 維持時と同じ CLI 振る舞いを検証できる。
- ESM-only 依存関係の採用、Node.js エコシステムとの整合、または配布形態の単純化など、移行コストを上回る具体的な利点がある。

## 互換性方針

npm bin の契約は `qni` コマンド名、shebang、引数、終了ステータス、標準出力、標準エラー、作業ディレクトリ、環境変数の引き継ぎを対象にする。

ESM へ移行する場合も、利用者から見える契約は次のように維持する。

- `qni` という bin 名を変えない。
- `qni ...`、`node dist/bin/qni.js ...`、インストール済みパッケージの `node_modules/.bin/qni ...` で同じ入力に同じ結果を返す。
- ESM 移行のプルリクエストでは `package.json` の `type` 変更、生成された `dist`、Cucumber 実行経路、TypeScript の単体テスト、npm package smoke を同じ差分で確認する。

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
  node "$repo/dist/bin/qni.js" run
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
  ./node_modules/.bin/qni run
)
```

この手順は代表的なスモークテストであり、ESM 移行課題では Cucumber と TypeScript の単体テストに同等の確認を追加する。

## 試験方針

ESM 移行課題を作る場合は、実装前に次の試験を受け入れ条件へ入れる。

- 直接 `node` 実行は `node dist/bin/qni.js ...` を使い、npm shim を通さない実行形を確認する。
- インストール済みパッケージでの実行は `npm pack` で作った tarball を一時プロジェクトに入れ、`node_modules/.bin/qni ...` から確認する。
- npm bin の契約は、少なくともヘルプ表示、TypeScript 実装コマンド、`qni benchmark run`、`qni benchmark run-all` の代表経路で確認する。
- Cucumber の既存機能は、通常のリポジトリ内実行に加えてインストール済みパッケージでの実行で代表シナリオを通す。
- TypeScript の単体テストは、直接 `node` 実行とインストール済みパッケージでの実行の argv 正規化、env 引き継ぎ、終了ステータス、stdio 転送を確認する。
- 変更後の最新の全体チェックとして `npm run check` を通す。

## ESM 実装課題を作る条件

次のどれかが発生したら、ESM 実装課題を別途作成する。

- 上記の移行開始条件がそろい、CommonJS 維持より ESM 移行の利点が大きいと判断できる。
- qni-cli の自然な機能拡張に ESM-only 依存関係が必要になる。
- npm CLI としての配布確認が安定し、CommonJS ライブラリ互換を維持しない判断ができる。

課題を作るときは、互換性方針と試験方針を受け入れ条件へ写し、`package.json` を変更する前に直接 `node` 実行とインストール済みパッケージでの実行の失敗が再現できる試験を追加する。
