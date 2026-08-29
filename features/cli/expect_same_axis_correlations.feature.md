# Feature: qni expect の同軸相関列挙

qni-cli の利用者として
同じ Pauli 軸の K 体相関を漏れなく調べるために
量子ビット位置の組合せに対応する Pauli 文字列を自動で列挙したい。

## Background:

- Given "qni add X --control 0 --qubit 2 --step 0" を実行

## Scenario: 3量子ビットの2体同軸相関を所定の順序で表示

- When "qni expect --same-axis-correlations 2" を実行
- Then 標準出力:

  ```text
  XXI=0.0
  XIX=0.0
  IXX=0.0
  YYI=0.0
  YIY=0.0
  IYY=0.0
  ZZI=1.0
  ZIZ=1.0
  IZZ=1.0
  ```

## Scenario: 明示した Pauli 文字列を列挙分より先に表示

- When "qni expect ZZZ --same-axis-correlations 1" を実行
- Then 標準出力:

  ```text
  ZZZ=1.0
  XII=0.0
  IXI=0.0
  IIX=0.0
  YII=0.0
  IYI=0.0
  IIY=0.0
  ZII=1.0
  IZI=1.0
  IIZ=1.0
  ```

## Scenario: 繰り返した列挙オプションの指定順を保つ

- When "qni expect --same-axis-correlations 1 --same-axis-correlations 2 --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "expectations": [
      { "pauli": "XII", "value": 0, "sign": 0 },
      { "pauli": "IXI", "value": 0, "sign": 0 },
      { "pauli": "IIX", "value": 0, "sign": 0 },
      { "pauli": "YII", "value": 0, "sign": 0 },
      { "pauli": "IYI", "value": 0, "sign": 0 },
      { "pauli": "IIY", "value": 0, "sign": 0 },
      { "pauli": "ZII", "value": 1, "sign": 1 },
      { "pauli": "IZI", "value": 1, "sign": 1 },
      { "pauli": "IIZ", "value": 1, "sign": 1 },
      { "pauli": "XXI", "value": 0, "sign": 0 },
      { "pauli": "XIX", "value": 0, "sign": 0 },
      { "pauli": "IXX", "value": 0, "sign": 0 },
      { "pauli": "YYI", "value": 0, "sign": 0 },
      { "pauli": "YIY", "value": 0, "sign": 0 },
      { "pauli": "IYY", "value": 0, "sign": 0 },
      { "pauli": "ZZI", "value": 1, "sign": 1 },
      { "pauli": "ZIZ", "value": 1, "sign": 1 },
      { "pauli": "IZZ", "value": 1, "sign": 1 }
    ]
  }
  ```

## Scenario: 列挙分を LaTeX で表示

- When "qni expect --same-axis-correlations=2 --latex" を実行
- Then 標準出力に次を含む:

  ```text
  \langle XXI \rangle = 0.0
  ```

## Scenario Outline: 不正な相関体数は終了コード1で失敗

- When "<command>" を実行
- Then 終了コードは 1

### Examples:

  | command                                      |
  | qni expect --same-axis-correlations 0        |
  | qni expect --same-axis-correlations 4        |
  | qni expect --same-axis-correlations 1.5      |
  | qni expect --same-axis-correlations          |

## Scenario Outline: 不正な相関体数では標準出力を出さない

- When "<command>" を実行
- Then 標準出力は空

### Examples:

  | command                                      |
  | qni expect --same-axis-correlations 0        |
  | qni expect --same-axis-correlations 4        |
  | qni expect --same-axis-correlations 1.5      |
  | qni expect --same-axis-correlations          |

## Scenario Outline: 不正な相関体数のエラーは平文1行だけ

- When "<command>" を実行
- Then 標準エラーは "<error>" の1行だけ

### Examples:

  | command                                      | error                                                          |
  | qni expect --same-axis-correlations 0        | --same-axis-correlations must be a positive integer             |
  | qni expect --same-axis-correlations 4        | --same-axis-correlations must not exceed the circuit qubit count |
  | qni expect --same-axis-correlations 1.5      | --same-axis-correlations must be a positive integer             |
  | qni expect --same-axis-correlations          | --same-axis-correlations requires a value                       |

## Scenario: expect のヘルプは同軸相関の例を示す

- When "qni expect --help" を実行
- Then 標準出力に次を含む:

  ```text
  qni expect --same-axis-correlations 2
  ```
