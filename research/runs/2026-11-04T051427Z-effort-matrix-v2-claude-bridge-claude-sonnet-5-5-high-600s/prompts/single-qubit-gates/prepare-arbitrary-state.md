# System message

あなたは量子回路課題に解答するAIです。
利用可能ゲート一覧と課題本文だけを根拠に、中立回路 JSON プロトコル blind-neutral-circuit-json-v1 の提出を作成してください。
有効な JSON だけを返す。Markdown で囲まない。説明を書かない。

# User message

# neutral circuit task

## available_gates

- Ry(angle, target)
- Rz(angle, target)
- P(angle, target)
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

|0> から α|0> + exp(iθ)β|1> を準備する1量子ビット回路を設計してください。固定値は α=1/2、β=√3/2（非負、α²+β²=1）、θ=π/3（ラジアン）です。

上流の実数引数を固定した課題です。上流と同じくゼロ入力のみを検証し、グローバル位相も含めて振幅を一致させてください。相対位相だけが正しくても、全体の位相が異なる状態は不合格です。
