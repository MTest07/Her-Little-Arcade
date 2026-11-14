'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PartyPopper,
  Users,
  Sparkles,
  Globe,
  Lock,
  Copy,
  Check,
  Play,
  Pause,
  RotateCcw,
  LogOut,
  Trophy,
  Clock,
  Send,
  UserPlus,
  UserX,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Palette,
  Eye,
  Zap,
  Brain,
  Smile,
  Compass,
  BookOpen,
  Puzzle,
  HelpCircle,
  Flame,
  ShieldAlert,
} from 'lucide-react';
import {
  PARTY_GAMES,
  ArcadeGameDef,
  getPartyPlacementXp,
} from '@/src/lib/arcade-data';
import { MultiplayerRoomState } from '@/src/components/VoiceAndLobbyDock';
import { AnimatedSkinnedAvatar } from '@/src/components/CosmeticAvatarAndBanner';
import { animateButtonPress } from '@/src/lib/gsap-motion';

export interface PartyGamesArenaProps {
  currentUser: {
    uid: string;
    username: string;
    avatar: string;
    customPhotoUrl?: string;
    equippedSkin?: string;
    equippedBanner?: string;
    level?: number;
  };
  activeCouple: {
    id: number;
    coupleName: string;
    coupleBanner?: string;
    coupleTitle?: string;
    equippedCoupleSkin?: string;
    status: string;
    requesterUid: string;
    partnerUid: string;
    requesterProfile?: {
      uid: string;
      username: string;
      avatar: string;
      customPhotoUrl?: string;
      equippedSkin?: string;
      isOnline?: boolean;
    } | null;
    partnerProfile?: {
      uid: string;
      username: string;
      avatar: string;
      customPhotoUrl?: string;
      equippedSkin?: string;
      isOnline?: boolean;
    } | null;
  } | null;
  activeRoom: MultiplayerRoomState | null;
  authFetcher: (url: string, init?: RequestInit) => Promise<Response>;
  onRoomUpdated: (room: MultiplayerRoomState | null) => void;
  onLeaveRoom: () => void;
  onOpenCouplePairing: () => void;
  onXpAwarded?: () => void;
}

interface PartyCoupleSlot {
  coupleId: number;
  coupleName: string;
  coupleBanner: string;
  coupleTitle: string;
  equippedCoupleSkin: string;
  members: Array<{
    uid: string;
    username: string;
    avatar: string;
    customPhotoUrl?: string;
    equippedSkin?: string;
    ready: boolean;
    joinedAt?: string;
  }>;
  bothJoined: boolean;
  bothReady: boolean;
}

interface PartySessionGameState {
  phase: 'playing' | 'round_summary' | 'finished';
  roundIndex: number;
  totalRounds: number;
  roundStartedAt: number;
  paused: boolean;
  coupleScores: Record<string, number>;
  partnerScores: Record<string, number>;
  roundSubmissions: Record<
    string,
    {
      coupleId: number;
      uid: string;
      username: string;
      answer: string;
      pointsAwarded: number;
      submittedAt: number;
    }
  >;
  drawingStrokes?: Array<{
    color: string;
    size: number;
    points: Array<{ x: number; y: number }>;
  }>;
  storyChain?: Array<{
    coupleName: string;
    username: string;
    line: string;
  }>;
}

// ============================================================================
// DETERMINISTIC CONTENT BANKS FOR ALL 12 PARTY GAMES
// ============================================================================

const QUIZ_SHOWDOWN_QUESTIONS = [
  {
    prompt: 'What is the ultimate secret to winning a multi-couple arcade night together?',
    options: [
      'Calling out clues clearly before the timer hits zero',
      'Button mashing with eyes closed',
      'Hiding the controller under a pillow',
      'Blaming lag before round 1 starts',
    ],
    correctIndex: 0,
  },
  {
    prompt: 'Which cozy date-night snack combo gives the best late-night gaming energy?',
    options: [
      'Warm popcorn & berry fizz',
      'Cold oatmeal & lemon peel',
      'Plain ice cubes',
      'Burnt toast crusts',
    ],
    correctIndex: 0,
  },
  {
    prompt: 'When two partners face a tricky co-op puzzle, what works fastest?',
    options: [
      'Splitting the board into left and right zones',
      'Both clicking the exact same tile repeatedly',
      'Turning the monitor upside down',
      'Waiting for the clock to run out',
    ],
    correctIndex: 0,
  },
  {
    prompt: 'In a couple trivia lightning round, what earns the Sync Bonus?',
    options: [
      'Both partners locking in the correct answer within 10 seconds',
      'Skipping every other question',
      'Picking different wrong answers',
      'Refreshing the browser tab',
    ],
    correctIndex: 0,
  },
  {
    prompt: 'Which romantic getaway setting matches the "Moonlit Lanterns" couple banner?',
    options: [
      'Floating paper lanterns over a quiet harbor at dusk',
      'A noisy highway rest stop at noon',
      'An empty office cubicle',
      'A crowded subway platform',
    ],
    correctIndex: 0,
  },
];

const DRAW_AND_GUESS_PROMPTS = [
  {
    word: 'PICNIC BASKET',
    hint: 'Checkered blanket & outdoor lunch',
    options: ['PICNIC BASKET', 'SPACE ROCKET', 'SNOWMAN', 'ALARM CLOCK'],
  },
  {
    word: 'SHOOTING STAR',
    hint: 'Make a wish across the night sky',
    options: ['SHOOTING STAR', 'UMBRELLA', 'CACTUS', 'BOWLING PIN'],
  },
  {
    word: 'FERRIS WHEEL',
    hint: 'Carnival ride with a view at the top',
    options: ['FERRIS WHEEL', 'SUBMARINE', 'TOASTER', 'BICYCLE'],
  },
  {
    word: 'LOVE LETTER',
    hint: 'Sealed envelope with a wax heart',
    options: ['LOVE LETTER', 'TRAFFIC LIGHT', 'PINEAPPLE', 'GUITAR'],
  },
  {
    word: 'CAMPFIRE S’MORES',
    hint: 'Toasted marshmallows & chocolate by the woods',
    options: ['CAMPFIRE S’MORES', 'IGLOO', 'SKATEBOARD', 'TELESCOPE'],
  },
];

const CHARADES_CHALLENGES = [
  {
    secretTitle: 'Caught in a Sudden Downpour Sharing One Tiny Umbrella',
    cues: [
      '🙌 Hold an imaginary tiny handle overhead',
      '🥶 Huddle shoulder-to-shoulder while tiptoeing over puddles',
      '🌧️ Shake water off your jacket and laugh',
    ],
    options: [
      'Sharing One Tiny Umbrella in the Rain',
      'Parallel Parking a Monster Truck',
      'Defusing a Time Bomb in Space',
      'Baking a Five-Tier Wedding Cake',
    ],
    correctIndex: 0,
  },
  {
    secretTitle: 'Trying to Assemble Flat-Pack Furniture Without the Manual',
    cues: [
      '🔩 Squint at 40 imaginary tiny screws on the floor',
      '🙃 Hold a wooden board upside down and scratch your head',
      '🎉 High-five even though 3 parts are still left over',
    ],
    options: [
      'Assembling Furniture Without the Manual',
      'Rowing a Gondola in Venice',
      'Winning an Olympic Figure Skating Gold',
      'Walking Five Excited Puppies at Once',
    ],
    correctIndex: 0,
  },
  {
    secretTitle: 'Sneaking Snacks Into a Quiet Movie Theater',
    cues: [
      '🧥 Stuff oversized crunchy bags inside a bulky jacket',
      '🤫 Walk on tiptoes past the ticket usher',
      '🍿 Slowly open a loud wrapper during a silent scene',
    ],
    options: [
      'Sneaking Snacks Into a Movie Theater',
      'Climbing Mount Everest in Flip-Flops',
      'Conducting a Symphony Orchestra',
      'Juggling Flaming Torches',
    ],
    correctIndex: 0,
  },
  {
    secretTitle: 'Taking a Couple Selfie on a Windy Mountain Peak',
    cues: [
      '📱 Stretch one arm out wide and angle the phone',
      '💨 Brush hair out of your eyes as gusts blow',
      '✌️ Flash a peace sign right before the shutter clicks',
    ],
    options: [
      'Taking a Couple Selfie on a Windy Peak',
      'Scuba Diving With Sea Turtles',
      'Painting a Renaissance Portrait',
      'Changing a Flat Tire in the Dark',
    ],
    correctIndex: 0,
  },
];

const WORD_ASSOCIATION_ROUNDS = [
  {
    clueA: 'MOONLIGHT',
    clueB: 'OCEAN',
    prompt: 'Pick the word that best bridges MOONLIGHT + OCEAN:',
    options: ['TIDE', 'STAPLER', 'CARPET', 'CEMENT'],
    correctIndex: 0,
  },
  {
    clueA: 'ARCADE',
    clueB: 'JACKPOT',
    prompt: 'Pick the word that best bridges ARCADE + JACKPOT:',
    options: ['TOKENS', 'BROCCOLI', 'LAUNDRY', 'SANDPAPER'],
    correctIndex: 0,
  },
  {
    clueA: 'COFFEE',
    clueB: 'SUNRISE',
    prompt: 'Pick the word that best bridges COFFEE + SUNRISE:',
    options: ['ESPRESSO', 'SNOWSHOE', 'WRENCH', 'CURTAIN'],
    correctIndex: 0,
  },
  {
    clueA: 'PASSPORT',
    clueB: 'SUITCASE',
    prompt: 'Pick the word that best bridges PASSPORT + SUITCASE:',
    options: ['ADVENTURE', 'DISHWASHER', 'CHALKBOARD', 'CEILING'],
    correctIndex: 0,
  },
];

const EMOJI_DECODE_PUZZLES = [
  {
    emojis: '🌙 🧺 🍓 🥂 ✨',
    category: 'Romantic Date Idea',
    options: [
      'Midnight Starlight Picnic',
      'Grocery Store Speedrun',
      'Early Morning Dentist Visit',
      'Rush Hour Traffic Jam',
    ],
    correctIndex: 0,
  },
  {
    emojis: '🎡 🍭 🧸 🎯 🎟️',
    category: 'Weekend Outing',
    options: [
      'Boardwalk Carnival Night',
      'Library Study Session',
      'Tax Preparation Workshop',
      'Hardware Store Inventory',
    ],
    correctIndex: 0,
  },
  {
    emojis: '🌧️ 🛋️ 🍿 🎬 🧣',
    category: 'Cozy Evening',
    options: [
      'Rainy Night Movie Marathon',
      'Desert Marathon Race',
      'Scuba Diving Lesson',
      'Car Wash Fundraiser',
    ],
    correctIndex: 0,
  },
  {
    emojis: '✈️ 🏝️ 🌅 🥥 📸',
    category: 'Dream Getaway',
    options: [
      'Tropical Island Sunset Escape',
      'Snowstorm Mountain Rescue',
      'Subway Commute at 8 AM',
      'Attic Cleaning Day',
    ],
    correctIndex: 0,
  },
];

const TWO_TRUTHS_ROUNDS = [
  {
    coupleTheme: 'Arcade Trivia & Couple Myths',
    statements: [
      '1. Sea otters hold paws while sleeping so they do not drift apart in the current.',
      '2. Gentoo penguins propose to their lifemates by searching the beach for the smoothest pebble.',
      '3. Goldfish can memorize and recite entire Shakespeare sonnets underwater.',
    ],
    lieIndex: 2,
  },
  {
    coupleTheme: 'Co-Op Gaming & Pop Culture',
    statements: [
      '1. The first commercial arcade video game cabinet was Computer Space in 1971.',
      '2. Pac-Man was inspired by a pizza with a single slice removed.',
      '3. Every arcade joystick is legally required to be made out of solid 24-karat gold.',
    ],
    lieIndex: 2,
  },
  {
    coupleTheme: 'World Travel & Romantic Landmarks',
    statements: [
      '1. The Eiffel Tower can grow more than 15 cm taller during hot summer days due to thermal expansion.',
      '2. Venice is built across more than 100 small islands connected by over 400 bridges.',
      '3. The Great Wall of China is painted neon pink every Valentine’s Day.',
    ],
    lieIndex: 2,
  },
];

const PUZZLE_RUSH_PATTERNS = [
  {
    sequence: ['💎', '🔥', '💎', '🔥', '💎', '?'],
    prompt: 'Complete the crystal relay sequence:',
    options: ['🔥', '🍀', '⚓', '🧊'],
    correctIndex: 0,
  },
  {
    sequence: ['2', '6', '12', '20', '30', '?'],
    prompt: 'Solve the vault number lock (+4, +6, +8, +10, +12):',
    options: ['42', '36', '48', '50'],
    correctIndex: 0,
  },
  {
    sequence: ['⬆️', '➡️', '⬇️', '⬅️', '⬆️', '?'],
    prompt: 'Predict the next compass rotation step:',
    options: ['➡️', '⬇️', '⬅️', '⬆️'],
    correctIndex: 0,
  },
  {
    sequence: ['🌸', '🌸🌙', '🌸🌙⭐', '?'],
    prompt: 'Select the next accumulating emblem:',
    options: ['🌸🌙⭐👑', '👑⭐🌙', '🌸🌸🌸', '🌙🌙⭐'],
    correctIndex: 0,
  },
];

const QUICKFIRE_TASKS = [
  {
    category: 'MATH BLITZ',
    question: '(18 × 2) + 14 = ?',
    options: ['50', '46', '54', '62'],
    correctIndex: 0,
  },
  {
    category: 'ODD ONE OUT',
    question: 'Which item does NOT belong in an arcade cabinet?',
    options: ['Cauliflower', 'Joystick', 'Coin Slot', 'CRT Monitor'],
    correctIndex: 0,
  },
  {
    category: 'WORD SCRAMBLE',
    question: 'Unscramble the word: R - O - M - A - N - C - E',
    options: ['ROMANCE', 'CARAMEL', 'MONARCH', 'LANTERN'],
    correctIndex: 0,
  },
  {
    category: 'REFLEX LOGIC',
    question: 'If Red > Blue and Blue > Gold, which is highest?',
    options: ['Red', 'Blue', 'Gold', 'Tied'],
    correctIndex: 0,
  },
];

export default function PartyGamesArena({
  currentUser,
  activeCouple,
  activeRoom,
  authFetcher,
  onRoomUpdated,
  onLeaveRoom,
  onOpenCouplePairing,
  onXpAwarded,
}: PartyGamesArenaProps) {
  const [selectedPartyGameId, setSelectedPartyGameId] = useState<string>(
    PARTY_GAMES[0]?.id || 'party-couple-quiz-showdown'
  );
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [loadingPublicRooms, setLoadingPublicRooms] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'info' | 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [inviteCoupleUsername, setInviteCoupleUsername] = useState<string>('');

  // Local interactive states for specific party games
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [textGuess, setTextGuess] = useState('');
  const [reactionHits, setReactionHits] = useState<number>(0);
  const [activeTargetCell, setActiveTargetCell] = useState<number>(3);
  const [memoryRevealPhase, setMemoryRevealPhase] = useState<boolean>(true);
  const [memoryPickedCells, setMemoryPickedCells] = useState<number[]>([]);
  const [treasureDugCells, setTreasureDugCells] = useState<number[]>([]);
  const [storyLineInput, setStoryLineInput] = useState('');
  const [brushColor, setBrushColor] = useState<string>('#E11D48');
  const [RecordingMatch, setRecordingMatch] = useState(false);
  const [recordedMatchAward, setRecordedMatchAward] = useState<{
    rank: number;
    xpEarned: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<Array<{ x: number; y: number }>>([]);

  const isPartyRoomActive = Boolean(activeRoom && activeRoom.mode === 'party');
  const activePartyGame: ArcadeGameDef =
    PARTY_GAMES.find(
      (g) => g.id === (isPartyRoomActive ? activeRoom?.gameId : selectedPartyGameId)
    ) || PARTY_GAMES[0];

  // Fetch open public party rooms when in browser view
  const fetchPublicPartyRooms = useCallback(async () => {
    setLoadingPublicRooms(true);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list_public_rooms',
          mode: 'party',
        }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.publicRooms)) {
        setPublicRooms(data.publicRooms);
      }
    } catch {
      // ignore
    } finally {
      setLoadingPublicRooms(false);
    }
  }, [authFetcher]);

  useEffect(() => {
    if (!isPartyRoomActive) {
      Promise.resolve().then(() => {
        fetchPublicPartyRooms();
      });
      const id = window.setInterval(fetchPublicPartyRooms, 4500);
      return () => window.clearInterval(id);
    }
  }, [isPartyRoomActive, fetchPublicPartyRooms]);

  // Group players in activeRoom into Couple Team Slots
  const coupleSlots: PartyCoupleSlot[] = React.useMemo(() => {
    if (!activeRoom || !Array.isArray(activeRoom.players)) return [];
    const byCoupleId = new Map<number, PartyCoupleSlot>();
    for (const p of activeRoom.players as any[]) {
      const cid = Number(p.coupleId || 0);
      if (!cid) continue;
      const existing = byCoupleId.get(cid);
      if (!existing) {
        byCoupleId.set(cid, {
          coupleId: cid,
          coupleName: p.coupleName || `Couple #${cid}`,
          coupleBanner: p.coupleBanner || 'banner-rose-dawn',
          coupleTitle: p.coupleTitle || 'Arcade Duo',
          equippedCoupleSkin: p.equippedCoupleSkin || 'skin-rosy-glow',
          members: [
            {
              uid: p.uid,
              username: p.username,
              avatar: p.avatar || '🦊',
              customPhotoUrl: p.customPhotoUrl,
              equippedSkin: p.equippedSkin,
              ready: Boolean(p.ready),
              joinedAt: p.joinedAt,
            },
          ],
          bothJoined: false,
          bothReady: false,
        });
      } else {
        if (!existing.members.some((m) => m.uid === p.uid)) {
          existing.members.push({
            uid: p.uid,
            username: p.username,
            avatar: p.avatar || '🐼',
            customPhotoUrl: p.customPhotoUrl,
            equippedSkin: p.equippedSkin,
            ready: Boolean(p.ready),
            joinedAt: p.joinedAt,
          });
        }
      }
    }
    const list = Array.from(byCoupleId.values());
    for (const slot of list) {
      slot.bothJoined = slot.members.length >= 2;
      slot.bothReady =
        slot.members.length >= 2 && slot.members.every((m) => Boolean(m.ready));
    }
    return list;
  }, [activeRoom]);

  const readyCoupleSlots = coupleSlots.filter((c) => c.bothReady);
  const canStartPartyGame = readyCoupleSlots.length >= 3 && coupleSlots.length <= 10;
  const isHost = Boolean(activeRoom && activeRoom.hostUid === currentUser.uid);

  const partyState: PartySessionGameState = React.useMemo(() => {
    const raw = (activeRoom?.gameState || {}) as Partial<PartySessionGameState>;
    return {
      phase: raw.phase || 'playing',
      roundIndex: typeof raw.roundIndex === 'number' ? raw.roundIndex : 0,
      totalRounds:
        typeof raw.totalRounds === 'number'
          ? raw.totalRounds
          : activePartyGame.partyRounds || 4,
      roundStartedAt: raw.roundStartedAt || 0,
      paused: Boolean(raw.paused),
      coupleScores: raw.coupleScores || {},
      partnerScores: raw.partnerScores || {},
      roundSubmissions: raw.roundSubmissions || {},
      drawingStrokes: raw.drawingStrokes || [],
      storyChain: raw.storyChain || [],
    };
  }, [activeRoom?.gameState, activePartyGame.partyRounds]);

  // Reset per-round local inputs when roundIndex changes
  useEffect(() => {
    Promise.resolve().then(() => {
      setSelectedOptionIdx(null);
      setTextGuess('');
      setReactionHits(0);
      setMemoryPickedCells([]);
      setTreasureDugCells([]);
      setMemoryRevealPhase(true);
    });
    const timer = window.setTimeout(() => {
      setMemoryRevealPhase(false);
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [partyState.roundIndex, activeRoom?.gameId]);

  // Rotate target cell in Reaction Rumble
  useEffect(() => {
    if (
      !isPartyRoomActive ||
      activeRoom?.status !== 'playing' ||
      activeRoom?.gameId !== 'party-reaction-rumble' ||
      partyState.paused
    ) {
      return;
    }
    const id = window.setInterval(() => {
      setActiveTargetCell((prev) => (prev * 5 + 3 + partyState.roundIndex) % 9);
    }, 900);
    return () => window.clearInterval(id);
  }, [
    isPartyRoomActive,
    activeRoom?.status,
    activeRoom?.gameId,
    partyState.roundIndex,
    partyState.paused,
  ]);

  // Render synchronized canvas strokes in Draw & Guess Party
  useEffect(() => {
    if (activeRoom?.gameId !== 'party-draw-and-guess' || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    for (const stroke of partyState.drawingStrokes || []) {
      if (!stroke.points || stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color || '#2C2523';
      ctx.lineWidth = stroke.size || 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [activeRoom?.gameId, partyState.drawingStrokes, partyState.roundIndex]);

  // Automatically record match result when phase reaches 'finished'
  useEffect(() => {
    if (
      !isPartyRoomActive ||
      activeRoom?.status !== 'playing' ||
      partyState.phase !== 'finished' ||
      RecordingMatch ||
      recordedMatchAward
    ) {
      return;
    }

    const sortedCouples = [...coupleSlots].sort((a, b) => {
      const scoreB = Number(partyState.coupleScores[String(b.coupleId)] || 0);
      const scoreA = Number(partyState.coupleScores[String(a.coupleId)] || 0);
      return scoreB - scoreA;
    });

    const myRankIndex = sortedCouples.findIndex(
      (c) => c.coupleId === activeCouple?.id
    );
    const myRank = myRankIndex >= 0 ? myRankIndex + 1 : sortedCouples.length || 1;
    const xpEarned = getPartyPlacementXp(myRank);

    Promise.resolve().then(() => {
      setRecordingMatch(true);
      setRecordedMatchAward({ rank: myRank, xpEarned });
    });

    if (isHost) {
      const standingsPayload = sortedCouples.map((c, idx) => ({
        coupleId: c.coupleId,
        coupleName: c.coupleName,
        rank: idx + 1,
        totalScore: Number(partyState.coupleScores[String(c.coupleId)] || 0),
        memberUids: c.members.map((m) => m.uid),
        memberScores: Object.fromEntries(
          c.members.map((m) => [
            m.uid,
            Number(partyState.partnerScores[m.uid] || 0),
          ])
        ),
      }));

      authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_party_match',
          roomCode: activeRoom?.roomCode,
          gameId: activePartyGame.id,
          gameTitle: activePartyGame.title,
          standings: standingsPayload,
        }),
      })
        .then(() => {
          onXpAwarded?.();
        })
        .catch(() => {})
        .finally(() => {
          setRecordingMatch(false);
        });
    } else {
      window.setTimeout(() => {
        onXpAwarded?.();
        setRecordingMatch(false);
      }, 1200);
    }
  }, [
    isPartyRoomActive,
    activeRoom?.status,
    activeRoom?.roomCode,
    partyState.phase,
    partyState.coupleScores,
    partyState.partnerScores,
    coupleSlots,
    activeCouple?.id,
    isHost,
    activePartyGame.id,
    activePartyGame.title,
    RecordingMatch,
    recordedMatchAward,
    authFetcher,
    onXpAwarded,
  ]);

  // ============================================================================
  // ROOM & LOBBY ACTIONS
  // ============================================================================

  const handleCreatePartyRoom = async (gameIdOverride?: string) => {
    if (!activeCouple || activeCouple.status !== 'active') {
      setStatusMessage({
        type: 'error',
        text: 'Active couple pairing is required before hosting a Party Game.',
      });
      return;
    }
    const targetGameId = gameIdOverride || selectedPartyGameId;
    const gameObj =
      PARTY_GAMES.find((g) => g.id === targetGameId) || PARTY_GAMES[0];

    setBusyAction('create');
    setStatusMessage(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_room',
          gameId: gameObj.id,
          gameTitle: gameObj.title,
          mode: 'party',
          visibility,
          joinPolicy: 'immediate',
          maxPlayers: 20,
          roundFormat: `${gameObj.partyRounds || 4} Party Rounds`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not create Party Room.');
      }
      if (data.room) {
        onRoomUpdated(data.room);
        setStatusMessage({
          type: 'success',
          text: `Party Room #${data.room.roomCode} created! Your paired partner was automatically invited.`,
        });
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to create Party Room.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleJoinPartyRoom = async (codeToJoin?: string) => {
    const cleanCode = (codeToJoin || joinCodeInput).trim().toUpperCase();
    if (!cleanCode) return;
    setBusyAction(`join-${cleanCode}`);
    setStatusMessage(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join_room_by_code',
          roomCode: cleanCode,
          source: 'party_browser',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not join Party Room.');
      }
      if (data.room) {
        onRoomUpdated(data.room);
        setJoinCodeInput('');
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not join Party Room.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleReady = async () => {
    if (!activeRoom) return;
    setBusyAction('ready');
    try {
      const updatedPlayers = (activeRoom.players || []).map((p: any) =>
        p.uid === currentUser.uid ? { ...p, ready: !p.ready } : p
      );
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_room',
          roomCode: activeRoom.roomCode,
          players: updatedPlayers,
        }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        onRoomUpdated(data.room);
      }
    } catch {
      // ignore
    } finally {
      setBusyAction(null);
    }
  };

  const handleInviteCoupleToParty = async () => {
    if (!activeRoom || !inviteCoupleUsername.trim()) return;
    setBusyAction('invite-couple');
    setStatusMessage(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_game_invitation',
          inviteType: 'party',
          targetUsername: inviteCoupleUsername.trim().replace(/^@/, ''),
          gameId: activePartyGame.id,
          roomCode: activeRoom.roomCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not send Party invitation.');
      }
      setInviteCoupleUsername('');
      setStatusMessage({
        type: 'success',
        text: `Party invitation sent! Both partners of that couple can accept from their Mailbox or join via Room #${activeRoom.roomCode}.`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send Party invitation.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const handleKickParticipant = async (targetUid: string) => {
    if (!activeRoom || !isHost) return;
    setBusyAction(`kick-${targetUid}`);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'kick_party_member',
          roomCode: activeRoom.roomCode,
          targetUid,
        }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        onRoomUpdated(data.room);
      }
    } catch {
      // ignore
    } finally {
      setBusyAction(null);
    }
  };

  const handleHostChangeGame = async (newGameId: string) => {
    if (!activeRoom || !isHost) return;
    const gameObj = PARTY_GAMES.find((g) => g.id === newGameId);
    if (!gameObj) return;
    setBusyAction('change-game');
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_room',
          roomCode: activeRoom.roomCode,
          gameId: gameObj.id,
          gameTitle: gameObj.title,
          roundFormat: `${gameObj.partyRounds || 4} Party Rounds`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        onRoomUpdated(data.room);
      }
    } catch {
      // ignore
    } finally {
      setBusyAction(null);
    }
  };

  const handleStartPartySession = async () => {
    if (!activeRoom || !canStartPartyGame) return;
    setBusyAction('start');
    setRecordedMatchAward(null);
    try {
      const initialCoupleScores: Record<string, number> = {};
      const initialPartnerScores: Record<string, number> = {};
      for (const slot of readyCoupleSlots) {
        initialCoupleScores[String(slot.coupleId)] = 0;
        for (const m of slot.members) {
          initialPartnerScores[m.uid] = 0;
        }
      }

      const initialGameState: PartySessionGameState = {
        phase: 'playing',
        roundIndex: 0,
        totalRounds: activePartyGame.partyRounds || 4,
        roundStartedAt: Date.now(),
        paused: false,
        coupleScores: initialCoupleScores,
        partnerScores: initialPartnerScores,
        roundSubmissions: {},
        drawingStrokes: [],
        storyChain: [],
      };

      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_room',
          roomCode: activeRoom.roomCode,
          status: 'playing',
          sessionSeed: Math.floor(100000 + Math.random() * 900000),
          gameState: initialGameState,
        }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        onRoomUpdated(data.room);
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to start Party Game.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // ============================================================================
  // IN-GAME ROUND SUBMISSION & SCORING SYNCHRONIZATION
  // ============================================================================

  const submitRoundContribution = async (
    answerLabel: string,
    pointsEarned: number,
    extraPatch?: Partial<PartySessionGameState>
  ) => {
    if (!activeRoom || !activeCouple) return;
    const myCoupleKey = String(activeCouple.id);
    const submissionKey = `${partyState.roundIndex}_${currentUser.uid}`;

    // Prevent duplicate scoring in the same round by the same user
    if (partyState.roundSubmissions[submissionKey]) return;

    const updatedCoupleScores = {
      ...partyState.coupleScores,
      [myCoupleKey]:
        Number(partyState.coupleScores[myCoupleKey] || 0) + pointsEarned,
    };
    const updatedPartnerScores = {
      ...partyState.partnerScores,
      [currentUser.uid]:
        Number(partyState.partnerScores[currentUser.uid] || 0) + pointsEarned,
    };
    const updatedSubmissions = {
      ...partyState.roundSubmissions,
      [submissionKey]: {
        coupleId: activeCouple.id,
        uid: currentUser.uid,
        username: currentUser.username,
        answer: answerLabel,
        pointsAwarded: pointsEarned,
        submittedAt: partyState.roundIndex + 1,
      },
    };

    const nextGameState: PartySessionGameState = {
      ...partyState,
      ...extraPatch,
      coupleScores: updatedCoupleScores,
      partnerScores: updatedPartnerScores,
      roundSubmissions: updatedSubmissions,
    };

    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_room',
          roomCode: activeRoom.roomCode,
          gameState: nextGameState,
        }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        onRoomUpdated(data.room);
      }
    } catch {
      // ignore
    }
  };

  const handleAdvanceRoundOrFinish = async () => {
    if (!activeRoom) return;
    const isLastRound = partyState.roundIndex + 1 >= partyState.totalRounds;
    const nextState: PartySessionGameState = {
      ...partyState,
      phase: isLastRound ? 'finished' : 'playing',
      roundIndex: isLastRound
        ? partyState.roundIndex
        : partyState.roundIndex + 1,
      roundStartedAt: Date.now(),
      drawingStrokes: [],
    };
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_room',
          roomCode: activeRoom.roomCode,
          gameState: nextState,
        }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        onRoomUpdated(data.room);
      }
    } catch {
      // ignore
    }
  };

  const handleTogglePauseParty = async () => {
    if (!activeRoom) return;
    const nextState: PartySessionGameState = {
      ...partyState,
      paused: !partyState.paused,
    };
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_room',
          roomCode: activeRoom.roomCode,
          gameState: nextState,
        }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        onRoomUpdated(data.room);
      }
    } catch {
      // ignore
    }
  };

  const handleReturnToPartyLobby = async () => {
    if (!activeRoom) return;
    setRecordedMatchAward(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_room',
          roomCode: activeRoom.roomCode,
          status: 'lobby',
          gameState: {},
        }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        onRoomUpdated(data.room);
      }
    } catch {
      // ignore
    }
  };

  const handleStartCanvasStroke = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    currentStrokeRef.current = [
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
    ];
  };

  const handleMoveCanvasStroke = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    currentStrokeRef.current.push(pt);
    const ctx = canvasRef.current.getContext('2d');
    if (ctx && currentStrokeRef.current.length >= 2) {
      const prev =
        currentStrokeRef.current[currentStrokeRef.current.length - 2];
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  };

  const handleEndCanvasStroke = async () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current.length > 1 && activeRoom) {
      const updatedStrokes = [
        ...(partyState.drawingStrokes || []),
        {
          color: brushColor,
          size: 4,
          points: currentStrokeRef.current,
        },
      ];
      await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_room',
          roomCode: activeRoom.roomCode,
          gameState: {
            ...partyState,
            drawingStrokes: updatedStrokes,
          },
        }),
      });
    }
  };

  const myCurrentRoundSubmission =
    partyState.roundSubmissions[`${partyState.roundIndex}_${currentUser.uid}`];

  // ============================================================================
  // VIEW 1: PARTY GAMES HUB & 12-GAME LIBRARY BROWSER (WHEN NOT IN A PARTY ROOM)
  // ============================================================================
  if (!isPartyRoomActive) {
    return (
      <div className="space-y-6">
        {/* Hero Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-[#FFE4E6] via-[#FDFBF7] to-[#E0F2FE] border-2 border-[#2C2523] shadow-[6px_6px_0px_#2C2523] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-[#E11D48] text-white text-xs font-black uppercase tracking-wider border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523]">
                Party Games · 3 to 10 Couples
              </span>
              <span className="px-3 py-1 rounded-xl bg-white text-[#2C2523] text-xs font-bold border-2 border-[#2C2523]">
                6 to 20 Players · Couple Teams
              </span>
              <span className="px-3 py-1 rounded-xl bg-[#FEF3C7] text-[#92400E] text-xs font-bold border-2 border-[#2C2523]">
                Placement XP Only · 0 Coins · 0 Trophies
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C2523]">
              Multi-Couple Party Arcade (12 Playable Party Games)
            </h1>
            <p className="text-xs sm:text-sm text-[#6B5E58]">
              Every couple competes together as a two-partner team against 2 to 9 other paired couples! Earn placement-tiered XP (<strong>1st: +60 XP</strong>, <strong>2nd: +45 XP</strong>, <strong>3rd: +35 XP</strong>, <strong>Others: +25 XP</strong>) without affecting your 2v2 Couple Leaderboard trophies.
            </p>
          </div>

          {/* Quick Join by Party Code or Create Party Room Box */}
          <div className="p-4 rounded-2xl bg-white border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523] space-y-3 min-w-[290px]">
            <div className="text-xs font-black uppercase tracking-wider text-[#2C2523]">
              Quick Join Party Room by Code
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="6-CHAR CODE..."
                className="flex-1 px-3 py-2 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] text-xs font-mono font-bold uppercase"
              />
              <button
                type="button"
                disabled={!joinCodeInput.trim() || Boolean(busyAction)}
                onClick={() => handleJoinPartyRoom()}
                className="px-4 py-2 rounded-xl bg-[#2C2523] text-white text-xs font-bold border-2 border-[#2C2523] disabled:opacity-45"
              >
                Join
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setVisibility(visibility === 'public' ? 'private' : 'public')}
                className="px-2.5 py-1 rounded-lg bg-[#F3EFE6] border border-[#2C2523] text-[11px] font-bold text-[#2C2523] flex items-center gap-1"
              >
                {visibility === 'public' ? (
                  <>
                    <Globe className="w-3 h-3 text-emerald-700" /> Public Party
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-indigo-700" /> Private Party
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() => handleCreatePartyRoom()}
                className="px-3.5 py-1.5 rounded-xl bg-[#E11D48] text-white text-xs font-bold border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523]"
              >
                Host Selected Game
              </button>
            </div>
          </div>
        </div>

        {/* Unpaired Warning Banner */}
        {(!activeCouple || activeCouple.status !== 'active') && (
          <div className="p-4 rounded-2xl bg-[#FFF3CD] border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[#D97706]" />
              <div className="text-xs font-bold text-[#2C2523]">
                Party Games require two actively paired partners per couple slot. Pair with your partner first!
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenCouplePairing}
              className="px-4 py-2 rounded-xl bg-[#D96B43] text-white text-xs font-bold border-2 border-[#2C2523]"
            >
              Pair Partner Now
            </button>
          </div>
        )}

        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl border-2 border-[#2C2523] text-xs font-bold flex items-center justify-between ${
              statusMessage.type === 'error'
                ? 'bg-[#FDE8E8] text-[#9B1C1C]'
                : 'bg-[#DEF7EC] text-[#03543F]'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="underline font-black"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Open Public Party Rooms Browser */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#2C2523]">
                Open Public Party Rooms ({publicRooms.length})
              </h2>
              <p className="text-xs text-[#6B5E58]">
                Join an eligible public party room (under 10 couples). Joining automatically invites your paired partner to your couple slot.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchPublicPartyRooms}
              className="px-3 py-1.5 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] text-xs font-bold"
            >
              Refresh
            </button>
          </div>

          {loadingPublicRooms ? (
            <div className="py-6 text-center text-xs font-bold text-[#6B5E58]">
              Scanning open Party Rooms...
            </div>
          ) : publicRooms.length === 0 ? (
            <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-dashed border-[#2C2523]/30 text-center text-xs text-[#6B5E58]">
              No public Party Rooms are waiting in lobby right now. Select any of the 12 Party Games below to host a new room!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {publicRooms.map((room) => (
                <div
                  key={room.roomCode}
                  className="p-3.5 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-[#2C2523] text-white">
                        #{room.roomCode}
                      </span>
                      <span className="text-xs font-bold text-[#2C2523] truncate">
                        {room.gameTitle}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#6B5E58] mt-1">
                      Host: @{room.hostUsername} ·{' '}
                      <strong className="text-[#2C2523]">
                        {room.ReadyCoupleCount ?? room.CoupleCount ?? 1}/10 Couples
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleJoinPartyRoom(room.roomCode)}
                    className="px-3.5 py-2 rounded-xl bg-[#DEF7EC] hover:bg-[#BCF0DA] border-2 border-[#2C2523] text-xs font-bold text-[#03543F]"
                  >
                    Join Party
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All 12 Party Games Library Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-[#2C2523]">
              Party Game Library (12 Games · 3–10 Couples)
            </h2>
            <span className="text-xs font-bold text-[#6B5E58]">
              Select a game to host a Public or Private Party Room
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PARTY_GAMES.map((game) => {
              const isSelected = selectedPartyGameId === game.id;
              return (
                <div
                  key={game.id}
                  onClick={() => setSelectedPartyGameId(game.id)}
                  className={`p-5 rounded-3xl border-2 border-[#2C2523] cursor-pointer transition-all flex flex-col justify-between gap-4 ${
                    isSelected
                      ? 'bg-white shadow-[6px_6px_0px_#2C2523] -translate-y-0.5'
                      : 'bg-[#FDFBF7] hover:bg-white shadow-[3px_3px_0px_#2C2523]'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="px-2.5 py-1 rounded-xl border-2 border-[#2C2523] text-[10px] font-black uppercase text-[#2C2523]"
                        style={{ backgroundColor: game.accentColor }}
                      >
                        {game.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#2C2523] text-white text-[10px] font-bold">
                        3–10 Couples · {game.partyRounds || 4} Rounds
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-[#2C2523]">
                      {game.title}
                    </h3>
                    <p className="text-xs text-[#6B5E58] leading-relaxed">
                      {game.shortDesc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-dashed border-[#2C2523]/20 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#6B5E58]">
                      1st: +60 XP · 0 Coins · 0 🏆
                    </span>
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={(e) => {
                        e.stopPropagation();
                        animateButtonPress(e.currentTarget);
                        setSelectedPartyGameId(game.id);
                        handleCreatePartyRoom(game.id);
                      }}
                      className="px-4 py-2 rounded-xl bg-[#D96B43] hover:bg-[#C25934] text-white text-xs font-bold border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523] flex items-center gap-1.5"
                    >
                      <PartyPopper className="w-3.5 h-3.5" />
                      Create Party Room
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: PARTY ROOM LOBBY (3 TO 10 COUPLES · 6 TO 20 PLAYERS)
  // ============================================================================
  if (activeRoom && activeRoom.status === 'lobby') {
    const myPlayerEntry = (activeRoom.players || []).find(
      (p: any) => p.uid === currentUser.uid
    );
    const amIReady = Boolean(myPlayerEntry?.ready);

    return (
      <div className="space-y-6">
        {/* Top Party Room Header Bar */}
        <div
          className="p-5 sm:p-6 rounded-3xl border-2 border-[#2C2523] shadow-[6px_6px_0px_#2C2523] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          style={{ backgroundColor: activePartyGame.accentColor || '#FFE4E6' }}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-[#2C2523] text-white text-xs font-black uppercase">
                Party Room #{activeRoom.roomCode}
              </span>
              <span className="px-3 py-1 rounded-xl bg-white border-2 border-[#2C2523] text-xs font-bold text-[#2C2523]">
                {activeRoom.visibility === 'private' ? '🔒 Private Party' : '🌐 Public Party'}
              </span>
              <span
                className={`px-3 py-1 rounded-xl border-2 border-[#2C2523] text-xs font-black ${
                  canStartPartyGame
                    ? 'bg-[#DEF7EC] text-[#03543F]'
                    : 'bg-[#FEF3C7] text-[#92400E]'
                }`}
              >
                {readyCoupleSlots.length}/10 Couples Ready (Min 3 Couples Required)
              </span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2C2523]">
              {activePartyGame.title} · Party Lobby
            </h1>
            <p className="text-xs sm:text-sm text-[#2C2523]/80 font-medium">
              {activePartyGame.shortDesc}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(activeRoom.roomCode);
                setCopiedCode(true);
                window.setTimeout(() => setCopiedCode(false), 1800);
              }}
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#F3EFE6] border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] text-xs font-bold flex items-center gap-1.5"
            >
              {copiedCode ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copiedCode ? 'Copied Code!' : `Copy Code (${activeRoom.roomCode})`}
            </button>

            <button
              type="button"
              onClick={onLeaveRoom}
              className="px-4 py-2.5 rounded-2xl bg-[#FDE8E8] hover:bg-[#FBD5D5] text-[#9B1C1C] border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] text-xs font-bold flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Leave Party
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl border-2 border-[#2C2523] text-xs font-bold flex items-center justify-between ${
              statusMessage.type === 'error'
                ? 'bg-[#FDE8E8] text-[#9B1C1C]'
                : 'bg-[#DEF7EC] text-[#03543F]'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="underline font-black"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Host Controls & Ready Action Bar */}
        <div className="p-5 rounded-3xl bg-white border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busyAction === 'ready'}
              onClick={handleToggleReady}
              className={`px-5 py-3 rounded-2xl border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] text-xs font-black uppercase flex items-center gap-2 ${
                amIReady
                  ? 'bg-[#DEF7EC] text-[#03543F]'
                  : 'bg-[#FEF3C7] text-[#92400E]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {amIReady ? 'You Are Ready ✓ (Click to Unready)' : 'Click Ready for Party'}
            </button>

            {isHost && (
              <>
                <select
                  value={activePartyGame.id}
                  onChange={(e) => handleHostChangeGame(e.target.value)}
                  className="px-3.5 py-2.5 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] text-xs font-bold text-[#2C2523]"
                >
                  {PARTY_GAMES.map((g) => (
                    <option key={g.id} value={g.id}>
                      Game: {g.title}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5 bg-[#FDFBF7] px-3 py-1.5 rounded-2xl border-2 border-[#2C2523]">
                  <input
                    type="text"
                    value={inviteCoupleUsername}
                    onChange={(e) => setInviteCoupleUsername(e.target.value)}
                    placeholder="Invite couple @username..."
                    className="bg-transparent text-xs font-bold text-[#2C2523] placeholder:text-[#6B5E58]/70 focus:outline-none w-36"
                  />
                  <button
                    type="button"
                    disabled={busyAction === 'invite-couple' || !inviteCoupleUsername.trim()}
                    onClick={handleInviteCoupleToParty}
                    className="ml-1 px-3 py-1.5 rounded-xl bg-[#E3E8FF] hover:bg-[#D0D8FF] border border-[#2C2523] text-[11px] font-black text-[#3B4CCA] disabled:opacity-45"
                  >
                    {busyAction === 'invite-couple' ? 'Sending...' : 'Invite Couple'}
                  </button>
                </div>
              </>
            )}
          </div>

          {isHost ? (
            <button
              type="button"
              disabled={!canStartPartyGame || busyAction === 'start'}
              onClick={handleStartPartySession}
              className="px-6 py-3.5 rounded-2xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-sm border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523] flex items-center justify-center gap-2 disabled:opacity-45"
            >
              <Play className="w-4 h-4" />
              {canStartPartyGame
                ? `Start ${activePartyGame.title} (${readyCoupleSlots.length} Couples)`
                : `Need ${Math.max(0, 3 - readyCoupleSlots.length)} More Ready Couple(s) to Start`}
            </button>
          ) : (
            <div className="px-4 py-2.5 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] text-xs font-bold text-[#6B5E58]">
              Waiting for Host (@{activeRoom.hostUsername}) to start ({readyCoupleSlots.length}/10 Couples Ready)...
            </div>
          )}
        </div>

        {/* 10 Couple Team Slots Grid (3 to 10 Couples · 6 to 20 Players) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 10 }).map((_, slotIdx) => {
            const slot = coupleSlots[slotIdx];
            const isMinimumSlot = slotIdx < 3;
            return (
              <div
                key={slot ? slot.coupleId : `empty-${slotIdx}`}
                className={`p-4 rounded-3xl border-2 border-[#2C2523] transition-all ${
                  slot
                    ? slot.bothReady
                      ? 'bg-white shadow-[4px_4px_0px_#2C2523]'
                      : 'bg-[#FFFBEB] shadow-[3px_3px_0px_#2C2523]'
                    : 'bg-[#FDFBF7]/70 border-dashed'
                }`}
              >
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#2C2523]/15">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#2C2523] text-white text-[10px] font-black uppercase">
                      Couple Team #{slotIdx + 1}
                    </span>
                    {slot ? (
                      <span className="font-serif text-sm font-bold text-[#2C2523]">
                        {slot.coupleName}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-[#6B5E58]">
                        {isMinimumSlot
                          ? 'Required Slot (Min 3 Couples)'
                          : 'Open Couple Slot'}
                      </span>
                    )}
                  </div>

                  {slot && (
                    <span
                      className={`px-2.5 py-0.5 rounded-md border border-[#2C2523] text-[10px] font-black uppercase ${
                        slot.bothReady
                          ? 'bg-[#DEF7EC] text-[#03543F]'
                          : 'bg-[#FEF3C7] text-[#92400E]'
                      }`}
                    >
                      {slot.bothReady
                        ? 'Both Partners Ready ✓'
                        : slot.bothJoined
                        ? 'Waiting to Ready Up'
                        : 'Waiting for Partner (1/2)'}
                    </span>
                  )}
                </div>

                {slot ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                    {[0, 1].map((memberIdx) => {
                      const member = slot.members[memberIdx];
                      return (
                        <div
                          key={member ? member.uid : `missing-${memberIdx}`}
                          className="p-2.5 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] flex items-center justify-between gap-2"
                        >
                          {member ? (
                            <>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <AnimatedSkinnedAvatar
                                  avatarId={member.avatar || '🦊'}
                                  customPhotoUrl={member.customPhotoUrl}
                                  skinId={member.equippedSkin}
                                  size="sm"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-[#2C2523] truncate">
                                    @{member.username}
                                  </div>
                                  <div
                                    className={`text-[10px] font-black ${
                                      member.ready
                                        ? 'text-emerald-700'
                                        : 'text-amber-700'
                                    }`}
                                  >
                                    {member.ready ? 'Ready ✓' : 'Not Ready'}
                                  </div>
                                </div>
                              </div>
                              {isHost && member.uid !== currentUser.uid && (
                                <button
                                  type="button"
                                  onClick={() => handleKickParticipant(member.uid)}
                                  className="p-1.5 rounded-lg bg-white hover:bg-[#FDE8E8] border border-[#2C2523] text-[#9B1C1C]"
                                  title="Remove participant"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <div className="py-2 text-[11px] font-bold text-[#6B5E58]">
                              Partner Invited · Waiting to join...
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-5 text-center text-xs text-[#6B5E58]">
                    Open for any actively paired couple (2 partners)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 3: FINAL COUPLE PODIUM & RESULTS SCREEN
  // ============================================================================
  if (partyState.phase === 'finished') {
    const sortedCouples = [...coupleSlots].sort((a, b) => {
      const scoreB = Number(partyState.coupleScores[String(b.coupleId)] || 0);
      const scoreA = Number(partyState.coupleScores[String(a.coupleId)] || 0);
      return scoreB - scoreA;
    });

    return (
      <div className="space-y-6">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#FEF3C7] via-[#FDFBF7] to-[#FFE4E6] border-2 border-[#2C2523] shadow-[8px_8px_0px_#2C2523] text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-2xl bg-[#2C2523] text-white text-xs font-black uppercase">
            <Trophy className="w-4 h-4 text-[#FBBF24]" />
            {activePartyGame.title} · Final Couple Podium
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#2C2523]">
            🎉 Champion Couple: {sortedCouples[0]?.coupleName || 'Your Couple'}!
          </h1>
          <p className="text-xs sm:text-sm text-[#6B5E58] max-w-xl mx-auto">
            Party Games award placement-tiered XP to both partners (<strong>+{recordedMatchAward?.xpEarned ?? 60} XP</strong> earned for Rank #{recordedMatchAward?.rank ?? 1}) with <strong>0 Coins</strong> and <strong>0 Couple Trophies</strong>.
          </p>

          {/* Top 3 Couple Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 max-w-4xl mx-auto">
            {sortedCouples.slice(0, 3).map((couple, idx) => {
              const rank = idx + 1;
              const totalScore = Number(
                partyState.coupleScores[String(couple.coupleId)] || 0
              );
              const xpReward = getPartyPlacementXp(rank);
              const medal = rank === 1 ? '🥇 1st Place' : rank === 2 ? '🥈 2nd Place' : '🥉 3rd Place';
              return (
                <div
                  key={couple.coupleId}
                  className={`p-5 rounded-3xl border-2 border-[#2C2523] text-left space-y-3 ${
                    rank === 1
                      ? 'bg-[#FEF3C7] shadow-[6px_6px_0px_#2C2523]'
                      : 'bg-white shadow-[4px_4px_0px_#2C2523]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-xl bg-[#2C2523] text-white text-xs font-black">
                      {medal}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-[#DEF7EC] border border-[#2C2523] text-xs font-black text-[#03543F]">
                      +{xpReward} XP Each
                    </span>
                  </div>
                  <div>
                    <div className="font-serif text-lg font-bold text-[#2C2523]">
                      {couple.coupleName}
                    </div>
                    <div className="text-2xl font-black text-[#E11D48] font-mono">
                      {totalScore} pts
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-[#2C2523]/15">
                    {couple.members.map((m) => (
                      <div
                        key={m.uid}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-[#2C2523]">
                          @{m.username}
                        </span>
                        <span className="font-mono font-bold text-[#6B5E58]">
                          {Number(partyState.partnerScores[m.uid] || 0)} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full Standings Table (Ranks 1 to 10) */}
          <div className="max-w-3xl mx-auto pt-4">
            <div className="bg-white rounded-2xl border-2 border-[#2C2523] overflow-hidden text-left">
              <div className="px-4 py-2.5 bg-[#2C2523] text-white text-xs font-black uppercase flex items-center justify-between">
                <span>All Participating Couples ({sortedCouples.length})</span>
                <span>Team Score · Placement XP</span>
              </div>
              <div className="divide-y divide-[#2C2523]/15">
                {sortedCouples.map((c, idx) => {
                  const rank = idx + 1;
                  const score = Number(
                    partyState.coupleScores[String(c.coupleId)] || 0
                  );
                  return (
                    <div
                      key={c.coupleId}
                      className="px-4 py-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-sm text-[#2C2523]">
                          #{rank}
                        </span>
                        <div>
                          <div className="font-bold text-[#2C2523]">
                            {c.coupleName}
                          </div>
                          <div className="text-[11px] text-[#6B5E58]">
                            {c.members.map((m) => `@${m.username}`).join(' & ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-sm text-[#2C2523]">
                          {score} pts
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-[#DEF7EC] border border-[#2C2523] font-black text-[#03543F]">
                          +{getPartyPlacementXp(rank)} XP · 0 🪙 · 0 🏆
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleReturnToPartyLobby}
              className="px-6 py-3 rounded-2xl bg-[#2C2523] text-white text-xs font-bold border-2 border-[#2C2523] shadow-[3px_3px_0px_#D96B43] flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again / Switch Party Game in Lobby
            </button>
            <button
              type="button"
              onClick={onLeaveRoom}
              className="px-5 py-3 rounded-2xl bg-white text-[#2C2523] text-xs font-bold border-2 border-[#2C2523] flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Exit Party Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 4: ACTIVE MULTI-ROUND PARTY GAMEPLAY ARENA (ALL 12 PARTY GAMES)
  // ============================================================================
  const rIdx = partyState.roundIndex;

  return (
    <div className="space-y-5">
      {/* Top In-Game HUD Header */}
      <div
        className="p-4 sm:p-5 rounded-3xl border-2 border-[#2C2523] shadow-[5px_5px_0px_#2C2523] flex flex-wrap items-center justify-between gap-3"
        style={{ backgroundColor: activePartyGame.accentColor || '#E0F2FE' }}
      >
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-2xl bg-[#2C2523] text-white text-xs font-black uppercase">
            Round {rIdx + 1} of {partyState.totalRounds}
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-[#2C2523]">
              {activePartyGame.title}
            </h2>
            <p className="text-xs text-[#2C2523]/80 font-bold">
              Room #{activeRoom?.roomCode} · {coupleSlots.length} Couples Competing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePauseParty}
            className="px-3.5 py-2 rounded-xl bg-white border-2 border-[#2C2523] text-xs font-bold flex items-center gap-1.5"
          >
            {partyState.paused ? (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-700" /> Resume
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-700" /> Pause
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleAdvanceRoundOrFinish}
            className="px-4 py-2 rounded-xl bg-[#2C2523] text-white border-2 border-[#2C2523] text-xs font-bold"
          >
            {rIdx + 1 >= partyState.totalRounds
              ? 'Finish & View Podium →'
              : 'Next Round →'}
          </button>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="px-3 py-2 rounded-xl bg-[#FDE8E8] text-[#9B1C1C] border-2 border-[#2C2523] text-xs font-bold"
          >
            Leave
          </button>
        </div>
      </div>

      {partyState.paused && (
        <div className="p-4 rounded-2xl bg-[#FEF3C7] border-2 border-[#2C2523] text-center text-xs font-black text-[#92400E]">
          ⏸️ Party Session Paused — Click Resume above when all couples are ready to continue.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Interactive Stage (8 cols) */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-white border-2 border-[#2C2523] shadow-[6px_6px_0px_#2C2523] space-y-5">
          {/* 1. COUPLE QUIZ SHOWDOWN */}
          {activePartyGame.id === 'party-couple-quiz-showdown' && (() => {
            const q = QUIZ_SHOWDOWN_QUESTIONS[rIdx % QUIZ_SHOWDOWN_QUESTIONS.length];
            return (
              <div className="space-y-4">
                <div className="text-xs font-black uppercase text-[#E11D48]">
                  Couple Quiz Showdown · Synchronized Team Question
                </div>
                <h3 className="font-serif text-xl font-bold text-[#2C2523]">
                  {q.prompt}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options.map((opt, idx) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(myCurrentRoundSubmission)}
                      onClick={() => {
                        setSelectedOptionIdx(idx);
                        const pts = idx === q.correctIndex ? 120 : 40;
                        submitRoundContribution(opt, pts);
                      }}
                      className={`p-4 rounded-2xl border-2 border-[#2C2523] text-left text-xs font-bold transition-all ${
                        selectedOptionIdx === idx
                          ? 'bg-[#DEF7EC] shadow-[3px_3px_0px_#2C2523]'
                          : 'bg-[#FDFBF7] hover:bg-[#F3EFE6]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 2. DRAW & GUESS PARTY */}
          {activePartyGame.id === 'party-draw-and-guess' && (() => {
            const dPrompt = DRAW_AND_GUESS_PROMPTS[rIdx % DRAW_AND_GUESS_PROMPTS.length];
            return (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-black uppercase text-[#D97706]">
                      Draw & Guess Party · Clue Hint: {dPrompt.hint}
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[#2C2523]">
                      Artist Secret Word: <span className="text-[#E11D48]">{dPrompt.word}</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {['#2C2523', '#E11D48', '#2563EB', '#059669', '#D97706'].map(
                      (c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBrushColor(c)}
                          className={`w-6 h-6 rounded-full border-2 ${
                            brushColor === c
                              ? 'border-[#2C2523] scale-110'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      )
                    )}
                  </div>
                </div>

                <canvas
                  ref={canvasRef}
                  width={560}
                  height={220}
                  onMouseDown={handleStartCanvasStroke}
                  onMouseMove={handleMoveCanvasStroke}
                  onMouseUp={handleEndCanvasStroke}
                  onMouseLeave={handleEndCanvasStroke}
                  className="w-full h-52 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] cursor-crosshair"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {dPrompt.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(myCurrentRoundSubmission)}
                      onClick={() =>
                        submitRoundContribution(
                          opt,
                          opt === dPrompt.word ? 130 : 45
                        )
                      }
                      className="p-3 rounded-xl bg-[#FDFBF7] hover:bg-[#DEF7EC] border-2 border-[#2C2523] text-xs font-bold text-[#2C2523]"
                    >
                      Guess: {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 3. CHARADES CHALLENGE */}
          {activePartyGame.id === 'party-charades-challenge' && (() => {
            const ch = CHARADES_CHALLENGES[rIdx % CHARADES_CHALLENGES.length];
            return (
              <div className="space-y-4">
                <div className="text-xs font-black uppercase text-[#4F46E5]">
                  Charades Challenge · Act & Decode the Scene
                </div>
                <div className="p-4 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] space-y-2">
                  <div className="text-xs font-bold text-[#6B5E58]">
                    Live Actor Stage Gestures:
                  </div>
                  {ch.cues.map((cue) => (
                    <div
                      key={cue}
                      className="p-2.5 rounded-xl bg-white border border-[#2C2523] text-xs font-bold text-[#2C2523]"
                    >
                      {cue}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ch.options.map((opt, idx) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(myCurrentRoundSubmission)}
                      onClick={() =>
                        submitRoundContribution(
                          opt,
                          idx === ch.correctIndex ? 125 : 40
                        )
                      }
                      className="p-3.5 rounded-2xl bg-[#FDFBF7] hover:bg-[#DEF7EC] border-2 border-[#2C2523] text-left text-xs font-bold"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 4. WORD ASSOCIATION BATTLE */}
          {activePartyGame.id === 'party-word-association' && (() => {
            const wa = WORD_ASSOCIATION_ROUNDS[rIdx % WORD_ASSOCIATION_ROUNDS.length];
            return (
              <div className="space-y-4">
                <div className="text-xs font-black uppercase text-[#059669]">
                  Word Association Battle · Couple Mind-Meld
                </div>
                <div className="flex items-center justify-center gap-4 py-3">
                  <span className="px-4 py-2 rounded-2xl bg-[#FEF3C7] border-2 border-[#2C2523] font-mono text-sm font-black">
                    {wa.clueA}
                  </span>
                  <span className="font-black text-lg">+</span>
                  <span className="px-4 py-2 rounded-2xl bg-[#E0F2FE] border-2 border-[#2C2523] font-mono text-sm font-black">
                    {wa.clueB}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#2C2523] text-center">
                  {wa.prompt}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {wa.options.map((opt, idx) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(myCurrentRoundSubmission)}
                      onClick={() =>
                        submitRoundContribution(
                          opt,
                          idx === wa.correctIndex ? 120 : 45
                        )
                      }
                      className="p-3.5 rounded-2xl bg-[#FDFBF7] hover:bg-[#DEF7EC] border-2 border-[#2C2523] font-bold text-xs"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 5. EMOJI DECODE */}
          {activePartyGame.id === 'party-emoji-decode' && (() => {
            const em = EMOJI_DECODE_PUZZLES[rIdx % EMOJI_DECODE_PUZZLES.length];
            return (
              <div className="space-y-4 text-center">
                <div className="text-xs font-black uppercase text-[#D97706]">
                  Emoji Decode · Category: {em.category}
                </div>
                <div className="py-5 px-6 rounded-3xl bg-[#FDFBF7] border-2 border-[#2C2523] text-4xl tracking-widest">
                  {em.emojis}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {em.options.map((opt, idx) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(myCurrentRoundSubmission)}
                      onClick={() =>
                        submitRoundContribution(
                          opt,
                          idx === em.correctIndex ? 125 : 40
                        )
                      }
                      className="p-3.5 rounded-2xl bg-[#FDFBF7] hover:bg-[#DEF7EC] border-2 border-[#2C2523] text-xs font-bold"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 6. REACTION RUMBLE */}
          {activePartyGame.id === 'party-reaction-rumble' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-[#E11D48]">
                  Reaction Rumble · Tap 5 Glowing Targets Fastest!
                </span>
                <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-[#2C2523] text-white">
                  Hits: {reactionHits} / 5
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                {Array.from({ length: 9 }).map((_, cellIdx) => {
                  const isTarget = cellIdx === activeTargetCell;
                  return (
                    <button
                      key={cellIdx}
                      type="button"
                      disabled={Boolean(myCurrentRoundSubmission)}
                      onClick={() => {
                        if (!isTarget) return;
                        const nextHits = reactionHits + 1;
                        setReactionHits(nextHits);
                        setActiveTargetCell((cellIdx + 4) % 9);
                        if (nextHits >= 5) {
                          submitRoundContribution('5x Reflex Blitz', 135);
                        }
                      }}
                      className={`h-20 rounded-2xl border-2 border-[#2C2523] font-black text-xl flex items-center justify-center transition-all ${
                        isTarget
                          ? 'bg-[#FFE4E6] shadow-[3px_3px_0px_#2C2523] scale-105'
                          : 'bg-[#FDFBF7]'
                      }`}
                    >
                      {isTarget ? '⚡ TAP!' : '·'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 7. MEMORY MAYHEM */}
          {activePartyGame.id === 'party-memory-mayhem' && (() => {
            const targetCells = [
              (rIdx + 1) % 9,
              (rIdx + 4) % 9,
              (rIdx + 7) % 9,
            ];
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-[#7C3AED]">
                    Memory Mayhem · Recall the 3 Star Tiles
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMemoryRevealPhase(true);
                      window.setTimeout(() => setMemoryRevealPhase(false), 1800);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#FDFBF7] border border-[#2C2523] text-[11px] font-bold"
                  >
                    Peek Pattern
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const isStar = targetCells.includes(idx);
                    const isPicked = memoryPickedCells.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={
                          memoryRevealPhase ||
                          isPicked ||
                          Boolean(myCurrentRoundSubmission)
                        }
                        onClick={() => {
                          const nextPicked = [...memoryPickedCells, idx];
                          setMemoryPickedCells(nextPicked);
                          if (nextPicked.length >= 3) {
                            const hits = nextPicked.filter((c) =>
                              targetCells.includes(c)
                            ).length;
                            submitRoundContribution(
                              `${hits}/3 Memory Stars`,
                              hits * 45
                            );
                          }
                        }}
                        className={`h-20 rounded-2xl border-2 border-[#2C2523] text-2xl flex items-center justify-center ${
                          memoryRevealPhase && isStar
                            ? 'bg-[#FEF3C7]'
                            : isPicked
                            ? isStar
                              ? 'bg-[#DEF7EC]'
                              : 'bg-[#FDE8E8]'
                            : 'bg-[#FDFBF7]'
                        }`}
                      >
                        {memoryRevealPhase && isStar
                          ? '🌟'
                          : isPicked
                          ? isStar
                            ? '🌟'
                            : '✖'
                          : '❓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 8. TWO TRUTHS & A LIE */}
          {activePartyGame.id === 'party-two-truths-and-a-lie' && (() => {
            const tt = TWO_TRUTHS_ROUNDS[rIdx % TWO_TRUTHS_ROUNDS.length];
            return (
              <div className="space-y-4">
                <div className="text-xs font-black uppercase text-[#E11D48]">
                  Two Truths & A Lie · Spot the Bluff ({tt.coupleTheme})
                </div>
                <p className="text-xs text-[#6B5E58]">
                  Two statements below are true and one is a lie. Select the LIE to score couple points!
                </p>
                <div className="space-y-2.5">
                  {tt.statements.map((st, idx) => (
                    <button
                      key={st}
                      type="button"
                      disabled={Boolean(myCurrentRoundSubmission)}
                      onClick={() =>
                        submitRoundContribution(
                          `Picked Statement #${idx + 1}`,
                          idx === tt.lieIndex ? 125 : 40
                        )
                      }
                      className="w-full p-4 rounded-2xl bg-[#FDFBF7] hover:bg-[#DEF7EC] border-2 border-[#2C2523] text-left text-xs font-bold"
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 9. PUZZLE RUSH */}
          {activePartyGame.id === 'party-puzzle-rush' && (() => {
            const pz = PUZZLE_RUSH_PATTERNS[rIdx % PUZZLE_RUSH_PATTERNS.length];
            return (
              <div className="space-y-4">
                <div className="text-xs font-black uppercase text-[#0284C7]">
                  Puzzle Rush · Cooperative Pattern Race
                </div>
                <div className="p-4 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] flex items-center justify-center gap-2 flex-wrap">
                  {pz.sequence.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-2 rounded-xl bg-white border-2 border-[#2C2523] font-mono text-base font-black"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <p className="text-xs font-bold text-[#2C2523]">{pz.prompt}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {pz.options.map((opt, idx) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(myCurrentRoundSubmission)}
                      onClick={() =>
                        submitRoundContribution(
                          opt,
                          idx === pz.correctIndex ? 130 : 45
                        )
                      }
                      className="p-3.5 rounded-2xl bg-[#FDFBF7] hover:bg-[#DEF7EC] border-2 border-[#2C2523] font-mono text-sm font-black"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 10. TREASURE HUNT PARTY */}
          {activePartyGame.id === 'party-treasure-hunt' && (() => {
            const relicCell = ((rIdx + 1) * 7 + 3) % 16;
            const relicRow = Math.floor(relicCell / 4);
            const relicCol = relicCell % 4;
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-[#D97706]">
                    Treasure Hunt Party · Radar Clues: Row {relicRow + 1} Area
                  </span>
                  <span className="text-xs font-bold text-[#6B5E58]">
                    Digs Used: {treasureDugCells.length}/3
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2.5 max-w-md mx-auto">
                  {Array.from({ length: 16 }).map((_, cell) => {
                    const isDug = treasureDugCells.includes(cell);
                    const isRelic = cell === relicCell;
                    const row = Math.floor(cell / 4);
                    const col = cell % 4;
                    const dist =
                      Math.abs(row - relicRow) + Math.abs(col - relicCol);
                    return (
                      <button
                        key={cell}
                        type="button"
                        disabled={isDug || Boolean(myCurrentRoundSubmission)}
                        onClick={() => {
                          const nextDug = [...treasureDugCells, cell];
                          setTreasureDugCells(nextDug);
                          if (isRelic) {
                            submitRoundContribution(
                              'Unearthed Golden Relic 👑',
                              140
                            );
                          } else if (nextDug.length >= 3) {
                            submitRoundContribution(
                              'Sonar Triangulation',
                              75
                            );
                          }
                        }}
                        className={`h-16 rounded-2xl border-2 border-[#2C2523] font-bold text-xs flex items-center justify-center ${
                          isDug
                            ? isRelic
                              ? 'bg-[#FEF3C7]'
                              : 'bg-[#E0F2FE]'
                            : 'bg-[#FDFBF7] hover:bg-[#F3EFE6]'
                        }`}
                      >
                        {isDug
                          ? isRelic
                            ? '👑 RELIC!'
                            : dist === 1
                            ? '🔥 HOT'
                            : '🌊 WARM'
                          : '🏝️ DIG'}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 11. STORY CHAIN */}
          {activePartyGame.id === 'party-story-chain' && (
            <div className="space-y-4">
              <div className="text-xs font-black uppercase text-[#16A34A]">
                Story Chain · Collaborative Couple Twist Builder
              </div>
              <div className="p-4 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] space-y-2 max-h-44 overflow-y-auto">
                <div className="text-xs font-bold text-[#2C2523]">
                  Opening Line: &ldquo;At midnight inside Her Little Arcade, a glowing golden ticket floated out of the prize slot...&rdquo;
                </div>
                {(partyState.storyChain || []).map((entry, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white border border-[#2C2523] text-xs"
                  >
                    <strong className="text-[#E11D48]">
                      {entry.coupleName} (@{entry.username}):
                    </strong>{' '}
                    {entry.line}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={storyLineInput}
                  onChange={(e) => setStoryLineInput(e.target.value)}
                  placeholder="Write the next sentence in the story chain..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] text-xs font-medium"
                />
                <button
                  type="button"
                  disabled={
                    !storyLineInput.trim() || Boolean(myCurrentRoundSubmission)
                  }
                  onClick={() => {
                    const line = storyLineInput.trim();
                    setStoryLineInput('');
                    submitRoundContribution(line, 120, {
                      storyChain: [
                        ...(partyState.storyChain || []),
                        {
                          coupleName:
                            activeCouple?.coupleName || 'Couple Team',
                          username: currentUser.username,
                          line,
                        },
                      ],
                    });
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#2C2523] text-white text-xs font-bold border-2 border-[#2C2523] disabled:opacity-45"
                >
                  Add Twist (+120 pts)
                </button>
              </div>
            </div>
          )}

          {/* 12. QUICKFIRE CHALLENGE */}
          {activePartyGame.id === 'party-quickfire-challenge' && (() => {
            const qf = QUICKFIRE_TASKS[rIdx % QUICKFIRE_TASKS.length];
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-[#FFE4E6] border border-[#2C2523] text-[10px] font-black uppercase text-[#E11D48]">
                    Quickfire Blitz · {qf.category}
                  </span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#2C2523]">
                  {qf.question}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {qf.options.map((opt, idx) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={Boolean(myCurrentRoundSubmission)}
                      onClick={() =>
                        submitRoundContribution(
                          opt,
                          idx === qf.correctIndex ? 130 : 45
                        )
                      }
                      className="p-4 rounded-2xl bg-[#FDFBF7] hover:bg-[#DEF7EC] border-2 border-[#2C2523] font-bold text-sm"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Round Submission Confirmation Bar */}
          {myCurrentRoundSubmission && (
            <div className="p-3.5 rounded-2xl bg-[#DEF7EC] border-2 border-[#2C2523] flex items-center justify-between gap-3 text-xs font-bold text-[#03543F]">
              <span>
                ✓ Round {rIdx + 1} Submitted ({myCurrentRoundSubmission.answer}) ·{' '}
                <strong>+{myCurrentRoundSubmission.pointsAwarded} Couple Points</strong> added!
              </span>
              <button
                type="button"
                onClick={handleAdvanceRoundOrFinish}
                className="px-3.5 py-1.5 rounded-xl bg-[#03543F] text-white text-xs font-bold"
              >
                {rIdx + 1 >= partyState.totalRounds
                  ? 'Finish Match & View Podium →'
                  : 'Advance to Next Round →'}
              </button>
            </div>
          )}
        </div>

        {/* Live Couple Scoreboard & Partner Contributions (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-white border-2 border-[#2C2523] shadow-[6px_6px_0px_#2C2523] space-y-4">
          <div className="flex items-center justify-between border-b border-[#2C2523]/15 pb-3">
            <div>
              <h3 className="font-serif text-base font-bold text-[#2C2523]">
                Live Couple Standings
              </h3>
              <p className="text-[11px] text-[#6B5E58]">
                Combined couple score + partner breakdown
              </p>
            </div>
            <Trophy className="w-5 h-5 text-[#D97706]" />
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {[...coupleSlots]
              .sort((a, b) => {
                const sB = Number(
                  partyState.coupleScores[String(b.coupleId)] || 0
                );
                const sA = Number(
                  partyState.coupleScores[String(a.coupleId)] || 0
                );
                return sB - sA;
              })
              .map((slot, idx) => {
                const total = Number(
                  partyState.coupleScores[String(slot.coupleId)] || 0
                );
                return (
                  <div
                    key={slot.coupleId}
                    className="p-3 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#2C2523]">
                        #{idx + 1} · {slot.coupleName}
                      </span>
                      <span className="font-mono font-black text-[#E11D48]">
                        {total} pts
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#6B5E58]">
                      {slot.members.map((m) => (
                        <span key={m.uid}>
                          @{m.username}:{' '}
                          <strong>
                            {Number(partyState.partnerScores[m.uid] || 0)}
                          </strong>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
