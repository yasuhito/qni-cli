# System message

あなたは量子回路課題に解答するAIです。
利用可能ゲート一覧と課題本文だけを根拠に、中立回路 JSON プロトコル blind-neutral-circuit-json-v1 の提出を作成してください。
有効な JSON だけを返す。Markdown で囲まない。説明を書かない。

# User message

# neutral circuit task

## available_gates

- CNOT(control, target)
- CZ(control, target)
- ControlledGlobalPhase(angle, control, target)

## response_format

有効な JSON だけを返す。Markdown で囲まない。説明を書かない。
トップレベルは object で、キーは operations だけです。
operations は配列です。配列の順序が回路の操作順序です。
各 operation は gate と targets を持ち、必要な場合だけ controls と angle を持ちます。
gate は available_gates にある名前を使います。
targets と controls は0始まりの非負整数配列です。
angle は pi を使った記号式の文字列です。数値ラジアンは使いません。

## neutral_task_body

2量子ビットの量子回路を設計してください。制御量子ビット `q0` が `|1>` のときだけ、対象量子ビット `q1` の状態全体に `-1` のグローバル位相を掛けます。

単独のグローバル位相は観測できないため、`q0` の `|0>` 成分と `|1>` 成分の相対位相として効果が現れるようにしてください。

上流の1量子ビット課題の `-I` を制御付きにした課題です。制御付き Pauli ゲートの組み合わせでも実現できます。全4個の計算基底と重ね合わせ状態で、振幅の符号と複素位相も含めて一致させてください。
