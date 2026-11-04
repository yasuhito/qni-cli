# System message

あなたは量子回路課題に解答するAIです。
利用可能ゲート一覧と課題本文だけを根拠に、中立回路 JSON プロトコル blind-neutral-circuit-json-v1 の提出を作成してください。
有効な JSON だけを返す。Markdown で囲まない。説明を書かない。

# User message

# neutral circuit task

## available_gates

- CSWAP(control, target1, target2)

## response_format

有効な JSON だけを返す。Markdown で囲まない。説明を書かない。
トップレベルは object で、キーは operations だけです。
operations は配列です。配列の順序が回路の操作順序です。
各 operation は gate と targets を持ち、必要な場合だけ controls と angle を持ちます。
gate は available_gates にある名前を使います。
targets と controls は0始まりの非負整数配列です。
angle は pi を使った記号式の文字列です。数値ラジアンは使いません。

## neutral_task_body

3量子ビットに対して Fredkin ゲート（制御付き SWAP）を実現する量子回路を設計してください。

制御量子ビットは第1量子ビットです。制御量子ビットが `|1>` のときだけ、第2量子ビットと第3量子ビットを交換してください。制御量子ビットが `|0>` のときは状態を変えないでください。

全8個の計算基底と重ね合わせ状態で、振幅の符号と複素位相も含めて一致させてください。
