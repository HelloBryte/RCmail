export type DiffSegment = {
  value: string;
  status: "same" | "added" | "removed";
};

type DiffPair = {
  before: DiffSegment[];
  after: DiffSegment[];
};

function tokenize(value: string) {
  return value.match(/(\s+|[^\s]+)/g) ?? [];
}

function mergeSegments(segments: DiffSegment[]) {
  if (segments.length === 0) {
    return segments;
  }

  const merged: DiffSegment[] = [segments[0]];

  for (let index = 1; index < segments.length; index += 1) {
    const segment = segments[index];
    const previous = merged[merged.length - 1];

    if (previous.status === segment.status) {
      previous.value += segment.value;
      continue;
    }

    merged.push({ ...segment });
  }

  return merged;
}

export function diffText(beforeText: string, afterText: string): DiffPair {
  const beforeTokens = tokenize(beforeText);
  const afterTokens = tokenize(afterText);
  const rows = beforeTokens.length + 1;
  const columns = afterTokens.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(columns).fill(0));

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      if (beforeTokens[row - 1] === afterTokens[column - 1]) {
        matrix[row][column] = matrix[row - 1][column - 1] + 1;
        continue;
      }

      matrix[row][column] = Math.max(matrix[row - 1][column], matrix[row][column - 1]);
    }
  }

  const before: DiffSegment[] = [];
  const after: DiffSegment[] = [];
  let row = beforeTokens.length;
  let column = afterTokens.length;

  while (row > 0 && column > 0) {
    if (beforeTokens[row - 1] === afterTokens[column - 1]) {
      before.push({ value: beforeTokens[row - 1], status: "same" });
      after.push({ value: afterTokens[column - 1], status: "same" });
      row -= 1;
      column -= 1;
      continue;
    }

    if (matrix[row - 1][column] >= matrix[row][column - 1]) {
      before.push({ value: beforeTokens[row - 1], status: "removed" });
      row -= 1;
      continue;
    }

    after.push({ value: afterTokens[column - 1], status: "added" });
    column -= 1;
  }

  while (row > 0) {
    before.push({ value: beforeTokens[row - 1], status: "removed" });
    row -= 1;
  }

  while (column > 0) {
    after.push({ value: afterTokens[column - 1], status: "added" });
    column -= 1;
  }

  return {
    before: mergeSegments(before.reverse()),
    after: mergeSegments(after.reverse()),
  };
}
