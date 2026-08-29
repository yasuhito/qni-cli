export interface PauliMeasurementSetting {
  readonly axes: string;
  readonly pauliStrings: readonly string[];
}

export interface PauliExpectationEstimate {
  readonly pauliString: string;
  readonly value: number;
  readonly stderr: number;
}

export interface PauliExpectationEstimation {
  readonly settings: readonly PauliMeasurementSetting[];
  readonly estimates: readonly PauliExpectationEstimate[];
}

export function groupPauliMeasurementSettings(
  pauliStrings: readonly string[]
): readonly PauliMeasurementSetting[] {
  const normalizedPauliStrings = pauliStrings.map((pauliString) => pauliString.toUpperCase());
  normalizedPauliStrings.forEach(ensureValidPauliSymbols);
  const pauliStringLength = normalizedPauliStrings[0]?.length;
  if (normalizedPauliStrings.some((pauliString) => pauliString.length !== pauliStringLength)) {
    throw new Error('Pauli strings must all have the same length');
  }

  const settings: { axes: string; pauliStrings: string[] }[] = [];

  for (const pauliString of normalizedPauliStrings) {
    const setting = settings.find((candidate) => axesAreCompatible(candidate.axes, pauliString));

    if (setting) {
      setting.axes = mergeAxes(setting.axes, pauliString);
      setting.pauliStrings.push(pauliString);
    } else {
      settings.push({ axes: pauliString, pauliStrings: [pauliString] });
    }
  }

  return settings.map((setting) => ({
    axes: setting.axes.replaceAll('I', 'Z'),
    pauliStrings: setting.pauliStrings
  }));
}

export function samplePauliExpectationValues(
  pauliStrings: readonly string[],
  shots: number,
  random: () => number,
  probabilitiesForAxes: (axes: string) => readonly number[]
): PauliExpectationEstimation {
  const settings = groupPauliMeasurementSettings(pauliStrings);
  const sums = new Map<string, number[]>();

  for (const setting of settings) {
    const cumulativeProbabilities = cumulativeDistribution(probabilitiesForAxes(setting.axes));
    const settingSums = setting.pauliStrings.map(() => 0);

    for (let shot = 0; shot < shots; shot += 1) {
      const basisIndex = sampleBasisIndex(cumulativeProbabilities, random());
      setting.pauliStrings.forEach((pauliString, index) => {
        settingSums[index] = (settingSums[index] ?? 0) + parityEigenvalue(pauliString, basisIndex);
      });
    }

    sums.set(settingKey(setting), settingSums);
  }

  const settingOffsets = new Map<string, number>();
  const estimates = pauliStrings.map((rawPauliString) => {
    const pauliString = rawPauliString.toUpperCase();
    const setting = settings.find((candidate) => candidate.pauliStrings.includes(pauliString));
    if (!setting) {
      throw new Error(`Pauli string has no measurement setting: ${pauliString}`);
    }
    const key = settingKey(setting);
    const offset = settingOffsets.get(key) ?? 0;
    settingOffsets.set(key, offset + 1);
    const value = normalizeScalar((sums.get(key)?.[offset] ?? 0) / shots);

    return {
      pauliString,
      value,
      stderr: normalizeScalar(Math.sqrt((1 - value ** 2) / shots))
    };
  });

  return { settings, estimates };
}

function axesAreCompatible(axes: string, pauliString: string): boolean {
  return (
    axes.length === pauliString.length &&
    [...pauliString].every(
      (symbol, index) => symbol === 'I' || axes[index] === 'I' || symbol === axes[index]
    )
  );
}

function mergeAxes(axes: string, pauliString: string): string {
  return [...axes].map((axis, index) => (pauliString[index] === 'I' ? axis : pauliString[index])).join('');
}

function ensureValidPauliSymbols(pauliString: string): void {
  if (![...pauliString].every((symbol) => ['I', 'X', 'Y', 'Z'].includes(symbol))) {
    throw new Error(`Pauli string must use only I, X, Y, and Z: ${pauliString}`);
  }
}

function cumulativeDistribution(probabilities: readonly number[]): readonly number[] {
  let cumulative = 0;
  return probabilities.map((probability) => {
    cumulative += probability;
    return cumulative;
  });
}

function sampleBasisIndex(cumulativeProbabilities: readonly number[], randomValue: number): number {
  let lower = 0;
  let upper = cumulativeProbabilities.length;

  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    if (randomValue < (cumulativeProbabilities[middle] ?? 0)) {
      upper = middle;
    } else {
      lower = middle + 1;
    }
  }

  return Math.min(lower, Math.max(0, cumulativeProbabilities.length - 1));
}

function parityEigenvalue(pauliString: string, basisIndex: number): 1 | -1 {
  const parity = [...pauliString].reduce((value, symbol, qubit) => {
    if (symbol === 'I') {
      return value;
    }
    const mask = 1 << (pauliString.length - qubit - 1);
    return value ^ (basisIndex & mask ? 1 : 0);
  }, 0);

  return parity === 0 ? 1 : -1;
}

function settingKey(setting: PauliMeasurementSetting): string {
  return `${setting.axes}\u0000${setting.pauliStrings.join('\u0000')}`;
}

function normalizeScalar(value: number): number {
  if (Math.abs(value) < Number.EPSILON) {
    return 0;
  }
  const nearestInteger = Math.round(value);
  return Math.abs(value - nearestInteger) <= Number.EPSILON ? nearestInteger : value;
}
