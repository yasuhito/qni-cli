export interface StoredResearchTaskSelection {
  readonly taskSelection: readonly string[];
  readonly taskSelectionMode: 'full' | 'selected';
}

export function readStoredResearchTaskSelection(
  value: Readonly<Record<string, unknown>>,
  invalidReason: string[]
): StoredResearchTaskSelection {
  const selection = parseTaskSelection(value.taskSelection, invalidReason);

  return {
    taskSelection: selection,
    taskSelectionMode: parseTaskSelectionMode(value.taskSelectionMode, value.taskSelection)
  };
}

export function matchesResearchTaskSelection(
  stored: StoredResearchTaskSelection,
  requested: readonly string[]
): boolean {
  const normalized = [...new Set(requested)].sort();

  if (normalized.length === 0) {
    return stored.taskSelectionMode === 'full';
  }

  return stored.taskSelectionMode === 'selected' &&
    stored.taskSelection.length === normalized.length &&
    stored.taskSelection.every((value, index) => value === normalized[index]);
}

function parseTaskSelection(value: unknown, invalidReason: string[]): readonly string[] {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    invalidReason.push('metadata.json taskSelection must be an array of task ids');
    return [];
  }

  return [...new Set(value as string[])].sort();
}

function parseTaskSelectionMode(mode: unknown, selection: unknown): 'full' | 'selected' {
  if (mode === 'full' || mode === 'selected') {
    return mode;
  }

  return selection === undefined ? 'full' : 'selected';
}
