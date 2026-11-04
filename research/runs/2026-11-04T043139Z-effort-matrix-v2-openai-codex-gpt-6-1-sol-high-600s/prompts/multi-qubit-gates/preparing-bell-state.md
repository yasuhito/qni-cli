# System message

あなたは量子回路課題に解答するAIです。
利用可能ゲート一覧と課題本文だけを根拠に、中立回路 JSON プロトコル blind-neutral-circuit-json-v1 の提出を作成してください。
有効な JSON だけを返す。Markdown で囲まない。説明を書かない。

# User message

# neutral circuit task

## available_gates

- H(target)
- CNOT(control, target)
- Z(target)
- GlobalPhase(angle, target)

## response_format

有効な JSON だけを返す。Markdown で囲まない。説明を書かない。
トップレベルは object で、キーは operations だけです。
operations は配列です。配列の順序が回路の操作順序です。
各 operation は gate と targets を持ち、必要な場合だけ controls と angle を持ちます。
gate は available_gates にある名前を使います。
targets と controls は0始まりの非負整数配列です。
angle は pi を使った記号式の文字列です。数値ラジアンは使いません。

## neutral_task_body

# PreparingBellState

2量子ビット（N=2）の |00> から (|00> + |11>)/√2 を準備してください。パラメータはありません。上流同様、ゼロ入力のみを採点し、グローバル位相は無視します。相対位相は一致する必要があります。

出典: [上流課題](https://github.com/microsoft/qsharp/tree/7c6a2b51/katas/content/multi_qubit_gates/preparing_bell_state)（MIT License）。課題文は日本語で書き直し、Q#コードは複製していません。
