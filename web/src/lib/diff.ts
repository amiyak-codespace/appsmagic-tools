export type DiffType = 'equal' | 'delete' | 'insert' | 'replace';

export interface DiffLine {
  type: DiffType;
  left?: string;
  right?: string;
  leftNum?: number;
  rightNum?: number;
}

export interface DiffStats {
  added: number;
  removed: number;
  unchanged: number;
}

function buildLcsTable(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  return dp;
}

export function computeDiff(original: string, modified: string): DiffLine[] {
  const a = original.split('\n'), b = modified.split('\n');
  if (original === modified)
    return a.map((line, i) => ({ type: 'equal', left: line, right: line, leftNum: i+1, rightNum: i+1 }));

  const dp = buildLcsTable(a, b);
  const ops: Array<{ op: 'equal'|'delete'|'insert'; ai?: number; bi?: number }> = [];
  let i = a.length, j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) { ops.push({ op: 'equal',  ai: i-1, bi: j-1 }); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { ops.push({ op: 'insert', bi: j-1 }); j--; }
    else { ops.push({ op: 'delete', ai: i-1 }); i--; }
  }
  ops.reverse();

  const result: DiffLine[] = [];
  let ln = 0, rn = 0, k = 0;
  while (k < ops.length) {
    const op = ops[k];
    if (op.op === 'equal') {
      result.push({ type: 'equal', left: a[op.ai!], right: b[op.bi!], leftNum: ++ln, rightNum: ++rn });
      k++;
    } else if (op.op === 'delete' && k+1 < ops.length && ops[k+1].op === 'insert') {
      result.push({ type: 'replace', left: a[op.ai!], right: b[ops[k+1].bi!], leftNum: ++ln, rightNum: ++rn });
      k += 2;
    } else if (op.op === 'delete') {
      result.push({ type: 'delete', left: a[op.ai!], leftNum: ++ln });
      k++;
    } else {
      result.push({ type: 'insert', right: b[op.bi!], rightNum: ++rn });
      k++;
    }
  }
  return result;
}

export function diffStats(lines: DiffLine[]): DiffStats {
  let added = 0, removed = 0, unchanged = 0;
  for (const l of lines) {
    if (l.type === 'insert') added++;
    else if (l.type === 'delete') removed++;
    else if (l.type === 'replace') { added++; removed++; }
    else unchanged++;
  }
  return { added, removed, unchanged };
}
