'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Swords,
  Users,
  Search,
  Send,
  Copy,
  Check,
  Share2,
  Globe,
  Lock,
  ShieldCheck,
  Sparkles,
  Trophy,
  Play,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Heart,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { MULTIPLAYER_GAMES, ARCADE_SKINS, getSkinById } from '@/src/lib/arcade-data';
import {
  MultiplayerRoomState,
  RoomPendingRequest,
} from '@/src/components/VoiceAndLobbyDock';
import {
  useGsapModalTransition,
  animateButtonPress,
} from '@/src/lib/gsap-motion';

interface CouplePartnerSummary {
  uid: string;
  username: string;
  email?: string;
  avatar: string;
  level?: number;
  xp?: number;
  equippedSkin?: string;
  isOnline?: boolean;
  presenceStatus?: string;
}

interface ActiveCoupleSummary {
  id: number;
  pairingCode?: string;
  requesterUid: string;
  partnerUid: string;
  status: string;
  coupleName: string;
  coupleBanner: string;
  coupleTitle?: string;
  equippedCoupleSkin?: string;
  coupleTrophies: number;
  requesterProfile?: CouplePartnerSummary | null;
  partnerProfile: CouplePartnerSummary | null;
}

interface SearchedPlayerItem {
  uid: string;
  username: string;
  avatar: string;
  equippedSkin: string;
  level: number;
  isOnline: boolean;
  presenceStatus: string;
  isPairedPartner: boolean;
  hasActiveCouple: boolean;
  coupleName: string;
  coupleTrophies: number;
  alreadyInvited?: boolean;
  pendingRoomCode?: string;
}

interface OutgoingInvitationItem {
  id: number;
  inviteType: string;
  senderUid: string;
  targetUid: string;
  targetUsername: string;
  targetCoupleName: string;
  gameId: string;
  roomCode: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | string;
  createdAt?: string;
}

export interface CoupleTeamLobbyState {
  id: number;
  coupleId: number;
  coupleName: string;
  coupleTitle: string;
  coupleTrophies: number;
  equippedCoupleSkin: string;
  equippedBanner: string;
  gameId: string;
  hostUid: string;
  partnerUid: string;
  partnerInviteStatus: 'none' | 'pending' | 'accepted' | 'declined';
  hostReady: boolean;
  partnerReady: boolean;
  bothOnline: boolean;
  bothReady: boolean;
  hostProfile: {
    uid: string;
    username: string;
    avatar: string;
    equippedSkin: string;
    isOnline: boolean;
    ready: boolean;
  };
  partnerProfile: {
    uid: string;
    username: string;
    avatar: string;
    equippedSkin: string;
    isOnline: boolean;
    ready: boolean;
  };
}

interface MatchmakingQueueEntry {
  id: number;
  queueMode: '1v1' | '2v2';
  gameId: string;
  coupleId: number;
  coupleName: string;
  coupleTrophies: number;
  status: 'searching' | 'match_found' | 'match_starting' | 'cancelled' | 'expired';
  matchedRoomCode: string;
  opponentCoupleName: string;
  opponentProfiles: Array<{ uid: string; username: string; avatar: string }>;
  waitSeconds: number;
  allowedTrophyRange: number;
}

interface PlayGameSetupModalProps {
  isOpen: boolean;
  initialGameId: string;
  mode: '1v1' | '2v2';
  currentUser: {
    uid: string;
    username: string;
    avatar: string;
    equippedSkin?: string;
  };
  activeCouple: ActiveCoupleSummary | null;
  activeRoom: MultiplayerRoomState | null;
  authFetcher: (url: string, options?: RequestInit) => Promise<Response>;
  onClose: () => void;
  onRoomJoinedOrCreated: (room: MultiplayerRoomState, autoLaunchGame?: boolean) => void;
  onOpenCouplePairing: () => void;
  onSwitchMode?: (mode: '1v1' | '2v2') => void;
}

function parseRoomPayload(dbRoom: Record<string, unknown>): MultiplayerRoomState {
  const safeParse = <T,>(raw: unknown, fallback: T): T => {
    if (typeof raw !== 'string' || !raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  return {
    roomCode: String(dbRoom.roomCode || ''),
    gameId: String(dbRoom.gameId || 'chess'),
    mode: dbRoom.mode === '2v2' ? '2v2' : '1v1',
    visibility: dbRoom.visibility === 'private' ? 'private' : 'public',
    joinPolicy:
      dbRoom.joinPolicy === 'approval_required' ? 'approval_required' : 'immediate',
    maxPlayers: Number(dbRoom.maxPlayers || (dbRoom.mode === '2v2' ? 4 : 2)),
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

export function PlayGameSetupModal({
  isOpen,
  initialGameId,
  mode,
  currentUser,
  activeCouple,
  activeRoom,
  authFetcher,
  onClose,
  onRoomJoinedOrCreated,
  onOpenCouplePairing,
  onSwitchMode,
}: PlayGameSetupModalProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [selectedGameId, setSelectedGameId] = useState(initialGameId);
  const [active1v1Option, setActive1v1Option] = useState<'invite' | 'create_room'>('invite');

  // 1v1 Invite Partner / Player state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedPlayers, setSearchedPlayers] = useState<SearchedPlayerItem[]>([]);
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const [sendingInviteUid, setSendingInviteUid] = useState<string | null>(null);
  const [outgoingInvitations, setOutgoingInvitations] = useState<OutgoingInvitationItem[]>([]);

  // 1v1 Create Room state
  const [roomVisibility, setRoomVisibility] = useState<'public' | 'private'>('public');
  const [roomJoinPolicy, setRoomJoinPolicy] = useState<'immediate' | 'approval_required'>(
    'immediate'
  );
  const [roundFormat, setRoundFormat] = useState('Standard Match (Best of 3)');
  const [includePairedPartnerIn1v1Room, setIncludePairedPartnerIn1v1Room] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [respondingRequestUid, setRespondingRequestUid] = useState<string | null>(null);

  // 2v2 Team & Matchmaking state
  const [teamLobby, setTeamLobby] = useState<CoupleTeamLobbyState | null>(null);
  const [invitingPartner2v2, setInvitingPartner2v2] = useState(false);
  const [respondingPartner2v2, setRespondingPartner2v2] = useState(false);
  const [togglingReady2v2, setTogglingReady2v2] = useState(false);
  const [queueEntry, setQueueEntry] = useState<MatchmakingQueueEntry | null>(null);
  const [enqueuingMatch, setEnqueuingMatch] = useState(false);
  const [cancellingMatch, setCancellingMatch] = useState(false);

  const [statusBanner, setStatusBanner] = useState<{
    type: 'info' | 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (initialGameId) {
      Promise.resolve().then(() => {
        setSelectedGameId(initialGameId);
      });
    }
  }, [initialGameId, isOpen]);

  useGsapModalTransition(
    backdropRef,
    panelRef,
    isOpen,
    `${mode}-${selectedGameId}-${active1v1Option}`
  );

  const selectedGame =
    MULTIPLAYER_GAMES.find((g) => g.id === selectedGameId) || MULTIPLAYER_GAMES[0];

  const pairedPartner: CouplePartnerSummary | null = activeCouple
    ? (activeCouple.requesterUid === currentUser.uid
        ? activeCouple.partnerProfile
        : activeCouple.requesterProfile || activeCouple.partnerProfile) || null
    : null;

  const getSkinName = (skinId?: string) => {
    const found =
      getSkinById(skinId) ||
      ARCADE_SKINS.find((s) => s.id === (skinId || 'skin-classic-notebook'));
    return found ? `${found.emblem} ${found.name}` : '📓 Classic Notebook';
  };

  const getBannerLabel = (bannerId?: string) => {
    if (!bannerId || bannerId === 'banner-none') return 'Notebook Standard';
    return bannerId
      .replace(/^banner-/, '')
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const runPlayerSearch = useCallback(
    async (queryText: string) => {
      if (!currentUser.uid || mode !== '1v1') return;
      setSearchingPlayers(true);
      try {
        const res = await authFetcher(
          `/api/arcade?searchUsername=${encodeURIComponent(
            queryText.trim()
          )}&inviteType=1v1&uid=${encodeURIComponent(currentUser.uid)}`
        );
        const data = await res.json();
        if (res.ok) {
          setSearchedPlayers(Array.isArray(data.players) ? data.players : []);
        }
      } catch {
        // ignore transient search error
      } finally {
        setSearchingPlayers(false);
      }
    },
    [authFetcher, currentUser.uid, mode]
  );

  useEffect(() => {
    if (!isOpen || mode !== '1v1') return;
    const timer = window.setTimeout(() => {
      runPlayerSearch(searchQuery);
    }, 240);
    return () => window.clearTimeout(timer);
  }, [isOpen, mode, searchQuery, runPlayerSearch]);

  // Poll matchmaking, outgoing 1v1 invitations, and 2v2 Couple Team Lobby while modal is open
  const pollModalLiveState = useCallback(async () => {
    if (!isOpen || !currentUser.uid) return;
    try {
      const res = await authFetcher(
        `/api/arcade?matchmakingStatus=1&uid=${encodeURIComponent(currentUser.uid)}`
      );
      if (!res.ok) return;
      const data = await res.json();

      if (Array.isArray(data.outgoingInvitations)) {
        setOutgoingInvitations(data.outgoingInvitations);
        // Check if an outgoing 1v1 invitation for this session was just accepted
        const accepted1v1 = (data.outgoingInvitations as OutgoingInvitationItem[]).find(
          (inv) =>
            inv.inviteType === '1v1' &&
            inv.status === 'accepted' &&
            inv.gameId === selectedGameId &&
            inv.roomCode
        );
        if (accepted1v1 && (!activeRoom || activeRoom.roomCode !== accepted1v1.roomCode)) {
          const roomRes = await authFetcher(
            `/api/arcade?roomCode=${encodeURIComponent(accepted1v1.roomCode)}`
          );
          const roomData = await roomRes.json();
          if (roomData?.room) {
            const parsed = parseRoomPayload(roomData.room);
            onRoomJoinedOrCreated(parsed, true);
            return;
          }
        }
      }

      if (data.coupleTeamLobby) {
        setTeamLobby(data.coupleTeamLobby);
      }

      if (data.myQueueEntry) {
        setQueueEntry(data.myQueueEntry);
        if (
          (data.myQueueEntry.status === 'match_found' ||
            data.myQueueEntry.status === 'match_starting') &&
          data.matchedRoom
        ) {
          const parsed = parseRoomPayload(data.matchedRoom);
          if (data.myQueueEntry.status === 'match_found') {
            await authFetcher('/api/arcade', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'acknowledge_match_starting',
                queueId: data.myQueueEntry.id,
              }),
            });
          }
          onRoomJoinedOrCreated(parsed, true);
        }
      } else {
        setQueueEntry(null);
      }
    } catch {
      // ignore poll error
    }
  }, [
    isOpen,
    currentUser.uid,
    authFetcher,
    selectedGameId,
    activeRoom,
    onRoomJoinedOrCreated,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    Promise.resolve().then(() => {
      pollModalLiveState();
    });
    const interval = window.setInterval(pollModalLiveState, 2200);
    return () => window.clearInterval(interval);
  }, [isOpen, pollModalLiveState]);

  const handleSend1v1Invite = async (targetUsername: string, targetUid: string) => {
    if (!activeCouple || activeCouple.status !== 'active') {
      setStatusBanner({
        type: 'error',
        text: 'Couple pairing is required before sending a 1v1 invitation.',
      });
      return;
    }
    setSendingInviteUid(targetUid);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_game_invitation',
          inviteType: '1v1',
          targetUsername,
          gameId: selectedGameId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not send 1v1 invitation.');
      }
      if (data.room) {
        const parsedRoom = parseRoomPayload(data.room);
        onRoomJoinedOrCreated(parsedRoom, false);
      }
      setStatusBanner({
        type: 'success',
        text: `1v1 invitation sent to @${targetUsername}! Waiting for acceptance...`,
      });
      await pollModalLiveState();
      await runPlayerSearch(searchQuery);
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send invitation.',
      });
    } finally {
      setSendingInviteUid(null);
    }
  };

  const handleCreate1v1Room = async () => {
    if (!activeCouple || activeCouple.status !== 'active') {
      setStatusBanner({
        type: 'error',
        text: 'Active Couple Pairing is required before creating a multiplayer room.',
      });
      return;
    }
    setCreatingRoom(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_room',
          gameId: selectedGameId,
          mode: '1v1',
          visibility: roomVisibility,
          joinPolicy: roomVisibility === 'public' ? roomJoinPolicy : 'immediate',
          includePairedPartner: includePairedPartnerIn1v1Room,
          settings: {
            format: roundFormat,
            createdFromPlayFlow: true,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.room) {
        throw new Error(data.error || 'Failed to create room.');
      }
      const parsed = parseRoomPayload(data.room);
      onRoomJoinedOrCreated(parsed, false);
      setStatusBanner({
        type: 'success',
        text: `${
          parsed.visibility === 'private' ? 'Private' : 'Public'
        } Room #${parsed.roomCode} created for ${selectedGame.title}!`,
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not create room.',
      });
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleRespondJoinRequest = async (requesterUid: string, approve: boolean) => {
    if (!activeRoom) return;
    setRespondingRequestUid(requesterUid);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond_join_request',
          roomCode: activeRoom.roomCode,
          requesterUid,
          approve,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.room) {
        throw new Error(data.error || 'Failed to process join request.');
      }
      const parsed = parseRoomPayload(data.room);
      onRoomJoinedOrCreated(parsed, false);
      setStatusBanner({
        type: 'info',
        text: approve ? 'Player approved and added to room!' : 'Join request declined.',
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to respond to request.',
      });
    } finally {
      setRespondingRequestUid(null);
    }
  };

  const handleStartRoomMatchNow = async () => {
    if (!activeRoom) return;
    if (activeRoom.players.length < activeRoom.maxPlayers) {
      setStatusBanner({
        type: 'error',
        text: `Waiting for ${activeRoom.maxPlayers - activeRoom.players.length} more player(s) to join before starting.`,
      });
      return;
    }
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_room',
          ...activeRoom,
          status: 'playing',
        }),
      });
      const data = await res.json();
      if (res.ok && data.room) {
        const parsed = parseRoomPayload(data.room);
        onRoomJoinedOrCreated(parsed, true);
      }
    } catch {
      setStatusBanner({
        type: 'error',
        text: 'Failed to launch room match.',
      });
    }
  };

  const handleInvitePartner2v2 = async () => {
    if (!activeCouple || activeCouple.status !== 'active') {
      setStatusBanner({
        type: 'error',
        text: 'Couple pairing is required for 2v2 Couple Mode.',
      });
      return;
    }
    setInvitingPartner2v2(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'invite_partner_2v2_team',
          gameId: selectedGameId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not invite partner.');
      }
      if (data.teamLobby) {
        setTeamLobby(data.teamLobby);
      }
      setStatusBanner({
        type: 'success',
        text: `Team invitation sent to @${pairedPartner?.username || 'partner'}! Once they accept, both of you click Ready to unlock Find Match.`,
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to invite partner.',
      });
    } finally {
      setInvitingPartner2v2(false);
    }
  };

  const handleRespondPartner2v2 = async (accept: boolean) => {
    setRespondingPartner2v2(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond_partner_2v2_team',
          accept,
          gameId: selectedGameId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to respond to team invitation.');
      }
      if (data.teamLobby) {
        setTeamLobby(data.teamLobby);
      }
      setStatusBanner({
        type: accept ? 'success' : 'info',
        text: accept
          ? 'You joined the 2v2 Couple Team! Both partners can now click Ready.'
          : 'You declined the 2v2 team invitation.',
      });
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to respond.',
      });
    } finally {
      setRespondingPartner2v2(false);
    }
  };

  const handleToggleReady2v2 = async () => {
    setTogglingReady2v2(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_2v2_team_ready',
          gameId: selectedGameId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to toggle team readiness.');
      }
      if (data.teamLobby) {
        setTeamLobby(data.teamLobby);
      }
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not update readiness.',
      });
    } finally {
      setTogglingReady2v2(false);
    }
  };

  const handleFind2v2Match = async () => {
    setEnqueuingMatch(true);
    setStatusBanner(null);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enqueue_matchmaking',
          queueMode: '2v2',
          gameId: selectedGameId,
          requireTeamReady: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not start 2v2 matchmaking.');
      }
      if (data.myQueueEntry) {
        setQueueEntry(data.myQueueEntry);
      }
      if (data.matchedRoom) {
        const parsed = parseRoomPayload(data.matchedRoom);
        onRoomJoinedOrCreated(parsed, true);
      }
    } catch (err: unknown) {
      setStatusBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to start matchmaking.',
      });
    } finally {
      setEnqueuingMatch(false);
    }
  };

  const handleCancel2v2Matchmaking = async () => {
    setCancellingMatch(true);
    try {
      const res = await authFetcher('/api/arcade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_matchmaking',
          queueId: queueEntry?.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setQueueEntry(data.myQueueEntry || null);
      }
    } catch {
      // ignore
    } finally {
      setCancellingMatch(false);
    }
  };

  const copyRoomCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1800);
  };

  const copyShareLink = (code: string) => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(
            code
          )}`
        : code;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
  };

  if (!isOpen) return null;

  const isRoomForSelectedGame =
    activeRoom &&
    activeRoom.status === 'lobby' &&
    activeRoom.gameId === selectedGameId &&
    activeRoom.mode === mode;

  const myReadyIn2v2 =
    teamLobby?.hostUid === currentUser.uid
      ? Boolean(teamLobby?.hostReady)
      : Boolean(teamLobby?.partnerReady);

  const canFind2v2Match =
    Boolean(teamLobby) &&
    teamLobby!.partnerInviteStatus === 'accepted' &&
    teamLobby!.hostReady &&
    teamLobby!.partnerReady &&
    teamLobby!.bothOnline;

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2C2523]/70 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-4xl bg-[#FDFBF7] border-2 border-[#2C2523] rounded-3xl shadow-[8px_8px_0px_#2C2523] overflow-hidden my-auto max-h-[92vh] flex flex-col"
      >
        {/* Top Modal Header */}
        <div
          className="px-5 py-4 border-b-2 border-[#2C2523] flex items-center justify-between gap-3"
          style={{ backgroundColor: selectedGame.accentColor || '#F3EFE6' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523] flex items-center justify-center shrink-0">
              {mode === '1v1' ? (
                <Swords className="w-5 h-5 text-[#2C2523]" />
              ) : (
                <Users className="w-5 h-5 text-[#2C2523]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg bg-[#2C2523] text-white text-[10px] font-black uppercase tracking-wider">
                  {mode === '1v1' ? '1v1 Duel Setup' : '2v2 Team & Matchmaking'}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-white/90 border border-[#2C2523] text-[10px] font-bold text-[#2C2523]">
                  {mode === '1v1'
                    ? 'XP Only · 0 Coins · 0 Trophies'
                    : 'XP + Coins + Couple Trophies 🏆'}
                </span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#2C2523] truncate mt-0.5">
                {selectedGame.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedGame.supports2v2 && onSwitchMode && (
              <div className="hidden sm:flex items-center rounded-xl border-2 border-[#2C2523] bg-white p-0.5 shadow-[2px_2px_0px_#2C2523]">
                <button
                  type="button"
                  onClick={() => onSwitchMode('1v1')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors ${
                    mode === '1v1'
                      ? 'bg-[#2C2523] text-white'
                      : 'text-[#2C2523] hover:bg-[#F3EFE6]'
                  }`}
                >
                  1v1 Mode
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchMode('2v2')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors ${
                    mode === '2v2'
                      ? 'bg-[#E11D48] text-white'
                      : 'text-[#2C2523] hover:bg-[#F3EFE6]'
                  }`}
                >
                  2v2 Couple
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                animateButtonPress(e.currentTarget);
                onClose();
              }}
              className="w-9 h-9 rounded-xl bg-white border-2 border-[#2C2523] flex items-center justify-center hover:bg-[#F3EFE6] transition-colors shrink-0"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-[#2C2523]" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Couple Pairing Gate Warning if Unpaired */}
          {(!activeCouple || activeCouple.status !== 'active') && (
            <div
              data-gsap-modal-item
              className="p-4 rounded-2xl bg-[#FFF3CD] border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#2C2523]">
                    Active Couple Pairing Required
                  </p>
                  <p className="text-xs text-[#6B5E58]">
                    Both 1v1 and 2v2 modes require an active couple pairing with your partner first.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenCouplePairing}
                className="px-4 py-2 rounded-xl bg-[#D96B43] text-white text-xs font-bold border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523] shrink-0"
              >
                Pair Partner Now
              </button>
            </div>
          )}

          {statusBanner && (
            <div
              data-gsap-modal-item
              className={`p-3.5 rounded-2xl border-2 border-[#2C2523] text-xs font-bold flex items-center justify-between gap-3 ${
                statusBanner.type === 'error'
                  ? 'bg-[#FDE8E8] text-[#9B1C1C]'
                  : statusBanner.type === 'success'
                  ? 'bg-[#DEF7EC] text-[#03543F]'
                  : 'bg-[#E1EFFE] text-[#1E429F]'
              }`}
            >
              <span>{statusBanner.text}</span>
              <button
                type="button"
                onClick={() => setStatusBanner(null)}
                className="text-xs underline font-black"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ================================================================
              MODE A: 1V1 PLAY GAME FLOW (Option 1: Invite Player | Option 2: Create Room)
             ================================================================ */}
          {mode === '1v1' && (
            <div className="space-y-5">
              {/* Two Main 1v1 Mode Tabs */}
              <div
                data-gsap-modal-item
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    animateButtonPress(e.currentTarget);
                    setActive1v1Option('invite');
                  }}
                  className={`p-4 rounded-2xl border-2 border-[#2C2523] text-left transition-all flex items-start gap-3 ${
                    active1v1Option === 'invite'
                      ? 'bg-[#E3E8FF] shadow-[4px_4px_0px_#2C2523] -translate-y-0.5'
                      : 'bg-white hover:bg-[#F3EFE6]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#2C2523] flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5 text-[#3B4CCA]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#3B4CCA]">
                      Option 1
                    </div>
                    <div className="font-serif text-base font-bold text-[#2C2523]">
                      Invite Partner / Player
                    </div>
                    <p className="text-xs text-[#6B5E58] mt-0.5">
                      Search by unique @username, check online status, and start immediately when accepted.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    animateButtonPress(e.currentTarget);
                    setActive1v1Option('create_room');
                  }}
                  className={`p-4 rounded-2xl border-2 border-[#2C2523] text-left transition-all flex items-start gap-3 ${
                    active1v1Option === 'create_room'
                      ? 'bg-[#FFE4E6] shadow-[4px_4px_0px_#2C2523] -translate-y-0.5'
                      : 'bg-white hover:bg-[#F3EFE6]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#2C2523] flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-[#E11D48]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#E11D48]">
                      Option 2
                    </div>
                    <div className="font-serif text-base font-bold text-[#2C2523]">
                      Create Room ({selectedGame.title})
                    </div>
                    <p className="text-xs text-[#6B5E58] mt-0.5">
                      Choose Public or Private visibility, generate a unique room code, and host your lobby.
                    </p>
                  </div>
                </button>
              </div>

              {/* OPTION 1 PANEL: INVITE PARTNER / PLAYER */}
              {active1v1Option === 'invite' && (
                <div
                  data-gsap-modal-item
                  className="bg-white border-2 border-[#2C2523] rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_#2C2523] space-y-4"
                >
                  {/* Paired Partner Quick Invite Card */}
                  {pairedPartner && (
                    <div className="p-3.5 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#FFE4E6] border-2 border-[#2C2523] flex items-center justify-center text-xl">
                          {pairedPartner.avatar || '🐼'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#2C2523]">
                              @{pairedPartner.username}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-[#FFE4E6] border border-[#2C2523] text-[10px] font-black text-[#E11D48]">
                              Paired Partner
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border border-[#2C2523] ${
                                pairedPartner.isOnline
                                  ? 'bg-[#DEF7EC] text-[#03543F]'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  pairedPartner.isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                                }`}
                              />
                              {pairedPartner.isOnline ? 'Online' : 'Offline'}
                            </span>
                          </div>
                          <p className="text-xs text-[#6B5E58] mt-0.5">
                            Invite your partner directly to a 1v1 duel in{' '}
                            <span className="font-semibold text-[#2C2523]">
                              {selectedGame.title}
                            </span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={sendingInviteUid === pairedPartner.uid}
                        onClick={(e) => {
                          animateButtonPress(e.currentTarget);
                          handleSend1v1Invite(pairedPartner.username, pairedPartner.uid);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#3B4CCA] hover:bg-[#2F3EA8] text-white text-xs font-bold border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523] flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {sendingInviteUid === pairedPartner.uid ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Invite Partner
                      </button>
                    </div>
                  )}

                  {/* Search Input by Unique Username */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#2C2523] mb-1.5">
                      Search Registered Player by Unique @Username
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-[#6B5E58] absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Type @username to find paired players..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] text-sm font-medium focus:outline-none focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Matching Player Profiles List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {searchingPlayers ? (
                      <div className="py-6 flex items-center justify-center gap-2 text-xs font-bold text-[#6B5E58]">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Searching registered players...
                      </div>
                    ) : searchedPlayers.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#6B5E58] bg-[#FDFBF7] rounded-xl border border-dashed border-[#2C2523]/40">
                        No matching players found. Try another @username.
                      </div>
                    ) : (
                      searchedPlayers.map((player) => (
                        <div
                          key={player.uid}
                          className="p-3 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#2C2523] flex items-center justify-center text-lg shrink-0">
                              {player.avatar || '🦊'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-sm text-[#2C2523] truncate">
                                  @{player.username}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border border-[#2C2523] ${
                                    player.isOnline
                                      ? 'bg-[#DEF7EC] text-[#03543F]'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      player.isOnline ? 'bg-emerald-500' : 'bg-gray-400'
                                    }`}
                                  />
                                  {player.isOnline ? 'Online' : 'Offline'}
                                </span>
                                {player.isPairedPartner && (
                                  <span className="px-1.5 py-0.5 rounded bg-[#FFE4E6] border border-[#2C2523] text-[10px] font-bold text-[#E11D48]">
                                    Your Partner
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#6B5E58] truncate">
                                {player.hasActiveCouple
                                  ? `Paired Couple: ${player.coupleName} · Lv.${player.level}`
                                  : 'Unpaired (Must pair with a partner before 1v1)'}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={
                              !player.hasActiveCouple ||
                              sendingInviteUid === player.uid ||
                              Boolean(player.alreadyInvited)
                            }
                            onClick={(e) => {
                              animateButtonPress(e.currentTarget);
                              handleSend1v1Invite(player.username, player.uid);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#2C2523] hover:bg-[#433936] text-white text-xs font-bold border-2 border-[#2C2523] flex items-center gap-1.5 shrink-0 disabled:opacity-45"
                          >
                            {sendingInviteUid === player.uid ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            {player.alreadyInvited ? 'Invited' : 'Send Invite'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Outgoing 1v1 Invitation States (Pending / Accepted / Declined / Expired) */}
                  {outgoingInvitations.filter((i) => i.inviteType === '1v1').length > 0 && (
                    <div className="pt-3 border-t-2 border-dashed border-[#2C2523]/20 space-y-2">
                      <div className="text-xs font-black uppercase tracking-wider text-[#2C2523] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Recent 1v1 Invitations Sent
                      </div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {outgoingInvitations
                          .filter((i) => i.inviteType === '1v1')
                          .slice(0, 5)
                          .map((inv) => {
                            const statusStyle =
                              inv.status === 'accepted'
                                ? 'bg-[#DEF7EC] text-[#03543F]'
                                : inv.status === 'declined'
                                ? 'bg-[#FDE8E8] text-[#9B1C1C]'
                                : inv.status === 'expired'
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-[#FEF3C7] text-[#92400E]';
                            return (
                              <div
                                key={inv.id}
                                className="px-3 py-2 rounded-xl bg-[#FDFBF7] border border-[#2C2523] flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="truncate">
                                  <span className="font-bold text-[#2C2523]">
                                    @{inv.targetUsername}
                                  </span>{' '}
                                  <span className="text-[#6B5E58]">
                                    · Room #{inv.roomCode}
                                  </span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-md border border-[#2C2523] text-[10px] font-black uppercase ${statusStyle}`}
                                >
                                  {inv.status}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* OPTION 2 PANEL: CREATE ROOM (Selected Game Automatically Carried Over) */}
              {active1v1Option === 'create_room' && (
                <div
                  data-gsap-modal-item
                  className="bg-white border-2 border-[#2C2523] rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_#2C2523] space-y-4"
                >
                  {!isRoomForSelectedGame ? (
                    <>
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#2C2523]/15">
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider text-[#6B5E58]">
                            Selected Game (Carried Over Automatically)
                          </div>
                          <div className="font-serif text-lg font-bold text-[#2C2523]">
                            {selectedGame.title} · 1v1 Duel Room
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-xl bg-[#F3EFE6] border-2 border-[#2C2523] text-xs font-bold">
                          2 Players Max
                        </span>
                      </div>

                      {/* Visibility Selector: Public vs Private */}
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-[#2C2523] mb-2">
                          Room Visibility
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setRoomVisibility('public')}
                            className={`p-3.5 rounded-2xl border-2 border-[#2C2523] text-left transition-all flex items-start gap-3 ${
                              roomVisibility === 'public'
                                ? 'bg-[#DEF7EC] shadow-[3px_3px_0px_#2C2523]'
                                : 'bg-[#FDFBF7] hover:bg-[#F3EFE6]'
                            }`}
                          >
                            <Globe className="w-5 h-5 text-[#03543F] shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-sm text-[#2C2523]">
                                Public Room
                              </div>
                              <p className="text-xs text-[#6B5E58] mt-0.5">
                                Listed in the Public Room Browser. Players can discover and join or use your room code.
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRoomVisibility('private')}
                            className={`p-3.5 rounded-2xl border-2 border-[#2C2523] text-left transition-all flex items-start gap-3 ${
                              roomVisibility === 'private'
                                ? 'bg-[#E3E8FF] shadow-[3px_3px_0px_#2C2523]'
                                : 'bg-[#FDFBF7] hover:bg-[#F3EFE6]'
                            }`}
                          >
                            <Lock className="w-5 h-5 text-[#3B4CCA] shrink-0 mt-0.5" />
                            <div>
                              <div className="font-bold text-sm text-[#2C2523]">
                                Private Room
                              </div>
                              <p className="text-xs text-[#6B5E58] mt-0.5">
                                Hidden from the public browser. Only players with the room code or invitation can enter.
                              </p>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Public Room Join Policy Toggle */}
                      {roomVisibility === 'public' && (
                        <div className="p-3.5 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-[#03543F] shrink-0 mt-0.5" />
                            <div>
                              <div className="text-xs font-bold text-[#2C2523]">
                                Public Browser Join Policy
                              </div>
                              <p className="text-[11px] text-[#6B5E58]">
                                Choose whether players from the Public Room Browser join immediately or require your approval.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setRoomJoinPolicy('immediate')}
                              className={`px-3 py-1.5 rounded-xl border-2 border-[#2C2523] text-xs font-bold ${
                                roomJoinPolicy === 'immediate'
                                  ? 'bg-[#2C2523] text-white'
                                  : 'bg-white text-[#2C2523]'
                              }`}
                            >
                              Immediate Join
                            </button>
                            <button
                              type="button"
                              onClick={() => setRoomJoinPolicy('approval_required')}
                              className={`px-3 py-1.5 rounded-xl border-2 border-[#2C2523] text-xs font-bold ${
                                roomJoinPolicy === 'approval_required'
                                  ? 'bg-[#2C2523] text-white'
                                  : 'bg-white text-[#2C2523]'
                              }`}
                            >
                              Require Approval
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Format & Partner Seating */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-[#2C2523] mb-1">
                            Match Format
                          </label>
                          <select
                            value={roundFormat}
                            onChange={(e) => setRoundFormat(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] text-xs font-bold"
                          >
                            <option value="Quick Match (1 Round)">Quick Match (1 Round)</option>
                            <option value="Standard Match (Best of 3)">
                              Standard Match (Best of 3)
                            </option>
                            <option value="Championship Set (Best of 5)">
                              Championship Set (Best of 5)
                            </option>
                          </select>
                        </div>

                        <div className="flex items-end">
                          <label className="w-full p-2.5 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] flex items-center gap-2.5 cursor-pointer text-xs font-bold text-[#2C2523]">
                            <input
                              type="checkbox"
                              checked={includePairedPartnerIn1v1Room}
                              onChange={(e) =>
                                setIncludePairedPartnerIn1v1Room(e.target.checked)
                              }
                              className="w-4 h-4 accent-[#D96B43]"
                            />
                            <span>Auto-seat my paired partner in Slot 2</span>
                          </label>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={creatingRoom}
                        onClick={(e) => {
                          animateButtonPress(e.currentTarget);
                          handleCreate1v1Room();
                        }}
                        className="w-full py-3 rounded-2xl bg-[#D96B43] hover:bg-[#C25934] text-white font-bold text-sm border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523] flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {creatingRoom ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Generate Unique Room Code & Enter Lobby
                      </button>
                    </>
                  ) : (
                    /* Active Created Room Lobby View */
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-[#2C2523] text-white text-[10px] font-black uppercase">
                              {activeRoom.visibility === 'private'
                                ? 'Private Room'
                                : 'Public Room'}
                            </span>
                            {activeRoom.visibility === 'public' && (
                              <span className="px-2 py-0.5 rounded-md bg-white border border-[#2C2523] text-[10px] font-bold">
                                {activeRoom.joinPolicy === 'approval_required'
                                  ? 'Host Approval Required'
                                  : 'Immediate Join'}
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-2xl font-black tracking-widest text-[#2C2523] mt-1">
                            #{activeRoom.roomCode}
                          </div>
                          <p className="text-xs text-[#6B5E58]">
                            Share this code or link with your opponent to join {selectedGame.title}.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyRoomCode(activeRoom.roomCode)}
                            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#F3EFE6] border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523] text-xs font-bold flex items-center gap-1.5"
                          >
                            {copiedCode ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                            {copiedCode ? 'Copied!' : 'Copy Code'}
                          </button>

                          <button
                            type="button"
                            onClick={() => copyShareLink(activeRoom.roomCode)}
                            className="px-3.5 py-2 rounded-xl bg-[#E3E8FF] hover:bg-[#D0D8FF] border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523] text-xs font-bold flex items-center gap-1.5"
                          >
                            {copiedLink ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Share2 className="w-3.5 h-3.5" />
                            )}
                            {copiedLink ? 'Link Copied!' : 'Share Invite Link'}
                          </button>
                        </div>
                      </div>

                      {/* Seated Players in Lobby */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[0, 1].map((slotIdx) => {
                          const p = activeRoom.players[slotIdx];
                          return (
                            <div
                              key={slotIdx}
                              className="p-3.5 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] flex items-center justify-between gap-3"
                            >
                              {p ? (
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-white border-2 border-[#2C2523] flex items-center justify-center text-lg">
                                    {p.avatar || '🦊'}
                                  </div>
                                  <div>
                                    <div className="font-bold text-sm text-[#2C2523]">
                                      @{p.username}
                                    </div>
                                    <div className="text-[11px] text-[#6B5E58]">
                                      Slot {slotIdx + 1} · Ready
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs font-bold text-[#6B5E58]">
                                  Slot {slotIdx + 1} · Waiting for opponent...
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Pending Join Requests (If Host Approval Required) */}
                      {activeRoom.hostUid === currentUser.uid &&
                        Array.isArray(activeRoom.pendingRequests) &&
                        activeRoom.pendingRequests.length > 0 && (
                          <div className="p-3.5 rounded-2xl bg-[#FEF3C7] border-2 border-[#2C2523] space-y-2">
                            <div className="text-xs font-black uppercase tracking-wider text-[#92400E]">
                              Pending Join Requests ({activeRoom.pendingRequests.length})
                            </div>
                            {activeRoom.pendingRequests.map((req: RoomPendingRequest) => (
                              <div
                                key={req.uid}
                                className="p-2.5 rounded-xl bg-white border border-[#2C2523] flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 text-xs font-bold">
                                  <span>{req.avatar || '🦊'}</span>
                                  <span>@{req.username}</span>
                                  {req.coupleName && (
                                    <span className="text-[10px] text-[#6B5E58]">
                                      ({req.coupleName})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={respondingRequestUid === req.uid}
                                    onClick={() => handleRespondJoinRequest(req.uid, true)}
                                    className="px-2.5 py-1 rounded-lg bg-[#DEF7EC] border border-[#2C2523] text-[11px] font-bold text-[#03543F]"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    disabled={respondingRequestUid === req.uid}
                                    onClick={() => handleRespondJoinRequest(req.uid, false)}
                                    className="px-2.5 py-1 rounded-lg bg-[#FDE8E8] border border-[#2C2523] text-[11px] font-bold text-[#9B1C1C]"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      <button
                        type="button"
                        disabled={activeRoom.players.length < 2}
                        onClick={(e) => {
                          animateButtonPress(e.currentTarget);
                          handleStartRoomMatchNow();
                        }}
                        className="w-full py-3 rounded-2xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-sm border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523] flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Play className="w-4 h-4" />
                        {activeRoom.players.length >= 2
                          ? `Start ${selectedGame.title} Now`
                          : 'Waiting for Opponent (1/2 Seated)...'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              MODE B: 2V2 TEAM & MATCHMAKING SCREEN (Partner Invite + Ready Gate + Find Match)
             ================================================================ */}
          {mode === '2v2' && (
            <div className="space-y-5">
              {/* Couple Banner & Team Header */}
              <div
                data-gsap-modal-item
                className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#FFF0F3] via-[#FDFBF7] to-[#E3E8FF] border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-dashed border-[#2C2523]/20">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#FFE4E6] border-2 border-[#2C2523] flex items-center justify-center">
                      <Heart className="w-5 h-5 text-[#E11D48] fill-[#E11D48]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif text-lg font-bold text-[#2C2523]">
                          {teamLobby?.coupleName ||
                            activeCouple?.coupleName ||
                            'Your Couple Team'}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#2C2523] text-white text-[10px] font-black uppercase">
                          {teamLobby?.coupleTitle || activeCouple?.coupleTitle || 'Duo'}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B5E58]">
                        Banner:{' '}
                        <span className="font-semibold text-[#2C2523]">
                          {getBannerLabel(
                            teamLobby?.equippedBanner || activeCouple?.coupleBanner
                          )}
                        </span>{' '}
                        · Couple Skin:{' '}
                        <span className="font-semibold text-[#2C2523]">
                          {getSkinName(
                            teamLobby?.equippedCoupleSkin ||
                              activeCouple?.equippedCoupleSkin
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="px-3.5 py-2 rounded-2xl bg-[#FEF3C7] border-2 border-[#2C2523] shadow-[2px_2px_0px_#2C2523] flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-[#D97706]" />
                    <span className="font-black text-sm text-[#2C2523]">
                      {teamLobby?.coupleTrophies ?? activeCouple?.coupleTrophies ?? 0} Couple
                      Trophies
                    </span>
                  </div>
                </div>

                {/* Both Team Members & Avatars, Skins, Online Status, and Readiness */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
                  {/* Member 1: Current User */}
                  <div className="p-3.5 rounded-2xl bg-white border-2 border-[#2C2523] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] flex items-center justify-center text-2xl shrink-0">
                        {currentUser.avatar || '🦊'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-[#2C2523] truncate">
                            @{currentUser.username}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-[#DEF7EC] border border-[#2C2523] text-[10px] font-bold text-[#03543F]">
                            You · Online
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6B5E58] truncate mt-0.5">
                          Skin: {getSkinName(currentUser.equippedSkin)}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl border-2 border-[#2C2523] text-[11px] font-black uppercase shrink-0 ${
                        myReadyIn2v2
                          ? 'bg-[#DEF7EC] text-[#03543F]'
                          : 'bg-[#F3EFE6] text-[#6B5E58]'
                      }`}
                    >
                      {myReadyIn2v2 ? 'Ready ✓' : 'Not Ready'}
                    </span>
                  </div>

                  {/* Member 2: Paired Partner (Unrelated Users Never Allowed) */}
                  <div className="p-3.5 rounded-2xl bg-white border-2 border-[#2C2523] flex items-center justify-between gap-3">
                    {pairedPartner ? (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-[#FDFBF7] border-2 border-[#2C2523] flex items-center justify-center text-2xl shrink-0">
                            {pairedPartner.avatar || '🐼'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-[#2C2523] truncate">
                                @{pairedPartner.username}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded border border-[#2C2523] text-[10px] font-bold ${
                                  pairedPartner.isOnline
                                    ? 'bg-[#DEF7EC] text-[#03543F]'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {pairedPartner.isOnline ? 'Online' : 'Offline'}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#6B5E58] truncate mt-0.5">
                              Skin: {getSkinName(pairedPartner.equippedSkin)}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-xl border-2 border-[#2C2523] text-[11px] font-black uppercase shrink-0 ${
                            teamLobby?.partnerInviteStatus === 'accepted' &&
                            (teamLobby.hostUid === pairedPartner.uid
                              ? teamLobby.hostReady
                              : teamLobby.partnerReady)
                              ? 'bg-[#DEF7EC] text-[#03543F]'
                              : 'bg-[#F3EFE6] text-[#6B5E58]'
                          }`}
                        >
                          {teamLobby?.partnerInviteStatus === 'accepted'
                            ? (
                                teamLobby.hostUid === pairedPartner.uid
                                  ? teamLobby.hostReady
                                  : teamLobby.partnerReady
                              )
                              ? 'Ready ✓'
                              : 'Not Ready'
                            : teamLobby?.partnerInviteStatus === 'pending'
                            ? 'Invited...'
                            : 'Not Joined'}
                        </span>
                      </>
                    ) : (
                      <div className="text-xs font-bold text-[#6B5E58]">
                        No Paired Partner Found (Pair in Profile & Couple first)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Two Main 2v2 Actions Side-by-Side on the Same Screen */}
              <div
                data-gsap-modal-item
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* ACTION 1: INVITE PARTNER & TEAM READINESS */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523] flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#FFE4E6] border border-[#2C2523] text-[10px] font-black uppercase text-[#E11D48]">
                        Step 1 · Invite Partner & Ready Up
                      </span>
                      <span className="text-xs font-bold text-[#6B5E58]">
                        Paired Partner Only
                      </span>
                    </div>

                    <h4 className="font-serif text-lg font-bold text-[#2C2523]">
                      Assemble Your Couple Team
                    </h4>
                    <p className="text-xs text-[#6B5E58]">
                      Invite your paired partner (@{pairedPartner?.username || 'partner'}) to join your 2v2 team for{' '}
                      <span className="font-bold text-[#2C2523]">
                        {selectedGame.title}
                      </span>
                      . Unrelated users cannot replace your paired partner.
                    </p>

                    {/* Partner Invitation Status Pill */}
                    <div className="p-3 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#2C2523]">
                        Partner Invitation Status:
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-md border border-[#2C2523] font-black uppercase text-[10px] ${
                          teamLobby?.partnerInviteStatus === 'accepted'
                            ? 'bg-[#DEF7EC] text-[#03543F]'
                            : teamLobby?.partnerInviteStatus === 'pending'
                            ? 'bg-[#FEF3C7] text-[#92400E]'
                            : teamLobby?.partnerInviteStatus === 'declined'
                            ? 'bg-[#FDE8E8] text-[#9B1C1C]'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {teamLobby?.partnerInviteStatus || 'none'}
                      </span>
                    </div>

                    {/* If current user is the invited partner and invite is pending, allow accepting directly */}
                    {teamLobby?.partnerInviteStatus === 'pending' &&
                      teamLobby.partnerUid === currentUser.uid && (
                        <div className="p-3 rounded-xl bg-[#E3E8FF] border-2 border-[#2C2523] space-y-2">
                          <div className="text-xs font-bold text-[#2C2523]">
                            @{teamLobby.hostProfile.username} invited you to the 2v2 team!
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={respondingPartner2v2}
                              onClick={() => handleRespondPartner2v2(true)}
                              className="flex-1 py-2 rounded-xl bg-[#2E7D32] text-white text-xs font-bold border-2 border-[#2C2523]"
                            >
                              Accept Team Invite
                            </button>
                            <button
                              type="button"
                              disabled={respondingPartner2v2}
                              onClick={() => handleRespondPartner2v2(false)}
                              className="px-3 py-2 rounded-xl bg-white text-[#9B1C1C] text-xs font-bold border-2 border-[#2C2523]"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      disabled={
                        !pairedPartner ||
                        invitingPartner2v2 ||
                        Boolean(queueEntry && queueEntry.status === 'searching')
                      }
                      onClick={(e) => {
                        animateButtonPress(e.currentTarget);
                        handleInvitePartner2v2();
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#3B4CCA] hover:bg-[#2F3EA8] text-white text-xs font-bold border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {invitingPartner2v2 ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {teamLobby?.partnerInviteStatus === 'pending'
                        ? `Resend Team Invite to @${pairedPartner?.username || 'Partner'}`
                        : teamLobby?.partnerInviteStatus === 'accepted'
                        ? `Partner Joined (@${pairedPartner?.username}) · Re-Invite`
                        : `Invite Partner (@${pairedPartner?.username || 'Partner'})`}
                    </button>

                    {/* Click Ready Button (Unlocks after Partner Accepts) */}
                    <button
                      type="button"
                      disabled={
                        teamLobby?.partnerInviteStatus !== 'accepted' ||
                        togglingReady2v2 ||
                        Boolean(queueEntry && queueEntry.status === 'searching')
                      }
                      onClick={(e) => {
                        animateButtonPress(e.currentTarget);
                        handleToggleReady2v2();
                      }}
                      className={`w-full py-3 rounded-xl font-bold text-xs border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex items-center justify-center gap-2 transition-colors disabled:opacity-45 ${
                        myReadyIn2v2
                          ? 'bg-[#DEF7EC] text-[#03543F]'
                          : 'bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#2C2523]'
                      }`}
                    >
                      {togglingReady2v2 ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                      {myReadyIn2v2
                        ? 'You Are Ready ✓ (Click to Unready)'
                        : 'Click Ready for 2v2 Matchmaking'}
                    </button>
                  </div>
                </div>

                {/* ACTION 2: FIND MATCH (2V2 TROPHY MATCHMAKING) */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523] flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#FEF3C7] border border-[#2C2523] text-[10px] font-black uppercase text-[#92400E]">
                        Step 2 · Find Match
                      </span>
                      <span className="text-xs font-bold text-[#6B5E58]">
                        Trophy-Based Queue
                      </span>
                    </div>

                    <h4 className="font-serif text-lg font-bold text-[#2C2523]">
                      2v2 Couple Matchmaking
                    </h4>

                    {/* Pre-Matchmaking Checklist */}
                    <div className="p-3 rounded-xl bg-[#FDFBF7] border-2 border-[#2C2523] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B5E58]">1. Both Partners Online</span>
                        {teamLobby?.bothOnline ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B5E58]">
                          2. Partner Accepted Team Invite
                        </span>
                        {teamLobby?.partnerInviteStatus === 'accepted' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B5E58]">
                          3. Both Partners Clicked Ready
                        </span>
                        {teamLobby?.hostReady && teamLobby?.partnerReady ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                    </div>

                    {/* Live Queue Status / Search Duration / Trophy Range */}
                    {queueEntry &&
                    (queueEntry.status === 'searching' ||
                      queueEntry.status === 'match_found' ||
                      queueEntry.status === 'match_starting') ? (
                      <div className="p-3.5 rounded-2xl bg-[#E3E8FF] border-2 border-[#2C2523] space-y-2">
                        <div className="flex items-center justify-between text-xs font-black text-[#2C2523]">
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3B4CCA]" />
                            {queueEntry.status === 'searching'
                              ? 'Searching for Eligible Couple...'
                              : 'Match Found! Launching Game...'}
                          </span>
                          <span className="font-mono">
                            {Math.floor((queueEntry.waitSeconds || 0) / 60)}:
                            {String((queueEntry.waitSeconds || 0) % 60).padStart(2, '0')}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#2C2523] flex items-center justify-between">
                          <span>Acceptable Trophy Range:</span>
                          <span className="font-bold">
                            ±{queueEntry.allowedTrophyRange || 150} 🏆
                          </span>
                        </div>
                        {queueEntry.opponentCoupleName && (
                          <div className="p-2 rounded-lg bg-[#DEF7EC] border border-[#2C2523] text-xs font-bold text-[#03543F]">
                            Matched vs {queueEntry.opponentCoupleName}!
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#6B5E58]">
                        Matches your couple against another online couple with similar Couple Trophies (range expands every 10s). Never matches against simulated bots.
                      </p>
                    )}
                  </div>

                  <div>
                    {queueEntry && queueEntry.status === 'searching' ? (
                      <button
                        type="button"
                        disabled={cancellingMatch}
                        onClick={(e) => {
                          animateButtonPress(e.currentTarget);
                          handleCancel2v2Matchmaking();
                        }}
                        className="w-full py-3 rounded-xl bg-[#FDE8E8] hover:bg-[#FBD5D5] text-[#9B1C1C] font-bold text-xs border-2 border-[#2C2523] shadow-[3px_3px_0px_#2C2523] flex items-center justify-center gap-2"
                      >
                        {cancellingMatch ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        Cancel Matchmaking
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!canFind2v2Match || enqueuingMatch}
                        onClick={(e) => {
                          animateButtonPress(e.currentTarget);
                          handleFind2v2Match();
                        }}
                        className="w-full py-3 rounded-xl bg-[#D96B43] hover:bg-[#C25934] text-white font-bold text-sm border-2 border-[#2C2523] shadow-[4px_4px_0px_#2C2523] flex items-center justify-center gap-2 disabled:opacity-45"
                      >
                        {enqueuingMatch ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Swords className="w-4 h-4" />
                        )}
                        {canFind2v2Match
                          ? `Find 2v2 Match (${selectedGame.title})`
                          : 'Waiting for Partner Acceptance & Both Ready...'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
