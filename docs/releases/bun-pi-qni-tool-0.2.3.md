---
summary: Bun 版 Pi から qni ツールを実行するとハングする問題を直す 0.2.3 修正
---

# qni-cli 0.2.3: Bun 版 Pi での qni ツール修正

qni-cli 0.2.2 では、mise などで導入した Bun でコンパイルされた単体バイナリ版の Pi から専用 `qni` ツールを呼ぶと、処理が返らなくなる問題がありました。Bun 版 Pi では `process.execPath` が Pi 自身を指すため、qni の代わりに入れ子の Pi エージェントが起動していました。

0.2.3 では、Bun 上で動いているときは `node` で `qni.js` を実行するようにしました。Node.js で動く Pi の動作は変わりません。Pi の利用者は更新後に次を実行してください。

```bash
pi install npm:qni-cli
```

## 確認

`npm run check` は成功しました。
