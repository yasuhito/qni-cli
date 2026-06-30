# qni-cli は Node.js / TypeScript のみの実行時にする

qni-cli は Ruby fallback と Ruby 実行時依存を削除し、Node.js / TypeScript のみの CLI 実行経路にする。Ruby 実装との最終比較証跡は `docs/reports/ruby-comparison-archive.md` と `docs/reports/ruby-comparison-archive.json` に保存し、以後の通常検証は `npm run check` を使う。

この判断により、CLI の実行経路、npm パッケージの配布確認、将来のベンチマークランナーを単純化する。一方で、Ruby ではない明示的な補助境界である `libexec/*.py`、`scripts/setup_symbolic_python.sh`、`pdflatex`、`pdftocairo` は、記号計算や画像出力のために引き続き残す。

