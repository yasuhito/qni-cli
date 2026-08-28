# Superdense coding

Use four qubits. The first two generate random classical inputs; the last two carry the Bell pair.

```bash
<qni> clear
<qni> add H --qubit 0 --step 0
<qni> add H --qubit 1 --step 0
<qni> add Measure --name input_high --qubit 0 --step 1
<qni> add Measure --name input_low --qubit 1 --step 1
<qni> add H --qubit 2 --step 2
<qni> add X --control 2 --qubit 3 --step 3
<qni> add Z --if input_high --qubit 2 --step 4
<qni> add X --if input_low --qubit 2 --step 5
<qni> add X --control 2 --qubit 3 --step 6
<qni> add H --qubit 2 --step 7
<qni> add Measure --name output_high --qubit 2 --step 8
<qni> add Measure --name output_low --qubit 3 --step 8
```

Display and execute it:

```bash
<qni> view
<qni> run --shots 16 --seed 42
<qni> run --shots 16 --seed 42 --json
```

Verify every result row, not only the totals:

- `input_high` equals `output_high`.
- `input_low` equals `output_low`.
- With seed 42 and 16 shots, all four input pairs occur.

If image dependencies are present, save the circuit:

```bash
<qni> export --png --light --output superdense-coding.png
```

Explain the stages in order: random input generation, Bell-pair preparation, conditional encoding, inverse Bell circuit, and output measurement.
