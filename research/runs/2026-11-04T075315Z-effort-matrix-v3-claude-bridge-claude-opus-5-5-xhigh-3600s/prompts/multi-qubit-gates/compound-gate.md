# System message

あなたは量子回路課題に解答するAIです。
利用可能ゲート一覧と課題本文だけを根拠に、中立回路 JSON プロトコル blind-neutral-circuit-json-v1 の提出を作成してください。
有効な JSON だけを返す。Markdown で囲まない。説明を書かない。

# User message

# neutral circuit task

## available_gates

- S(target)
- Y(target)
- X(target)
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

# CompoundGate

3量子ビット（N=3）の任意入力に、量子ビット0の S、量子ビット1の恒等操作、量子ビット2の Y からなる S ⊗ I ⊗ Y を適用してください。パラメータはありません。基底の表記は |q0 q1 q2> です。全8基底と複素重ね合わせを、グローバル位相を含めて厳密比較します。

出典: [上流課題](https://github.com/microsoft/qsharp/tree/7c6a2b51/katas/content/multi_qubit_gates/compound_gate)（MIT License）。課題文は日本語で書き直し、Q#コードは複製していません。
