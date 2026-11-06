'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Chess, Square } from 'chess.js';
import { CHESS_TIME_PRESETS, ChessTimePreset } from '@/src/lib/arcade-data';
import {
  applyChessIncrementMs,
  computeInitialChessTimeMs,
  formatChessClock,
} from '@/src/lib/game-rules';
import { soundFX } from '@/src/lib/sound';
import {
  Clock,
  RotateCcw,
  Flag,
  Handshake,
  ArrowLeft,
  Play,
  Pause,
  Sliders,
  Sparkles,
  CheckCircle2,
  Music,
  RefreshCw,
} from 'lucide-react';

interface ChessArenaProps {
  playerName: string;
  partnerName: string;
  autostart?: boolean;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onBackToArcade: () => void;
  onMatchFinished: (
    result: 'win' | 'loss' | 'draw',
    score: number,
    details: Record<string, unknown>
  ) => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const PIECE_UNICODE: Record<string, string> = {
  wp: '♙',
  wn: '♘',
  wb: '♗',
  wr: '♖',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  bn: '♞',
  bb: '♝',
  br: '♜',
  bq: '♛',
  bk: '♚',
};

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

function StauntonPieceSvg({ color, type }: { color: 'w' | 'b'; type: string }) {
  const fill = color === 'w' ? '#FFFBEB' : '#1C1917';
  const stroke = color === 'w' ? '#78350F' : '#FCD34D';
  const innerStroke = color === 'w' ? '#B45309' : '#F59E0B';

  return (
    <svg
      viewBox="0 0 45 45"
      className="h-9 w-9 sm:h-11 sm:w-11 drop-shadow-[0_2px_3px_rgba(0,0,0,0.45)] select-none pointer-events-none"
      aria-hidden="true"
    >
      {type === 'p' && (
        <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinecap="round">
          <path d="M 22.5,9 C 19.5,9 17,11.5 17,14.5 C 17,16.8 18.4,18.7 20.4,19.5 C 17.5,21.2 15.5,24.5 15.5,29 L 29.5,29 C 29.5,24.5 27.5,21.2 24.6,19.5 C 26.6,18.7 28,16.8 28,14.5 C 28,11.5 25.5,9 22.5,9 z" />
          <path d="M 12.5,33 L 32.5,33 L 34,37 L 11,37 L 12.5,33 z" />
        </g>
      )}
      {type === 'r' && (
        <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round">
          <path d="M 14,11 L 14,16 L 18,16 L 18,13 L 21,13 L 21,16 L 24,16 L 24,13 L 27,13 L 27,16 L 31,16 L 31,11 L 14,11 z" />
          <path d="M 15,16 L 16.5,29 L 28.5,29 L 30,16 L 15,16 z" />
          <path d="M 12,33 L 33,33 L 34.5,37 L 10.5,37 L 12,33 z" />
        </g>
      )}
      {type === 'n' && (
        <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round">
          <path d="M 22,10 C 31,11 33,19 32,29 L 15,29 C 15,23 19,21 21,18 C 17,19 14,17 13,14 C 15,11 18,9 22,10 z" />
          <circle cx="19" cy="14" r="1.4" fill={innerStroke} />
          <path d="M 12,33 L 33,33 L 34.5,37 L 10.5,37 L 12,33 z" />
        </g>
      )}
      {type === 'b' && (
        <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round">
          <circle cx="22.5" cy="9.5" r="2.2" />
          <path d="M 22.5,12 C 16,15 15,22 16,29 L 29,29 C 30,22 29,15 22.5,12 z" />
          <path d="M 20,18 L 25,18 M 22.5,15.5 L 22.5,20.5" stroke={innerStroke} strokeWidth="1.8" />
          <path d="M 12,33 L 33,33 L 34.5,37 L 10.5,37 L 12,33 z" />
        </g>
      )}
      {type === 'q' && (
        <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round">
          <circle cx="12" cy="13" r="1.8" />
          <circle cx="17.5" cy="11" r="1.8" />
          <circle cx="22.5" cy="10" r="2" />
          <circle cx="27.5" cy="11" r="1.8" />
          <circle cx="33" cy="13" r="1.8" />
          <path d="M 13,15 L 17.5,23 L 20,14 L 22.5,23 L 25,14 L 27.5,23 L 32,15 L 29.5,29 L 15.5,29 L 13,15 z" />
          <path d="M 12,33 L 33,33 L 34.5,37 L 10.5,37 L 12,33 z" />
        </g>
      )}
      {type === 'k' && (
        <g fill={fill} stroke={stroke} strokeWidth="2.2" strokeLinejoin="round">
          <path d="M 22.5,6.5 L 22.5,12 M 19.5,9 L 25.5,9" strokeWidth="2.4" />
          <path d="M 22.5,12 C 15.5,14 14.5,21 15.5,29 L 29.5,29 C 30.5,21 29.5,14 22.5,12 z" />
          <path d="M 12,33 L 33,33 L 34.5,37 L 10.5,37 L 12,33 z" />
        </g>
      )}
    </svg>
  );
}

export function ChessArena({
  playerName,
  partnerName,
  autostart = false,
  roomGameState,
  onSyncRoomGameState,
  onBackToArcade,
  onMatchFinished,
}: ChessArenaProps) {
  const chessRef = useRef<Chess>(new Chess());
  const [fen, setFen] = useState<string>(() => new Chess().fen());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [lastMoveSquares, setLastMoveSquares] = useState<{ from: Square; to: Square } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    color: 'w' | 'b';
  } | null>(null);
  const [boardFlipped, setBoardFlipped] = useState<boolean>(false);

  // Shell states: 'title' | 'playing' | 'paused' | 'gameover'
  const [shellState, setShellState] = useState<'title' | 'playing' | 'paused' | 'gameover'>(
    autostart ? 'playing' : 'title'
  );

  // Time Controls
  const [selectedPreset, setSelectedPreset] = useState<ChessTimePreset>(CHESS_TIME_PRESETS[3]); // 10 min rapid default
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState<number>(7);
  const [customExtraSeconds, setCustomExtraSeconds] = useState<number>(30);
  const [customIncrementSeconds, setCustomIncrementSeconds] = useState<number>(5);

  const [whiteTimeMs, setWhiteTimeMs] = useState<number>(600 * 1000);
  const [blackTimeMs, setBlackTimeMs] = useState<number>(600 * 1000);
  const [activeTurn, setActiveTurn] = useState<'w' | 'b'>('w');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [capturedByWhite, setCapturedByWhite] = useState<string[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<string[]>([]);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [winnerLabel, setWinnerLabel] = useState<string | null>(null);
  const [autoPartnerBot, setAutoPartnerBot] = useState<boolean>(true);
  const [musicActive, setMusicActive] = useState<boolean>(soundFX.musicEnabled);

  const isUnlimited = !isCustomMode && selectedPreset.id === 'unlimited';
  const activeIncrementSec = isCustomMode
    ? customIncrementSeconds
    : selectedPreset.incrementSeconds;

  // Synchronize incoming room chess state when playing live in a shared room
  const incomingRoomFen =
    typeof roomGameState?.chessFen === 'string' ? roomGameState.chessFen : null;
  const lastSyncedFenRef = useRef<string>('');

  useEffect(() => {
    if (!incomingRoomFen || incomingRoomFen === lastSyncedFenRef.current) return;
    if (incomingRoomFen !== chessRef.current.fen()) {
      try {
        chessRef.current.load(incomingRoomFen);
        lastSyncedFenRef.current = incomingRoomFen;
        Promise.resolve().then(() => {
          setFen(incomingRoomFen);
          setActiveTurn(chessRef.current.turn());
          if (Array.isArray(roomGameState?.moveHistory)) {
            setMoveHistory(roomGameState.moveHistory as string[]);
          }
          if (typeof roomGameState?.whiteTimeMs === 'number') {
            setWhiteTimeMs(roomGameState.whiteTimeMs);
          }
          if (typeof roomGameState?.blackTimeMs === 'number') {
            setBlackTimeMs(roomGameState.blackTimeMs);
          }
        });
      } catch {
        // Ignore malformed FEN
      }
    }
  }, [incomingRoomFen, roomGameState]);

  function startNewChessMatch() {
    const g = new Chess();
    chessRef.current = g;
    setFen(g.fen());
    setSelectedSquare(null);
    setLegalTargets([]);
    setLastMoveSquares(null);
    setPendingPromotion(null);
    setMoveHistory([]);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setGameOverReason(null);
    setWinnerLabel(null);
    setActiveTurn('w');

    const initialMs = isCustomMode
      ? computeInitialChessTimeMs({
          minutes: customMinutes,
          extraSeconds: customExtraSeconds,
          incrementSeconds: customIncrementSeconds,
        })
      : computeInitialChessTimeMs(selectedPreset);

    setWhiteTimeMs(initialMs);
    setBlackTimeMs(initialMs);
    setShellState('playing');
    soundFX.playSuccess();

    if (onSyncRoomGameState) {
      lastSyncedFenRef.current = g.fen();
      onSyncRoomGameState({
        chessFen: g.fen(),
        moveHistory: [],
        whiteTimeMs: initialMs,
        blackTimeMs: initialMs,
      });
    }
  }

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = shellState;
    }
  }, [shellState]);

  // Dual Chess Clock Ticker
  useEffect(() => {
    if (shellState !== 'playing' || isUnlimited) return;

    const timer = setInterval(() => {
      if (activeTurn === 'w') {
        setWhiteTimeMs((prev) => {
          if (prev <= 150) {
            concludeMatch('loss', `${partnerName} (Black) won on time`, 'Time Out');
            return 0;
          }
          return prev - 100;
        });
      } else {
        setBlackTimeMs((prev) => {
          if (prev <= 150) {
            concludeMatch('win', `${playerName} (White) won on time`, 'Time Out');
            return 0;
          }
          return prev - 100;
        });
      }
    }, 100);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellState, activeTurn, isUnlimited]);

  function concludeMatch(
    result: 'win' | 'loss' | 'draw',
    winnerText: string,
    reasonText: string
  ) {
    setShellState('gameover');
    setWinnerLabel(winnerText);
    setGameOverReason(reasonText);
    if (result === 'win') soundFX.playFanfare();
    else soundFX.playSuccess();

    const baseScore = result === 'win' ? 1200 : result === 'draw' ? 650 : 300;
    onMatchFinished(result, baseScore + moveHistory.length * 10, {
      preset: isCustomMode
        ? `Custom ${customMinutes}m+${customIncrementSeconds}s`
        : selectedPreset.label,
      moves: moveHistory.length,
      reason: reasonText,
      finalFen: fen,
    });
  }

  function tallyCapturedPieces(game: Chess) {
    const startCounts: Record<string, number> = {
      wp: 8,
      wn: 2,
      wb: 2,
      wr: 2,
      wq: 1,
      bp: 8,
      bn: 2,
      bb: 2,
      br: 2,
      bq: 1,
    };
    const currentCounts: Record<string, number> = {
      wp: 0,
      wn: 0,
      wb: 0,
      wr: 0,
      wq: 0,
      bp: 0,
      bn: 0,
      bb: 0,
      br: 0,
      bq: 0,
    };

    const board = game.board();
    for (const row of board) {
      for (const cell of row) {
        if (cell && cell.type !== 'k') {
          const key = `${cell.color}${cell.type}`;
          currentCounts[key] = (currentCounts[key] || 0) + 1;
        }
      }
    }

    const whiteCap: string[] = [];
    const blackCap: string[] = [];

    (['q', 'r', 'b', 'n', 'p'] as const).forEach((t) => {
      const missingBlack = Math.max(0, startCounts[`b${t}`] - (currentCounts[`b${t}`] || 0));
      for (let i = 0; i < missingBlack; i++) whiteCap.push(PIECE_UNICODE[`b${t}`]);

      const missingWhite = Math.max(0, startCounts[`w${t}`] - (currentCounts[`w${t}`] || 0));
      for (let i = 0; i < missingWhite; i++) blackCap.push(PIECE_UNICODE[`w${t}`]);
    });

    setCapturedByWhite(whiteCap);
    setCapturedByBlack(blackCap);
  }

  function computeMaterialDiff(viewChess: Chess): number {
    const board = viewChess.board();
    let whiteSum = 0;
    let blackSum = 0;
    for (const row of board) {
      for (const cell of row) {
        if (!cell) continue;
        const val = PIECE_VALUES[cell.type] || 0;
        if (cell.color === 'w') whiteSum += val;
        else blackSum += val;
      }
    }
    return whiteSum - blackSum;
  }

  function evaluateBoardOutcome(game: Chess, moverSide: 'w' | 'b') {
    if (game.isCheckmate()) {
      const isPlayerWin = moverSide === 'w';
      concludeMatch(
        isPlayerWin ? 'win' : 'loss',
        isPlayerWin ? `${playerName} Wins by Checkmate!` : `${partnerName} Wins by Checkmate!`,
        'Checkmate'
      );
      return true;
    }
    if (game.isStalemate()) {
      concludeMatch('draw', 'Draw Agreed by Stalemate', 'Stalemate');
      return true;
    }
    if (game.isThreefoldRepetition()) {
      concludeMatch('draw', 'Draw by Threefold Repetition', 'Threefold Repetition');
      return true;
    }
    if (game.isInsufficientMaterial()) {
      concludeMatch('draw', 'Draw by Insufficient Material', 'Insufficient Material');
      return true;
    }
    if (game.isDraw()) {
      concludeMatch('draw', 'Draw by 50-Move Rule', '50-Move Rule / Draw');
      return true;
    }
    return false;
  }

  function isPawnPromotionMove(game: Chess, from: Square, to: Square): boolean {
    const piece = game.get(from);
    if (!piece || piece.type !== 'p') return false;
    const targetRank = to[1];
    if (piece.color === 'w' && targetRank === '8') return true;
    if (piece.color === 'b' && targetRank === '1') return true;
    return false;
  }

  function executeMove(
    from: Square,
    to: Square,
    promotionPiece: 'q' | 'r' | 'b' | 'n' = 'q'
  ) {
    const game = chessRef.current;
    try {
      const moveObj = game.move({ from, to, promotion: promotionPiece });
      if (!moveObj) return false;

      if (game.inCheck()) {
        soundFX.playCheck();
      } else if (moveObj.captured) {
        soundFX.playCapture();
      } else {
        soundFX.playMove();
      }

      // Apply increment to the player who just moved
      if (moveObj.color === 'w') {
        setWhiteTimeMs((ms) => applyChessIncrementMs(ms, activeIncrementSec, isUnlimited));
      } else {
        setBlackTimeMs((ms) => applyChessIncrementMs(ms, activeIncrementSec, isUnlimited));
      }

      const nextFen = game.fen();
      const nextHistory = [...game.history()];
      setFen(nextFen);
      setMoveHistory(nextHistory);
      setLastMoveSquares({ from, to });
      tallyCapturedPieces(game);
      setSelectedSquare(null);
      setLegalTargets([]);
      setPendingPromotion(null);

      if (onSyncRoomGameState) {
        lastSyncedFenRef.current = nextFen;
        onSyncRoomGameState({
          chessFen: nextFen,
          moveHistory: nextHistory,
          whiteTimeMs,
          blackTimeMs,
        });
      }

      if (evaluateBoardOutcome(game, moveObj.color)) {
        return true;
      }

      const nextTurn = game.turn();
      setActiveTurn(nextTurn);

      // If Partner Auto-Reply is enabled for Black, make a smart tactical reply after 480ms
      if (nextTurn === 'b' && autoPartnerBot) {
        setTimeout(() => {
          if (chessRef.current.isGameOver()) return;
          const legalMoves = chessRef.current.moves({ verbose: true });
          if (legalMoves.length === 0) return;
          const tactical = legalMoves.filter((m) => m.captured || m.san.includes('+'));
          const chosen =
            tactical.length > 0 ? tactical[0] : legalMoves[legalMoves.length % 3 === 0 ? 0 : Math.min(1, legalMoves.length - 1)];

          const botMove = chessRef.current.move(chosen);
          if (botMove) {
            if (chessRef.current.inCheck()) soundFX.playCheck();
            else if (botMove.captured) soundFX.playCapture();
            else soundFX.playMove();

            setBlackTimeMs((ms) =>
              applyChessIncrementMs(ms, activeIncrementSec, isUnlimited)
            );
            const afterBotFen = chessRef.current.fen();
            const afterBotHist = [...chessRef.current.history()];
            setFen(afterBotFen);
            setMoveHistory(afterBotHist);
            setLastMoveSquares({ from: botMove.from as Square, to: botMove.to as Square });
            tallyCapturedPieces(chessRef.current);
            if (!evaluateBoardOutcome(chessRef.current, 'b')) {
              setActiveTurn(chessRef.current.turn());
            }
          }
        }, 480);
      }

      return true;
    } catch {
      soundFX.playError();
      return false;
    }
  }

  function handleSquareClick(sq: Square) {
    if (shellState !== 'playing' || pendingPromotion) return;
    const game = chessRef.current;

    if (selectedSquare && legalTargets.includes(sq)) {
      if (isPawnPromotionMove(game, selectedSquare, sq)) {
        const piece = game.get(selectedSquare);
        setPendingPromotion({
          from: selectedSquare,
          to: sq,
          color: piece?.color || 'w',
        });
        return;
      }
      executeMove(selectedSquare, sq, 'q');
      return;
    }

    const pieceOnSq = game.get(sq);
    if (pieceOnSq && pieceOnSq.color === game.turn()) {
      setSelectedSquare(sq);
      const verboseMoves = game.moves({ square: sq, verbose: true });
      setLegalTargets(verboseMoves.map((m) => m.to as Square));
      soundFX.playMove();
    } else {
      setSelectedSquare(null);
      setLegalTargets([]);
    }
  }

  const viewGame = new Chess(fen);
  const boardMatrix = viewGame.board();
  const inCheckNow = viewGame.inCheck();
  const checkedColor = inCheckNow ? viewGame.turn() : null;
  const materialDiff = computeMaterialDiff(viewGame);
  const displayRanks = boardFlipped ? [...RANKS].reverse() : RANKS;
  const displayFiles = boardFlipped ? [...FILES].reverse() : FILES;

  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900 p-4 text-stone-100 sm:p-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToArcade}
            className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-amber-500/50 hover:text-amber-200 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Arcade Hub</span>
          </button>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-stone-100">
              Royal Observatory Chess
            </h2>
            <p className="text-xs text-stone-400">
              Full FIDE Legal Rules · Promotion · Castling · En Passant · Check &amp; Clocks
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBoardFlipped((f) => !f)}
            className="flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-xs text-stone-300 hover:border-amber-500/50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Flip Board</span>
          </button>
          <button
            type="button"
            onClick={() => setMusicActive(soundFX.toggleMusic())}
            className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs ${
              musicActive
                ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                : 'border-stone-700 bg-stone-950 text-stone-400'
            }`}
          >
            <Music className="h-3.5 w-3.5" />
            <span>{musicActive ? 'Music ON' : 'Music OFF'}</span>
          </button>
          <button
            type="button"
            onClick={() => setAutoPartnerBot(!autoPartnerBot)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              autoPartnerBot
                ? 'border-teal-500/50 bg-teal-500/15 text-teal-200'
                : 'border-stone-700 bg-stone-950 text-stone-300'
            }`}
          >
            {autoPartnerBot ? `Partner Auto-Reply: ON` : `2-Player Shared Board: ON`}
          </button>

          {shellState === 'playing' && (
            <button
              type="button"
              onClick={() => setShellState('paused')}
              aria-label="Pause Chess Game"
              className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-medium text-stone-200 hover:bg-stone-800 whitespace-nowrap shrink-0"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause</span>
            </button>
          )}
        </div>
      </div>

      {/* TITLE / TIME CONTROL SELECTION STAGE */}
      {shellState === 'title' && (
        <div className="grid grid-cols-1 gap-8 py-2 lg:grid-cols-12">
          <div className="flex flex-col justify-between lg:col-span-7">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <Clock className="h-4 w-4" />
                <span>SELECT CHESS TIME CONTROL OR CUSTOM CLOCK</span>
              </div>
              <h3 className="mt-2 text-2xl font-bold text-stone-100">
                Configure Your Chess Match
              </h3>
              <p className="mt-1 text-sm text-stone-400">
                Choose from Bullet, Blitz, Rapid, Classical, Unlimited, or build your own custom timer with per-move increments.
              </p>

              {/* Preset Grid */}
              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {CHESS_TIME_PRESETS.map((preset) => {
                  const active = !isCustomMode && selectedPreset.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setIsCustomMode(false);
                        setSelectedPreset(preset);
                        soundFX.playMove();
                      }}
                      className={`flex flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? 'border-amber-400 bg-amber-500/15 text-stone-100'
                          : 'border-stone-800 bg-stone-900/90 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                        {preset.category}
                      </span>
                      <span className="mt-0.5 font-mono text-sm font-bold text-stone-100 tabular-nums">
                        {preset.label}
                      </span>
                      <span className="mt-0.5 text-[11px] text-stone-400">
                        {preset.minutes > 0
                          ? `${preset.minutes}m + ${preset.incrementSeconds}s/move`
                          : 'Untimed Casual Match'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-stone-800 pt-4">
              <button
                type="button"
                data-start="true"
                onClick={startNewChessMatch}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Start Chess Match</span>
              </button>
              <span className="font-mono text-xs text-stone-400 tabular-nums">
                Active Timer:{' '}
                {isCustomMode
                  ? `${customMinutes}m ${customExtraSeconds}s + ${customIncrementSeconds}s/move`
                  : selectedPreset.label}
              </span>
            </div>
          </div>

          {/* Custom Time Builder */}
          <div className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-950 p-6 lg:col-span-5">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-300">
                  <Sliders className="h-4 w-4" />
                  <span>CUSTOM TIME CONTROL</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(!isCustomMode)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    isCustomMode
                      ? 'bg-teal-500 text-stone-950'
                      : 'border border-stone-700 bg-stone-900 text-stone-300'
                  }`}
                >
                  {isCustomMode ? 'Custom Active' : 'Enable Custom'}
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="flex justify-between text-xs text-stone-300">
                    <span>Minutes per Player</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      {customMinutes} min
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={customMinutes}
                    onChange={(e) => {
                      setIsCustomMode(true);
                      setCustomMinutes(Number(e.target.value));
                    }}
                    className="mt-1.5 w-full accent-amber-500"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-xs text-stone-300">
                    <span>Extra Starting Seconds</span>
                    <span className="font-mono font-bold text-amber-300 tabular-nums">
                      +{customExtraSeconds} sec
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={59}
                    value={customExtraSeconds}
                    onChange={(e) => {
                      setIsCustomMode(true);
                      setCustomExtraSeconds(Number(e.target.value));
                    }}
                    className="mt-1.5 w-full accent-amber-500"
                  />
                </div>

                <div>
                  <label className="flex justify-between text-xs text-stone-300">
                    <span>Increment per Move (Fischer)</span>
                    <span className="font-mono font-bold text-teal-300 tabular-nums">
                      +{customIncrementSeconds} sec/move
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={customIncrementSeconds}
                    onChange={(e) => {
                      setIsCustomMode(true);
                      setCustomIncrementSeconds(Number(e.target.value));
                    }}
                    className="mt-1.5 w-full accent-teal-400"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-stone-800/80 pt-3.5 text-xs text-stone-400">
              <div className="flex items-center gap-1.5 font-semibold text-stone-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Full Legal Chess Engine Active</span>
              </div>
              <p className="mt-1 leading-relaxed">
                Supports interactive Pawn Promotion (Queen, Rook, Bishop, Knight), Castling, En Passant, Check highlighting, Stalemate, and live Multiplayer Room board sync.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE CHESS BOARD & TELEMETRY */}
      {shellState !== 'title' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left/Center: 8x8 Staunton Chessboard */}
          <div className="flex flex-col items-center justify-center lg:col-span-7">
            {/* Opponent Clock Bar */}
            <div className="mb-3 flex w-full max-w-[464px] items-center justify-between rounded-xl border border-stone-800 bg-stone-950 px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-800 text-sm">
                  ♚
                </span>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-100">
                    <span>{partnerName} (Black)</span>
                    {materialDiff < 0 && (
                      <span className="rounded bg-teal-500/20 px-1.5 py-0.5 font-mono text-[10px] text-teal-300">
                        +{Math.abs(materialDiff)}
                      </span>
                    )}
                  </div>
                  <div className="min-h-[16px] text-xs text-amber-300">
                    {capturedByBlack.join(' ') || 'No captures yet'}
                  </div>
                </div>
              </div>
              <div
                aria-label="Black Clock"
                className={`rounded-lg px-3 py-1 font-mono text-base font-bold tabular-nums ${
                  activeTurn === 'b'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-900 text-stone-300'
                }`}
              >
                {formatChessClock(blackTimeMs, isUnlimited)}
              </div>
            </div>

            {/* 8x8 Royal Wooden & Parchment Chessboard */}
            <div className="relative w-full max-w-[464px] rounded-2xl border-4 border-[#5C3A21] bg-[#3E2723] p-2.5 shadow-2xl">
              <div
                role="grid"
                aria-label="Interactive Chessboard"
                data-fen={fen}
                className="grid aspect-square w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-lg border-2 border-[#78350F]"
              >
                {displayRanks.map((rankStr) =>
                  displayFiles.map((fileStr) => {
                    const rIdx = RANKS.indexOf(rankStr);
                    const cIdx = FILES.indexOf(fileStr);
                    const sq = `${fileStr}${rankStr}` as Square;
                    const isLight = (rIdx + cIdx) % 2 === 0;
                    const piece = boardMatrix[rIdx][cIdx];
                    const isSelected = selectedSquare === sq;
                    const isTarget = legalTargets.includes(sq);
                    const isLastMove =
                      lastMoveSquares?.from === sq || lastMoveSquares?.to === sq;
                    const isKingCheckedHere =
                      piece?.type === 'k' && piece.color === checkedColor;

                    return (
                      <button
                        key={sq}
                        type="button"
                        data-square={sq}
                        onClick={() => handleSquareClick(sq)}
                        aria-label={`Square ${sq}${
                          piece
                            ? ` ${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}`
                            : ''
                        }`}
                        style={{
                          backgroundColor: isKingCheckedHere
                            ? '#DC2626'
                            : isSelected
                            ? '#F59E0B'
                            : isLastMove
                            ? isLight
                              ? '#FDE68A'
                              : '#B45309'
                            : isLight
                            ? '#F3E5AB'
                            : '#8B5A2B',
                        }}
                        className="relative flex items-center justify-center select-none transition-colors focus:outline-none"
                      >
                        {/* Coordinate Labels */}
                        {fileStr === displayFiles[0] && (
                          <span
                            style={{ color: isLight ? '#5C3A21' : '#F3E5AB' }}
                            className="pointer-events-none absolute top-0.5 left-1 font-mono text-[9px] font-bold"
                          >
                            {rankStr}
                          </span>
                        )}
                        {rankStr === displayRanks[7] && (
                          <span
                            style={{ color: isLight ? '#5C3A21' : '#F3E5AB' }}
                            className="pointer-events-none absolute right-1 bottom-0.5 font-mono text-[9px] font-bold"
                          >
                            {fileStr}
                          </span>
                        )}

                        {/* Legal Destination Indicator */}
                        {isTarget && !piece && (
                          <span className="pointer-events-none h-3.5 w-3.5 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                        )}
                        {isTarget && piece && (
                          <span className="pointer-events-none absolute inset-1 rounded-md border-3 border-rose-500/90" />
                        )}

                        {/* Custom Staunton Chess Piece */}
                        {piece && (
                          <div className="relative flex items-center justify-center">
                            <StauntonPieceSvg color={piece.color} type={piece.type} />
                            <span className="sr-only">
                              {PIECE_UNICODE[`${piece.color}${piece.type}`]}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* INTERACTIVE PAWN PROMOTION CHOOSER OVERLAY */}
              {pendingPromotion && (
                <div className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/80 p-4 backdrop-blur-xs">
                  <div className="w-full max-w-xs rounded-2xl border-2 border-amber-400 bg-stone-900 p-5 text-center shadow-2xl">
                    <h4 className="text-base font-bold text-amber-300">
                      Promote Your Pawn ({pendingPromotion.to.toUpperCase()})
                    </h4>
                    <p className="mt-1 text-xs text-stone-300">
                      Choose which piece your pawn becomes on the 8th rank:
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2.5">
                      {(
                        [
                          { code: 'q', label: 'Queen (9)' },
                          { code: 'r', label: 'Rook (5)' },
                          { code: 'b', label: 'Bishop (3)' },
                          { code: 'n', label: 'Knight (3)' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() =>
                            executeMove(
                              pendingPromotion.from,
                              pendingPromotion.to,
                              opt.code
                            )
                          }
                          className="flex flex-col items-center gap-1 rounded-xl border border-stone-700 bg-stone-950 p-2.5 hover:border-amber-400"
                        >
                          <StauntonPieceSvg
                            color={pendingPromotion.color}
                            type={opt.code}
                          />
                          <span className="text-xs font-bold text-stone-100">
                            {opt.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Player Clock Bar */}
            <div className="mt-3 flex w-full max-w-[464px] items-center justify-between rounded-xl border border-stone-800 bg-stone-950 px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-sm text-amber-300">
                  ♔
                </span>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-100">
                    <span>{playerName} (White)</span>
                    {materialDiff > 0 && (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                        +{materialDiff}
                      </span>
                    )}
                  </div>
                  <div className="min-h-[16px] text-xs text-amber-300">
                    {capturedByWhite.join(' ') || 'No captures yet'}
                  </div>
                </div>
              </div>
              <div
                aria-label="White Clock"
                className={`rounded-lg px-3 py-1 font-mono text-base font-bold tabular-nums ${
                  activeTurn === 'w'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-900 text-stone-300'
                }`}
              >
                {formatChessClock(whiteTimeMs, isUnlimited)}
              </div>
            </div>
          </div>

          {/* Right Panel: Move History, Check Status & Match Actions */}
          <div className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-950 p-5 lg:col-span-5">
            <div>
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Match Telemetry &amp; Move Log
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    inCheckNow
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-stone-900 text-amber-300'
                  }`}
                >
                  {inCheckNow
                    ? 'CHECK ALERT!'
                    : activeTurn === 'w'
                    ? 'White to Move'
                    : 'Black to Move'}
                </span>
              </div>

              {/* Algebraic Move Pairs */}
              <div className="mt-3 h-56 overflow-y-auto rounded-xl border border-stone-900 bg-stone-900/50 p-3 font-mono text-xs tabular-nums">
                {moveHistory.length === 0 ? (
                  <p className="text-stone-500">
                    Click any White piece (ranks 1–2) to highlight legal squares and make your opening move.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {Array.from(
                      { length: Math.ceil(moveHistory.length / 2) },
                      (_, idx) => {
                        const wMove = moveHistory[idx * 2];
                        const bMove = moveHistory[idx * 2 + 1];
                        return (
                          <React.Fragment key={idx}>
                            <div className="text-stone-200">
                              <span className="text-stone-500">{idx + 1}.</span> {wMove}
                            </div>
                            <div className="text-teal-300">{bMove || ''}</div>
                          </React.Fragment>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action Controls */}
            <div className="mt-4 space-y-2.5 border-t border-stone-800 pt-4">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    concludeMatch('draw', 'Draw Agreed by Mutual Consent', 'Mutual Draw Offer')
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs font-medium text-stone-200 hover:border-amber-500/50 whitespace-nowrap shrink-0"
                >
                  <Handshake className="h-3.5 w-3.5 text-amber-400" />
                  <span>Offer Draw</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    concludeMatch('loss', `${partnerName} Won by Resignation`, 'Resignation')
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs font-medium text-rose-300 hover:border-rose-500/50 whitespace-nowrap shrink-0"
                >
                  <Flag className="h-3.5 w-3.5" />
                  <span>Resign</span>
                </button>
                <button
                  type="button"
                  onClick={startNewChessMatch}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs font-medium text-stone-200 hover:bg-stone-800 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Rematch</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShellState('title')}
                className="w-full rounded-lg border border-stone-800 bg-stone-900/60 py-2 text-xs text-stone-400 hover:text-stone-200"
              >
                Change Time Control ({isCustomMode ? 'Custom' : selectedPreset.label})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAUSE OVERLAY */}
      {shellState === 'paused' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-stone-700 bg-stone-900 p-6 text-center shadow-2xl">
            <h3 className="text-xl font-bold text-stone-100">Chess Clocks Paused</h3>
            <p className="mt-1 text-xs text-stone-400">
              Take a breather—both White and Black timers are frozen.
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setShellState('playing')}
                className="w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
              >
                Resume Match
              </button>
              <button
                type="button"
                onClick={startNewChessMatch}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 py-2.5 text-xs font-semibold text-stone-200 hover:bg-stone-700"
              >
                Restart Board
              </button>
              <button
                type="button"
                onClick={onBackToArcade}
                className="w-full rounded-lg py-2 text-xs text-stone-400 hover:text-stone-200"
              >
                Exit to Arcade Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER SUMMARY OVERLAY */}
      {shellState === 'gameover' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-2xl font-bold text-stone-100">
              {winnerLabel || 'Chess Match Complete'}
            </h3>
            <p className="mt-1 text-xs font-medium text-amber-400">
              Outcome Reason: {gameOverReason} · Total Moves: {moveHistory.length}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-stone-800 bg-stone-950 p-3 text-xs">
              <div>
                <div className="text-stone-400">XP Reward (1v1)</div>
                <div className="mt-0.5 font-mono text-base font-bold text-amber-300 tabular-nums">
                  +30 XP
                </div>
              </div>
              <div>
                <div className="text-stone-400">Arcade Coins</div>
                <div className="mt-0.5 font-mono text-base font-bold text-stone-400 tabular-nums">
                  0 Coins (2v2 Exclusive)
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={startNewChessMatch}
                className="flex-1 rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
              >
                Play Rematch
              </button>
              <button
                type="button"
                onClick={onBackToArcade}
                className="flex-1 rounded-lg border border-stone-700 bg-stone-800 py-2.5 text-xs font-semibold text-stone-200 hover:bg-stone-700"
              >
                Back to Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
