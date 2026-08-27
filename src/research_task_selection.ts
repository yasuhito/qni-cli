export interface StoredResearchTaskSelection {
  readonly taskSelection: readonly string[];
  readonly taskSelectionMode: 'full' | 'selected';
  readonly taskSelectionRecorded: boolean;
}

export function readStoredResearchTaskSelection(
  value: Readonly<Record<string, unknown>>,
  invalidReason: string[]
): StoredResearchTaskSelection {
  const selection = parseTaskSelection(value.taskSelection, invalidReason);

  return {
    taskSelection: selection,
    taskSelectionMode: parseTaskSelectionMode(value.taskSelectionMode, value.taskSelection),
    taskSelectionRecorded: value.taskSelection !== undefined
  };
}

export function matchesRecordedResearchTaskIds(
  stored: StoredResearchTaskSelection,
  resultTaskIds: readonly string[]
): boolean {
  return !stored.taskSelectionRecorded || sameTaskIds(stored.taskSelection, resultTaskIds);
}

export function matchesResearchTaskSelection(
  stored: StoredResearchTaskSelection,
  requested: readonly string[]
): boolean {
  const normalized = normalizeTaskIds(requested);

  if (normalized.length === 0) {
    return stored.taskSelectionMode === 'full';
  }

  return stored.taskSelectionMode === 'selected' &&
    stored.taskSelection.length === normalized.length &&
    stored.taskSelection.every((value, index) => value === normalized[index]);
}

export class ResearchTaskSetMatcher {
  private referenceTaskIds: readonly string[] | undefined;

  matches(taskIds: readonly string[]): boolean {
    if (!this.referenceTaskIds) {
      this.referenceTaskIds = normalizeTaskIds(taskIds);
      return true;
    }

    return sameTaskIds(this.referenceTaskIds, taskIds);
  }
}

function normalizeTaskIds(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function sameTaskIds(left: readonly string[], right: readonly string[]): boolean {
  const normalizedLeft = normalizeTaskIds(left);
  const normalizedRight = normalizeTaskIds(right);

  return normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index]);
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
