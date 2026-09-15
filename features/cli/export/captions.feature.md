# Feature: qni export のキャプション

qni-cli の利用者として
回路図に説明を添えてノートや資料へ貼れるように
qni export のキャプションオプションを使いたい。

## Scenario: qni export --latex-source --caption は成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source --caption 'CNOT before cut'" を実行
- Then コマンドは成功

## Scenario: qni export --latex-source --caption は回路の下にキャプションを出力する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source --caption 'CNOT before cut'" を実行
- Then 標準出力に次を含む:

  ```text
  {\fontsize{12}{15}\selectfont \hspace*{6.7pt}CNOT before cut\hspace*{6.7pt}}
  ```

## Scenario: qni export --latex-source --caption-position top は成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source --caption 'Top caption' --caption-position top" を実行
- Then コマンドは成功

## Scenario: qni export --latex-source --caption-position top はキャプションを回路より前に出力する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source --caption 'Top caption' --caption-position top" を実行
- Then 標準出力に次を含む:

  ```text
  {\fontsize{12}{15}\selectfont \hspace*{6.7pt}Top caption\hspace*{6.7pt}}
  \\[0.8em]
  \scalebox{1.0}{
  ```

## Scenario: qni export --png --caption は成功する

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni export --png --light --caption 'CNOT before cut' --output circuit.png" を実行
- Then コマンドは成功

## Scenario: 下側のディセンダ付きキャプションは PNG のインク余白を均等に保つ

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni export --png --light --caption 'gyp jq' --caption-position bottom --caption-size 24 --no-transparent --output circuit.png" を実行
- Then "circuit.png" の四辺のインク余白は 15px 以上 17px 以下である

## Scenario: 上側の小さいキャプションは PNG のインク余白を均等に保つ

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni export --png --light --caption 'gyp' --caption-position top --caption-size 8 --no-transparent --output circuit.png" を実行
- Then "circuit.png" の四辺のインク余白は 15px 以上 17px 以下である

## Scenario: qni export --png --caption は標準出力を空にする

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni export --png --light --caption 'CNOT before cut' --output circuit.png" を実行
- Then 標準出力は空

## Scenario: qni export --png --caption は PNG ファイルを書き出す

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni export --png --light --caption 'CNOT before cut' --output circuit.png" を実行
- Then "circuit.png" は PNG 画像である

## Scenario: qni export --png --caption は透過 PNG を書き出す

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni export --png --light --caption 'CNOT before cut' --output circuit.png" を実行
- Then "circuit.png" は透過 PNG 画像である

## Scenario: qni export --png --caption --no-transparent は不透過 PNG を書き出す

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni export --png --light --caption 'CNOT before cut' --no-transparent --output circuit.png" を実行
- Then "circuit.png" は不透過 PNG 画像である

## Scenario: ダークテーマの不透過キャプション PNG は黒い背景を持つ

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --png --dark --caption 'Dark caption' --no-transparent --output circuit.png" を実行
- Then "circuit.png" の背景色は "#000000" である

## Scenario: ダークテーマの不透過 PNG でもキャプションと回路が見える

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --png --dark --caption 'Dark caption' --no-transparent --output circuit.png" を実行
- Then "circuit.png" の四辺のインク余白は 15px 以上 17px 以下である
