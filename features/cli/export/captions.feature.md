# Feature: qni export captions

qni-cli のユーザとして
回路図に説明を添えてノートや資料へ貼れるように
qni export の caption option を使いたい。

## Scenario: qni export --latex-source --caption は成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source --caption 'CNOT before cut'" を実行
- Then コマンドは成功

## Scenario: qni export --latex-source --caption は回路の下に caption を出力する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source --caption 'CNOT before cut'" を実行
- Then 標準出力に次を含む:

  ```text
  {\fontsize{12}{15}\selectfont CNOT before cut}
  ```

## Scenario: qni export --latex-source --caption-position top は成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source --caption 'Top caption' --caption-position top" を実行
- Then コマンドは成功

## Scenario: qni export --latex-source --caption-position top は caption を回路より前に出力する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source --caption 'Top caption' --caption-position top" を実行
- Then 標準出力に次を含む:

  ```text
  {\fontsize{12}{15}\selectfont Top caption}
  \\[0.8em]
  \scalebox{1.0}{
  ```

## Scenario: qni export --png --caption は成功する

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni export --png --light --caption 'CNOT before cut' --output circuit.png" を実行
- Then コマンドは成功

## Scenario: qni export --png --caption は標準出力を空にする

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni export --png --light --caption 'CNOT before cut' --output circuit.png" を実行
- Then 標準出力は空

## Scenario: qni export --png --caption は PNG ファイルを書き出す

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni export --png --light --caption 'CNOT before cut' --output circuit.png" を実行
- Then "circuit.png" は PNG 画像である
