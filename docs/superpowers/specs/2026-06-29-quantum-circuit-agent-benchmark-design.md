# 量子回路AIエージェント評価ベンチマーク設計メモ

## 概要

本メモは、量子回路の研究開発を支援するAIマルチエージェント基盤を評価するための候補ベンチマークを整理する。評価対象は、自然言語で与えられた課題から量子回路を設計し、`qni-cli` などの決定論的なCLIでシミュレーション、状態確認、期待値計算、可視化、資源量確認を行いながら、正しい回路へ到達できるかである。理論物理一般ではなく、量子コンピューティング、特に量子回路設計に範囲を絞ることで、AIエージェントの推論力とCLIによる厳密な検証を組み合わせた評価がしやすくなる。

## 外部ベンチマーク候補

| ベンチマーク | 主な対象 | 評価への使い方 | 備考 |
|---|---|---|---|
| QCircuitBench | AIによる量子アルゴリズム設計、量子回路実装 | 自然言語の問題文から回路、後処理、検証までを生成する総合評価に使う | 問題文、量子回路コード、古典後処理、検証関数を含む。AIエージェント評価に最も近い候補。 |
| QuanBench | LLMによる量子コード生成 | 量子アルゴリズム、状態準備、ゲート分解、量子機械学習の小中規模タスクとして使う | 実行可能な標準解と機能的正しさ、量子意味的同等性の評価がある。`qni-cli` 向け移植候補。 |
| QuanBench+ | 複数フレームワーク対応の量子コード生成 | Qiskit、PennyLane、Cirq 間で同じ意図を扱う比較評価に使う | 複数の実装表現から、qni の中立的な回路表現へ落とし込む際の参考になる。 |
| Qiskit HumanEval | Qiskitコード生成 | HumanEval型の短い量子プログラミング課題として使う | 151問。API利用能力と実行可能な量子コード生成の評価に向く。 |
| QHackBench | PennyLaneコード生成 | PennyLane由来の実用的・競技的課題を回路設計課題へ変換して使う | QHack の実課題を元にしており、難度別評価の参考になる。 |
| QASMBench | OpenQASM形式の量子回路ベンチマーク | 既存回路の読み込み、実行、資源量分析、最適化、可視化の評価に使う | 小規模から大規模まであり、幅、深さ、CNOT数などの指標を持つ。 |
| MQT Bench | 量子ソフトウェア・設計自動化ツール評価 | GHZ、QFT、Grover、QAOA、VQE、Shorなどの回路生成・変換評価に使う | 抽象度の異なる回路を生成でき、対象ハードウェアやゲート集合も指定できる。 |
| SupermarQ | アプリケーション指向の量子ベンチマーク | 応用クラスごとの回路性能、特徴量、ハードウェア非依存評価の参考に使う | 量子システム性能評価寄りだが、回路設計タスクの代表性を考える材料になる。 |
| QED-C Application-Oriented Benchmarks | 応用・アルゴリズム指向の量子ベンチマーク | Hidden Shift、Bernstein-Vazirani、QFT、Phase Estimation、Amplitude Estimation などの応用タスクとして使う | 実行基盤と計測方法が整っており、アプリケーション指向の評価に向く。 |
| QUEKO | 量子回路マッピング、レイアウト変換 | 量子ビット配置、接続制約、SWAP挿入、深さ最適化の評価に使う | 既知の最適マッピングを持つため、最適性評価に使いやすい。 |
| RevLib | 可逆回路・量子回路設計 | 可逆論理合成、ゲート分解、回路簡約の題材として使う | 古典可逆関数から量子回路へ変換する課題に向く。 |
| StabilizerBench | 量子誤り訂正、スタビライザー回路合成 | 状態準備、意味を保った最適化、耐故障回路合成の高度な評価に使う | AIエージェント評価を明確に意識したベンチマーク。Gottesman-Knill系の効率的検証と相性がよい。 |

## 評価対象としての整理

これらのベンチマークは、目的別に次のように使い分ける。

1. **AIエージェントの回路設計能力を測る候補**: QCircuitBench、QuanBench、QuanBench+、Qiskit HumanEval、QHackBench。
2. **既存回路の処理・検証・最適化能力を測る候補**: QASMBench、MQT Bench、SupermarQ、QED-C Application-Oriented Benchmarks。
3. **配置・合成・最適性を測る候補**: QUEKO、RevLib、StabilizerBench。

本プロジェクトでは、最初から全ベンチマークを統合するのではなく、`qni-cli` の現在の能力に近い状態準備、基本アルゴリズム、ゲート分解から始め、CLI機能の成長に合わせて、QASM読み込み、回路等価性確認、資源量評価、配置最適化へ拡張するのがよい。

## 独自ベンチマーク候補: Microsoft Quantum Katas 由来タスク

このリポジトリでは、Microsoft Quantum Katas を読み取り専用の課題ソースとして使い、Q# ではなく `qni-cli` のコマンド列で解答回路を作る取り組みを進めている。これは外部ベンチマークとは別に、独自の「Quantum Katas for qni agents」として整備できる有力な評価基盤である。

独自ベンチマーク化する場合、各Kataタスクを次の要素に分解して保存する。

- 課題文: 元のKataの意図を自然な日本語または英語で記述する。
- 初期状態または入力条件: 基底状態、任意状態、角度パラメータ、補助量子ビットなどを明示する。
- 期待される量子操作: Q#構文ではなく、状態変換または回路の意味として定義する。
- 許可される操作: `qni-cli` で使えるゲート、制御、角度、測定、期待値計算を明示する。
- 検証方法: `qni run`、`qni run --symbolic`、`qni expect`、将来の等価性検査など、決定論的な確認方法を定義する。
- 標準解: 参考用の `qni` コマンド列を保存する。ただし評価時には隠す。
- 採点指標: 正誤、ゲート数、深さ、補助量子ビット数、CLI呼び出し回数、修正回数、所要時間などを記録する。

## 独自ベンチマークの強み

Quantum Katas 由来の独自ベンチマークは、既存のLLMコード生成ベンチマークと違い、フレームワークAPIの知識ではなく量子回路そのものの設計と検証を評価しやすい。AIエージェントには、どの回路を組むべきか、どの性質を確認すべきか、失敗時にどこを直すべきかを考えさせる。一方で、状態ベクトル、期待値、可視化、等価性確認などの決定論的処理は `qni-cli` に任せる。これにより、AIが誤りやすい計算をCLIで固定し、AIの強みである仮説生成、探索、説明、改良に集中させられる。

## 最初の評価対象の推奨

最初の評価対象としては、Microsoft Quantum Katas 由来の `BasicGates` と `Superposition` を独自ベンチマーク化するのが最も適切である。理由は、課題の意図が教育用に小さく整理されており、現在の `qni-cli` の機能で表現できるものが多く、AIエージェントが自然言語の課題から回路を組み立て、CLIで決定論的に検証するという本プロジェクトの特徴を説明しやすいからである。

外部ベンチマークとの接続先としては、次に QuanBench の状態準備とゲート分解の小規模タスクを狙うのがよい。QuanBench はAIによる量子コード生成を明示的に対象としており、課題数も比較的扱いやすく、量子意味的な正しさを評価する考え方が本プロジェクトと近い。Qiskit HumanEval は「HumanEval の量子版」と説明しやすいが、Qiskit API利用能力の評価に寄りやすいため、`qni-cli` の研究開発評価としては QuanBench の後に補助的に扱うのが自然である。

## 段階的な構築案

1. 既に feature 化している `BasicGates` と `Superposition` を、最初の独自ベンチマーク集合として整理する。
2. 各タスクに、課題文、標準解、検証コマンド、必要な `qni-cli` 機能、難度を付与する。
3. AIエージェントが課題文だけを読んで `qni` コマンド列を作り、検証結果をもとに自己修正する評価ランナーを作る。
4. 成功率だけでなく、回路資源量、修正回数、検証ログの質、人間が追跡できる研究ログの有無を測る。
5. 外部ベンチマークとして QuanBench の状態準備・ゲート分解タスクを同じ形式へ移植し、独自ベンチマークと共通の評価基盤で実行する。
6. その後、Qiskit HumanEval、QCircuitBench、QASMBench、MQT Bench などへ段階的に広げる。

## 参考URL

- QCircuitBench: https://github.com/EstelYang/QCircuitBench
- QuanBench: https://github.com/GuoXiaoYu1125/Quanbench
- QuanBench+: https://huggingface.co/datasets/Jawadkotaich/quanbench-plus
- Qiskit HumanEval: https://github.com/qiskit-community/qiskit-human-eval
- QHackBench: https://arxiv.org/abs/2506.20008
- QASMBench: https://github.com/pnnl/QASMBench
- MQT Bench: https://github.com/munich-quantum-toolkit/bench
- SupermarQ: https://superstaq.readthedocs.io/en/latest/apps/supermarq/supermarq.html
- QED-C Application-Oriented Benchmarks: https://github.com/SRI-International/QC-App-Oriented-Benchmarks
- QUEKO: https://github.com/UCLA-VAST/QUEKO-benchmark
- RevLib: https://www.revlib.org/
- StabilizerBench: https://arxiv.org/abs/2604.21287
