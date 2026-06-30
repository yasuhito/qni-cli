# qni research record は git commit を作らない

`qni research record` の初期機能では、研究試行ディレクトリとその中のファイルを作成するだけにし、git commit は自動で作らない。PhysicsIntern は1 logical step ごとに commit するが、Qni のMVPでは commit のタイミングを人間または上位 harness に任せる。

この判断により、既存の作業木に未コミット変更がある場合の扱い、commit message の設計、失敗時の rollback などを初期範囲から外せる。将来必要になった場合は、`--commit` のような明示オプションとして追加する。
