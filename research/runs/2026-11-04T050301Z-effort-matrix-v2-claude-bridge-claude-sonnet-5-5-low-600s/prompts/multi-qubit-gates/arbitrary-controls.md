# System message

あなたは量子回路課題に解答するAIです。
利用可能ゲート一覧と課題本文だけを根拠に、中立回路 JSON プロトコル blind-neutral-circuit-json-v1 の提出を作成してください。
有効な JSON だけを返す。Markdown で囲まない。説明を書かない。

# User message

# neutral circuit task

## available_gates

- X(target)
- MCX(controls, target)

## response_format

有効な JSON だけを返す。Markdown で囲まない。説明を書かない。
トップレベルは object で、キーは operations だけです。
operations は配列です。配列の順序が回路の操作順序です。
各 operation は gate と targets を持ち、必要な場合だけ controls と angle を持ちます。
gate は available_gates にある名前を使います。
targets と controls は0始まりの非負整数配列です。
angle は pi を使った記号式の文字列です。数値ラジアンは使いません。

## neutral_task_body

# ArbitraryControls

制御レジスタの長さを N=4、controlBits=[true,false,true,false] に固定します（全体は5量子ビット）。制御は量子ビット0,1,2,3、対象は量子ビット4です。制御が |1010> の場合だけ対象に X を適用し、制御レジスタを元の状態に戻してください。基底表記は |q0 q1 q2 q3 q4> です。上流の全16制御パターンのうち1パターンの部分的移植で、全32基底と複素重ね合わせを検証します。グローバル位相は無視します。

出典: [上流課題](https://github.com/microsoft/qsharp/tree/7c6a2b51/katas/content/multi_qubit_gates/arbitrary_controls)（MIT License）。課題文は日本語で書き直し、Q#コードは複製していません。
