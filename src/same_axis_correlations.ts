const PAULI_AXES = ['X', 'Y', 'Z'] as const;

export function sameAxisCorrelationPauliStrings(
  qubitCount: number,
  bodyCount: number
): readonly string[] {
  if (!Number.isSafeInteger(bodyCount) || bodyCount <= 0) {
    throw new Error('--same-axis-correlations must be a positive integer');
  }
  if (bodyCount > qubitCount) {
    throw new Error('--same-axis-correlations must not exceed the circuit qubit count');
  }

  return PAULI_AXES.flatMap((axis) =>
    positionCombinations(qubitCount, bodyCount).map((positions) => {
      const pauli = Array<string>(qubitCount).fill('I');
      for (const position of positions) {
        pauli[position] = axis;
      }
      return pauli.join('');
    })
  );
}

function positionCombinations(itemCount: number, selectionCount: number): readonly number[][] {
  const combinations: number[][] = [];

  function append(prefix: readonly number[], next: number): void {
    if (prefix.length === selectionCount) {
      combinations.push([...prefix]);
      return;
    }

    const remaining = selectionCount - prefix.length;
    for (let position = next; position <= itemCount - remaining; position += 1) {
      append([...prefix, position], position + 1);
    }
  }

  append([], 0);
  return combinations;
}
