# Ruby fallback なし npm リリースサイクル記録

## 状態

status: pending

この記録は #83 の削除条件である「Ruby fallback を使わない npm リリースサイクルを 1 回完了した」ことを保存するためのテンプレートです。現時点では未完了です。

## 対象リリース

- npm パッケージバージョン: 未記録
- git タグ: 未記録
- リリース候補または公開済みパッケージ: 未記録
- リリース日: 未記録
- 検証者: 未記録

## 完了条件

- [ ] npm 経路でパッケージをインストールできる。
- [ ] `bundle` を失敗させる shim がある状態で、代表コマンドが成功する。
- [ ] `qni --help` が成功する。
- [ ] `qni add H --qubit 0 --step 0` が成功する。
- [ ] `qni run` が成功する。
- [ ] `qni benchmark run` が成功する。
- [ ] リリースサイクル中に `QNI_USE_RUBY=1` が不要だった。
- [ ] リリースサイクル中に `bundle exec bin/qni` が不要だった。
- [ ] 問題があった場合、回避策または修正課題が記録されている。

## 検証コマンド

削除前のリリースサイクル記録では次を実行します。

```bash
npm run check
npm run smoke:package
npm run archive:ruby-comparison
bundle exec rake check
```

Ruby fallback 削除後のリリースサイクルでは、Ruby 比較と旧 Ruby 検証の代わりに Node 経路だけを実行します。

```bash
npm run check
npm run smoke:package
```

## 証跡

未記録。

## 判定

#83 の Ruby fallback 削除に進むには、この文書の `status` を `passed` に更新し、対象リリースと証跡を記録する必要があります。
