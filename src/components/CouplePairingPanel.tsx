'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PlayerProfile } from './AuthModal';
import { ArcadeCircularLoader, ArcadeInlineSpinner } from './ArcadeLoader';
import {
  AnimatedSkinnedAvatar,
  ProfileBannerBackdrop,
  ThreeLayerProfileHeader,
} from './CosmeticAvatarAndBanner';
import { ARCADE_BANNERS, getSkinById, getBannerById } from '@/src/lib/arcade-data';
import { soundFX } from '@/src/lib/sound';
import {
  HeartHandshake,
  Copy,
  Check,
  Sparkles,
  UserCheck,
  Unlink,
  Calendar,
  Trophy,
  AlertCircle,
  CheckCircle2,
  Search,
  Send,
  XCircle,
} from 'lucide-react';

export interface EnrichedCouplePairing {
  id: number;
  pairingCode: string;
  requesterUid: string;
  partnerUid: string;
  requesterConfirmed: boolean;
  partnerConfirmed: boolean;
  status: 'pending_partner' | 'pending_requester_confirm' | 'active' | 'unpaired';
  coupleName: string;
  anniversaryDate: string;
  coupleBio: string;
  coupleBanner: string;
  coupleTitle?: string;
  equippedCoupleSkin?: string;
  coupleTrophies?: number;
  highestTrophies?: number;
  claimedTrophyMilestones?: string;
  weeklyTrophies?: number;
  monthlyTrophies?: number;
  coupleXp: number;
  coupleLevel: number;
  coupleWins: number;
  coupleLosses: number;
  coupleDraws: number;
  requesterProfile: PlayerProfile | null;
  partnerProfile: PlayerProfile | null;
  combinedXp: number;
  combinedLevel: number;
}

export interface CoupleContextData {
  activeCouple: EnrichedCouplePairing | null;
  pendingOutgoing: EnrichedCouplePairing | null;
  pendingIncoming: EnrichedCouplePairing | null;
}

interface CouplePairingPanelProps {
  currentUser: PlayerProfile;
  sessionToken: string;
  coupleContext: CoupleContextData;
  initialPairCodeFromUrl?: string;
  onCoupleContextChanged: (nextCtx: CoupleContextData) => void;
  onOpenPhotoUpload?: () => void;
  onOpenCosmeticsVault?: () => void;
}

function getAvatarEmoji(avatarCode?: string) {
  if (avatarCode === 'star-cat') return '🐱';
  if (avatarCode === 'bunny') return '🐰';
  if (avatarCode === 'otter') return '🦦';
  return '🦊';
}

export function CouplePairingPanel({
  currentUser,
  sessionToken,
  coupleContext,
  initialPairCodeFromUrl = '',
  onCoupleContextChanged,
  onOpenPhotoUpload,
  onOpenCosmeticsVault,
}: CouplePairingPanelProps) {
  const [enteredCode, setEnteredCode] = useState(initialPairCodeFromUrl);
  const [targetUsernameInput, setTargetUsernameInput] = useState('');
  const [inspectedInvite, setInspectedInvite] = useState<{
    pairingCode: string;
    requesterProfile: PlayerProfile;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Couple profile editor states
  const activeCouple = coupleContext.activeCouple;
  const [editCoupleName, setEditCoupleName] = useState(activeCouple?.coupleName || '');
  const [editAnniversary, setEditAnniversary] = useState(activeCouple?.anniversaryDate || '');
  const [editBio, setEditBio] = useState(activeCouple?.coupleBio || '');
  const [editBanner, setEditBanner] = useState(activeCouple?.coupleBanner || 'twilight-lanterns');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [confirmUnpairModal, setConfirmUnpairModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const onCoupleContextChangedRef = useRef(onCoupleContextChanged);
  useEffect(() => {
    onCoupleContextChangedRef.current = onCoupleContextChanged;
  });

  // Real-time poll while CouplePairingPanel is open so both accounts see pairing acceptance & online status live
  useEffect(() => {
    if (!currentUser.uid || !sessionToken) return;
    let cancelled = false;
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/arcade?coupleContext=1', {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data?.coupleContext && !cancelled) {
          onCoupleContextChangedRef.current(data.coupleContext);
        }
      } catch {
        // Ignore transient network errors
      }
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [currentUser.uid, sessionToken]);

  async function callCoupleAction(payload: Record<string, unknown>) {
    const res = await fetch('/api/arcade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Couple pairing request failed');
    }
    return data;
  }

  async function handleSendUsernameRequest(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    const clean = targetUsernameInput.trim().replace(/^@+/, '');
    if (!clean) {
      setErrorMsg('Please enter your partner’s registered @username.');
      return;
    }
    setLoading(true);
    try {
      const data = await callCoupleAction({
        action: 'send_couple_pairing_request',
        targetUsername: clean,
      });
      if (data.coupleContext) {
        onCoupleContextChanged(data.coupleContext);
      }
      setTargetUsernameInput('');
      if (data.autoMatchedMutual) {
        setStatusMsg(
          `Mutual request matched! You and @${clean} both requested each other — your Shared Couple Profile is now active!`
        );
      } else {
        setStatusMsg(
          `Couple Pairing Request sent to @${clean}! As soon as they accept in their Mailbox or Couple Profile, both accounts will link automatically.`
        );
      }
      soundFX.playSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send pairing request.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateInviteCode() {
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      const data = await callCoupleAction({ action: 'create_couple_invite' });
      if (data.coupleContext) {
        onCoupleContextChanged(data.coupleContext);
      }
      setStatusMsg(
        `Generated unique pairing code #${data.invite?.pairingCode}. Share it with your partner!`
      );
      soundFX.playSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate pairing code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelInvite(code?: string) {
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      const data = await callCoupleAction({
        action: 'cancel_couple_invite',
        pairingCode: code,
      });
      if (data.coupleContext) {
        onCoupleContextChanged(data.coupleContext);
      }
      setStatusMsg('Pending couple pairing invitation cancelled.');
      soundFX.playMove();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to cancel invite.');
    } finally {
      setLoading(false);
    }
  }

  async function handleInspectCode(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setInspectedInvite(null);
    const clean = enteredCode.trim().toUpperCase();
    if (!clean) {
      setErrorMsg('Please enter a 6-character partner pairing code.');
      return;
    }
    setLoading(true);
    try {
      const data = await callCoupleAction({
        action: 'inspect_couple_invite',
        pairingCode: clean,
      });
      setInspectedInvite(data.preview);
      soundFX.playMove();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid pairing code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptInvite(code: string) {
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      const data = await callCoupleAction({
        action: 'accept_couple_invite',
        pairingCode: code,
      });
      if (data.coupleContext) {
        onCoupleContextChanged(data.coupleContext);
        if (data.coupleContext.activeCouple) {
          setEditCoupleName(data.coupleContext.activeCouple.coupleName);
          setEditAnniversary(data.coupleContext.activeCouple.anniversaryDate);
          setEditBio(data.coupleContext.activeCouple.coupleBio);
          setEditBanner(data.coupleContext.activeCouple.coupleBanner);
        }
      }
      setInspectedInvite(null);
      setEnteredCode('');
      setStatusMsg(
        'Couple Pairing complete! Your Shared Couple Profile is now active for both you and your partner.'
      );
      soundFX.playSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not accept pairing invite.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalRequesterConfirm(code: string) {
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      const data = await callCoupleAction({
        action: 'confirm_couple_invite',
        pairingCode: code,
      });
      if (data.coupleContext) {
        onCoupleContextChanged(data.coupleContext);
        if (data.coupleContext.activeCouple) {
          setEditCoupleName(data.coupleContext.activeCouple.coupleName);
          setEditAnniversary(data.coupleContext.activeCouple.anniversaryDate);
          setEditBio(data.coupleContext.activeCouple.coupleBio);
          setEditBanner(data.coupleContext.activeCouple.coupleBanner);
        }
      }
      setStatusMsg('Couple Pairing confirmed by both partners! Your Shared Couple Profile is now active.');
      soundFX.playSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not confirm pairing.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCoupleProfile(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      const data = await callCoupleAction({
        action: 'update_couple_profile',
        coupleName: editCoupleName,
        anniversaryDate: editAnniversary,
        coupleBio: editBio,
        coupleBanner: editBanner,
      });
      if (data.coupleContext) {
        onCoupleContextChanged(data.coupleContext);
      }
      setIsEditingProfile(false);
      setStatusMsg('Shared Couple Profile updated!');
      soundFX.playSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save couple profile.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnpairConfirm() {
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      const data = await callCoupleAction({ action: 'unpair_couple' });
      if (data.coupleContext) {
        onCoupleContextChanged(data.coupleContext);
      }
      setConfirmUnpairModal(false);
      setStatusMsg(
        'Your accounts have been unpaired. Both individual accounts and personal game histories remain intact.'
      );
      soundFX.playMove();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to unpair accounts.');
    } finally {
      setLoading(false);
    }
  }

  function copyPairingCode(code: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  }

  function copyPairingInviteLink(code: string) {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = `${window.location.origin}/?pair=${encodeURIComponent(code)}`;
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  }

  const bannerGradient =
    (activeCouple?.coupleBanner || editBanner) === 'starlight-picnic'
      ? 'from-indigo-950/90 via-stone-900 to-amber-950/40'
      : (activeCouple?.coupleBanner || editBanner) === 'rosewood-conservatory'
      ? 'from-rose-950/80 via-stone-900 to-teal-950/40'
      : 'from-amber-950/70 via-stone-900 to-stone-950';

  return (
    <section className="py-2 text-stone-100 space-y-5">
      {/* Player's Own 3-Layer Profile Header (Banner + Uploaded Photo + Animated Skin Frame) */}
      <ThreeLayerProfileHeader
        username={currentUser.username}
        titleOrSubtitle="Your Personal 3-Layer Arcade Identity (Banner + Uploaded Picture + Skin Frame)"
        avatarId={currentUser.avatar}
        customPhotoUrl={currentUser.customPhotoUrl}
        equippedSkinId={currentUser.equippedSkin}
        equippedBannerId={currentUser.equippedBanner || 'banner-sketchbook-grid'}
        level={currentUser.level}
        coins={currentUser.coins}
        onOpenPhotoUpload={onOpenPhotoUpload}
        onOpenCosmeticsVault={onOpenCosmeticsVault}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div className="flex items-center gap-2.5">
          <HeartHandshake className="h-5 w-5 text-rose-400" />
          <div>
            <h2 className="text-base font-bold text-stone-100">
              {activeCouple ? 'Shared Couple Profile' : 'Pair with Partner'}
            </h2>
            <p className="text-xs text-stone-400">
              {activeCouple
                ? `Active Couple Pairing (#${activeCouple.pairingCode}) · Verified Mutual Link`
                : 'Link two separate registered accounts via mutual confirmation to unlock your Couple Profile, 1v1 Multiplayer, and 2v2 Couple Mode.'}
            </p>
          </div>
        </div>

        {activeCouple && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditCoupleName(activeCouple.coupleName);
                setEditAnniversary(activeCouple.anniversaryDate);
                setEditBio(activeCouple.coupleBio);
                setEditBanner(activeCouple.coupleBanner);
                setIsEditingProfile(!isEditingProfile);
              }}
              className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-1.5 text-xs font-semibold text-stone-200 hover:border-amber-500/60 whitespace-nowrap"
            >
              {isEditingProfile ? 'Cancel Edit' : 'Customize Couple Profile'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmUnpairModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20 whitespace-nowrap"
            >
              <Unlink className="h-3.5 w-3.5" />
              <span>Unpair Account</span>
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {statusMsg && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <span>{statusMsg}</span>
        </div>
      )}

      {loading && (
        <div className="mt-4">
          <ArcadeCircularLoader
            active={loading}
            variant="compact"
            messages={[
              'Syncing Couple Pairing with database...',
              'Getting everything ready...',
              'Almost there!',
            ]}
          />
        </div>
      )}

      {/* ====================================================================
          STATE A: ACTIVE SHARED COUPLE PROFILE
          ==================================================================== */}
      {activeCouple ? (
        <div className="mt-5 space-y-5">
          {/* Shared Couple Banner Card */}
          <ProfileBannerBackdrop
            bannerId={
              activeCouple.coupleBanner ||
              currentUser.equippedBanner ||
              'banner-sketchbook-grid'
            }
            className="p-6"
          >
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              {/* Both Partners' Avatars & Animated Skin Frames */}
              <div className="flex items-center gap-4">
                <div className="flex items-center -space-x-2">
                  <AnimatedSkinnedAvatar
                    avatarId={activeCouple.requesterProfile?.avatar}
                    customPhotoUrl={activeCouple.requesterProfile?.customPhotoUrl}
                    skinId={
                      activeCouple.requesterProfile?.equippedSkin ||
                      activeCouple.equippedCoupleSkin ||
                      'skin-classic-notebook'
                    }
                    size="md"
                  />
                  <AnimatedSkinnedAvatar
                    avatarId={activeCouple.partnerProfile?.avatar}
                    customPhotoUrl={activeCouple.partnerProfile?.customPhotoUrl}
                    skinId={
                      activeCouple.partnerProfile?.equippedSkin ||
                      activeCouple.equippedCoupleSkin ||
                      'skin-classic-notebook'
                    }
                    size="md"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-rose-300">
                    <span>{activeCouple.coupleTitle || 'Newcomer Duo'}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {activeCouple.requesterProfile?.username} &amp;{' '}
                      {activeCouple.partnerProfile?.username}
                    </span>
                  </div>
                  <h3 className="mt-0.5 text-2xl font-bold tracking-tight text-stone-100">
                    {activeCouple.coupleName ||
                      `${activeCouple.requesterProfile?.username} & ${activeCouple.partnerProfile?.username}`}
                  </h3>
                  <p className="mt-1 text-xs text-stone-300">
                    {activeCouple.coupleBio || 'Playing side by side in Her Little Arcade.'}
                  </p>
                  {activeCouple.anniversaryDate && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-300">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Anniversary / Together Since: {activeCouple.anniversaryDate}</span>
                    </div>
                  )}
                  {(() => {
                    const cSkin = getSkinById(
                      activeCouple.equippedCoupleSkin || currentUser.equippedSkin
                    );
                    const cBanner = getBannerById(
                      activeCouple.coupleBanner || currentUser.equippedBanner
                    );
                    return (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 font-semibold ${cSkin.tagColorClass}`}
                        >
                          <span>{cSkin.emblem}</span>
                          <span>Couple Frame: {cSkin.name}</span>
                          <span className="font-mono text-[10px] uppercase opacity-90">
                            · {cSkin.rarity}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-950/90 px-2.5 py-0.5 font-mono text-[11px] text-stone-200">
                          Banner: {cBanner.name} ({cBanner.rarity})
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Combined Couple Trophies, Level & Win-Loss Record */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs tabular-nums sm:grid-cols-4">
                <div className="rounded-xl border border-amber-500/40 bg-stone-950/85 px-4 py-3 text-center">
                  <div className="text-amber-300">Couple Trophies</div>
                  <div className="mt-1 text-lg font-bold text-amber-300">
                    🏆 {activeCouple.coupleTrophies ?? 0}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Peak: {activeCouple.highestTrophies ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border border-stone-800/90 bg-stone-950/80 px-4 py-3 text-center">
                  <div className="text-stone-400">Couple Level</div>
                  <div className="mt-1 text-lg font-bold text-amber-300">
                    Lv.{activeCouple.combinedLevel}
                  </div>
                  <div className="text-[11px] text-stone-400">{activeCouple.combinedXp} XP</div>
                </div>

                <div className="rounded-xl border border-stone-800/90 bg-stone-950/80 px-4 py-3 text-center">
                  <div className="text-stone-400">2v2 Record</div>
                  <div className="mt-1 text-lg font-bold text-emerald-400">
                    {activeCouple.coupleWins}W
                  </div>
                  <div className="text-[11px] text-stone-400">
                    {activeCouple.coupleLosses}L · {activeCouple.coupleDraws}D
                  </div>
                </div>

                <div className="rounded-xl border border-stone-800/90 bg-stone-950/80 px-4 py-3 text-center">
                  <div className="text-stone-400">2v2 Status</div>
                  <div className="mt-1 text-sm font-bold text-teal-300">Ready</div>
                  <div className="text-[11px] text-stone-400">#{activeCouple.pairingCode}</div>
                </div>
              </div>
            </div>
          </ProfileBannerBackdrop>

          {/* Individual Partner Breakdown */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[activeCouple.requesterProfile, activeCouple.partnerProfile].map((partner, idx) => {
              if (!partner) return null;
              const isMe = partner.uid === currentUser.uid;
              const isOnline = isMe ? true : Boolean(partner.isOnline);
              return (
                <div
                  key={partner.uid}
                  className="flex items-center justify-between rounded-xl border border-stone-800 bg-stone-950 p-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <AnimatedSkinnedAvatar
                      avatarId={partner.avatar}
                      customPhotoUrl={isMe ? currentUser.customPhotoUrl : partner.customPhotoUrl}
                      skinId={isMe ? currentUser.equippedSkin : partner.equippedSkin}
                      size="sm"
                    />
                    <div>
                      <div className="flex items-center gap-2 font-bold text-stone-100">
                        <span>
                          @{partner.username} {isMe ? '(You)' : `(Partner ${idx + 1})`}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[10px] ${
                            isOnline ? 'text-emerald-400' : 'text-stone-400'
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-stone-600'
                            }`}
                          />
                          {isOnline
                            ? partner.presenceStatus === 'in_match'
                              ? 'In Match'
                              : 'Online'
                            : 'Offline'}
                        </span>
                      </div>
                      <div className="text-stone-400">
                        {partner.email || `Couple ID #${activeCouple.id} · Paired ${activeCouple.anniversaryDate}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="font-semibold text-amber-300">
                      Lv.{partner.level} · {partner.xp} XP
                    </div>
                    <div className="text-stone-400">
                      {partner.wins}W · {partner.losses}L · {partner.coins} Coins
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Couple Profile Editor Form */}
          {isEditingProfile && (
            <form
              onSubmit={handleSaveCoupleProfile}
              className="space-y-4 rounded-xl border border-stone-800 bg-stone-950 p-4"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Trophy className="h-4 w-4" />
                <span>Edit Shared Couple Profile</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="couple-name-input" className="block text-xs font-medium text-stone-300">
                    Custom Couple Name
                  </label>
                  <input
                    id="couple-name-input"
                    type="text"
                    value={editCoupleName}
                    onChange={(e) => setEditCoupleName(e.target.value)}
                    placeholder="e.g. Team Starlight"
                    className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="couple-anniversary-input" className="block text-xs font-medium text-stone-300">
                    Anniversary / Special Date
                  </label>
                  <input
                    id="couple-anniversary-input"
                    type="date"
                    value={editAnniversary}
                    onChange={(e) => setEditAnniversary(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="couple-bio-input" className="block text-xs font-medium text-stone-300">
                  Shared Couple Bio &amp; Motto
                </label>
                <input
                  id="couple-bio-input"
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Our shared arcade motto..."
                  className="mt-1 w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-stone-300">
                  Shared Couple Banner Atmosphere
                </span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {[
                    { id: 'twilight-lanterns', label: 'Twilight Lanterns' },
                    { id: 'starlight-picnic', label: 'Starlight Picnic' },
                    { id: 'rosewood-conservatory', label: 'Rosewood Conservatory' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setEditBanner(b.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                        editBanner === b.id
                          ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                          : 'border-stone-800 bg-stone-900 text-stone-400'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400"
              >
                Save Couple Profile
              </button>
            </form>
          )}

          {/* Unpair Confirmation Dialog */}
          {confirmUnpairModal && (
            <div className="rounded-xl border border-rose-500/50 bg-rose-950/30 p-4 text-xs">
              <div className="font-bold text-rose-200">
                Confirm Unpairing from {activeCouple.coupleName}?
              </div>
              <p className="mt-1 text-stone-300">
                Unpairing dissolves your shared Couple Profile so either account can pair again later. Your individual player account, coins, XP, and personal game history will NOT be deleted.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleUnpairConfirm}
                  className="rounded-lg bg-rose-500 px-3.5 py-1.5 font-bold text-stone-950 hover:bg-rose-400"
                >
                  Confirm Unpair
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmUnpairModal(false)}
                  className="rounded-lg border border-stone-700 bg-stone-900 px-3.5 py-1.5 font-semibold text-stone-200"
                >
                  Keep Pairing
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ====================================================================
           STATE B: UNPAIRED — INVITE BY USERNAME OR CODE & INSTANT 1-STEP ACCEPT
           ==================================================================== */
        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Invite Partner by @username or 6-Character Code */}
          <div className="space-y-4 lg:col-span-6">
            <h3 className="text-sm font-bold text-stone-100">
              Step 1: Invite Your Partner
            </h3>
            <p className="text-xs leading-relaxed text-stone-400">
              Send a direct Couple Pairing Request by entering your partner&apos;s{' '}
              <span className="font-mono text-stone-200">@username</span>, or generate a 6-character pairing code to share with them. As soon as your partner accepts, both accounts will automatically link to the same Shared Couple Profile in real time.
            </p>

            {/* Direct @username Request Form */}
            <form onSubmit={handleSendUsernameRequest} className="flex gap-2">
              <label htmlFor="partner-username-request-input" className="sr-only">
                Partner Username
              </label>
              <input
                id="partner-username-request-input"
                type="text"
                value={targetUsernameInput}
                onChange={(e) => setTargetUsernameInput(e.target.value)}
                placeholder="Enter partner's @username"
                className="w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400 whitespace-nowrap shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Request</span>
              </button>
            </form>

            {coupleContext.pendingOutgoing ? (
              <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-200">
                    {coupleContext.pendingOutgoing.partnerProfile
                      ? `Pending Request to @${coupleContext.pendingOutgoing.partnerProfile.username}`
                      : 'Your Active Invite Code'}
                  </span>
                  <span className="font-mono text-base font-bold text-amber-300 tabular-nums">
                    #{coupleContext.pendingOutgoing.pairingCode}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyPairingCode(coupleContext.pendingOutgoing!.pairingCode)}
                    className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-semibold text-stone-200 hover:border-amber-500/50"
                  >
                    {copiedCode ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-stone-400" />
                    )}
                    <span>
                      {copiedCode
                        ? 'Copied Code'
                        : `Copy Code (${coupleContext.pendingOutgoing.pairingCode})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyPairingInviteLink(coupleContext.pendingOutgoing!.pairingCode)}
                    className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-semibold text-stone-200 hover:border-amber-500/50"
                  >
                    {copiedLink ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    )}
                    <span>{copiedLink ? 'Invitation Link Copied!' : 'Copy Invite Link'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleCancelInvite(coupleContext.pendingOutgoing!.pairingCode)}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/20"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Cancel Invite</span>
                  </button>
                </div>

                <p className="text-[11px] text-stone-400">
                  {coupleContext.pendingOutgoing.partnerProfile ? (
                    <>
                      Waiting for{' '}
                      <span className="font-semibold text-stone-200">
                        @{coupleContext.pendingOutgoing.partnerProfile.username}
                      </span>{' '}
                      to accept in their Mailbox or enter code{' '}
                      <span className="font-mono font-semibold text-stone-200">
                        {coupleContext.pendingOutgoing.pairingCode}
                      </span>
                      . Your page will update automatically as soon as they accept!
                    </>
                  ) : (
                    <>
                      Waiting for your partner to enter code{' '}
                      <span className="font-mono font-semibold text-stone-200">
                        {coupleContext.pendingOutgoing.pairingCode}
                      </span>{' '}
                      on their account. Your page will update automatically as soon as they accept!
                    </>
                  )}
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleGenerateInviteCode}
                className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-stone-900 px-4 py-2.5 text-xs font-bold text-amber-300 transition-colors hover:bg-stone-800"
              >
                {loading ? (
                  <ArcadeInlineSpinner size={15} label="Generating Code..." />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Or Generate 6-Character Pairing Code</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Right Column: Accept Incoming Request or Enter Partner's Pairing Code */}
          <div className="space-y-4 lg:col-span-6">
            <h3 className="text-sm font-bold text-stone-100">
              Step 2: Accept Partner Request or Enter Code
            </h3>
            <p className="text-xs leading-relaxed text-stone-400">
              Accept an incoming Couple Pairing Request below or enter the 6-character pairing code from your partner to activate your Shared Couple Profile immediately.
            </p>

            {coupleContext.pendingIncoming && coupleContext.pendingIncoming.requesterProfile && (
              <div className="rounded-xl border border-teal-500/50 bg-teal-500/10 p-3.5 text-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <AnimatedSkinnedAvatar
                      avatarId={coupleContext.pendingIncoming.requesterProfile.avatar}
                      customPhotoUrl={coupleContext.pendingIncoming.requesterProfile.customPhotoUrl}
                      skinId={coupleContext.pendingIncoming.requesterProfile.equippedSkin}
                      size="sm"
                    />
                    <div>
                      <div className="font-bold text-teal-200">
                        Incoming Pairing Request from @{coupleContext.pendingIncoming.requesterProfile.username}
                      </div>
                      <div className="text-stone-300">
                        Lv.{coupleContext.pendingIncoming.requesterProfile.level} · Code #{coupleContext.pendingIncoming.pairingCode}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleAcceptInvite(coupleContext.pendingIncoming!.pairingCode)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-teal-400 py-2 text-xs font-bold text-stone-950 hover:bg-teal-300"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>
                    Accept &amp; Activate Couple Profile with @{coupleContext.pendingIncoming.requesterProfile.username}
                  </span>
                </button>
              </div>
            )}

            <form onSubmit={handleInspectCode} className="flex gap-2">
              <label htmlFor="partner-pair-code-input" className="sr-only">
                Partner Pairing Code
              </label>
              <input
                id="partner-pair-code-input"
                type="text"
                maxLength={8}
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-char code"
                className="w-full rounded-lg border border-stone-800 bg-stone-900 px-3 py-2 font-mono text-xs uppercase text-stone-100 focus:border-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3.5 py-2 text-xs font-bold text-stone-100 hover:bg-stone-700 whitespace-nowrap shrink-0"
              >
                {loading ? (
                  <ArcadeInlineSpinner size={14} label="Verifying..." />
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5" />
                    <span>Verify Code</span>
                  </>
                )}
              </button>
            </form>

            {inspectedInvite && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <AnimatedSkinnedAvatar
                      avatarId={inspectedInvite.requesterProfile.avatar}
                      customPhotoUrl={inspectedInvite.requesterProfile.customPhotoUrl}
                      skinId={inspectedInvite.requesterProfile.equippedSkin}
                      size="sm"
                    />
                    <div>
                      <div className="font-bold text-stone-100">
                        @{inspectedInvite.requesterProfile.username} · Lv.
                        {inspectedInvite.requesterProfile.level}
                      </div>
                      <div className="text-stone-400">
                        {inspectedInvite.requesterProfile.isOnline ? 'Online Now' : 'Registered Player'}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-amber-300">
                    #{inspectedInvite.pairingCode}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleAcceptInvite(inspectedInvite.pairingCode)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 py-2 text-xs font-bold text-stone-950 hover:bg-amber-400"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>
                    Accept &amp; Activate Pairing with @{inspectedInvite.requesterProfile.username}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
