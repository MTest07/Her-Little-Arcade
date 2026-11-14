'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import { CHESS_TIME_PRESETS, ChessTimePreset } from '@/src/lib/arcade-data';
import {
  computeInitialChessTimeMs,
  formatChessClock,
} from '@/src/lib/game-rules';
import { soundFX } from '@/src/lib/sound';
import { AnimatedSkinnedAvatar } from '@/src/components/CosmeticAvatarAndBanner';
import { MultiplayerRoomState } from '@/src/components/VoiceAndLobbyDock';
import {
  Clock,
  RotateCcw,
  Flag,
  Handshake,
  ArrowLeft,
  Play,
  Sliders,
  Sparkles,
  CheckCircle2,
  Music,
  RefreshCw,
  Users,
  Wifi,
  WifiOff,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface ChessArenaProps {
  playerName: string;
  partnerName: string;
  currentUser?: {
    uid: string;
    username: string;
    avatar: string;
    customPhotoUrl?: string;
    equippedSkin?: string;
  };
  activeRoom?: MultiplayerRoomState | null;
  authFetcher?: (url: string, options?: RequestInit) => Promise<Response>;
  onRoomUpdated?: (room: MultiplayerRoomState) => void;
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

function parseRoomPayload(dbRoom: Record<string, unknown>): MultiplayerRoomState {
  const safeParse = <T,>(raw: unknown, fallback: T): T => {
    if (typeof raw !== 'string' || !raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };
  const resolvedMode =
    dbRoom.mode === 'party' ? 'party' : dbRoom.mode === '2v2' ? '2v2' : '1v1';
  return {
    roomCode: String(dbRoom.roomCode || ''),
    gameId: String(dbRoom.gameId || 'chess'),
    mode: resolvedMode,
    visibility: dbRoom.visibility === 'private' ? 'private' : 'public',
    joinPolicy:
      dbRoom.joinPolicy === 'approval_required' ? 'approval_required' : 'immediate',
    maxPlayers: Number(dbRoom.maxPlayers || 2),
    hostUid: String(dbRoom.hostUid || ''),
    hostName: String(dbRoom.hostName || 'Player'),
    hostAvatar: String(dbRoom.hostAvatar || '🦊'),
    status:
      dbRoom.status === 'playing'
        ? 'playing'
        : dbRoom.status === 'finished'
        ? 'finished'
        : 'lobby',
    settings: safeParse(dbRoom.settingsJson, {}),
    players: safeParse(dbRoom.playersJson, []),
    teams: safeParse(dbRoom.teamsJson, []),
    pendingRequests: safeParse(dbRoom.pendingRequestsJson, []),
    invitedUids: safeParse(dbRoom.invitedUidsJson, []),
    gameState: safeParse(dbRoom.gameStateJson, {}),
    chat: safeParse(dbRoom.chatJson, []),
    voiceParticipants: safeParse(dbRoom.voiceParticipantsJson, []),
  };
}

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
  currentUser,
  activeRoom,
  authFetcher,
  onRoomUpdated,
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
  const [manualFlipOverride, setManualFlipOverride] = useState<boolean | null>(null);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Shell states: 'title' | 'playing' | 'gameover'
  const [shellState, setShellState] = useState<'title' | 'playing' | 'gameover'>(
    autostart || activeRoom?.status === 'playing' ? 'playing' : 'title'
  );

  // Time Controls (for rematch / custom configuration)
  const [selectedPreset, setSelectedPreset] = useState<ChessTimePreset>(CHESS_TIME_PRESETS[3]);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState<number>(10);
  const [customExtraSeconds, setCustomExtraSeconds] = useState<number>(0);
  const [customIncrementSeconds, setCustomIncrementSeconds] = useState<number>(5);

  const [whiteTimeMs, setWhiteTimeMs] = useState<number>(600 * 1000);
  const [blackTimeMs, setBlackTimeMs] = useState<number>(600 * 1000);
  const [activeTurn, setActiveTurn] = useState<'w' | 'b'>('w');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [capturedByWhite, setCapturedByWhite] = useState<string[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<string[]>([]);
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [winnerLabel, setWinnerLabel] = useState<string | null>(null);
  const [musicActive, setMusicActive] = useState<boolean>(soundFX.musicEnabled);

  const lastSyncedVersionRef = useRef<number>(-1);
  const lastRecordedSeedRef = useRef<string>('');
  const timeoutClaimedForSeedRef = useRef<string>('');

  const effectiveGameState = (activeRoom?.gameState || roomGameState || {}) as Record<
    string,
    unknown
  >;

  const roomPlayers = activeRoom?.players || [];
  const bothHumanPlayersPresent = roomPlayers.length >= 2;

  // Determine White and Black player identities from roomGameState or activeRoom.players
  const whiteUid =
    String(effectiveGameState.whiteUid || '') ||
    roomPlayers[0]?.uid ||
    currentUser?.uid ||
    '';
  const blackUid =
    String(effectiveGameState.blackUid || '') ||
    roomPlayers.find((p) => p.uid !== whiteUid)?.uid ||
    '';

  const whitePlayerInRoom = roomPlayers.find((p) => p.uid === whiteUid);
  const blackPlayerInRoom = roomPlayers.find((p) => p.uid === blackUid);

  const whiteUsername =
    whitePlayerInRoom?.username ||
    String(effectiveGameState.whiteUsername || '') ||
    (currentUser?.uid === whiteUid ? currentUser.username : playerName);
  const blackUsername =
    blackPlayerInRoom?.username ||
    String(effectiveGameState.blackUsername || '') ||
    (currentUser?.uid === blackUid ? currentUser.username : partnerName);

  const myColor: 'w' | 'b' =
    currentUser?.uid && blackUid && currentUser.uid === blackUid ? 'b' : 'w';

  // Auto-orient board so current player's pieces are at the bottom unless manually flipped
  const boardFlipped =
    manualFlipOverride !== null ? manualFlipOverride : myColor === 'b';

  const isUnlimited =
    typeof effectiveGameState.isUnlimited === 'boolean'
      ? Boolean(effectiveGameState.isUnlimited)
      : !isCustomMode && selectedPreset.id === 'unlimited';

  const drawOfferByUid =
    typeof effectiveGameState.drawOfferByUid === 'string' &&
    effectiveGameState.drawOfferByUid
      ? effectiveGameState.drawOfferByUid
      : null;
  const drawOfferByUsername =
    typeof effectiveGameState.drawOfferByUsername === 'string' &&
    effectiveGameState.drawOfferByUsername
      ? effectiveGameState.drawOfferByUsername
      : null;

  const tallyCapturedPieces = useCallback((game: Chess) => {
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
  }, []);

  // Synchronize incoming room chess state when playing live in a shared room
  useEffect(() => {
    const incomingFen =
      typeof effectiveGameState.chessFen === 'string' && effectiveGameState.chessFen
        ? effectiveGameState.chessFen
        : typeof effectiveGameState.fen === 'string' && effectiveGameState.fen
        ? effectiveGameState.fen
        : null;
    const incomingVersion = Number(effectiveGameState.stateVersion || 0);
    const incomingStatus = String(effectiveGameState.matchStatus || 'playing');
    const isIncomingGameOver = incomingStatus !== 'playing';
    const incomingSeed = String(effectiveGameState.sessionSeed || '1');

    if (!incomingFen) return;

    const shouldApply =
      incomingVersion > lastSyncedVersionRef.current ||
      incomingFen !== chessRef.current.fen() ||
      (isIncomingGameOver && shellState !== 'gameover');

    if (!shouldApply) return;

    try {
      const prevFen = chessRef.current.fen();
      chessRef.current.load(incomingFen);
      lastSyncedVersionRef.current = incomingVersion;

      if (prevFen !== incomingFen) {
        if (chessRef.current.inCheck()) soundFX.playCheck();
        else soundFX.playMove();
      }

      const turnStartedAt = Number(
        effectiveGameState.turnStartedAt ||
          effectiveGameState.lastMoveTimestamp ||
          Date.now()
      );
      const elapsedSinceTurnMs =
        !isIncomingGameOver && !isUnlimited
          ? Math.max(0, Date.now() - turnStartedAt)
          : 0;
      const serverTurn = chessRef.current.turn();

      const rawWhiteMs =
        typeof effectiveGameState.whiteTimeMs === 'number'
          ? effectiveGameState.whiteTimeMs
          : 600 * 1000;
      const rawBlackMs =
        typeof effectiveGameState.blackTimeMs === 'number'
          ? effectiveGameState.blackTimeMs
          : 600 * 1000;

      const computedWhiteMs =
        serverTurn === 'w' ? Math.max(0, rawWhiteMs - elapsedSinceTurnMs) : rawWhiteMs;
      const computedBlackMs =
        serverTurn === 'b' ? Math.max(0, rawBlackMs - elapsedSinceTurnMs) : rawBlackMs;

      const histList = Array.isArray(effectiveGameState.moveHistory)
        ? (effectiveGameState.moveHistory as string[])
        : Array.isArray(effectiveGameState.moveHistorySan)
        ? (effectiveGameState.moveHistorySan as string[])
        : null;

      Promise.resolve().then(() => {
        setFen(incomingFen);
        setActiveTurn(serverTurn);
        tallyCapturedPieces(chessRef.current);
        setWhiteTimeMs(computedWhiteMs);
        setBlackTimeMs(computedBlackMs);

        if (histList) {
          setMoveHistory(histList);
        }
        const lm = effectiveGameState.lastMove as
          | { from?: string; to?: string }
          | undefined;
        if (lm?.from && lm?.to) {
          setLastMoveSquares({ from: lm.from as Square, to: lm.to as Square });
        } else {
          setLastMoveSquares(null);
        }

        if (isIncomingGameOver) {
          const reason = String(
            effectiveGameState.gameOverReason ||
              effectiveGameState.endReason ||
              'Match Complete'
          );
          const winLabel = String(
            effectiveGameState.winnerLabel ||
              effectiveGameState.endReason ||
              'Chess Match Complete'
          );
          setShellState('gameover');
          setGameOverReason(reason);
          setWinnerLabel(winLabel);

          // Record match result once per sessionSeed for this authenticated player
          if (lastRecordedSeedRef.current !== incomingSeed) {
            lastRecordedSeedRef.current = incomingSeed;
            const winnerSide = (effectiveGameState.winnerSide ||
              effectiveGameState.winnerColor) as 'w' | 'b' | 'draw' | null;
            const myOutcome: 'win' | 'loss' | 'draw' =
              winnerSide === 'draw' || !winnerSide
                ? 'draw'
                : winnerSide === myColor
                ? 'win'
                : 'loss';
            if (myOutcome === 'win') soundFX.playFanfare();
            else soundFX.playSuccess();

            const movesCount = histList ? histList.length : 0;
            const baseScore =
              myOutcome === 'win' ? 1200 : myOutcome === 'draw' ? 650 : 300;
            onMatchFinished(myOutcome, baseScore + movesCount * 10, {
              preset: String(effectiveGameState.timeControlLabel || 'Rapid 10+0'),
              moves: movesCount,
              reason,
              finalFen: incomingFen,
              sessionSeed: incomingSeed,
              myColor,
            });
          }
        } else if (activeRoom?.status === 'playing' && shellState !== 'playing') {
          setShellState('playing');
          setGameOverReason(null);
          setWinnerLabel(null);
        }
      });
    } catch {
      // Ignore malformed FEN
    }
  }, [
    effectiveGameState,
    isUnlimited,
    myColor,
    activeRoom?.status,
    shellState,
    tallyCapturedPieces,
    onMatchFinished,
  ]);

  // Send authoritative chess action to backend
  const dispatchAuthoritativeChessAction = useCallback(
    async (payload: {
      actionType:
        | 'move'
        | 'offer_draw'
        | 'respond_draw'
        | 'resign'
        | 'claim_timeout'
        | 'new_game';
      from?: string;
      to?: string;
      promotion?: 'q' | 'r' | 'b' | 'n';
      acceptDraw?: boolean;
      newGameSettings?: Record<string, unknown>;
    }) => {
      if (!activeRoom?.roomCode || !authFetcher) return false;
      setSubmittingAction(true);
      setActionError(null);
      try {
        const res = await authFetcher('/api/arcade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'chess_action',
            roomCode: activeRoom.roomCode,
            ...payload,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setActionError(data.error || 'Illegal move or invalid action.');
          soundFX.playError();
          return false;
        }
        if (data.room && onRoomUpdated) {
          const parsed = parseRoomPayload(data.room);
          onRoomUpdated(parsed);
        }
        return true;
      } catch {
        setActionError('Network error while synchronizing move.');
        soundFX.playError();
        return false;
      } finally {
        setSubmittingAction(false);
      }
    },
    [activeRoom, authFetcher, onRoomUpdated]
  );

  // Dual Chess Clock Ticker (ticks locally between server updates and claims timeout at 0)
  useEffect(() => {
    if (
      shellState !== 'playing' ||
      isUnlimited ||
      !bothHumanPlayersPresent ||
      effectiveGameState.matchStatus === 'gameover'
    ) {
      return;
    }

    const currentSeed = String(effectiveGameState.sessionSeed || '1');
    const timer = setInterval(() => {
      if (activeTurn === 'w') {
        setWhiteTimeMs((prev) => {
          const next = Math.max(0, prev - 100);
          if (next === 0 && timeoutClaimedForSeedRef.current !== currentSeed) {
            timeoutClaimedForSeedRef.current = currentSeed;
            dispatchAuthoritativeChessAction({ actionType: 'claim_timeout' });
          }
          return next;
        });
      } else {
        setBlackTimeMs((prev) => {
          const next = Math.max(0, prev - 100);
          if (next === 0 && timeoutClaimedForSeedRef.current !== currentSeed) {
            timeoutClaimedForSeedRef.current = currentSeed;
            dispatchAuthoritativeChessAction({ actionType: 'claim_timeout' });
          }
          return next;
        });
      }
    }, 100);

    return () => clearInterval(timer);
  }, [
    shellState,
    activeTurn,
    isUnlimited,
    bothHumanPlayersPresent,
    effectiveGameState.matchStatus,
    effectiveGameState.sessionSeed,
    dispatchAuthoritativeChessAction,
  ]);

  async function startNewChessMatch() {
    const initialMs = isCustomMode
      ? computeInitialChessTimeMs({
          minutes: customMinutes,
          extraSeconds: customExtraSeconds,
          incrementSeconds: customIncrementSeconds,
        })
      : computeInitialChessTimeMs(selectedPreset);
    const incSec = isCustomMode
      ? customIncrementSeconds
      : selectedPreset.incrementSeconds;
    const label = isCustomMode
      ? `Custom ${customMinutes}m+${customIncrementSeconds}s`
      : selectedPreset.label;

    if (activeRoom?.roomCode && authFetcher) {
      const ok = await dispatchAuthoritativeChessAction({
        actionType: 'new_game',
        newGameSettings: {
          initialTimeMs: initialMs,
          incrementSeconds: incSec,
          isUnlimited: !isCustomMode && selectedPreset.id === 'unlimited',
          timeControlLabel: label,
          swapColors: true,
        },
      });
      if (ok) {
        setSelectedSquare(null);
        setLegalTargets([]);
        setPendingPromotion(null);
        setShellState('playing');
        soundFX.playSuccess();
      }
      return;
    }

    // Fallback if room sync callback only
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
    setWhiteTimeMs(initialMs);
    setBlackTimeMs(initialMs);
    setShellState('playing');
    soundFX.playSuccess();

    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        chessFen: g.fen(),
        moveHistory: [],
        whiteTimeMs: initialMs,
        blackTimeMs: initialMs,
        matchStatus: 'playing',
      });
    }
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

  function isPawnPromotionMove(game: Chess, from: Square, to: Square): boolean {
    const piece = game.get(from);
    if (!piece || piece.type !== 'p') return false;
    const targetRank = to[1];
    if (piece.color === 'w' && targetRank === '8') return true;
    if (piece.color === 'b' && targetRank === '1') return true;
    return false;
  }

  async function executeMove(
    from: Square,
    to: Square,
    promotionPiece: 'q' | 'r' | 'b' | 'n' = 'q'
  ) {
    if (!bothHumanPlayersPresent) {
      setActionError('Waiting for your partner to join the match before making a move.');
      return false;
    }
    const game = chessRef.current;
    if (game.turn() !== myColor) {
      setActionError("Wait for your partner's move — it is not your turn.");
      soundFX.playError();
      return false;
    }

    // Validate move locally first with chess.js
    const testGame = new Chess(game.fen());
    try {
      const moveObj = testGame.move({ from, to, promotion: promotionPiece });
      if (!moveObj) {
        setActionError('Illegal chess move.');
        soundFX.playError();
        return false;
      }

      // Optimistically update board UI immediately while server validates
      setSelectedSquare(null);
      setLegalTargets([]);
      setPendingPromotion(null);
      setLastMoveSquares({ from, to });

      if (activeRoom?.roomCode && authFetcher) {
        const ok = await dispatchAuthoritativeChessAction({
          actionType: 'move',
          from,
          to,
          promotion: promotionPiece,
        });
        return ok;
      }

      // Fallback if no authFetcher provided
      chessRef.current.move({ from, to, promotion: promotionPiece });
      const nextFen = chessRef.current.fen();
      const nextHistory = [...chessRef.current.history()];
      setFen(nextFen);
      setMoveHistory(nextHistory);
      setActiveTurn(chessRef.current.turn());
      tallyCapturedPieces(chessRef.current);
      if (onSyncRoomGameState) {
        onSyncRoomGameState({
          chessFen: nextFen,
          moveHistory: nextHistory,
          whiteTimeMs,
          blackTimeMs,
        });
      }
      return true;
    } catch {
      setActionError('Illegal move — leaves King in check or violates piece movement.');
      soundFX.playError();
      return false;
    }
  }

  function handleSquareClick(sq: Square) {
    if (
      shellState !== 'playing' ||
      pendingPromotion ||
      submittingAction ||
      !bothHumanPlayersPresent ||
      effectiveGameState.matchStatus === 'gameover'
    ) {
      return;
    }
    const game = chessRef.current;
    const currentTurn = game.turn();

    // Prevent moving during opponent's turn
    if (currentTurn !== myColor) {
      setActionError(
        `It is ${currentTurn === 'w' ? `@${whiteUsername} (White)` : `@${blackUsername} (Black)`}'s turn to move.`
      );
      return;
    }

    setActionError(null);

    if (selectedSquare && legalTargets.includes(sq)) {
      if (isPawnPromotionMove(game, selectedSquare, sq)) {
        const piece = game.get(selectedSquare);
        setPendingPromotion({
          from: selectedSquare,
          to: sq,
          color: piece?.color || myColor,
        });
        return;
      }
      executeMove(selectedSquare, sq, 'q');
      return;
    }

    const pieceOnSq = game.get(sq);
    // Only allow selecting own color pieces
    if (pieceOnSq && pieceOnSq.color === myColor && currentTurn === myColor) {
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

  // Determine top bar (opponent) and bottom bar (me) based on board orientation
  const topSide: 'w' | 'b' = boardFlipped ? 'w' : 'b';
  const bottomSide: 'w' | 'b' = boardFlipped ? 'b' : 'w';

  const getSideProfile = (side: 'w' | 'b') => {
    const isWhite = side === 'w';
    const uid = isWhite ? whiteUid : blackUid;
    const roomP = isWhite ? whitePlayerInRoom : blackPlayerInRoom;
    const username = isWhite ? whiteUsername : blackUsername;
    const avatar =
      roomP?.avatar ||
      String(
        isWhite
          ? effectiveGameState.whiteAvatar || '🦊'
          : effectiveGameState.blackAvatar || '🐼'
      );
    const customPhotoUrl =
      roomP?.customPhotoUrl ||
      String(
        isWhite
          ? effectiveGameState.whiteCustomPhotoUrl || ''
          : effectiveGameState.blackCustomPhotoUrl || ''
      );
    const equippedSkin =
      roomP?.equippedSkin ||
      String(
        isWhite
          ? effectiveGameState.whiteEquippedSkin || ''
          : effectiveGameState.blackEquippedSkin || ''
      );
    const isOnline = roomP ? roomP.isOnline !== false : Boolean(uid);
    const timeMs = isWhite ? whiteTimeMs : blackTimeMs;
    const captures = isWhite ? capturedByWhite : capturedByBlack;
    const matAdvantage = isWhite
      ? materialDiff > 0
        ? materialDiff
        : 0
      : materialDiff < 0
      ? Math.abs(materialDiff)
      : 0;

    return {
      side,
      uid,
      username,
      avatar,
      customPhotoUrl,
      equippedSkin,
      isOnline,
      timeMs,
      captures,
      matAdvantage,
      isMe: currentUser?.uid === uid,
    };
  };

  const topPlayer = getSideProfile(topSide);
  const bottomPlayer = getSideProfile(bottomSide);

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
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold tracking-tight text-stone-100">
                Royal Observatory Chess
              </h2>
              {activeRoom?.roomCode && (
                <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                  Room #{activeRoom.roomCode}
                </span>
              )}
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                You play {myColor === 'w' ? '♔ White' : '♚ Black'}
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Official FIDE Rules · 100% Real Human Duel · Castling · En Passant · Promotion · Live Clocks
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setManualFlipOverride((prev) =>
                prev === null ? !(myColor === 'b') : !prev
              )
            }
            className="flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-950 px-2.5 py-1.5 text-xs text-stone-300 hover:border-amber-500/50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Flip View</span>
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
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-200">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
            <span>Human vs Human Verified</span>
          </span>
        </div>
      </div>

      {/* WAITING FOR HUMAN PARTNER BANNER IF ROOM HAS < 2 PLAYERS */}
      {!bothHumanPlayersPresent && (
        <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-5 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300">
            <Users className="h-5 w-5 animate-pulse" />
          </div>
          <h3 className="mt-2.5 text-base font-bold text-stone-100">
            Waiting for Your Partner (@{partnerName}) to Accept &amp; Enter Room{' '}
            {activeRoom?.roomCode ? `#${activeRoom.roomCode}` : ''}
          </h3>
          <p className="mx-auto mt-1 max-w-lg text-xs text-stone-300">
            Her Little Arcade never uses bots or simulated opponents. As soon as your partner accepts your 1v1 challenge in their Mailbox or Game Setup screen, both boards synchronize and the clock begins!
          </p>
        </div>
      )}

      {/* INCOMING DRAW OFFER BANNER */}
      {drawOfferByUid &&
        currentUser?.uid &&
        drawOfferByUid !== currentUser.uid &&
        shellState === 'playing' && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-amber-400 bg-amber-500/15 px-4 py-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-200">
              <Handshake className="h-4 w-4 text-amber-400" />
              <span>
                @{drawOfferByUsername || partnerName} offered a mutual Draw! Do you accept?
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={submittingAction}
                onClick={() =>
                  dispatchAuthoritativeChessAction({
                    actionType: 'respond_draw',
                    acceptDraw: true,
                  })
                }
                className="rounded-lg bg-emerald-500 px-3 py-1.5 font-bold text-stone-950 hover:bg-emerald-400"
              >
                Accept Draw
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={() =>
                  dispatchAuthoritativeChessAction({
                    actionType: 'respond_draw',
                    acceptDraw: false,
                  })
                }
                className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-1.5 font-semibold text-stone-200 hover:bg-stone-800"
              >
                Decline
              </button>
            </div>
          </div>
        )}

      {/* ACTION ERROR / ILLEGAL MOVE FEEDBACK */}
      {actionError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/50 bg-rose-500/15 px-4 py-2.5 text-xs font-semibold text-rose-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="underline text-rose-300"
          >
            Dismiss
          </button>
        </div>
      )}

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
                Choose from Bullet, Blitz, Rapid, Classical, Unlimited, or build your own custom timer with per-move increments for your live human duel.
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
                <span>Apply Clock &amp; Start Match</span>
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
                    min={1}
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
                <span>Authoritative Server Chess Engine Active</span>
              </div>
              <p className="mt-1 leading-relaxed">
                Every move is validated on both client and server using standard FIDE rules: Castling, En Passant, Promotion (Queen, Rook, Bishop, Knight), Check, Checkmate, Stalemate, Threefold Repetition, and 50-Move Rule.
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
            {/* Top Player (Opponent) Clock & Identity Bar */}
            <div className="mb-3 flex w-full max-w-[464px] items-center justify-between rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <AnimatedSkinnedAvatar
                  avatarId={topPlayer.avatar}
                  customPhotoUrl={topPlayer.customPhotoUrl || undefined}
                  skinId={topPlayer.equippedSkin || undefined}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-stone-100">
                    <span className="truncate">@{topPlayer.username}</span>
                    <span className="rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-300">
                      {topPlayer.side === 'w' ? '♔ White' : '♚ Black'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        topPlayer.isOnline
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {topPlayer.isOnline ? (
                        <>
                          <Wifi className="h-2.5 w-2.5" />
                          <span>Online</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-2.5 w-2.5" />
                          <span>Reconnecting...</span>
                        </>
                      )}
                    </span>
                    {topPlayer.matAdvantage > 0 && (
                      <span className="rounded bg-teal-500/20 px-1.5 py-0.5 font-mono text-[10px] text-teal-300">
                        +{topPlayer.matAdvantage}
                      </span>
                    )}
                  </div>
                  <div className="min-h-[16px] text-xs text-amber-300 truncate">
                    {topPlayer.captures.join(' ') || 'No captures yet'}
                  </div>
                </div>
              </div>
              <div
                aria-label={`${topPlayer.side === 'w' ? 'White' : 'Black'} Clock`}
                className={`rounded-lg px-3 py-1 font-mono text-base font-bold tabular-nums shrink-0 ${
                  activeTurn === topPlayer.side
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-900 text-stone-300'
                }`}
              >
                {formatChessClock(topPlayer.timeMs, isUnlimited)}
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
                      Choose which piece your pawn becomes on the promotion rank:
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

            {/* Bottom Player (Me) Clock & Identity Bar */}
            <div className="mt-3 flex w-full max-w-[464px] items-center justify-between rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <AnimatedSkinnedAvatar
                  avatarId={bottomPlayer.avatar}
                  customPhotoUrl={bottomPlayer.customPhotoUrl || undefined}
                  skinId={bottomPlayer.equippedSkin || undefined}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-stone-100">
                    <span className="truncate">@{bottomPlayer.username}</span>
                    <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                      {bottomPlayer.side === 'w' ? '♔ White' : '♚ Black'}
                      {bottomPlayer.isMe ? ' · You' : ''}
                    </span>
                    {bottomPlayer.matAdvantage > 0 && (
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                        +{bottomPlayer.matAdvantage}
                      </span>
                    )}
                  </div>
                  <div className="min-h-[16px] text-xs text-amber-300 truncate">
                    {bottomPlayer.captures.join(' ') || 'No captures yet'}
                  </div>
                </div>
              </div>
              <div
                aria-label={`${bottomPlayer.side === 'w' ? 'White' : 'Black'} Clock`}
                className={`rounded-lg px-3 py-1 font-mono text-base font-bold tabular-nums shrink-0 ${
                  activeTurn === bottomPlayer.side
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-900 text-stone-300'
                }`}
              >
                {formatChessClock(bottomPlayer.timeMs, isUnlimited)}
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
                      ? 'bg-rose-500/20 text-rose-300 animate-pulse'
                      : activeTurn === myColor
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-stone-900 text-amber-300'
                  }`}
                >
                  {inCheckNow
                    ? `CHECK! (${activeTurn === 'w' ? 'White' : 'Black'} King under attack)`
                    : activeTurn === myColor
                    ? `Your Turn (${myColor === 'w' ? 'White' : 'Black'})`
                    : `Waiting for @${activeTurn === 'w' ? whiteUsername : blackUsername}`}
                </span>
              </div>

              {/* Algebraic Move Pairs */}
              <div className="mt-3 h-56 overflow-y-auto rounded-xl border border-stone-900 bg-stone-900/50 p-3 font-mono text-xs tabular-nums">
                {moveHistory.length === 0 ? (
                  <p className="text-stone-400">
                    {activeTurn === myColor
                      ? `It is your turn (${myColor === 'w' ? 'White' : 'Black'}). Click one of your pieces to highlight all legal squares.`
                      : `Waiting for @${whiteUsername} (White) to make the opening move...`}
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
                  disabled={
                    submittingAction ||
                    !bothHumanPlayersPresent ||
                    Boolean(drawOfferByUid)
                  }
                  onClick={() =>
                    dispatchAuthoritativeChessAction({ actionType: 'offer_draw' })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs font-medium text-stone-200 hover:border-amber-500/50 disabled:opacity-45 whitespace-nowrap shrink-0"
                >
                  <Handshake className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    {drawOfferByUid === currentUser?.uid ? 'Draw Offered' : 'Offer Draw'}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={submittingAction || !bothHumanPlayersPresent}
                  onClick={() =>
                    dispatchAuthoritativeChessAction({ actionType: 'resign' })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs font-medium text-rose-300 hover:border-rose-500/50 disabled:opacity-45 whitespace-nowrap shrink-0"
                >
                  <Flag className="h-3.5 w-3.5" />
                  <span>Resign</span>
                </button>
                <button
                  type="button"
                  disabled={submittingAction || !bothHumanPlayersPresent}
                  onClick={startNewChessMatch}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-xs font-medium text-stone-200 hover:bg-stone-800 disabled:opacity-45 whitespace-nowrap shrink-0"
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
                Configure Next Match Clock (
                {String(effectiveGameState.timeControlLabel || selectedPreset.label)})
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
              Outcome Reason: {gameOverReason} · Total Half-Moves: {moveHistory.length}
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
                disabled={submittingAction}
                onClick={startNewChessMatch}
                className="flex-1 rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
              >
                Play Rematch (Swap Colors)
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
