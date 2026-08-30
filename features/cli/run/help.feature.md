# Feature: qni run のヘルプ表示

qni-cli の利用者として
状態ベクトル表示のオプションを迷わず選べるように
qni run のヘルプで利用できるオプションを確認したい。

## Scenario: qni run --help は成功する

- When "qni run --help" を実行
- Then コマンドは成功

## Scenario: qni run --help は run コマンドの使い方を表示

- When "qni run --help" を実行
- Then 標準出力:

  ```text
  Usage:
    qni run [--symbolic] [--basis=BASIS] [--latex]
    qni run [--shots N] [--seed N] [--json]

  Overview:
    Simulate ./circuit.json and print the resulting state vector.
    Circuit diagrams list q0, q1, and later qubits from top to bottom, with steps from left to right.
    State-vector and ket bit strings list q0, q1, and later qubits from left to right.
    Without --symbolic, output is numeric amplitudes in the computational basis.
    A circuit containing Measure is run once and prints qN=0 or qN=1 for each measured qubit.
    Use --shots to run a measurement circuit independently from its initial state and print a joint distribution.
    Use --seed to reproduce the same joint distribution. Without it, qni generates a seed and includes it in the output.
    Use --json to return shots, seed, classical bit names, values, and counts as structured data.
    In a measurement distribution, classicalBits lists columns in measurement execution order; read values by bit name.
    Measurement follows computational-basis probabilities and collapses the state before later operations.
    --symbolic prints a symbolic ket expression for supported small circuits.
    --basis currently works only with --symbolic and supports x or y for 1-qubit output, and bell for 2-qubit output.
    --latex prints a state vector using LaTeX ket notation.

  Options:
    [--symbolic]       # Show a 1-qubit symbolic state expression
    [--basis=BASIS]    # Show a symbolic state in a named basis such as x, y, or bell
    [--latex]          # Print the state vector as LaTeX
    [--shots N]        # Run a measurement circuit N independent times
    [--seed N]         # Use an unsigned 32-bit seed for reproducible measurement
    [--json]           # Print a machine-readable measurement distribution

  Examples:
    qni run
    qni run --latex
    qni run --symbolic
    qni run --symbolic --latex
    qni run --symbolic --basis x
    qni run --symbolic --basis y
    qni run --symbolic --basis bell
    qni run --shots 100
    qni run --shots 100 --seed 42
    qni run --shots 100 --seed 42 --json
  ```
