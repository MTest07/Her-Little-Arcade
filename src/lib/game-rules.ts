import { SINGLE_PLAYER_GAMES, MULTIPLAYER_GAMES, ALL_ARCADE_GAMES } from './arcade-data';

export function verifyGameCatalogCounts() {
  const hasReversiOrCheckers = ALL_ARCADE_GAMES.some(
    (g) => /reversi|othello|checkers/i.test(g.title) || /reversi|othello|checkers/i.test(g.id)
  );
  return {
    singleCount: SINGLE_PLAYER_GAMES.length,
    multiCount: MULTIPLAYER_GAMES.length,
    totalCount: ALL_ARCADE_GAMES.length,
    hasReversiOrCheckers,
  };
}

export const MAX_PLAYER_LEVEL = 300;
export const MAX_COIN_CAPACITY = 5_000_000;

export interface XpCurveConfig {
  baseXp: number;
  linearStep: number;
  quadraticStep: number;
}

export const DEFAULT_XP_CURVE_CONFIG: XpCurveConfig = {
  baseXp: 100,
  linearStep: 25,
  quadraticStep: 5,
};

export function getXpRequiredForLevel(
  level: number,
  config: XpCurveConfig = DEFAULT_XP_CURVE_CONFIG
): number {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel >= MAX_PLAYER_LEVEL) {
    return 0;
  }
  const offset = safeLevel - 1;
  return (
    config.baseXp +
    config.linearStep * offset +
    config.quadraticStep * offset * offset
  );
}

export function getCumulativeXpForLevel(
  targetLevel: number,
  config: XpCurveConfig = DEFAULT_XP_CURVE_CONFIG
): number {
  const clampedTarget = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(targetLevel)));
  let total = 0;
  for (let lvl = 1; lvl < clampedTarget; lvl++) {
    total += getXpRequiredForLevel(lvl, config);
  }
  return total;
}

export const MAX_CUMULATIVE_XP = getCumulativeXpForLevel(MAX_PLAYER_LEVEL);

export function calculateLevelFromXp(
  xp: number,
  config: XpCurveConfig = DEFAULT_XP_CURVE_CONFIG
): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
  isMaxLevel: boolean;
  clampedTotalXp: number;
  levelFloorTotalXp: number;
} {
  const safeXp = Math.max(0, Math.floor(Number(xp) || 0));
  let remaining = safeXp;
  let level = 1;
  let levelFloorTotalXp = 0;

  while (level < MAX_PLAYER_LEVEL) {
    const req = getXpRequiredForLevel(level, config);
    if (remaining >= req) {
      remaining -= req;
      levelFloorTotalXp += req;
      level += 1;
    } else {
      const progressPercent =
        req > 0 ? Math.min(100, Math.max(0, Math.round((remaining / req) * 100))) : 100;
      return {
        level,
        currentLevelXp: remaining,
        nextLevelXp: req,
        progressPercent,
        isMaxLevel: false,
        clampedTotalXp: safeXp,
        levelFloorTotalXp,
      };
    }
  }

  return {
    level: MAX_PLAYER_LEVEL,
    currentLevelXp: 0,
    nextLevelXp: 0,
    progressPercent: 100,
    isMaxLevel: true,
    clampedTotalXp: levelFloorTotalXp,
    levelFloorTotalXp,
  };
}

export function clampCoinsToCapacity(
  currentCoins: number,
  deltaCoins: number,
  maxCapacity: number = MAX_COIN_CAPACITY
): {
  nextCoins: number;
  actualDelta: number;
  overflowClipped: number;
  isAtCapacity: boolean;
} {
  const safeCurrent = Math.max(0, Math.min(maxCapacity, Math.floor(Number(currentCoins) || 0)));
  const rawNext = safeCurrent + Math.floor(Number(deltaCoins) || 0);
  const nextCoins = Math.max(0, Math.min(maxCapacity, rawNext));
  const actualDelta = nextCoins - safeCurrent;
  const overflowClipped = rawNext > maxCapacity ? rawNext - maxCapacity : 0;
  return {
    nextCoins,
    actualDelta,
    overflowClipped,
    isAtCapacity: nextCoins >= maxCapacity,
  };
}

export interface CustomChessClockConfig {
  minutes: number;
  extraSeconds: number;
  incrementSeconds: number;
}

export function computeInitialChessTimeMs(config: CustomChessClockConfig): number {
  const mins = Math.max(0, Math.min(180, Math.floor(config.minutes)));
  const secs = Math.max(0, Math.min(59, Math.floor(config.extraSeconds)));
  return (mins * 60 + secs) * 1000;
}

export function applyChessIncrementMs(
  currentRemainingMs: number,
  incrementSeconds: number,
  isUnlimited: boolean
): number {
  if (isUnlimited) return currentRemainingMs;
  if (currentRemainingMs <= 0) return 0;
  const incMs = Math.max(0, Math.min(120, Math.floor(incrementSeconds))) * 1000;
  return currentRemainingMs + incMs;
}

export function formatChessClock(ms: number, isUnlimited: boolean): string {
  if (isUnlimited) return '∞';
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.ceil(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Tic-Tac-Toe pure rules
export type TicTacToeCell = 'X' | 'O' | null;

export function checkTicTacToeWinner(board: TicTacToeCell[]): {
  winner: 'X' | 'O' | 'draw' | null;
  line: number[] | null;
} {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a, b, c] };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: 'draw', line: null };
  }
  return { winner: null, line: null };
}

// Connect Four pure rules (6 rows x 7 cols)
export type ConnectFourCell = 1 | 2 | 0;

export function dropConnectFourDisc(
  grid: ConnectFourCell[][],
  col: number,
  player: 1 | 2
): { nextGrid: ConnectFourCell[][]; placedRow: number } | null {
  if (col < 0 || col >= 7) return null;
  const nextGrid = grid.map((r) => [...r]);
  for (let row = 5; row >= 0; row--) {
    if (nextGrid[row][col] === 0) {
      nextGrid[row][col] = player;
      return { nextGrid, placedRow: row };
    }
  }
  return null;
}

export function checkConnectFourWinnerWithLine(grid: ConnectFourCell[][]): {
  winner: 1 | 2 | 'draw' | null;
  line: [number, number][] | null;
} {
  const rows = 6;
  const cols = 7;
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = grid[r][c];
      if (p === 0) continue;
      for (const [dr, dc] of dirs) {
        const cells: [number, number][] = [[r, c]];
        for (let step = 1; step < 4; step++) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === p) {
            cells.push([nr, nc]);
          } else {
            break;
          }
        }
        if (cells.length === 4) {
          return { winner: p, line: cells };
        }
      }
    }
  }
  if (grid[0].every((cell) => cell !== 0)) {
    return { winner: 'draw', line: null };
  }
  return { winner: null, line: null };
}

export function checkConnectFourWinner(grid: ConnectFourCell[][]): 1 | 2 | 'draw' | null {
  return checkConnectFourWinnerWithLine(grid).winner;
}

// 2048 Pure slide & merge logic
export function slide2048RowLeft(row: number[]): { newRow: number[]; gainedScore: number } {
  const nonZero = row.filter((n) => n !== 0);
  const merged: number[] = [];
  let gainedScore = 0;
  let i = 0;
  while (i < nonZero.length) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const val = nonZero[i] * 2;
      merged.push(val);
      gainedScore += val;
      i += 2;
    } else {
      merged.push(nonZero[i]);
      i += 1;
    }
  }
  while (merged.length < 4) {
    merged.push(0);
  }
  return { newRow: merged, gainedScore };
}

export function move2048Grid(
  grid: number[][],
  direction: 'left' | 'right' | 'up' | 'down'
): { nextGrid: number[][]; scoreDelta: number; moved: boolean } {
  let working = grid.map((r) => [...r]);
  const rotateRight = (m: number[][]) =>
    m[0].map((_, c) => m.map((row) => row[c]).reverse());
  const rotateLeft = (m: number[][]) =>
    m[0].map((_, c) => m.map((row) => row[3 - c]));

  if (direction === 'right') {
    working = working.map((r) => [...r].reverse());
  } else if (direction === 'up') {
    working = rotateLeft(working);
  } else if (direction === 'down') {
    working = rotateRight(working);
  }

  let totalScore = 0;
  working = working.map((row) => {
    const { newRow, gainedScore } = slide2048RowLeft(row);
    totalScore += gainedScore;
    return newRow;
  });

  if (direction === 'right') {
    working = working.map((r) => [...r].reverse());
  } else if (direction === 'up') {
    working = rotateRight(working);
  } else if (direction === 'down') {
    working = rotateLeft(working);
  }

  let moved = false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (working[r][c] !== grid[r][c]) {
        moved = true;
      }
    }
  }

  return { nextGrid: working, scoreDelta: totalScore, moved };
}

export function can2048GridMove(grid: number[][]): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return true;
      if (c + 1 < 4 && grid[r][c] === grid[r][c + 1]) return true;
      if (r + 1 < 4 && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

// Hexagonal Staggered Bubble Shooter Cluster + Unanchored Avalanche Resolver
export function getHexNeighbors(r: number, c: number, rows: number, cols: number): [number, number][] {
  const isOddRow = r % 2 === 1;
  const offsets = isOddRow
    ? [
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, 0],
        [1, 1],
      ]
    : [
        [-1, -1],
        [-1, 0],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
      ];
  const neighbors: [number, number][] = [];
  for (const [dr, dc] of offsets) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      neighbors.push([nr, nc]);
    }
  }
  return neighbors;
}

export function resolveBubbleClusterAndAvalanche(
  grid: (number | null)[][],
  placedRow: number,
  placedCol: number
): {
  nextGrid: (number | null)[][];
  poppedCells: [number, number][];
  droppedCells: [number, number][];
} {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const targetColor = grid[placedRow]?.[placedCol];
  const nextGrid = grid.map((r) => [...r]);

  if (targetColor === null || targetColor === undefined) {
    return { nextGrid, poppedCells: [], droppedCells: [] };
  }

  // 1. BFS to find connected cluster of same color
  const visited = new Set<string>();
  const queue: [number, number][] = [[placedRow, placedCol]];
  const cluster: [number, number][] = [];
  visited.add(`${placedRow},${placedCol}`);

  while (queue.length > 0) {
    const [cr, cc] = queue.shift()!;
    cluster.push([cr, cc]);
    for (const [nr, nc] of getHexNeighbors(cr, cc, rows, cols)) {
      const key = `${nr},${nc}`;
      if (!visited.has(key) && nextGrid[nr][nc] === targetColor) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  if (cluster.length < 3) {
    return { nextGrid, poppedCells: [], droppedCells: [] };
  }

  // Pop the matching cluster
  for (const [pr, pc] of cluster) {
    nextGrid[pr][pc] = null;
  }

  // 2. BFS from top ceiling (row 0) to find all anchored bubbles; any remaining are floating and drop!
  const anchored = new Set<string>();
  const anchorQueue: [number, number][] = [];
  for (let c = 0; c < cols; c++) {
    if (nextGrid[0][c] !== null) {
      anchored.add(`0,${c}`);
      anchorQueue.push([0, c]);
    }
  }

  while (anchorQueue.length > 0) {
    const [ar, ac] = anchorQueue.shift()!;
    for (const [nr, nc] of getHexNeighbors(ar, ac, rows, cols)) {
      const key = `${nr},${nc}`;
      if (!anchored.has(key) && nextGrid[nr][nc] !== null) {
        anchored.add(key);
        anchorQueue.push([nr, nc]);
      }
    }
  }

  const droppedCells: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (nextGrid[r][c] !== null && !anchored.has(`${r},${c}`)) {
        droppedCells.push([r, c]);
        nextGrid[r][c] = null;
      }
    }
  }

  return {
    nextGrid,
    poppedCells: cluster,
    droppedCells,
  };
}

// Word Battle validator
export function scoreWordBattleSubmission(
  word: string,
  allowedLetters: string[],
  centerLetter: string
): { valid: boolean; points: number; reason?: string } {
  const cleaned = word.trim().toUpperCase();
  if (cleaned.length < 3) {
    return { valid: false, points: 0, reason: 'Word must be at least 3 letters long.' };
  }
  const upperCenter = centerLetter.toUpperCase();
  if (!cleaned.includes(upperCenter)) {
    return { valid: false, points: 0, reason: `Must include center letter "${upperCenter}".` };
  }
  const allowedSet = new Set(allowedLetters.map((l) => l.toUpperCase()));
  for (const ch of cleaned) {
    if (!allowedSet.has(ch)) {
      return { valid: false, points: 0, reason: `Letter "${ch}" is not on the crystal rack.` };
    }
  }
  const pangramBonus =
    allowedSet.size <= cleaned.length && [...allowedSet].every((l) => cleaned.includes(l))
      ? 50
      : 0;
  return {
    valid: true,
    points: cleaned.length * 15 + pangramBonus,
  };
}
