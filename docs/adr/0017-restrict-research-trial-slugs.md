# 研究試行 slug は小文字英数字とハイフンに制限する

`qni research record` の `--slug` は、研究試行IDとディレクトリ名に含まれるため、小文字英数字とハイフンだけを許可する。形式は次の正規表現にする。

```text
[a-z0-9]+(-[a-z0-9]+)*
```

許可例:

```text
smoke-claude
bellstate-codex
trial-001
```

拒否例:

```text
Smoke Claude
../escape
smoke_claude
```

この判断により、ディレクトリ名、URL、将来の GitHub Pages、集計処理で扱いやすい安全な識別子になる。
