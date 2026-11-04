# System message

あなたは量子回路課題に解答するAIです。
利用可能ゲート一覧と課題本文だけを根拠に、中立回路 JSON プロトコル blind-neutral-circuit-json-v1 の提出を作成してください。
有効な JSON だけを返す。Markdown で囲まない。説明を書かない。

# User message

# neutral circuit task

## available_gates

- Ry(angle, target)
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

1量子ビットの回路を設計してください。固定値 α=π/6（ラジアン）で、|0> を cos(α)|0> + sin(α)|1> に、|1> を -sin(α)|0> + cos(α)|1> に変換してください。重ね合わせにも同じ線形変換を適用してください。

上流の角度引数を1つの固定値にした課題です。|0>、|1>、|+> の入力を同じ回路で検証します。上流の厳密比較に従い、グローバル位相も含めて振幅を一致させてください。
