# Feature: qni expect の JSON 出力

qni-cli の利用者として
複数の期待値を再解析せず機械処理するために
期待値と符号を JSON で取得したい。

## Scenario: Bell 状態の期待値を入力順と重複を保つ JSON で表示

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add X --control 0 --qubit 1 --step 1" を実行
- When "qni expect zz XX zz --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "expectations": [
      { "pauli": "ZZ", "value": 1, "sign": 1 },
      { "pauli": "XX", "value": 1, "sign": 1 },
      { "pauli": "ZZ", "value": 1, "sign": 1 }
    ]
  }
  ```

## Scenario: JSON は負の期待値を表示

- Given "qni add X --qubit 0 --step 0" を実行
- When "qni expect Z --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "expectations": [
      { "pauli": "Z", "value": -1, "sign": -1 }
    ]
  }
  ```

## Scenario: JSON はゼロの期待値を表示

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni expect Z --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "expectations": [
      { "pauli": "Z", "value": 0, "sign": 0 }
    ]
  }
  ```

## Scenario: JSON は非整数の期待値を数値で表示

- Given "qni add Ry --angle π/3 --qubit 0 --step 0" を実行
- When "qni expect Z --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "expectations": [
      { "pauli": "Z", "value": 0.5000000000000002, "sign": 1 }
    ]
  }
  ```

## Scenario: --json と --latex の併用は失敗

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni expect Z --json --latex" を実行
- Then 標準エラー:

  ```text
  --json cannot be used with --latex
  ```

## Scenario: Pauli 文字列のない --json は失敗

- When "qni expect --json" を実行
- Then 標準エラー:

  ```text
  at least one Pauli string is required with --json
  ```

## Scenario: 無効な Pauli 文字列では JSON を出力しない

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni expect Z BAD --json" を実行
- Then 標準出力は空

## Scenario: 無効な Pauli 文字列のエラーは平文で表示

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni expect Z BAD --json" を実行
- Then 標準エラー:

  ```text
  Pauli string length must match qubit count: BAD
  ```

## Scenario: --json を付けない通常出力は変わらない

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni expect Z" を実行
- Then 標準出力:

  ```text
  Z=0.0
  ```

## Scenario: --latex 出力は変わらない

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni expect Z --latex" を実行
- Then 標準出力:

  ```text
  \langle Z \rangle = 0.0
  ```

## Scenario: expect のヘルプは JSON 出力例を示す

- When "qni expect --help" を実行
- Then 標準出力に次を含む:

  ```text
  qni expect ZZ XX --json
  ```
