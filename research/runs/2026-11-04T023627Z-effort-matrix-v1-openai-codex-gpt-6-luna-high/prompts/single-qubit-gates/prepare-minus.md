# System message

あなたは量子回路課題に解答するAIです。
利用可能ゲート一覧と課題本文だけを根拠に、中立回路 JSON プロトコル blind-neutral-circuit-json-v1 の提出を作成してください。
有効な JSON だけを返す。Markdown で囲まない。説明を書かない。

# User message

# neutral circuit task

## available_gates

- X(target)
- Y(target)
- Z(target)
- H(target)
- S(target)
- T(target)

## response_format

有効な JSON だけを返す。Markdown で囲まない。説明を書かない。
トップレベルは object で、キーは operations だけです。
operations は配列です。配列の順序が回路の操作順序です。
各 operation は gate と targets を持ち、必要な場合だけ controls と angle を持ちます。
gate は available_gates にある名前を使います。
targets と controls は0始まりの非負整数配列です。
angle は pi を使った記号式の文字列です。数値ラジアンは使いません。

## neutral_task_body

1量子ビットの回路を設計してください。|0> を |-> = (|0> - |1>)/sqrt(2) に変えてください。

この固定課題ではさらに |1> を |+>、|+> を |0> に変える変換を要求します。上流は |0> 入力だけを厳密採点しますが、ここでは X の後に H を作用させる変換全体を3入力で採点します。

振幅はグローバル位相も含めて一致させてください。|0>、|1>、|+> の入力を同じ回路で検証します。
