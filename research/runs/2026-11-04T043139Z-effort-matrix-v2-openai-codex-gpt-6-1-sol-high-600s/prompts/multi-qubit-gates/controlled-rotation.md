# System message

あなたは量子回路課題に解答するAIです。
利用可能ゲート一覧と課題本文だけを根拠に、中立回路 JSON プロトコル blind-neutral-circuit-json-v1 の提出を作成してください。
有効な JSON だけを返す。Markdown で囲まない。説明を書かない。

# User message

# neutral circuit task

## available_gates

- CRx(angle, control, target)
- Rx(angle, target)
- Z(target)

## response_format

有効な JSON だけを返す。Markdown で囲まない。説明を書かない。
トップレベルは object で、キーは operations だけです。
operations は配列です。配列の順序が回路の操作順序です。
各 operation は gate と targets を持ち、必要な場合だけ controls と angle を持ちます。
gate は available_gates にある名前を使います。
targets と controls は0始まりの非負整数配列です。
angle は pi を使った記号式の文字列です。数値ラジアンは使いません。

## neutral_task_body

# ControlledRotation

2量子ビット（N=2）の任意入力に、量子ビット0を制御、量子ビット1を対象とする Rx(θ) を適用してください。固定値は θ=π/3 です。Rx(θ)=exp(-iθX/2) の規約を使います。上流は複数角度を検証しますが、この課題は固定角度の部分的移植です。全4基底と制御をまたぐ複素重ね合わせを検証し、全体のグローバル位相のみ無視します。制御部分だけの位相変更は不正解です。

出典: [上流課題](https://github.com/microsoft/qsharp/tree/7c6a2b51/katas/content/multi_qubit_gates/controlled_rotation)（MIT License）。課題文は日本語で書き直し、Q#コードは複製していません。
