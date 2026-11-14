'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MULTIPLAYER_GAMES,
  KEEPSAKE_PICNIC_IMAGE,
  TREASURE_MAP_IMAGE,
} from '@/src/lib/arcade-data';
import {
  TicTacToeCell,
  checkTicTacToeWinner,
  ConnectFourCell,
  dropConnectFourDisc,
  checkConnectFourWinnerWithLine,
  scoreWordBattleSubmission,
} from '@/src/lib/game-rules';
import {
  generateFreshGameSeed,
  seededShuffle,
  getRandomStartingTurnSymbol,
  getRandomStartingPlayerNumber,
  generateBattleshipFleet,
  generateWordBattleRack,
  generateHigherLowerStartingCard,
  generateMazeKeyPositions,
  generateJigsawTileOrder,
  generateTreasureRelicCoords,
} from '@/src/lib/game-randomizer';
import { PersonalizedItemRecord } from './SinglePlayerGames';
import { soundFX } from '@/src/lib/sound';
import { AnimatedSkinnedAvatar } from './CosmeticAvatarAndBanner';
import { MultiplayerRoomState, RoomCoupleTeam } from './VoiceAndLobbyDock';
import {
  ArrowLeft,
  Play,
  Eraser,
  Compass,
  UtensilsCrossed,
  Flame,
  Music,
  Shield,
  Crosshair,
  Sparkles,
  Shuffle,
  Users,
  Wifi,
  WifiOff,
  ShieldCheck,
} from 'lucide-react';

interface MultiplayerGamesProps {
  gameId: string;
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
  roomMode?: '1v1' | '2v2';
  roomTeams?: RoomCoupleTeam[];
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  autostart?: boolean;
  personalizedItems: PersonalizedItemRecord[];
  onBackToArcade: () => void;
  onMatchFinished: (
    gameId: string,
    mode: string,
    result: 'win' | 'loss' | 'draw' | 'completed',
    score: number,
    xpEarned: number,
    coinsEarned: number,
    details?: Record<string, unknown>
  ) => void;
}

export function MultiplayerGameArena({
  gameId,
  playerName,
  partnerName,
  currentUser,
  activeRoom,
  roomMode = '1v1',
  roomTeams = [],
  roomGameState,
  onSyncRoomGameState,
  autostart = false,
  personalizedItems,
  onBackToArcade,
  onMatchFinished,
}: MultiplayerGamesProps) {
  const gameDef =
    MULTIPLAYER_GAMES.find((g) => g.id === gameId) || MULTIPLAYER_GAMES[0];

  const effectiveRoomState = (activeRoom?.gameState || roomGameState || {}) as Record<
    string,
    unknown
  >;

  const [shellState, setShellState] = useState<'title' | 'playing' | 'gameover'>(
    autostart || activeRoom?.status === 'playing' ? 'playing' : 'title'
  );
  const [selectedMatchMode, setSelectedMatchMode] = useState<'1v1' | '2v2'>(
    gameDef.supports2v2 && (activeRoom?.mode === '2v2' || roomMode === '2v2')
      ? '2v2'
      : '1v1'
  );
  const effectiveMode: '1v1' | '2v2' =
    gameDef.supports2v2 && (activeRoom?.mode === '2v2' || selectedMatchMode === '2v2')
      ? '2v2'
      : '1v1';

  const [score, setScore] = useState<number>(0);
  const [partnerScore, setPartnerScore] = useState<number>(0);
  const [localSeed, setLocalSeed] = useState<number>(208411);
  const [lastResult, setLastResult] = useState<'win' | 'loss' | 'draw' | 'completed'>('win');
  const [outcomeText, setOutcomeText] = useState<string>('Match Complete!');
  const [musicActive, setMusicActive] = useState<boolean>(soundFX.musicEnabled);

  const lastRecordedSeedRef = useRef<string>('');

  const sessionSeed = Number(effectiveRoomState.sessionSeed || localSeed);

  const roomPlayers = activeRoom?.players || [];
  const effectiveTeams = activeRoom?.teams?.length ? activeRoom.teams : roomTeams;

  // Determine human slots (Slot 1 vs Slot 2)
  const slot1Player =
    roomPlayers.find((p) => p.uid === activeRoom?.hostUid) || roomPlayers[0] || null;
  const slot2Player =
    roomPlayers.find((p) => p.uid !== slot1Player?.uid) || roomPlayers[1] || null;

  const mySlot: 1 | 2 = (() => {
    if (!currentUser?.uid) return 1;
    if (effectiveMode === '2v2' && effectiveTeams.length >= 2) {
      if (effectiveTeams[1]?.members?.some((m) => m.uid === currentUser.uid)) {
        return 2;
      }
      return 1;
    }
    if (slot2Player?.uid === currentUser.uid) return 2;
    return 1;
  })();

  const minHumanPlayersRequired = effectiveMode === '2v2' ? 4 : 2;
  const allHumanPlayersJoined = roomPlayers.length >= minHumanPlayersRequired;

  const slot1Label =
    effectiveMode === '2v2'
      ? effectiveTeams[0]?.coupleName || `${playerName} & ${partnerName}`
      : slot1Player?.username
      ? `@${slot1Player.username}`
      : `@${playerName}`;

  const slot2Label =
    effectiveMode === '2v2'
      ? effectiveTeams[1]?.coupleName || 'Opponent Couple'
      : slot2Player?.username
      ? `@${slot2Player.username}`
      : `@${partnerName}`;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = shellState;
    }
  }, [shellState]);

  // Synchronize live scores and shared gameover state across all connected human players
  useEffect(() => {
    const s1 =
      typeof effectiveRoomState.p1Score === 'number'
        ? effectiveRoomState.p1Score
        : null;
    const s2 =
      typeof effectiveRoomState.p2Score === 'number'
        ? effectiveRoomState.p2Score
        : null;
    if (s1 !== null || s2 !== null) {
      Promise.resolve().then(() => {
        if (s1 !== null) setScore(mySlot === 1 ? s1 : s2 ?? 0);
        if (s2 !== null) setPartnerScore(mySlot === 1 ? s2 : s1 ?? 0);
      });
    }

    const incomingOutcome = effectiveRoomState.matchOutcome as
      | {
          seed?: number;
          winnerSlot?: 1 | 2 | 'draw' | 'coop';
          p1Score?: number;
          p2Score?: number;
          summaryText?: string;
        }
      | undefined;

    if (
      incomingOutcome &&
      Number(incomingOutcome.seed) === sessionSeed &&
      lastRecordedSeedRef.current !== `${gameDef.id}:${sessionSeed}`
    ) {
      lastRecordedSeedRef.current = `${gameDef.id}:${sessionSeed}`;
      const myRes: 'win' | 'loss' | 'draw' | 'completed' =
        incomingOutcome.winnerSlot === 'coop'
          ? 'completed'
          : incomingOutcome.winnerSlot === 'draw'
          ? 'draw'
          : incomingOutcome.winnerSlot === mySlot
          ? 'win'
          : 'loss';

      const myFinalScore =
        mySlot === 1
          ? Number(incomingOutcome.p1Score ?? score)
          : Number(incomingOutcome.p2Score ?? partnerScore);
      const summary = String(incomingOutcome.summaryText || 'Match Complete!');

      Promise.resolve().then(() => {
        setScore(myFinalScore);
        setLastResult(myRes);
        setOutcomeText(summary);
        setShellState('gameover');
        soundFX.playFanfare();

        const recordedMode =
          effectiveMode === '2v2'
            ? '2v2_couple'
            : gameDef.category === 'cooperative'
            ? 'cooperative'
            : '1v1';
        const earnedXp =
          effectiveMode === '2v2' ? gameDef.xpReward + 10 : gameDef.xpReward;
        const earnedCoins =
          effectiveMode === '2v2'
            ? myRes === 'win' || myRes === 'completed'
              ? 25
              : myRes === 'draw'
              ? 12
              : 8
            : 0;

        onMatchFinished(
          gameDef.id,
          recordedMode,
          myRes,
          myFinalScore,
          earnedXp,
          earnedCoins,
          {
            sessionSeed,
            matchMode: effectiveMode,
            team1: slot1Label,
            team2: slot2Label,
            team1Score: incomingOutcome.p1Score ?? 0,
            team2Score: incomingOutcome.p2Score ?? 0,
          }
        );
      });
    } else if (
      !incomingOutcome &&
      shellState === 'gameover' &&
      activeRoom?.status === 'playing'
    ) {
      Promise.resolve().then(() => {
        setShellState('playing');
      });
    }
  }, [
    effectiveRoomState,
    sessionSeed,
    mySlot,
    gameDef.id,
    gameDef.category,
    gameDef.xpReward,
    effectiveMode,
    slot1Label,
    slot2Label,
    score,
    partnerScore,
    shellState,
    activeRoom?.status,
    onMatchFinished,
  ]);

  function handleSyncScores(slot1Pts: number, slot2Pts: number) {
    setScore(mySlot === 1 ? slot1Pts : slot2Pts);
    setPartnerScore(mySlot === 1 ? slot2Pts : slot1Pts);
    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        p1Score: slot1Pts,
        p2Score: slot2Pts,
      });
    }
  }

  function finishMatch(
    resultFromCallerPerspective: 'win' | 'loss' | 'draw' | 'completed',
    finalScore: number,
    summaryText: string,
    details?: Record<string, unknown>
  ) {
    const winnerSlot: 1 | 2 | 'draw' | 'coop' =
      resultFromCallerPerspective === 'completed'
        ? 'coop'
        : resultFromCallerPerspective === 'draw'
        ? 'draw'
        : resultFromCallerPerspective === 'win'
        ? mySlot
        : mySlot === 1
        ? 2
        : 1;

    const p1Final =
      mySlot === 1 ? finalScore : Number(details?.opponentScore ?? partnerScore);
    const p2Final =
      mySlot === 2 ? finalScore : Number(details?.opponentScore ?? partnerScore);

    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        p1Score: p1Final,
        p2Score: p2Final,
        matchOutcome: {
          seed: sessionSeed,
          winnerSlot,
          p1Score: p1Final,
          p2Score: p2Final,
          summaryText,
        },
      });
    }

    if (lastRecordedSeedRef.current === `${gameDef.id}:${sessionSeed}`) {
      return;
    }
    lastRecordedSeedRef.current = `${gameDef.id}:${sessionSeed}`;

    setScore(finalScore);
    setLastResult(resultFromCallerPerspective);
    setOutcomeText(summaryText);
    setShellState('gameover');
    soundFX.playFanfare();

    const recordedMode =
      effectiveMode === '2v2'
        ? '2v2_couple'
        : gameDef.category === 'cooperative'
        ? 'cooperative'
        : '1v1';
    const earnedXp =
      effectiveMode === '2v2' ? gameDef.xpReward + 10 : gameDef.xpReward;
    const earnedCoins =
      effectiveMode === '2v2'
        ? resultFromCallerPerspective === 'win' ||
          resultFromCallerPerspective === 'completed'
          ? 25
          : resultFromCallerPerspective === 'draw'
          ? 12
          : 8
        : 0;
    onMatchFinished(
      gameDef.id,
      recordedMode,
      resultFromCallerPerspective,
      finalScore,
      earnedXp,
      earnedCoins,
      {
        ...details,
        sessionSeed,
        matchMode: effectiveMode,
        team1: slot1Label,
        team2: slot2Label,
        team1Score: p1Final,
        team2Score: p2Final,
      }
    );
  }

  function triggerFreshSession() {
    const freshSeed = generateFreshGameSeed();
    setLocalSeed(freshSeed);
    setScore(0);
    setPartnerScore(0);
    setShellState('playing');
    soundFX.playSuccess();
    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        sessionSeed: freshSeed,
        p1Score: 0,
        p2Score: 0,
        matchOutcome: null,
        tttBoard: null,
        tttTurn: null,
        c4Grid: null,
        c4Turn: null,
        bsFleets: null,
        bsShots: null,
        bsTurn: null,
        dgStrokes: [],
        dgPromptIdx: 0,
        qbQuestionIdx: 0,
        wbFoundWords: [],
        rrTimesBySlot: {},
        todCardIdx: 0,
        todCompletedCount: 0,
        holCurrentVal: null,
        holHistory: null,
        mazePos: [0, 0],
        mazeGateUnlocked: false,
        cookStepIdx: 0,
        cookDishesServed: 0,
        jigsawTiles: null,
        treasureDug: {},
      });
    }
  }

  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-stone-800 bg-stone-900 p-5 text-stone-100">
      {/* Unified Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToArcade}
            className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-amber-500/50 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Arcade Hub</span>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold tracking-tight text-stone-100">
                {gameDef.title}
              </h2>
              {activeRoom?.roomCode && (
                <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-300">
                  Room #{activeRoom.roomCode}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-md border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 text-[10px] font-bold text-teal-200">
                <ShieldCheck className="h-3 w-3 text-teal-400" />
                <span>Human Multiplayer · Zero Bots</span>
              </span>
            </div>
            <p className="text-xs text-stone-400">
              {effectiveMode === '2v2' ? '2v2 Couple Mode' : '1v1 Partner Duel'} ·{' '}
              {gameDef.category} · {slot1Label} vs {slot2Label}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-3 rounded-xl border border-stone-800 bg-stone-950 px-3.5 py-1.5 font-mono text-xs tabular-nums">
            <span>
              You ({mySlot === 1 ? slot1Label : slot2Label}):{' '}
              <strong className="text-amber-300">{score}</strong>
            </span>
            <span aria-hidden="true" className="text-stone-700">
              ·
            </span>
            <span>
              {mySlot === 1 ? slot2Label : slot1Label}:{' '}
              <strong className="text-teal-300">{partnerScore}</strong>
            </span>
          </div>

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
            <span>{musicActive ? 'BGM ON' : 'BGM OFF'}</span>
          </button>
        </div>
      </div>

      {/* LIVE HUMAN PARTICIPANTS STRIP (1v1 or 2v2) */}
      {effectiveMode === '1v1' ? (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-stone-800 bg-stone-950/90 p-3 text-xs sm:grid-cols-2">
          {[
            { slot: 1 as const, player: slot1Player, fallbackName: playerName },
            { slot: 2 as const, player: slot2Player, fallbackName: partnerName },
          ].map(({ slot, player, fallbackName }) => {
            const isOnline = player ? player.isOnline !== false : false;
            return (
              <div
                key={slot}
                className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900 px-3 py-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AnimatedSkinnedAvatar
                    avatarId={player?.avatar || (slot === 1 ? '🦊' : '🐼')}
                    customPhotoUrl={player?.customPhotoUrl}
                    skinId={player?.equippedSkin}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-stone-100 truncate">
                        @{player?.username || fallbackName}
                      </span>
                      {mySlot === slot && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                          You (Slot {slot})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-stone-400">
                      {player ? (
                        isOnline ? (
                          <span className="inline-flex items-center gap-1 text-emerald-300">
                            <Wifi className="h-3 w-3" /> Online in Room
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-300">
                            <WifiOff className="h-3 w-3" /> Disconnected · Reconnecting...
                          </span>
                        )
                      ) : (
                        <span className="text-amber-300">
                          Waiting for human player to accept invite...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="font-mono text-sm font-bold text-amber-300 tabular-nums">
                  {mySlot === slot ? score : partnerScore} pts
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-rose-500/30 bg-stone-950/90 p-3 text-xs sm:grid-cols-2">
          {[0, 1].map((tIdx) => {
            const team = effectiveTeams[tIdx];
            const slotNum = (tIdx + 1) as 1 | 2;
            return (
              <div
                key={tIdx}
                className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900 px-3 py-2"
              >
                <div className="min-w-0">
                  <div
                    className={`text-[11px] font-semibold ${
                      tIdx === 0 ? 'text-amber-300' : 'text-teal-300'
                    }`}
                  >
                    Couple Team {slotNum} {mySlot === slotNum ? '· Your Couple' : ''}
                  </div>
                  <div className="font-bold text-stone-100 truncate">
                    {team?.coupleName || (tIdx === 0 ? slot1Label : slot2Label)}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-stone-300">
                    {team?.members?.length ? (
                      team.members.map((m) => (
                        <span
                          key={m.uid}
                          className="inline-flex items-center gap-1 rounded bg-stone-950 px-2 py-0.5"
                        >
                          <span>@{m.username}</span>
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              m.isOnline !== false ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                          />
                        </span>
                      ))
                    ) : (
                      <span className="text-stone-400">Waiting for paired couple...</span>
                    )}
                  </div>
                </div>
                <div
                  className={`font-mono text-base font-bold tabular-nums ${
                    tIdx === 0 ? 'text-amber-300' : 'text-teal-300'
                  }`}
                >
                  {mySlot === slotNum ? score : partnerScore} pts
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WAITING FOR HUMAN PLAYERS GATE (NO BOTS ALLOWED) */}
      {!allHumanPlayersJoined && (
        <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-5 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
            <Users className="h-5 w-5 animate-pulse" />
          </div>
          <h3 className="mt-2 text-base font-bold text-stone-100">
            Waiting for Human Players ({roomPlayers.length}/{minHumanPlayersRequired}{' '}
            Joined)
          </h3>
          <p className="mx-auto mt-1 max-w-lg text-xs text-stone-300">
            No bots or simulated opponents are ever used. As soon as your partner{' '}
            {effectiveMode === '2v2' ? 'and opponent couple ' : ''}accepts the invitation and enters Room{' '}
            {activeRoom?.roomCode ? `#${activeRoom.roomCode}` : ''}, live synchronized gameplay unlocks automatically!
          </p>
        </div>
      )}

      {/* TITLE STAGE */}
      {shellState === 'title' && (
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center py-6 text-center">
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-stone-100">
            {gameDef.title}
          </h3>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-400">
            {gameDef.rulesSummary}
          </p>

          <button
            type="button"
            data-start="true"
            disabled={!allHumanPlayersJoined}
            onClick={triggerFreshSession}
            className="mt-6 flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3 text-sm font-bold text-stone-950 transition-colors hover:bg-amber-400 disabled:opacity-45 whitespace-nowrap shrink-0"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>
              {allHumanPlayersJoined
                ? `Start ${effectiveMode === '2v2' ? '2v2 Couple Match' : '1v1 Human Duel'}`
                : `Waiting for Human Opponent (${roomPlayers.length}/${minHumanPlayersRequired})...`}
            </span>
          </button>
        </div>
      )}

      {/* ACTIVE GAMEPLAY ROUTER */}
      {shellState !== 'title' && (
        <div className="min-h-[420px]">
          {gameDef.id === 'tic-tac-toe' && (
            <TicTacToeDuel
              key={`ttt-${sessionSeed}`}
              sessionSeed={sessionSeed}
              mySlot={mySlot}
              slot1Label={slot1Label}
              slot2Label={slot2Label}
              allHumanPlayersJoined={allHumanPlayersJoined}
              roomGameState={effectiveRoomState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={handleSyncScores}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'connect-four' && (
            <ConnectFourDuel
              key={`c4-${sessionSeed}`}
              sessionSeed={sessionSeed}
              mySlot={mySlot}
              slot1Label={slot1Label}
              slot2Label={slot2Label}
              allHumanPlayersJoined={allHumanPlayersJoined}
              roomGameState={effectiveRoomState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={handleSyncScores}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'battleship' && (
            <BattleshipDuel
              key={`battleship-${sessionSeed}`}
              sessionSeed={sessionSeed}
              mySlot={mySlot}
              slot1Label={slot1Label}
              slot2Label={slot2Label}
              allHumanPlayersJoined={allHumanPlayersJoined}
              roomGameState={effectiveRoomState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={handleSyncScores}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'draw-and-guess' && (
            <DrawAndGuessParty
              key={`draw-${sessionSeed}`}
              sessionSeed={sessionSeed}
              mySlot={mySlot}
              slot1Label={slot1Label}
              slot2Label={slot2Label}
              roomGameState={effectiveRoomState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={handleSyncScores}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'quiz-battle' && (
            <QuizBattleDuel
              key={`quiz-${sessionSeed}`}
              sessionSeed={sessionSeed}
              mySlot={mySlot}
              slot1Label={slot1Label}
              slot2Label={slot2Label}
              personalizedItems={personalizedItems}
              roomGameState={effectiveRoomState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={handleSyncScores}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'word-battle' && (
            <WordBattleDuel
              key={`word-${sessionSeed}`}
              sessionSeed={sessionSeed}
              mySlot={mySlot}
              playerName={currentUser?.username || playerName}
              roomGameState={effectiveRoomState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={handleSyncScores}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'reaction-race' && (
            <ReactionRaceDuel
              key={`reaction-${sessionSeed}`}
              sessionSeed={sessionSeed}
              mySlot={mySlot}
              slot1Label={slot1Label}
              slot2Label={slot2Label}
              roomGameState={effectiveRoomState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={handleSyncScores}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'truth-or-dare' && (
            <TruthOrDareParty
              key={`tod-${sessionSeed}`}
              sessionSeed={sessionSeed}
              slot1Label={slot1Label}
              slot2Label={slot2Label}
              personalizedItems={personalizedItems}
              roomGameState={effectiveRoomState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={handleSyncScores}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'higher-or-lower' && (
            <HigherOrLowerDuel
              key={`hol-${sessionSeed}`}
              sessionSeed={sessionSeed}
              mySlot={mySlot}
              slot1Label={slot1Label}
              slot2Label={slot2Label}
              roomGameState={effectiveRoomState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={handleSyncScores}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'escape-the-maze' && (
            <EscapeTheMazeCoop
              key={`maze-${sessionSeed}`}
              sessionSeed={sessionSeed}
              roomGameState={effectiveRoomState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={handleSyncScores}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'cooking-together' && (
            <CookingTogetherCoop
              key={`cooking-${sessionSeed}`}
              sessionSeed={sessionSeed}
              roomGameState={effectiveRoomState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={handleSyncScores}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'jigsaw-puzzle' && (
            <JigsawPuzzleCoop
              key={`jigsaw-${sessionSeed}`}
              sessionSeed={sessionSeed}
              roomGameState={effectiveRoomState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={handleSyncScores}
              onFinish={finishMatch}
            />
          )}
          {gameDef.id === 'treasure-hunt' && (
            <TreasureHuntCoop
              key={`treasure-${sessionSeed}`}
              sessionSeed={sessionSeed}
              roomGameState={effectiveRoomState}
              onSyncRoomGameState={onSyncRoomGameState}
              onScores={handleSyncScores}
              onFinish={finishMatch}
            />
          )}
        </div>
      )}

      {/* GAMEOVER MODAL */}
      {shellState === 'gameover' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-900 p-6 text-center shadow-2xl">
            <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-2xl font-bold text-amber-300">{outcomeText}</h3>
            <p className="mt-1 text-xs text-stone-400">{gameDef.title}</p>
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-stone-800 bg-stone-950 p-3 font-mono text-xs tabular-nums sm:grid-cols-4">
              <div>
                <div className="text-stone-500">SCORE</div>
                <div className="mt-1 text-base font-bold text-stone-100">{score}</div>
              </div>
              <div>
                <div className="text-stone-500">XP EARNED</div>
                <div className="mt-1 text-base font-bold text-amber-400">
                  +{effectiveMode === '2v2' ? gameDef.xpReward + 10 : gameDef.xpReward}
                </div>
              </div>
              <div>
                <div className="text-stone-500">2v2 COINS</div>
                <div className="mt-1 text-xs font-bold text-teal-400">
                  {effectiveMode === '2v2'
                    ? lastResult === 'win' || lastResult === 'completed'
                      ? '+25 Coins'
                      : lastResult === 'draw'
                      ? '+12 Coins'
                      : '+8 Coins'
                    : '0 (2v2 Only)'}
                </div>
              </div>
              <div>
                <div className="text-stone-500">TROPHIES</div>
                <div className="mt-1 text-xs font-bold text-rose-300">
                  {effectiveMode === '2v2'
                    ? lastResult === 'win' || lastResult === 'completed'
                      ? '+30 🏆'
                      : lastResult === 'draw'
                      ? '+6 🏆'
                      : '-15 🏆'
                    : '0 (2v2 Only)'}
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={triggerFreshSession}
                className="flex-1 rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
              >
                Rematch Together (Fresh Board)
              </button>
              <button
                type="button"
                onClick={onBackToArcade}
                className="flex-1 rounded-lg border border-stone-700 bg-stone-800 py-2.5 text-xs font-semibold text-stone-200 hover:bg-stone-700"
              >
                Arcade Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   1. TIC-TAC-TOE (100% Human Turn Enforcement & Real-Time Room Sync)
   ============================================================================ */
function TicTacToeDuel({
  sessionSeed,
  mySlot,
  slot1Label,
  slot2Label,
  allHumanPlayersJoined,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  mySlot: 1 | 2;
  slot1Label: string;
  slot2Label: string;
  allHumanPlayersJoined: boolean;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (
    res: 'win' | 'loss' | 'draw',
    score: number,
    text: string,
    details?: Record<string, unknown>
  ) => void;
}) {
  const mySymbol: 'X' | 'O' = mySlot === 1 ? 'X' : 'O';
  const [board, setBoard] = useState<TicTacToeCell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>(() =>
    getRandomStartingTurnSymbol(sessionSeed)
  );
  const [winningLine, setWinningLine] = useState<number[] | null>(null);

  useEffect(() => {
    if (Array.isArray(roomGameState?.tttBoard) && roomGameState.tttBoard.length === 9) {
      const incomingBoard = roomGameState.tttBoard as TicTacToeCell[];
      const check = checkTicTacToeWinner(incomingBoard);
      Promise.resolve().then(() => {
        setBoard(incomingBoard);
        if (roomGameState.tttTurn === 'X' || roomGameState.tttTurn === 'O') {
          setTurn(roomGameState.tttTurn);
        }
        if (check.line) setWinningLine(check.line);
      });
    }
  }, [roomGameState]);

  function handleSquare(idx: number) {
    if (!allHumanPlayersJoined) return;
    if (turn !== mySymbol) return;
    if (board[idx]) return;
    const check = checkTicTacToeWinner(board);
    if (check.winner) return;

    const next = [...board];
    next[idx] = mySymbol;
    const nextTurn: 'X' | 'O' = mySymbol === 'X' ? 'O' : 'X';
    setBoard(next);
    setTurn(nextTurn);
    soundFX.playMove();

    const afterMove = checkTicTacToeWinner(next);
    if (afterMove.winner) {
      setWinningLine(afterMove.line);
      if (afterMove.winner === 'draw') {
        onScores(200, 200);
        if (onSyncRoomGameState) {
          onSyncRoomGameState({ tttBoard: next, tttTurn: nextTurn });
        }
        setTimeout(
          () => onFinish('draw', 200, 'Tic-Tac-Toe Draw!', { opponentScore: 200 }),
          300
        );
      } else {
        const winnerIsSlot1 = afterMove.winner === 'X';
        const s1 = winnerIsSlot1 ? 300 : 100;
        const s2 = winnerIsSlot1 ? 100 : 300;
        onScores(s1, s2);
        if (onSyncRoomGameState) {
          onSyncRoomGameState({ tttBoard: next, tttTurn: nextTurn });
        }
        const winnerName = winnerIsSlot1 ? slot1Label : slot2Label;
        setTimeout(
          () =>
            onFinish('win', 300, `${winnerName} Wins Tic-Tac-Toe!`, {
              opponentScore: 100,
            }),
          300
        );
      }
      return;
    }

    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        tttBoard: next,
        tttTurn: nextTurn,
      });
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between rounded-xl border border-stone-800 bg-stone-950 px-4 py-2 text-xs text-stone-300">
        <span>
          Your Symbol:{' '}
          <strong className={mySymbol === 'X' ? 'text-amber-300' : 'text-teal-300'}>
            {mySymbol} ({mySlot === 1 ? slot1Label : slot2Label})
          </strong>
        </span>
        <span>
          Turn:{' '}
          <strong className={turn === mySymbol ? 'text-emerald-300' : 'text-amber-300'}>
            {turn === mySymbol
              ? 'Your Turn to Mark!'
              : `Waiting for ${turn === 'X' ? slot1Label : slot2Label} (${turn})`}
          </strong>
        </span>
      </div>

      <div className="grid aspect-square w-full max-w-[330px] grid-cols-3 gap-3 rounded-2xl border-2 border-stone-700 bg-stone-950 p-4 shadow-xl">
        {board.map((val, idx) => {
          const isWinCell = winningLine?.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              disabled={!allHumanPlayersJoined || turn !== mySymbol || Boolean(val)}
              onClick={() => handleSquare(idx)}
              aria-label={`Tic Tac Toe Square ${idx + 1} ${val || 'Empty'}`}
              className={`flex aspect-square items-center justify-center rounded-xl border text-4xl font-bold transition-all ${
                isWinCell
                  ? 'border-emerald-400 bg-emerald-500/25 scale-105 shadow-lg'
                  : 'border-stone-800 bg-stone-900 hover:border-amber-500/60 disabled:cursor-not-allowed'
              }`}
            >
              <span className={val === 'X' ? 'text-amber-400' : 'text-teal-400'}>
                {val || ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
   2. CONNECT FOUR (100% Human Turn Enforcement & Real-Time Room Sync)
   ============================================================================ */
function ConnectFourDuel({
  sessionSeed,
  mySlot,
  slot1Label,
  slot2Label,
  allHumanPlayersJoined,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  mySlot: 1 | 2;
  slot1Label: string;
  slot2Label: string;
  allHumanPlayersJoined: boolean;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (
    res: 'win' | 'loss' | 'draw',
    score: number,
    text: string,
    details?: Record<string, unknown>
  ) => void;
}) {
  const [grid, setGrid] = useState<ConnectFourCell[][]>(() =>
    Array.from({ length: 6 }, () => Array(7).fill(0))
  );
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [lastPlaced, setLastPlaced] = useState<[number, number] | null>(null);
  const [winCells, setWinCells] = useState<[number, number][] | null>(null);
  const [turn, setTurn] = useState<1 | 2>(() =>
    getRandomStartingPlayerNumber(sessionSeed)
  );

  useEffect(() => {
    if (Array.isArray(roomGameState?.c4Grid) && roomGameState.c4Grid.length === 6) {
      const nextGrid = roomGameState.c4Grid as ConnectFourCell[][];
      const res = checkConnectFourWinnerWithLine(nextGrid);
      Promise.resolve().then(() => {
        setGrid(nextGrid);
        if (roomGameState.c4Turn === 1 || roomGameState.c4Turn === 2) {
          setTurn(roomGameState.c4Turn);
        }
        if (Array.isArray(roomGameState.c4LastPlaced)) {
          setLastPlaced(roomGameState.c4LastPlaced as [number, number]);
        }
        if (res.line) setWinCells(res.line);
      });
    }
  }, [roomGameState]);

  function handleColumnDrop(col: number) {
    if (!allHumanPlayersJoined || winCells || turn !== mySlot) return;
    const step = dropConnectFourDisc(grid, col, mySlot);
    if (!step) return;

    const nextTurn: 1 | 2 = mySlot === 1 ? 2 : 1;
    setGrid(step.nextGrid);
    setLastPlaced([step.placedRow, col]);
    setTurn(nextTurn);
    soundFX.playDrop();

    const res = checkConnectFourWinnerWithLine(step.nextGrid);
    if (res.winner) {
      setWinCells(res.line);
      if (onSyncRoomGameState) {
        onSyncRoomGameState({
          c4Grid: step.nextGrid,
          c4Turn: nextTurn,
          c4LastPlaced: [step.placedRow, col],
        });
      }
      if (res.winner === 'draw') {
        onScores(250, 250);
        setTimeout(
          () =>
            onFinish('draw', 250, 'Connect Four Grid Full — Draw!', {
              opponentScore: 250,
            }),
          350
        );
      } else {
        const s1 = res.winner === 1 ? 450 : 150;
        const s2 = res.winner === 2 ? 450 : 150;
        onScores(s1, s2);
        const winnerName = res.winner === 1 ? slot1Label : slot2Label;
        setTimeout(
          () =>
            onFinish('win', 450, `${winnerName} Connected Four!`, {
              opponentScore: 150,
            }),
          350
        );
      }
      return;
    }

    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        c4Grid: step.nextGrid,
        c4Turn: nextTurn,
        c4LastPlaced: [step.placedRow, col],
      });
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between rounded-xl border border-stone-800 bg-stone-950 px-4 py-2 text-xs text-stone-300">
        <span>
          Your Disc:{' '}
          <strong className={mySlot === 1 ? 'text-amber-300' : 'text-teal-300'}>
            {mySlot === 1 ? 'Amber' : 'Teal'} ({mySlot === 1 ? slot1Label : slot2Label})
          </strong>
        </span>
        <span>
          Turn:{' '}
          <strong className={turn === mySlot ? 'text-emerald-300' : 'text-amber-300'}>
            {turn === mySlot
              ? 'Your Turn to Drop!'
              : `Waiting for ${turn === 1 ? slot1Label : slot2Label}`}
          </strong>
        </span>
      </div>

      <div className="grid w-full grid-cols-7 gap-2 px-4">
        {[0, 1, 2, 3, 4, 5, 6].map((c) => (
          <div
            key={c}
            className="flex h-6 items-center justify-center font-mono text-xs text-amber-300"
          >
            {hoverCol === c && turn === mySlot ? '▼ DROP' : `Col ${c + 1}`}
          </div>
        ))}
      </div>

      <div className="grid w-full grid-cols-7 gap-2.5 rounded-2xl border-4 border-[#1D4ED8] bg-[#1E3A8A] p-4 shadow-2xl">
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isWinDisc = winCells?.some(([wr, wc]) => wr === r && wc === c);
            const isNewest = lastPlaced?.[0] === r && lastPlaced?.[1] === c;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                disabled={!allHumanPlayersJoined || turn !== mySlot}
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(null)}
                onClick={() => handleColumnDrop(c)}
                aria-label={`Drop disc in column ${c + 1} row ${r + 1}`}
                style={{
                  backgroundColor:
                    cell === 1 ? '#F59E0B' : cell === 2 ? '#14B8A6' : '#0F172A',
                }}
                className={`aspect-square rounded-full border-2 transition-all duration-200 ${
                  isWinDisc
                    ? 'border-white ring-4 ring-emerald-400 scale-105'
                    : isNewest
                    ? 'border-amber-200 scale-105'
                    : cell === 1
                    ? 'border-amber-300 shadow-inner'
                    : cell === 2
                    ? 'border-teal-200 shadow-inner'
                    : 'border-[#1E40AF] hover:border-amber-400/70'
                }`}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   3. BATTLESHIP (100% Human vs Human Synchronized Naval Radar Grids)
   ============================================================================ */
interface NavalShipDef {
  id: string;
  name: string;
  size: number;
  coords: [number, number][];
}

const SHIPS_TO_PLACE = [
  { id: 'carrier', name: 'Carrier', size: 5 },
  { id: 'battleship', name: 'Battleship', size: 4 },
  { id: 'cruiser', name: 'Cruiser', size: 3 },
  { id: 'submarine', name: 'Submarine', size: 3 },
  { id: 'destroyer', name: 'Destroyer', size: 2 },
];

function BattleshipDuel({
  sessionSeed,
  mySlot,
  slot1Label,
  slot2Label,
  allHumanPlayersJoined,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  mySlot: 1 | 2;
  slot1Label: string;
  slot2Label: string;
  allHumanPlayersJoined: boolean;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (
    res: 'win' | 'loss' | 'draw',
    score: number,
    text: string,
    details?: Record<string, unknown>
  ) => void;
}) {
  const opponentSlot: 1 | 2 = mySlot === 1 ? 2 : 1;

  const defaultFleets = {
    '1': generateBattleshipFleet(sessionSeed + 11),
    '2': generateBattleshipFleet(sessionSeed + 97),
  };

  const syncedFleets =
    (roomGameState?.bsFleets as Record<'1' | '2', NavalShipDef[]> | undefined) ||
    defaultFleets;
  const syncedShots = (roomGameState?.bsShots as
    | Record<'1' | '2', Record<string, 'hit' | 'miss'>>
    | undefined) || { '1': {}, '2': {} };
  const activeTurn: 1 | 2 =
    roomGameState?.bsTurn === 2 ? 2 : roomGameState?.bsTurn === 1 ? 1 : 1;

  const myFleet = syncedFleets[String(mySlot) as '1' | '2'] || defaultFleets[mySlot];
  const enemyFleet =
    syncedFleets[String(opponentSlot) as '1' | '2'] || defaultFleets[opponentSlot];
  const myShots = syncedShots[String(mySlot) as '1' | '2'] || {};
  const incomingShots = syncedShots[String(opponentSlot) as '1' | '2'] || {};

  const [placingIdx, setPlacingIdx] = useState<number>(5);
  const [orientation, setOrientation] = useState<'H' | 'V'>('H');
  const [combatLog, setCombatLog] = useState<string>(
    'Real-time naval link active! Fire on the Enemy Target Radar on your turn.'
  );

  const totalEnemyCells = enemyFleet.reduce((acc, s) => acc + s.size, 0);

  function syncBattleshipState(
    nextFleets: Record<'1' | '2', NavalShipDef[]>,
    nextShots: Record<'1' | '2', Record<string, 'hit' | 'miss'>>,
    nextTurn: 1 | 2
  ) {
    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        bsFleets: nextFleets,
        bsShots: nextShots,
        bsTurn: nextTurn,
      });
    }
  }

  function handlePlaceShipAt(r: number, c: number) {
    if (placingIdx >= SHIPS_TO_PLACE.length) return;
    const shipSpec = SHIPS_TO_PLACE[placingIdx];
    const coords: [number, number][] = [];
    for (let i = 0; i < shipSpec.size; i++) {
      const nr = orientation === 'V' ? r + i : r;
      const nc = orientation === 'H' ? c + i : c;
      if (nr >= 10 || nc >= 10) {
        setCombatLog(`${shipSpec.name} (${shipSpec.size} cells) does not fit there!`);
        soundFX.playError();
        return;
      }
      coords.push([nr, nc]);
    }
    const occupied = new Set(
      myFleet.flatMap((s) => s.coords.map(([sr, sc]) => `${sr}-${sc}`))
    );
    if (coords.some(([cr, cc]) => occupied.has(`${cr}-${cc}`))) {
      setCombatLog('Cannot overlap another vessel in your fleet!');
      soundFX.playError();
      return;
    }

    const updatedMyFleet = [
      ...myFleet,
      {
        id: shipSpec.id,
        name: `${shipSpec.name} (${shipSpec.size})`,
        size: shipSpec.size,
        coords,
      },
    ];
    const nextFleets = {
      ...syncedFleets,
      [String(mySlot)]: updatedMyFleet,
    };
    const nextIdx = placingIdx + 1;
    setPlacingIdx(nextIdx);
    soundFX.playDrop();
    syncBattleshipState(nextFleets, syncedShots, activeTurn);
  }

  function fireAtEnemyCoord(r: number, c: number) {
    if (!allHumanPlayersJoined) return;
    if (activeTurn !== mySlot) {
      setCombatLog(
        `Wait for ${opponentSlot === 1 ? slot1Label : slot2Label} to fire their salvo!`
      );
      return;
    }
    if (placingIdx < SHIPS_TO_PLACE.length) {
      setCombatLog('Finish deploying all 5 ships in your Home Fleet first!');
      return;
    }
    const key = `${r}-${c}`;
    if (myShots[key]) return;

    const hitShip = enemyFleet.find((ship) =>
      ship.coords.some(([sr, sc]) => sr === r && sc === c)
    );
    const isHit = Boolean(hitShip);
    const nextMyShots = {
      ...myShots,
      [key]: isHit ? ('hit' as const) : ('miss' as const),
    };
    const nextAllShots = {
      ...syncedShots,
      [String(mySlot)]: nextMyShots,
    };
    const nextTurn: 1 | 2 = opponentSlot;

    if (isHit && hitShip) {
      soundFX.playExplosion();
      setCombatLog(
        `DIRECT HIT on ${opponentSlot === 1 ? slot1Label : slot2Label} at Sector ${String.fromCharCode(65 + r)}${c + 1}!`
      );
    } else {
      soundFX.playSplash();
      setCombatLog(
        `Splash at Sector ${String.fromCharCode(65 + r)}${c + 1} — missed.`
      );
    }

    const p1Hits = Object.values(nextAllShots['1'] || {}).filter(
      (v) => v === 'hit'
    ).length;
    const p2Hits = Object.values(nextAllShots['2'] || {}).filter(
      (v) => v === 'hit'
    ).length;
    onScores(p1Hits * 110, p2Hits * 110);
    syncBattleshipState(syncedFleets, nextAllShots, nextTurn);

    const myHits = Object.values(nextMyShots).filter((v) => v === 'hit').length;
    if (myHits >= totalEnemyCells) {
      const myName = mySlot === 1 ? slot1Label : slot2Label;
      setTimeout(
        () =>
          onFinish('win', myHits * 110 + 350, `${myName} Sank All 5 Enemy Warships!`, {
            opponentScore: (mySlot === 1 ? p2Hits : p1Hits) * 110,
          }),
        350
      );
    }
  }

  const hitsCount = Object.values(myShots).filter((v) => v === 'hit').length;
  const sunkEnemyShips = enemyFleet.filter((ship) =>
    ship.coords.every(([sr, sc]) => myShots[`${sr}-${sc}`] === 'hit')
  );
  const myShipCells = new Set(
    myFleet.flatMap((s) => s.coords.map(([r, c]) => `${r}-${c}`))
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-500/30 bg-slate-950 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 text-teal-300">
          <Crosshair className="h-4 w-4" />
          <span className="font-semibold">
            {activeTurn === mySlot
              ? `YOUR TURN TO FIRE · ${combatLog}`
              : `Waiting for ${opponentSlot === 1 ? slot1Label : slot2Label}'s Salvo...`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {placingIdx < SHIPS_TO_PLACE.length && (
            <button
              type="button"
              onClick={() => setOrientation((o) => (o === 'H' ? 'V' : 'H'))}
              className="rounded-lg border border-amber-400 bg-amber-500/20 px-2.5 py-1 font-bold text-amber-200"
            >
              Orientation: {orientation === 'H' ? 'Horizontal ➡' : 'Vertical ⬇'}
            </button>
          )}
          {Object.keys(incomingShots).length === 0 && (
            <button
              type="button"
              onClick={() => {
                const freshFleet = generateBattleshipFleet(generateFreshGameSeed());
                setPlacingIdx(5);
                syncBattleshipState(
                  { ...syncedFleets, [String(mySlot)]: freshFleet },
                  syncedShots,
                  activeTurn
                );
                soundFX.playFlip();
              }}
              className="rounded-lg border border-teal-500/40 bg-teal-500/15 px-2.5 py-1 text-teal-200 hover:border-teal-400"
            >
              Randomize My Fleet
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ENEMY TARGET RADAR */}
        <div className="flex flex-col items-center rounded-2xl border border-teal-500/30 bg-slate-950 p-4">
          <div className="mb-2 flex w-full items-center justify-between text-xs">
            <span className="font-bold text-rose-300">
              🎯 ENEMY TARGET RADAR ({opponentSlot === 1 ? slot1Label : slot2Label})
            </span>
            <span className="font-mono text-teal-300">
              Hits: {hitsCount}/{totalEnemyCells} · Sunk: {sunkEnemyShips.length}/5
            </span>
          </div>

          <div className="grid aspect-square w-full max-w-[360px] grid-cols-10 gap-1 rounded-xl border border-teal-900/60 bg-[#061320] p-2">
            {Array.from({ length: 10 }, (_, r) =>
              Array.from({ length: 10 }, (_, c) => {
                const state = myShots[`${r}-${c}`];
                return (
                  <button
                    key={`target-${r}-${c}`}
                    type="button"
                    disabled={!allHumanPlayersJoined || activeTurn !== mySlot}
                    onClick={() => fireAtEnemyCoord(r, c)}
                    aria-label={`Radar Sector ${r + 1}-${c + 1}`}
                    className={`flex aspect-square items-center justify-center rounded-xs border font-mono text-[10px] font-bold transition-colors ${
                      state === 'hit'
                        ? 'border-rose-400 bg-rose-500/40 text-rose-100'
                        : state === 'miss'
                        ? 'border-slate-700 bg-slate-800/80 text-slate-400'
                        : 'border-teal-900/50 bg-teal-950/35 text-teal-500/40 hover:border-amber-400'
                    }`}
                  >
                    {state === 'hit' ? '✕' : state === 'miss' ? '•' : ''}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* YOUR HOME FLEET */}
        <div className="flex flex-col items-center rounded-2xl border border-stone-800 bg-slate-950 p-4">
          <div className="mb-2 flex w-full items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-amber-300">
              <Shield className="h-3.5 w-3.5" />
              <span>YOUR HOME FLEET ({mySlot === 1 ? slot1Label : slot2Label})</span>
            </span>
            <span className="font-mono text-stone-400">
              Ships Deployed: {myFleet.length}/5
            </span>
          </div>

          <div className="grid aspect-square w-full max-w-[360px] grid-cols-10 gap-1 rounded-xl border border-stone-800 bg-[#091526] p-2">
            {Array.from({ length: 10 }, (_, r) =>
              Array.from({ length: 10 }, (_, c) => {
                const hasShip = myShipCells.has(`${r}-${c}`);
                const incoming = incomingShots[`${r}-${c}`];
                return (
                  <button
                    key={`fleet-${r}-${c}`}
                    type="button"
                    onClick={() => handlePlaceShipAt(r, c)}
                    aria-label={`Home Fleet Sector ${r + 1}-${c + 1}`}
                    className={`flex aspect-square items-center justify-center rounded-xs border font-mono text-[10px] font-bold ${
                      incoming === 'hit'
                        ? 'border-rose-400 bg-rose-600/50 text-white'
                        : hasShip
                        ? 'border-amber-400/80 bg-amber-500/35 text-amber-200'
                        : incoming === 'miss'
                        ? 'border-slate-700 bg-slate-800 text-slate-500'
                        : 'border-slate-800/80 bg-slate-900/60 hover:border-amber-400/50'
                    }`}
                  >
                    {incoming === 'hit'
                      ? '🔥'
                      : hasShip
                      ? '■'
                      : incoming === 'miss'
                      ? '•'
                      : ''}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   4. DRAW & GUESS (Real-Time Shared Canvas Strokes & Partner Guessing)
   ============================================================================ */
const DRAW_PROMPTS = [
  'Shooting Star',
  'Cup of Hot Cocoa',
  'Campfire Tent',
  'Crescent Moon',
  'Kitsune Fox',
];

interface DrawStrokeRecord {
  color: string;
  size: number;
  points: Array<{ x: number; y: number }>;
}

function DrawAndGuessParty({
  sessionSeed,
  mySlot,
  slot1Label,
  slot2Label,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  mySlot: 1 | 2;
  slot1Label: string;
  slot2Label: string;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'completed', score: number, text: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStrokeRef = useRef<Array<{ x: number; y: number }>>([]);
  const [drawing, setDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#FBBF24');
  const [brushSize, setBrushSize] = useState(5);
  const [guessText, setGuessText] = useState('');
  const [feedback, setFeedback] = useState('');

  const promptIdx = Number(roomGameState?.dgPromptIdx || 0);
  const strokes = Array.isArray(roomGameState?.dgStrokes)
    ? (roomGameState.dgStrokes as DrawStrokeRecord[])
    : [];

  const shuffledPrompts = seededShuffle(DRAW_PROMPTS, sessionSeed);
  const secretWord = shuffledPrompts[promptIdx % shuffledPrompts.length];
  const maskedWord = secretWord
    .split('')
    .map((ch, i) => (ch === ' ' ? '  ' : i === 0 || i === 4 ? ch : '_'))
    .join(' ');

  // Re-render synced strokes onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokes) {
      if (!s.points?.length) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
    }
  }, [strokes]);

  function drawStroke(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round(
      ((e.clientX - rect.left) / rect.width) * canvasRef.current.width
    );
    const y = Math.round(
      ((e.clientY - rect.top) / rect.height) * canvasRef.current.height
    );
    const ctx = canvasRef.current.getContext('2d');
    const pts = currentStrokeRef.current;
    if (ctx) {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (pts.length > 0) {
        ctx.moveTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      } else {
        ctx.moveTo(x, y);
      }
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    pts.push({ x, y });
  }

  function finishStroke() {
    if (!drawing) return;
    setDrawing(false);
    if (currentStrokeRef.current.length > 0 && onSyncRoomGameState) {
      const nextStrokes: DrawStrokeRecord[] = [
        ...strokes,
        {
          color: brushColor,
          size: brushSize,
          points: [...currentStrokeRef.current],
        },
      ];
      currentStrokeRef.current = [];
      onSyncRoomGameState({ dgStrokes: nextStrokes });
    }
  }

  function clearCanvas() {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if (onSyncRoomGameState) {
      onSyncRoomGameState({ dgStrokes: [] });
    }
  }

  function handleGuessSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guessText.trim().toLowerCase() === secretWord.toLowerCase()) {
      onScores(500, 500);
      setFeedback(`Spot on! It was "${secretWord}"!`);
      setTimeout(() => onFinish('completed', 500, 'Masterpiece Guessed Together!'), 350);
    } else {
      setFeedback(`Hint: Starts with "${secretWord.slice(0, 3)}..."`);
      soundFX.playMove();
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex flex-col items-center gap-3 lg:col-span-7">
        <div className="flex w-full items-center justify-between text-xs">
          <span className="font-semibold text-amber-300">
            {mySlot === 1
              ? `Sketch Prompt (${slot1Label}): ${secretWord}`
              : `Clue for ${slot2Label}: ${maskedWord}`}
          </span>
          <button
            type="button"
            onClick={() => {
              if (onSyncRoomGameState) {
                onSyncRoomGameState({
                  dgStrokes: [],
                  dgPromptIdx: promptIdx + 1,
                });
              }
            }}
            className="text-stone-400 hover:text-stone-200"
          >
            Next Prompt
          </button>
        </div>

        <canvas
          ref={canvasRef}
          width={520}
          height={280}
          onMouseDown={(e) => {
            setDrawing(true);
            const rect = e.currentTarget.getBoundingClientRect();
            currentStrokeRef.current = [
              {
                x: Math.round(
                  ((e.clientX - rect.left) / rect.width) * e.currentTarget.width
                ),
                y: Math.round(
                  ((e.clientY - rect.top) / rect.height) * e.currentTarget.height
                ),
              },
            ];
          }}
          onMouseUp={finishStroke}
          onMouseLeave={finishStroke}
          onMouseMove={drawStroke}
          className="w-full cursor-crosshair rounded-2xl border border-stone-800 bg-stone-950"
        />

        <div className="flex flex-wrap items-center gap-2">
          {['#FBBF24', '#F43F5E', '#2DD4BF', '#A78BFA', '#34D399', '#FFFFFF'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setBrushColor(c)}
              aria-label={`Select brush color ${c}`}
              style={{ backgroundColor: c }}
              className={`h-7 w-7 rounded-full border-2 ${
                brushColor === c ? 'border-white scale-110' : 'border-transparent'
              }`}
            />
          ))}
          {[3, 6, 11].map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => setBrushSize(sz)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-mono ${
                brushSize === sz
                  ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                  : 'border-stone-700 bg-stone-900 text-stone-300'
              }`}
            >
              {sz}px
            </button>
          ))}
          <button
            type="button"
            onClick={clearCanvas}
            className="flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs text-stone-200"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col justify-between rounded-2xl border border-stone-800 bg-stone-950 p-5 lg:col-span-5">
        <div>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-stone-100">Live Partner Guess Box</h4>
            <span className="font-mono text-xs text-amber-300">{maskedWord}</span>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Strokes sync live across the room. Submit the prompt guess below to score!
          </p>
          <form onSubmit={handleGuessSubmit} className="mt-4 space-y-2.5">
            <input
              type="text"
              value={guessText}
              onChange={(e) => setGuessText(e.target.value)}
              placeholder="Enter your guess..."
              className="w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 text-xs text-stone-100"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-amber-500 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400"
            >
              Submit Guess
            </button>
          </form>
          {feedback && <p className="mt-3 text-xs text-teal-300">{feedback}</p>}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   5. QUIZ BATTLE (Synchronized Head-to-Head Trivia)
   ============================================================================ */
function QuizBattleDuel({
  sessionSeed,
  mySlot,
  slot1Label,
  slot2Label,
  personalizedItems,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  mySlot: 1 | 2;
  slot1Label: string;
  slot2Label: string;
  personalizedItems: PersonalizedItemRecord[];
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (
    res: 'win' | 'loss' | 'draw',
    score: number,
    text: string,
    details?: Record<string, unknown>
  ) => void;
}) {
  const customQuestions = personalizedItems
    .filter((i) => i.category === 'quiz_question')
    .map((i) => {
      try {
        const p = JSON.parse(i.payloadJson);
        return {
          question: p.question || i.title,
          options: p.options || ['Option A', 'Option B', 'Option C', 'Option D'],
          answerIndex: Number(p.answerIndex ?? 0),
          category: p.category || 'Our Memories',
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const baseQuestions = [
    ...customQuestions,
    {
      question:
        'Which planet in our solar system is famous for its bright icy ring system?',
      options: ['Mercury', 'Saturn', 'Mars', 'Venus'],
      answerIndex: 1,
      category: 'Stargazing Trivia',
    },
    {
      question:
        'In standard chess, how many squares does a King move during castling?',
      options: ['1 square', '2 squares', '3 squares', '4 squares'],
      answerIndex: 1,
      category: 'Arcade Classics',
    },
    {
      question:
        'Which Japanese green tea is stone-ground into a fine vivid powder?',
      options: ['Sencha', 'Matcha', 'Oolong', 'Earl Grey'],
      answerIndex: 1,
      category: 'Cozy Café Trivia',
    },
  ];

  const questions = seededShuffle(baseQuestions, sessionSeed);
  const qIdx = Number(roomGameState?.qbQuestionIdx || 0);
  const p1Pts = Number(roomGameState?.p1Score || 0);
  const p2Pts = Number(roomGameState?.p2Score || 0);
  const totalRounds = Math.min(4, questions.length);
  const currentQ = questions[qIdx % questions.length]!;

  function selectAnswer(idx: number) {
    const correct = idx === currentQ.answerIndex;
    const delta = correct ? 250 : 50;
    const nextP1 = mySlot === 1 ? p1Pts + delta : p1Pts;
    const nextP2 = mySlot === 2 ? p2Pts + delta : p2Pts;
    const nextQ = qIdx + 1;

    if (correct) soundFX.playCapture();
    else soundFX.playError();

    onScores(nextP1, nextP2);
    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        qbQuestionIdx: nextQ,
        p1Score: nextP1,
        p2Score: nextP2,
      });
    }

    if (nextQ >= totalRounds) {
      const myFinal = mySlot === 1 ? nextP1 : nextP2;
      const oppFinal = mySlot === 1 ? nextP2 : nextP1;
      const res: 'win' | 'loss' | 'draw' =
        myFinal > oppFinal ? 'win' : myFinal < oppFinal ? 'loss' : 'draw';
      const winnerText =
        nextP1 > nextP2
          ? `${slot1Label} Wins Quiz Battle!`
          : nextP2 > nextP1
          ? `${slot2Label} Wins Quiz Battle!`
          : 'Quiz Battle Tie!';
      setTimeout(
        () => onFinish(res, myFinal, winnerText, { opponentScore: oppFinal }),
        350
      );
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-stone-800 bg-stone-950 p-6">
      <div className="flex items-center justify-between text-xs text-amber-300">
        <span>Category: {currentQ.category}</span>
        <span>
          Question {Math.min(qIdx + 1, totalRounds)} of {totalRounds}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-bold text-stone-100">{currentQ.question}</h3>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {currentQ.options.map((opt: string, idx: number) => (
          <button
            key={idx}
            type="button"
            onClick={() => selectAnswer(idx)}
            className="rounded-xl border border-stone-800 bg-stone-900 p-3.5 text-left text-xs font-semibold text-stone-100 hover:border-amber-500"
          >
            {idx + 1}. {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   6. WORD BATTLE (Shared Honeycomb Rack & Synchronized Word Forging)
   ============================================================================ */
function WordBattleDuel({
  sessionSeed,
  mySlot,
  playerName,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  mySlot: 1 | 2;
  playerName: string;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (
    res: 'win' | 'loss' | 'draw',
    score: number,
    text: string,
    details?: Record<string, unknown>
  ) => void;
}) {
  const initialRackSpec = generateWordBattleRack(sessionSeed);
  const [rack, setRack] = useState<string[]>(initialRackSpec.rack);
  const center = initialRackSpec.center;
  const [wordInput, setWordInput] = useState('');
  const [msg, setMsg] = useState(
    `Forge words of 3+ letters that include the golden center letter "${center}".`
  );

  const foundEntries = Array.isArray(roomGameState?.wbFoundWords)
    ? (roomGameState.wbFoundWords as Array<{
        word: string;
        by: string;
        points: number;
        slot: 1 | 2;
      }>)
    : [];

  function shuffleOuterLetters() {
    const outer = rack.filter((l) => l !== center);
    const rotated = [...outer.slice(1), outer[0]];
    setRack([
      rotated[0],
      rotated[1],
      center,
      rotated[2],
      rotated[3],
      rotated[4],
      rotated[5],
    ]);
    soundFX.playFlip();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const upper = wordInput.trim().toUpperCase();
    if (foundEntries.some((f) => f.word === upper)) {
      setMsg('Already forged that word in this room!');
      return;
    }
    const check = scoreWordBattleSubmission(upper, rack, center);
    if (!check.valid) {
      setMsg(check.reason || 'Invalid word.');
      soundFX.playError();
      return;
    }

    const nextEntries = [
      ...foundEntries,
      { word: upper, by: playerName, points: check.points, slot: mySlot },
    ];
    const p1Pts = nextEntries
      .filter((e) => e.slot === 1)
      .reduce((acc, e) => acc + e.points, 0);
    const p2Pts = nextEntries
      .filter((e) => e.slot === 2)
      .reduce((acc, e) => acc + e.points, 0);

    setWordInput('');
    setMsg(`Forged "${upper}" for +${check.points} pts!`);
    onScores(p1Pts, p2Pts);
    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        wbFoundWords: nextEntries,
        p1Score: p1Pts,
        p2Score: p2Pts,
      });
    }
    soundFX.playCapture();

    if (nextEntries.length >= 4) {
      const myPts = mySlot === 1 ? p1Pts : p2Pts;
      const oppPts = mySlot === 1 ? p2Pts : p1Pts;
      setTimeout(
        () =>
          onFinish('win', myPts, 'Word Battle Complete!', {
            opponentScore: oppPts,
          }),
        350
      );
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-stone-800 bg-stone-950 p-6">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {rack.map((letter) => (
          <button
            key={letter}
            type="button"
            onClick={() => setWordInput((w) => w + letter)}
            className={`h-11 w-11 rounded-xl border font-mono text-base font-bold transition-transform hover:scale-105 ${
              letter === center
                ? 'border-amber-400 bg-amber-500 text-stone-950 shadow-md'
                : 'border-stone-700 bg-stone-900 text-stone-100 hover:border-amber-500/50'
            }`}
          >
            {letter}
          </button>
        ))}
        <button
          type="button"
          onClick={shuffleOuterLetters}
          aria-label="Shuffle Letters"
          className="flex h-11 items-center gap-1 rounded-xl border border-stone-700 bg-stone-900 px-3 text-xs text-stone-300 hover:border-amber-400"
        >
          <Shuffle className="h-3.5 w-3.5" />
          <span>Shuffle</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full gap-2">
        <input
          type="text"
          value={wordInput}
          onChange={(e) => setWordInput(e.target.value.toUpperCase())}
          placeholder="e.g. STAR, TRAIN, ART..."
          className="w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 font-mono text-sm text-stone-100 uppercase"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400"
        >
          Submit
        </button>
      </form>
      <p className="text-xs text-amber-300">{msg}</p>
      <div className="text-xs text-stone-400">
        Shared Forged Words ({foundEntries.length}/4):{' '}
        {foundEntries.map((f) => `${f.word} (@${f.by})`).join(' · ') || 'None yet'}
      </div>
    </div>
  );
}

/* ============================================================================
   7. REACTION RACE (Real Human Reflex Comparison)
   ============================================================================ */
function ReactionRaceDuel({
  sessionSeed,
  mySlot,
  slot1Label,
  slot2Label,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  mySlot: 1 | 2;
  slot1Label: string;
  slot2Label: string;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (
    res: 'win' | 'loss' | 'draw',
    score: number,
    text: string,
    details?: Record<string, unknown>
  ) => void;
}) {
  const [phase, setPhase] = useState<'waiting' | 'ready' | 'false_start' | 'done'>(
    'waiting'
  );
  const [startTimestamp, setStartTimestamp] = useState(0);
  const [reactionMs, setReactionMs] = useState<number | null>(null);

  const timesBySlot: Record<string, number> =
    (roomGameState?.rrTimesBySlot as Record<string, number> | undefined) || {};

  useEffect(() => {
    if (phase !== 'waiting') return;
    const delayMs = 950 + (sessionSeed % 1100);
    const t = setTimeout(() => {
      setPhase('ready');
      setStartTimestamp(performance.now());
    }, delayMs);
    return () => clearTimeout(t);
  }, [phase, sessionSeed]);

  function handleStrike() {
    if (phase === 'waiting') {
      setPhase('false_start');
      soundFX.playError();
      setTimeout(() => setPhase('waiting'), 900);
      return;
    }
    if (phase === 'ready') {
      const ms = Math.max(115, Math.round(performance.now() - startTimestamp));
      setReactionMs(ms);
      setPhase('done');
      const pts = Math.max(200, 1000 - ms);
      const nextTimes: Record<string, number> = {
        ...timesBySlot,
        [String(mySlot)]: ms,
      };
      const p1Pts = nextTimes['1'] ? Math.max(200, 1000 - nextTimes['1']) : 0;
      const p2Pts = nextTimes['2'] ? Math.max(200, 1000 - nextTimes['2']) : 0;

      onScores(p1Pts, p2Pts);
      if (onSyncRoomGameState) {
        onSyncRoomGameState({
          rrTimesBySlot: nextTimes,
          p1Score: p1Pts,
          p2Score: p2Pts,
        });
      }
      soundFX.playCapture();

      if (nextTimes['1'] && nextTimes['2']) {
        const fasterSlot = nextTimes['1'] <= nextTimes['2'] ? 1 : 2;
        const winnerName = fasterSlot === 1 ? slot1Label : slot2Label;
        setTimeout(
          () =>
            onFinish(
              fasterSlot === mySlot ? 'win' : 'loss',
              pts,
              `${winnerName} Won Reaction Race (${Math.min(nextTimes['1'], nextTimes['2'])}ms)!`,
              { opponentScore: mySlot === 1 ? p2Pts : p1Pts }
            ),
          450
        );
      } else {
        setTimeout(
          () => onFinish('win', pts, `Lightning Reflex: ${ms}ms!`),
          650
        );
      }
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
      <button
        type="button"
        onClick={handleStrike}
        className={`flex h-56 w-full flex-col items-center justify-center rounded-2xl border-2 p-6 text-center transition-colors ${
          phase === 'ready'
            ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
            : phase === 'false_start'
            ? 'border-rose-400 bg-rose-500/25 text-rose-200'
            : 'border-stone-800 bg-stone-950 text-stone-300'
        }`}
      >
        <span className="text-xl font-bold">
          {phase === 'waiting' && 'Wait for Emerald Lantern...'}
          {phase === 'false_start' && 'Too Early! False Start — Resetting...'}
          {phase === 'ready' && 'STRIKE NOW! (Click Here)'}
          {phase === 'done' && `Your Reaction Time: ${reactionMs} ms`}
        </span>
      </button>
    </div>
  );
}

/* ============================================================================
   8. TRUTH OR DARE (Synchronized Turn Wheel + Custom Shared Decks)
   ============================================================================ */
function TruthOrDareParty({
  sessionSeed,
  slot1Label,
  slot2Label,
  personalizedItems,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  slot1Label: string;
  slot2Label: string;
  personalizedItems: PersonalizedItemRecord[];
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'completed', score: number, text: string) => void;
}) {
  const customCards = personalizedItems
    .filter((i) => i.category === 'truth_or_dare')
    .map((i) => {
      try {
        const p = JSON.parse(i.payloadJson);
        return {
          type: (p.type || 'truth') as 'truth' | 'dare',
          prompt: p.prompt || i.title,
          deck: p.deck || 'Custom Shared Deck',
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const baseDeck = [
    ...customCards,
    {
      type: 'truth' as const,
      prompt:
        'What is a dream trip destination you want us to visit together in the next two years?',
      deck: 'Cozy Late Night',
    },
    {
      type: 'dare' as const,
      prompt:
        'Speak in a dramatic movie trailer voice for the next 60 seconds in voice or text chat!',
      deck: 'Playful Spark',
    },
    {
      type: 'truth' as const,
      prompt: 'What was your very first impression of me when we first met?',
      deck: 'Cozy Late Night',
    },
  ];

  const deck = seededShuffle(baseDeck, sessionSeed);
  const idx = Number(roomGameState?.todCardIdx || 0);
  const completedCount = Number(roomGameState?.todCompletedCount || 0);
  const spotlightSlot: 1 | 2 = roomGameState?.todSpotlightSlot === 2 ? 2 : 1;
  const activeCard = deck[idx % deck.length]!;

  function spinTurnWheel() {
    const nextSlot: 1 | 2 = spotlightSlot === 1 ? 2 : 1;
    if (onSyncRoomGameState) {
      onSyncRoomGameState({ todSpotlightSlot: nextSlot });
    }
    soundFX.playFlip();
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-stone-800 bg-stone-950 p-6 text-center">
      <div className="flex w-full items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wider text-amber-400">
          {activeCard.type.toUpperCase()} · {activeCard.deck}
        </span>
        <button
          type="button"
          onClick={spinTurnWheel}
          className="rounded-lg border border-stone-700 bg-stone-900 px-2.5 py-1 text-teal-300"
        >
          Spotlight: {spotlightSlot === 1 ? slot1Label : slot2Label} (Spin)
        </button>
      </div>
      <p className="text-lg font-bold leading-relaxed text-stone-100">
        &ldquo;{activeCard.prompt}&rdquo;
      </p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => {
            const nextC = completedCount + 1;
            const nextIdx = idx + 1;
            const nextSlot: 1 | 2 = spotlightSlot === 1 ? 2 : 1;
            onScores(nextC * 150, nextC * 150);
            if (onSyncRoomGameState) {
              onSyncRoomGameState({
                todCardIdx: nextIdx,
                todCompletedCount: nextC,
                todSpotlightSlot: nextSlot,
                p1Score: nextC * 150,
                p2Score: nextC * 150,
              });
            }
            soundFX.playCapture();
          }}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
        >
          Complete &amp; Draw Next Card
        </button>
        <button
          type="button"
          onClick={() =>
            onFinish(
              'completed',
              Math.max(300, completedCount * 150),
              'Truth or Dare Session Completed!'
            )
          }
          className="rounded-xl border border-stone-700 bg-stone-900 px-4 py-2.5 text-xs font-semibold text-stone-200"
        >
          Finish Deck
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   9. HIGHER OR LOWER (Synchronized Astral Card Deck + History Trail)
   ============================================================================ */
function HigherOrLowerDuel({
  sessionSeed,
  mySlot,
  slot1Label,
  slot2Label,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  mySlot: 1 | 2;
  slot1Label: string;
  slot2Label: string;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (
    res: 'win' | 'loss' | 'draw',
    score: number,
    text: string,
    details?: Record<string, unknown>
  ) => void;
}) {
  const initialCard = generateHigherLowerStartingCard(sessionSeed);
  const currentVal =
    typeof roomGameState?.holCurrentVal === 'number'
      ? roomGameState.holCurrentVal
      : initialCard;
  const history = Array.isArray(roomGameState?.holHistory)
    ? (roomGameState.holHistory as number[])
    : [initialCard];
  const p1Score = Number(roomGameState?.p1Score || 0);
  const p2Score = Number(roomGameState?.p2Score || 0);

  function guess(dir: 'higher' | 'lower') {
    const deckSequence = seededShuffle(
      [14, 6, 18, 9, 20, 4, 15, 11, 19, 3, 16, 8, 2, 13, 17, 7],
      sessionSeed + history.length
    );
    let nextVal = deckSequence[history.length % deckSequence.length];
    if (nextVal === currentVal) nextVal = currentVal < 21 ? currentVal + 1 : 1;
    const won =
      (dir === 'higher' && nextVal > currentVal) ||
      (dir === 'lower' && nextVal < currentVal);

    const nextHist = [...history.slice(-6), nextVal];
    const nextP1 = mySlot === 1 ? p1Score + (won ? 160 : 0) : p1Score;
    const nextP2 = mySlot === 2 ? p2Score + (won ? 160 : 0) : p2Score;

    onScores(nextP1, nextP2);
    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        holCurrentVal: nextVal,
        holHistory: nextHist,
        p1Score: nextP1,
        p2Score: nextP2,
      });
    }
    if (won) soundFX.playCapture();
    else soundFX.playMove();

    const myNextScore = mySlot === 1 ? nextP1 : nextP2;
    if (myNextScore >= 640) {
      const winnerName = mySlot === 1 ? slot1Label : slot2Label;
      setTimeout(
        () =>
          onFinish('win', myNextScore, `${winnerName} Reached 4x Prediction Streak!`, {
            opponentScore: mySlot === 1 ? nextP2 : nextP1,
          }),
        350
      );
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-stone-800 bg-stone-950 p-6 text-center">
      <span className="text-xs text-stone-400">
        Astral Card Value (Scale 1–21) · First to 640 pts wins!
      </span>
      <div className="flex h-36 w-28 flex-col items-center justify-center rounded-2xl border-2 border-amber-400 bg-stone-900 font-mono text-4xl font-bold text-amber-300 tabular-nums shadow-lg">
        <span>{currentVal}</span>
        <span className="mt-1 text-[10px] text-stone-400">ASTRAL TAROT</span>
      </div>
      <div className="text-[11px] font-mono text-stone-400">
        Drawn Trail: {history.join(' → ')}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => guess('higher')}
          className="rounded-xl bg-teal-500 px-5 py-2.5 text-xs font-bold text-stone-950 hover:bg-teal-400"
        >
          ▲ Higher
        </button>
        <button
          type="button"
          onClick={() => guess('lower')}
          className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-stone-950 hover:bg-amber-400"
        >
          ▼ Lower
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   10. ESCAPE THE MAZE (Synchronized Cooperative Key-Switch Dungeon)
   ============================================================================ */
function EscapeTheMazeCoop({
  sessionSeed,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'completed', score: number, text: string) => void;
}) {
  const [switchCoord] = useState<[number, number]>(
    () => generateMazeKeyPositions(sessionSeed)[0]
  );
  const pos: [number, number] = Array.isArray(roomGameState?.mazePos)
    ? (roomGameState.mazePos as [number, number])
    : [0, 0];
  const gateUnlocked = Boolean(roomGameState?.mazeGateUnlocked);

  function move(dr: number, dc: number) {
    const nr = Math.max(0, Math.min(4, pos[0] + dr));
    const nc = Math.max(0, Math.min(4, pos[1] + dc));
    const nextUnlocked =
      gateUnlocked || (nr === switchCoord[0] && nc === switchCoord[1]);
    soundFX.playMove();
    if (nextUnlocked && !gateUnlocked) {
      soundFX.playCapture();
    }
    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        mazePos: [nr, nc],
        mazeGateUnlocked: nextUnlocked,
      });
    }
    if (nr === 4 && nc === 4) {
      onScores(600, 600);
      setTimeout(
        () => onFinish('completed', 600, 'Sanctuary Maze Escaped Together!'),
        300
      );
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
      <p className="text-xs text-stone-400">
        Step on the Switch Plate (Row {switchCoord[0] + 1}, Col {switchCoord[1] + 1}) and guide your team to the Exit Portal (Bottom-Right)!
      </p>
      <div className="grid aspect-square w-64 grid-cols-5 gap-1.5 rounded-2xl border border-stone-800 bg-stone-950 p-3">
        {Array.from({ length: 5 }, (_, r) =>
          Array.from({ length: 5 }, (_, c) => {
            const isPlayer = pos[0] === r && pos[1] === c;
            const isSwitch = r === switchCoord[0] && c === switchCoord[1];
            const isExit = r === 4 && c === 4;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => move(r - pos[0], c - pos[1])}
                aria-label={`Maze tile ${r + 1}-${c + 1}`}
                className={`flex items-center justify-center rounded-lg border text-xs font-bold ${
                  isPlayer
                    ? 'border-amber-400 bg-amber-500 text-stone-950'
                    : isExit
                    ? 'border-teal-400 bg-teal-500/20 text-teal-200'
                    : isSwitch
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                    : 'border-stone-800 bg-stone-900'
                }`}
              >
                {isPlayer
                  ? '★'
                  : isExit
                  ? 'EXIT'
                  : isSwitch
                  ? gateUnlocked
                    ? 'OPEN'
                    : 'KEY'
                  : ''}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   11. COOKING TOGETHER (Synchronized Cooperative Bistro Kitchen)
   ============================================================================ */
const RECIPE_STEPS = [
  'Whisk Sweet Batter',
  'Fold Matcha Powder',
  'Steam Fluffy Soufflé',
  'Garnish Strawberry',
];

function CookingTogetherCoop({
  sessionSeed,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'completed', score: number, text: string) => void;
}) {
  const stepIdx = Number(roomGameState?.cookStepIdx || 0);
  const dishesServed = Number(roomGameState?.cookDishesServed || 0);
  const counterButtons = seededShuffle(RECIPE_STEPS, sessionSeed);

  function addIngredient(stepName: string) {
    if (stepName === RECIPE_STEPS[stepIdx]) {
      const nextStep = stepIdx + 1;
      soundFX.playCapture();
      if (nextStep >= RECIPE_STEPS.length) {
        const nextDishes = dishesServed + 1;
        const pts = nextDishes * 320;
        onScores(pts, pts);
        if (onSyncRoomGameState) {
          onSyncRoomGameState({
            cookStepIdx: 0,
            cookDishesServed: nextDishes,
            p1Score: pts,
            p2Score: pts,
          });
        }
        if (nextDishes >= 2) {
          setTimeout(
            () => onFinish('completed', pts, 'Co-Op Bistro Service Complete!'),
            350
          );
        }
      } else if (onSyncRoomGameState) {
        onSyncRoomGameState({ cookStepIdx: nextStep });
      }
    } else {
      soundFX.playError();
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-stone-800 bg-stone-950 p-6">
      <div className="flex w-full items-center justify-between text-xs text-amber-300">
        <span className="flex items-center gap-1.5 font-bold">
          <UtensilsCrossed className="h-4 w-4" />
          Order: Matcha Soufflé Pancakes
        </span>
        <span>Dishes Served: {dishesServed} / 2</span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-900">
        <div
          className="h-full bg-teal-400 transition-all duration-300"
          style={{ width: `${(stepIdx / RECIPE_STEPS.length) * 100}%` }}
        />
      </div>

      <div className="w-full rounded-xl border border-stone-800 bg-stone-900 p-3 text-xs">
        <span className="text-stone-400">Next Required Prep Step: </span>
        <strong className="text-teal-300">{RECIPE_STEPS[stepIdx]}</strong>
      </div>

      <div className="grid w-full grid-cols-2 gap-2.5">
        {counterButtons.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => addIngredient(step)}
            className="flex items-center gap-2 rounded-xl border border-stone-800 bg-stone-900 p-3.5 text-left text-xs font-semibold text-stone-100 hover:border-amber-500"
          >
            <Flame className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{step}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   12. JIGSAW PUZZLE TOGETHER (Synchronized Shared Keepsake Photo Tiles)
   ============================================================================ */
function JigsawPuzzleCoop({
  sessionSeed,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'completed', score: number, text: string) => void;
}) {
  const defaultTiles = generateJigsawTileOrder(sessionSeed);
  const tiles =
    Array.isArray(roomGameState?.jigsawTiles) &&
    roomGameState.jigsawTiles.length === 9
      ? (roomGameState.jigsawTiles as number[])
      : defaultTiles;
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  function handleTileClick(idx: number) {
    if (selectedIdx === null) {
      setSelectedIdx(idx);
      soundFX.playMove();
      return;
    }
    const next = [...tiles];
    [next[selectedIdx], next[idx]] = [next[idx], next[selectedIdx]];
    setSelectedIdx(null);
    soundFX.playCapture();

    if (onSyncRoomGameState) {
      onSyncRoomGameState({ jigsawTiles: next });
    }

    const solved = next.every((val, i) => val === i);
    if (solved) {
      onScores(650, 650);
      setTimeout(
        () => onFinish('completed', 650, 'Shared Keepsake Jigsaw Completed!'),
        350
      );
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4">
      <p className="text-xs text-stone-400">
        Click two tiles to swap them into ascending order (1 to 9) together!
      </p>
      <div className="grid aspect-square w-72 grid-cols-3 gap-2 rounded-2xl border border-stone-800 bg-stone-950 p-3">
        {tiles.map((pieceNum, idx) => {
          const origRow = Math.floor(pieceNum / 3);
          const origCol = pieceNum % 3;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleTileClick(idx)}
              style={{
                backgroundImage: `url(${KEEPSAKE_PICNIC_IMAGE})`,
                backgroundSize: '300% 300%',
                backgroundPosition: `${origCol * 50}% ${origRow * 50}%`,
              }}
              className={`relative flex items-center justify-center overflow-hidden rounded-xl border font-mono text-lg font-bold ${
                selectedIdx === idx
                  ? 'border-amber-400 ring-2 ring-amber-400'
                  : pieceNum === idx
                  ? 'border-emerald-500/80'
                  : 'border-stone-700'
              }`}
            >
              <span className="relative z-10 rounded bg-black/70 px-2 py-0.5 text-stone-100">
                {pieceNum + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
   13. TREASURE HUNT (Synchronized Compass Triangulation & Relics)
   ============================================================================ */
function TreasureHuntCoop({
  sessionSeed,
  roomGameState,
  onSyncRoomGameState,
  onScores,
  onFinish,
}: {
  sessionSeed: number;
  roomGameState?: Record<string, unknown>;
  onSyncRoomGameState?: (nextState: Record<string, unknown>) => void;
  onScores: (s1: number, s2: number) => void;
  onFinish: (res: 'completed', score: number, text: string) => void;
}) {
  const [relics] = useState<[number, number][]>(() =>
    generateTreasureRelicCoords(sessionSeed)
  );
  const dug =
    (roomGameState?.treasureDug as Record<string, string> | undefined) || {};
  const [clueMsg, setClueMsg] = useState(
    'Click any island sector to excavate and triangulate compass clues together.'
  );

  function digSector(r: number, c: number) {
    const key = `${r}-${c}`;
    if (dug[key]) return;
    const isRelic = relics.some(([rr, cc]) => rr === r && cc === c);
    const minDist = Math.min(
      ...relics.map(([rr, cc]) => Math.abs(rr - r) + Math.abs(cc - c))
    );

    const next = { ...dug, [key]: isRelic ? 'RELIC' : `${minDist}` };
    if (isRelic) {
      setClueMsg(`Unearthed Golden Relic at Sector (${r + 1}, ${c + 1})!`);
      soundFX.playCapture();
    } else {
      setClueMsg(`Compass Reading: Nearest relic is ${minDist} tile(s) away.`);
      soundFX.playMove();
    }

    const foundCount = Object.values(next).filter((v) => v === 'RELIC').length;
    onScores(foundCount * 240, foundCount * 240);
    if (onSyncRoomGameState) {
      onSyncRoomGameState({
        treasureDug: next,
        p1Score: foundCount * 240,
        p2Score: foundCount * 240,
      });
    }
    if (foundCount >= relics.length) {
      setTimeout(
        () => onFinish('completed', 720, 'All 3 Archipelago Relics Unearthed!'),
        350
      );
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
        <Compass className="h-4 w-4" />
        <span>{clueMsg}</span>
      </div>

      <div className="relative aspect-4/3 w-full max-w-md overflow-hidden rounded-2xl border border-stone-800">
        <img
          src={TREASURE_MAP_IMAGE}
          alt="Archipelago Treasure Map"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover opacity-65"
        />
        <div className="relative z-10 grid h-full w-full grid-cols-5 grid-rows-5 gap-1.5 p-3">
          {Array.from({ length: 5 }, (_, r) =>
            Array.from({ length: 5 }, (_, c) => {
              const val = dug[`${r}-${c}`];
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => digSector(r, c)}
                  aria-label={`Excavate Island Sector ${r + 1}-${c + 1}`}
                  className={`flex items-center justify-center rounded-lg border font-mono text-xs font-bold transition-colors ${
                    val === 'RELIC'
                      ? 'border-amber-300 bg-amber-500 text-stone-950'
                      : val
                      ? 'border-stone-700 bg-stone-950/85 text-teal-300'
                      : 'border-white/20 bg-black/30 text-white/70 hover:bg-black/50'
                  }`}
                >
                  {val === 'RELIC' ? '💎' : val || ''}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
