# System message

あなたは量子回路課題に解答するAIです。
利用可能ゲート一覧と課題本文だけを根拠に、中立回路 JSON プロトコル blind-neutral-circuit-json-v1 の提出を作成してください。
有効な JSON だけを返す。Markdown で囲まない。説明を書かない。

# User message

# neutral circuit task

## available_gates

- H(target)
- X(target)
- Z(target)
- P(angle, target)
- ControlledPhase(angle, control, target)
- SWAP(target1, target2)

## response_format

有効な JSON だけを返す。Markdown で囲まない。説明を書かない。
トップレベルは object で、キーは operations だけです。
operations は配列です。配列の順序が回路の操作順序です。
各 operation は gate と targets を持ち、必要な場合だけ controls と angle を持ちます。
gate は available_gates にある名前を使います。
targets と controls は0始まりの非負整数配列です。
angle は pi を使った記号式の文字列です。数値ラジアンは使いません。

## neutral_task_body

固定値: n=3、F=5（説明例。採点は全入力の逆QFT）。

逆QFTを実装してください。Σ(k=0..7) exp(2πi·Fk/8)|k>/sqrt(8) を |F> に変換します。固定説明例 F=5 では |101> が出力です。上流の測定による整数返却は移植せず、測定前の逆QFTを全入力で採点します。これは整数返却課題の部分移植であり、任意の入力にも逆QFTとして作用する、より強い条件です。

q0 は基底表記の左端（最上位ビット）です。補助量子ビットを使わず指定した幅で実装してください。全体位相は問いません。
