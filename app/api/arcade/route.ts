import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/src/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import {
  getArcadeBootstrapData,
  registerUserWithEmail,
  signInUserWithEmail,
  verifyUserEmailCode,
  createPasswordResetRequest,
  completePasswordResetWithToken,
  getOrCreateOAuthPlayerProfile,
  checkUsernameAvailability,
  completeInitialUsernameSetup,
  redeemRenameCardForUsername,
  purchaseRewardShopItem,
  equipOrUnequipSkin,
  updateUserProfilePhoto,
  purchaseArcadeBanner,
  equipOrUnequipBanner,
  purchaseChestToInventory,
  openArcadeChest,
  toggleRankedShieldCardArmed,
  claimChallengeReward,
  updateSeasonalBracketConfig,
  concludeActiveSeasonNow,
  getCoupleContextForUser,
  createCouplePairingInvite,
  inspectCouplePairingInvite,
  acceptCouplePairingInvite,
  confirmCouplePairingFinal,
  cancelCouplePairingInvite,
  updateSharedCoupleProfile,
  claimCoupleTrophyMilestone,
  unpairCoupleAccounts,
  createValidatedMultiplayerRoom,
  inspectRoomForJoin,
  joinValidatedMultiplayerRoom,
  respondToRoomJoinRequest,
  listJoinablePublicRooms,
  upsertMultiplayerRoom,
  getRoomByCode,
  recordGameMatchResult,
  updatePlayerProfileFields,
  addPersonalizedItem,
  verifySignedSessionToken,
  restoreAuthenticatedUserSession,
  terminateAuthenticatedUserSession,
  updateUserPresenceHeartbeat,
  getMatchmakingStateForUser,
  enqueueMatchmaking,
  cancelMatchmaking,
  acknowledgeMatchStarting,
  searchUsersAndCouplesForInvite,
  sendGameInvitationByUsername,
  cancelGameInvitation,
  respondToGameInvitation,
  get2v2CoupleTeamLobby,
  invitePartnerTo2v2Team,
  respondPartnerTo2v2Team,
  toggle2v2TeamReady,
  kickPartyRoomParticipant,
  seedDemoPartyCouples,
  recordPartyMatchResult,
  submitAuthoritativeChessAction,
  getMailboxForUser,
  sendCouplePairingRequestByUsername,
  sendDirectRoomOrPartyInvitation,
  markMailboxItemsRead,
  dismissMailboxItems,
  respondToMailboxItem,
  getCoupleVoiceChatState,
  issueCoupleLiveKitToken,
  startCoupleVoiceCall,
  respondCoupleVoiceCall,
  endCoupleVoiceCall,
  syncCoupleVoiceSignaling,
  testLiveKitAndVoiceDiagnostics,
} from '@/src/db/repository';

const SESSION_COOKIE_NAME = 'hla_session';
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

function attachSessionCookie(
  req: NextRequest,
  res: NextResponse,
  sessionToken: string,
  keepSignedIn: boolean
): NextResponse {
  const proto =
    req.headers.get('x-forwarded-proto') ||
    (req.url.startsWith('https://') ? 'https' : 'http');
  const isHttps = proto === 'https' || process.env.NODE_ENV === 'production';

  res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: '/',
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    ...(keepSignedIn ? { maxAge: THIRTY_DAYS_SECONDS } : {}),
  });
  return res;
}

function clearSessionCookie(req: NextRequest, res: NextResponse): NextResponse {
  const proto =
    req.headers.get('x-forwarded-proto') ||
    (req.url.startsWith('https://') ? 'https' : 'http');
  const isHttps = proto === 'https' || process.env.NODE_ENV === 'production';

  res.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 0,
  });
  return res;
}

async function resolveAuthenticatedIdentity(req: NextRequest): Promise<{
  uid: string;
  email: string;
  keepSignedIn: boolean;
} | null> {
  const candidateTokens: string[] = [];

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const headerToken = authHeader.slice(7).trim();
    if (headerToken) candidateTokens.push(headerToken);
  }

  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value?.trim();
  if (cookieToken && !candidateTokens.includes(cookieToken)) {
    candidateTokens.push(cookieToken);
  }

  for (const token of candidateTokens) {
    // 1. Check HMAC-signed server session token (hla.<payload>.<sig>)
    const signed = verifySignedSessionToken(token);
    if (signed) {
      return {
        uid: signed.uid,
        email: signed.email,
        keepSignedIn: signed.keepSignedIn,
      };
    }

    // 2. Check Firebase ID token
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email || `${decoded.uid}@herlittlearcade.app`,
        keepSignedIn: true,
      };
    } catch {
      // try next candidate token
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const inspectRoomCode = searchParams.get('inspectRoom');
    const requestedUid = searchParams.get('uid') || undefined;
    const identity = await resolveAuthenticatedIdentity(req);
    const verifiedUid = identity?.uid;

    const checkUsername = searchParams.get('checkUsername');
    if (checkUsername !== null) {
      const check = await checkUsernameAvailability(
        checkUsername,
        verifiedUid || requestedUid
      );
      return NextResponse.json(check);
    }

    const mailboxParam = searchParams.get('mailbox');
    if (mailboxParam) {
      if (!verifiedUid) {
        return NextResponse.json(
          { error: 'Unauthorized: Sign in required to view Mailbox.' },
          { status: 401 }
        );
      }
      if (requestedUid && requestedUid !== verifiedUid) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot access another user’s Mailbox.' },
          { status: 403 }
        );
      }
      const [mailbox, coupleContext] = await Promise.all([
        getMailboxForUser(verifiedUid),
        getCoupleContextForUser(verifiedUid),
      ]);
      return NextResponse.json({ mailbox, coupleContext });
    }

    const coupleContextParam = searchParams.get('coupleContext');
    if (coupleContextParam) {
      if (!verifiedUid) {
        return NextResponse.json(
          { error: 'Unauthorized: Sign in required for Couple Context.' },
          { status: 401 }
        );
      }
      if (requestedUid && requestedUid !== verifiedUid) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot access another user’s Couple Context.' },
          { status: 403 }
        );
      }
      const coupleContext = await getCoupleContextForUser(verifiedUid);
      return NextResponse.json({ coupleContext });
    }

    const coupleVoiceParam = searchParams.get('coupleVoice');
    if (coupleVoiceParam) {
      if (!verifiedUid) {
        return NextResponse.json(
          { error: 'Unauthorized: Sign in required for Couple Voice Chat.' },
          { status: 401 }
        );
      }
      if (requestedUid && requestedUid !== verifiedUid) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot access another user’s voice state.' },
          { status: 403 }
        );
      }
      const coupleVoiceState = await getCoupleVoiceChatState(verifiedUid);
      return NextResponse.json({ coupleVoiceState });
    }

    const diagnosticsParam = searchParams.get('diagnostics');
    if (diagnosticsParam) {
      const diagnostics = await testLiveKitAndVoiceDiagnostics(verifiedUid);
      return NextResponse.json({ diagnostics });
    }

    const publicRooms = searchParams.get('publicRooms');
    if (publicRooms) {
      const gameId = searchParams.get('gameId') || undefined;
      const modeParam = searchParams.get('mode');
      const mode =
        modeParam === '1v1' || modeParam === '2v2' || modeParam === 'party'
          ? modeParam
          : 'all';
      const roomsList = await listJoinablePublicRooms({
        gameId,
        mode,
        actorUid: verifiedUid,
      });
      return NextResponse.json({ publicRooms: roomsList });
    }

    const teamLobby2v2 = searchParams.get('teamLobby2v2');
    if (teamLobby2v2) {
      if (!verifiedUid) {
        return NextResponse.json(
          { error: 'Unauthorized: Sign in required for 2v2 Team Lobby.' },
          { status: 401 }
        );
      }
      if (requestedUid && requestedUid !== verifiedUid) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot access another user’s 2v2 Team Lobby.' },
          { status: 403 }
        );
      }
      const gameId = searchParams.get('gameId') || undefined;
      const teamLobby = await get2v2CoupleTeamLobby(verifiedUid, gameId);
      return NextResponse.json({ teamLobby });
    }

    const searchUsername = searchParams.get('searchUsername');
    if (searchUsername !== null) {
      if (!verifiedUid) {
        return NextResponse.json(
          { error: 'Unauthorized: Sign in required to search players.' },
          { status: 401 }
        );
      }
      const inviteType = searchParams.get('inviteType') === '2v2' ? '2v2' : '1v1';
      const results = await searchUsersAndCouplesForInvite({
        actorUid: verifiedUid,
        query: searchUsername,
        inviteType,
      });
      return NextResponse.json(results);
    }

    if (inspectRoomCode) {
      const inspection = await inspectRoomForJoin(inspectRoomCode, verifiedUid);
      return NextResponse.json(inspection);
    }

    const matchmakingStatus = searchParams.get('matchmakingStatus');
    if (matchmakingStatus) {
      if (!verifiedUid) {
        return NextResponse.json(
          { error: 'Unauthorized: Sign in required for matchmaking status.' },
          { status: 401 }
        );
      }
      if (requestedUid && requestedUid !== verifiedUid) {
        return NextResponse.json(
          { error: 'Forbidden: Cannot access another user’s matchmaking status.' },
          { status: 403 }
        );
      }
      const state = await getMatchmakingStateForUser(verifiedUid);
      return NextResponse.json(state);
    }

    const roomCode = searchParams.get('roomCode');
    if (roomCode) {
      const room = await getRoomByCode(roomCode);
      return NextResponse.json({ room });
    }

    // Enforce user data isolation: if caller requested a specific ?uid= that does not match their verified session, reject with 403
    if (requestedUid && verifiedUid && requestedUid !== verifiedUid) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot request private bootstrap data for another user.' },
        { status: 403 }
      );
    }

    // Only load private user collections for the cryptographically verified user identity
    const data = await getArcadeBootstrapData(verifiedUid);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch arcade data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'check_username') {
      const identity = await resolveAuthenticatedIdentity(req);
      const check = await checkUsernameAvailability(
        String(body.username || ''),
        identity?.uid || (body.excludeUid ? String(body.excludeUid) : undefined)
      );
      return NextResponse.json(check);
    }

    if (action === 'restore_session') {
      const identity = await resolveAuthenticatedIdentity(req);
      if (!identity) {
        const unauthRes = NextResponse.json({
          authenticated: false,
          profile: null,
        });
        return clearSessionCookie(req, unauthRes);
      }
      const restored = await restoreAuthenticatedUserSession(
        identity.uid,
        identity.email,
        identity.keepSignedIn
      );
      if (!restored) {
        const unauthRes = NextResponse.json({
          authenticated: false,
          profile: null,
        });
        return clearSessionCookie(req, unauthRes);
      }
      const res = NextResponse.json({
        authenticated: true,
        profile: restored.profile,
        sessionToken: restored.sessionToken,
        keepSignedIn: restored.keepSignedIn,
      });
      return attachSessionCookie(req, res, restored.sessionToken, restored.keepSignedIn);
    }

    if (action === 'logout') {
      const identity = await resolveAuthenticatedIdentity(req);
      if (identity?.uid) {
        await terminateAuthenticatedUserSession(identity.uid);
      }
      const res = NextResponse.json({ loggedOut: true });
      return clearSessionCookie(req, res);
    }

    // Public authentication actions
    if (action === 'register_email') {
      const keepSignedIn = body.keepSignedIn !== false;
      const out = await registerUserWithEmail({
        email: String(body.email || ''),
        password: String(body.password || ''),
        firebaseUid: body.firebaseUid ? String(body.firebaseUid) : undefined,
        keepSignedIn,
      });
      const res = NextResponse.json(out);
      return attachSessionCookie(req, res, out.sessionToken, keepSignedIn);
    }

    if (action === 'signin_email') {
      const keepSignedIn = body.keepSignedIn !== false;
      const out = await signInUserWithEmail({
        email: String(body.email || ''),
        password: String(body.password || ''),
        keepSignedIn,
      });
      const res = NextResponse.json(out);
      return attachSessionCookie(req, res, out.sessionToken, keepSignedIn);
    }

    if (action === 'oauth_sync') {
      const keepSignedIn = body.keepSignedIn !== false;
      const identity = await resolveAuthenticatedIdentity(req);
      const targetUid = identity?.uid || String(body.uid || '');
      const targetEmail = identity?.email || String(body.email || '');
      if (!targetUid || !targetEmail) {
        return NextResponse.json(
          { error: 'Missing OAuth account identity.' },
          { status: 400 }
        );
      }
      const out = await getOrCreateOAuthPlayerProfile(
        targetUid,
        targetEmail,
        body.googleDisplayName ? String(body.googleDisplayName) : undefined,
        keepSignedIn
      );
      const res = NextResponse.json(out);
      return attachSessionCookie(req, res, out.sessionToken, keepSignedIn);
    }

    if (action === 'request_password_reset') {
      const out = await createPasswordResetRequest(String(body.email || ''));
      return NextResponse.json(out);
    }

    if (action === 'complete_password_reset') {
      const out = await completePasswordResetWithToken({
        email: String(body.email || ''),
        resetToken: String(body.resetToken || ''),
        newPassword: String(body.newPassword || ''),
      });
      const res = NextResponse.json(out);
      return attachSessionCookie(req, res, out.sessionToken, true);
    }

    // Authenticated actions require a verified session token or Firebase ID token
    const identity = await resolveAuthenticatedIdentity(req);
    if (!identity) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in to your account.' },
        { status: 401 }
      );
    }

    if (action === 'complete_username_setup') {
      const profile = await completeInitialUsernameSetup(
        identity.uid,
        String(body.username || '')
      );
      return NextResponse.json({ profile });
    }

    if (action === 'use_rename_card') {
      const profile = await redeemRenameCardForUsername(
        identity.uid,
        String(body.username || '')
      );
      return NextResponse.json({ profile });
    }

    if (action === 'purchase_shop_item') {
      const profile = await purchaseRewardShopItem(
        identity.uid,
        String(body.itemId || '')
      );
      return NextResponse.json({ profile, user: profile });
    }

    if (action === 'equip_skin') {
      const profile = await equipOrUnequipSkin(
        identity.uid,
        String(body.skinId || 'skin-classic-notebook'),
        Boolean(body.applyToCouple)
      );
      const coupleContext = await getCoupleContextForUser(identity.uid);
      return NextResponse.json({ profile, user: profile, coupleContext });
    }

    if (action === 'update_profile_photo') {
      const rawPhotoInput =
        body.photoDataUrl !== undefined
          ? String(body.photoDataUrl)
          : String(body.customPhotoUrl || '');
      const profile = await updateUserProfilePhoto(
        identity.uid,
        rawPhotoInput
      );
      const coupleContext = await getCoupleContextForUser(identity.uid);
      return NextResponse.json({ profile, user: profile, coupleContext });
    }

    if (action === 'purchase_banner') {
      const profile = await purchaseArcadeBanner(
        identity.uid,
        String(body.bannerId || '')
      );
      return NextResponse.json({ profile, user: profile });
    }

    if (action === 'equip_banner') {
      const profile = await equipOrUnequipBanner(
        identity.uid,
        String(body.bannerId || 'banner-sketchbook-grid'),
        Boolean(body.applyToCouple)
      );
      const coupleContext = await getCoupleContextForUser(identity.uid);
      return NextResponse.json({ profile, user: profile, coupleContext });
    }

    if (action === 'buy_chest') {
      const profile = await purchaseChestToInventory(
        identity.uid,
        (body.chestTier || 'Common') as 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary',
        Number(body.quantity || 1)
      );
      return NextResponse.json({ profile, user: profile });
    }

    if (action === 'open_chest') {
      const out = await openArcadeChest({
        uid: identity.uid,
        chestTier: (body.chestTier || 'Common') as
          | 'Common'
          | 'Uncommon'
          | 'Rare'
          | 'Epic'
          | 'Legendary',
        openMethod:
          body.openMethod === 'key' || body.openMethod === 'inventory'
            ? body.openMethod
            : 'coins',
      });
      return NextResponse.json(out);
    }

    if (action === 'toggle_shield_card') {
      const profile = await toggleRankedShieldCardArmed(
        identity.uid,
        Boolean(body.armed)
      );
      const teamLobby = await get2v2CoupleTeamLobby(identity.uid);
      return NextResponse.json({ profile, user: profile, teamLobby });
    }

    if (action === 'claim_challenge') {
      const out = await claimChallengeReward(
        identity.uid,
        String(body.challengeKey || '')
      );
      return NextResponse.json(out);
    }

    if (action === 'update_season_bracket') {
      const out = await updateSeasonalBracketConfig(
        identity.uid,
        body.config || {}
      );
      return NextResponse.json(out);
    }

    if (action === 'conclude_season_now') {
      const out = await concludeActiveSeasonNow(identity.uid);
      const bootstrap = await getArcadeBootstrapData(identity.uid);
      return NextResponse.json({ rollover: out, ...bootstrap });
    }

    if (action === 'claim_trophy_milestone') {
      const pairing = await claimCoupleTrophyMilestone(
        identity.uid,
        String(body.milestoneId || '')
      );
      const coupleContext = await getCoupleContextForUser(identity.uid);
      return NextResponse.json({ pairing, coupleContext });
    }

    if (action === 'search_invite_targets') {
      const results = await searchUsersAndCouplesForInvite({
        actorUid: identity.uid,
        query: String(body.query || ''),
        inviteType: body.inviteType === '2v2' ? '2v2' : '1v1',
      });
      return NextResponse.json(results);
    }

    if (action === 'send_game_invitation') {
      const out = await sendGameInvitationByUsername({
        senderUid: identity.uid,
        inviteType: body.inviteType === '2v2' ? '2v2' : '1v1',
        targetUsername: body.targetUsername ? String(body.targetUsername) : undefined,
        targetCoupleId: body.targetCoupleId ? Number(body.targetCoupleId) : undefined,
        gameId: String(body.gameId || 'chess'),
        settings: body.settings && typeof body.settings === 'object' ? body.settings : undefined,
      });
      return NextResponse.json(out);
    }

    if (action === 'respond_game_invitation') {
      const out = await respondToGameInvitation({
        actorUid: identity.uid,
        invitationId: Number(body.invitationId),
        accept: Boolean(body.accept),
      });
      return NextResponse.json(out);
    }

    if (action === 'cancel_game_invitation') {
      const out = await cancelGameInvitation({
        actorUid: identity.uid,
        invitationId: Number(body.invitationId),
      });
      return NextResponse.json(out);
    }

    if (action === 'invite_partner_2v2_team') {
      const teamLobby = await invitePartnerTo2v2Team({
        actorUid: identity.uid,
        gameId: String(body.gameId || 'word-orbit-relay'),
      });
      return NextResponse.json({ teamLobby });
    }

    if (action === 'respond_partner_2v2_team') {
      const teamLobby = await respondPartnerTo2v2Team({
        actorUid: identity.uid,
        accept: Boolean(body.accept),
        gameId: body.gameId ? String(body.gameId) : undefined,
      });
      return NextResponse.json({ teamLobby });
    }

    if (action === 'toggle_2v2_team_ready') {
      const teamLobby = await toggle2v2TeamReady({
        actorUid: identity.uid,
        ready: body.ready !== undefined ? Boolean(body.ready) : undefined,
        gameId: body.gameId ? String(body.gameId) : undefined,
      });
      return NextResponse.json({ teamLobby });
    }

    if (action === 'presence_heartbeat') {
      const out = await updateUserPresenceHeartbeat({
        uid: identity.uid,
        presenceStatus: body.presenceStatus,
        activeRoomCode: body.activeRoomCode,
      });
      return NextResponse.json(out || { ok: true });
    }

    if (action === 'enqueue_matchmaking') {
      const state = await enqueueMatchmaking({
        actorUid: identity.uid,
        queueMode: body.queueMode === '1v1' ? '1v1' : '2v2',
        gameId: String(body.gameId || 'quiz-battle'),
        requireTeamReady: Boolean(body.requireTeamReady),
      });
      return NextResponse.json(state);
    }

    if (action === 'cancel_matchmaking') {
      const state = await cancelMatchmaking({
        actorUid: identity.uid,
        queueId: body.queueId ? Number(body.queueId) : undefined,
      });
      return NextResponse.json(state);
    }

    if (action === 'acknowledge_match_starting') {
      const state = await acknowledgeMatchStarting({
        actorUid: identity.uid,
        queueId: Number(body.queueId),
      });
      return NextResponse.json(state);
    }

    if (action === 'verify_email') {
      const profile = await verifyUserEmailCode(
        identity.uid,
        String(body.code || '')
      );
      return NextResponse.json({ profile });
    }

    // Couple Pairing actions
    if (action === 'create_couple_invite') {
      const invite = await createCouplePairingInvite(identity.uid);
      const coupleContext = await getCoupleContextForUser(identity.uid);
      return NextResponse.json({ invite, coupleContext });
    }

    if (action === 'inspect_couple_invite') {
      const preview = await inspectCouplePairingInvite(
        identity.uid,
        String(body.pairingCode || '')
      );
      return NextResponse.json({ preview });
    }

    if (action === 'accept_couple_invite') {
      const updated = await acceptCouplePairingInvite(
        identity.uid,
        String(body.pairingCode || '')
      );
      const coupleContext = await getCoupleContextForUser(identity.uid);
      return NextResponse.json({ pairing: updated, coupleContext });
    }

    if (action === 'confirm_couple_invite') {
      const confirmed = await confirmCouplePairingFinal(
        identity.uid,
        String(body.pairingCode || '')
      );
      const coupleContext = await getCoupleContextForUser(identity.uid);
      return NextResponse.json({ pairing: confirmed, coupleContext });
    }

    if (action === 'cancel_couple_invite') {
      const out = await cancelCouplePairingInvite(
        identity.uid,
        body.pairingCode ? String(body.pairingCode) : undefined
      );
      return NextResponse.json(out);
    }

    if (action === 'update_couple_profile') {
      const updated = await updateSharedCoupleProfile(identity.uid, {
        coupleName: body.coupleName,
        anniversaryDate: body.anniversaryDate,
        coupleBio: body.coupleBio,
        coupleBanner: body.coupleBanner,
        coupleTitle: body.coupleTitle,
      });
      const coupleContext = await getCoupleContextForUser(identity.uid);
      return NextResponse.json({ pairing: updated, coupleContext });
    }

    if (action === 'unpair_couple') {
      await unpairCoupleAccounts(identity.uid);
      const coupleContext = await getCoupleContextForUser(identity.uid);
      return NextResponse.json({ unpaired: true, coupleContext });
    }

    // Multiplayer Room actions (Create Room, Public Room Browser, Join Group & Party Games)
    if (action === 'create_room') {
      const room = await createValidatedMultiplayerRoom({
        hostUid: identity.uid,
        gameId: String(body.gameId || 'chess'),
        mode:
          body.mode === 'party'
            ? 'party'
            : body.mode === '2v2'
            ? '2v2'
            : '1v1',
        visibility: body.visibility === 'private' ? 'private' : 'public',
        joinPolicy:
          body.joinPolicy === 'approval_required' ? 'approval_required' : 'immediate',
        invitedUids: Array.isArray(body.invitedUids) ? body.invitedUids : [],
        settings: body.settings || {},
        includePairedPartner: body.includePairedPartner !== false,
      });
      return NextResponse.json({ room });
    }

    if (action === 'list_public_rooms') {
      const publicRooms = await listJoinablePublicRooms({
        gameId: body.gameId ? String(body.gameId) : undefined,
        mode:
          body.mode === '1v1' || body.mode === '2v2' || body.mode === 'party'
            ? body.mode
            : 'all',
        actorUid: identity.uid,
      });
      return NextResponse.json({ publicRooms });
    }

    if (action === 'join_room') {
      const out = await joinValidatedMultiplayerRoom({
        actorUid: identity.uid,
        roomCode: String(body.roomCode || ''),
        includePairedPartner: body.includePairedPartner !== false,
        viaDirectCodeOrInvite: Boolean(body.viaDirectCodeOrInvite),
      });
      return NextResponse.json({
        room: out,
        pendingApproval: 'pendingApproval' in out ? Boolean(out.pendingApproval) : false,
        pendingMessage: 'pendingMessage' in out ? out.pendingMessage : undefined,
      });
    }

    if (action === 'respond_join_request') {
      const room = await respondToRoomJoinRequest({
        hostUid: identity.uid,
        roomCode: String(body.roomCode || ''),
        requesterUid: String(body.requesterUid || ''),
        approve: Boolean(body.approve),
      });
      return NextResponse.json({ room });
    }

    if (action === 'kick_party_member') {
      const room = await kickPartyRoomParticipant({
        hostUid: identity.uid,
        roomCode: String(body.roomCode || ''),
        targetCoupleId: body.targetCoupleId ? Number(body.targetCoupleId) : undefined,
        targetUid: body.targetUid ? String(body.targetUid) : undefined,
      });
      return NextResponse.json({ room });
    }

    if (action === 'seed_demo_party_couples') {
      const room = await seedDemoPartyCouples({
        hostUid: identity.uid,
        roomCode: String(body.roomCode || ''),
        targetCouples: body.targetCouples ? Number(body.targetCouples) : 4,
      });
      return NextResponse.json({ room });
    }

    if (action === 'sync_room') {
      const room = await upsertMultiplayerRoom({
        roomCode: String(body.roomCode || ''),
        gameId: String(body.gameId || 'chess'),
        mode:
          body.mode === 'party'
            ? 'party'
            : body.mode === '2v2'
            ? '2v2'
            : '1v1',
        visibility:
          body.visibility === 'private' || body.visibility === 'public'
            ? body.visibility
            : undefined,
        joinPolicy:
          body.joinPolicy === 'approval_required' || body.joinPolicy === 'immediate'
            ? body.joinPolicy
            : undefined,
        maxPlayers: Number(
          body.maxPlayers ||
            (body.mode === 'party' ? 20 : body.mode === '2v2' ? 4 : 2)
        ),
        hostUid: String(body.hostUid || identity.uid),
        hostName: String(body.hostName || 'Player'),
        hostAvatar: body.hostAvatar ? String(body.hostAvatar) : undefined,
        status: String(body.status || 'lobby'),
        settings: body.settings || {},
        players: body.players || [],
        teams: body.teams || [],
        pendingRequests: Array.isArray(body.pendingRequests)
          ? body.pendingRequests
          : undefined,
        invitedUids: Array.isArray(body.invitedUids) ? body.invitedUids : undefined,
        gameState: body.gameState || {},
        chat: body.chat || [],
        voiceParticipants: body.voiceParticipants || [],
      });
      return NextResponse.json({ room });
    }

    if (action === 'chess_action') {
      const movePayload =
        body.move && typeof body.move === 'object'
          ? body.move
          : body.from && body.to
          ? {
              from: String(body.from),
              to: String(body.to),
              promotion: body.promotion,
            }
          : undefined;
      const newSettings =
        body.newGameSettings && typeof body.newGameSettings === 'object'
          ? (body.newGameSettings as Record<string, unknown>)
          : {};
      const room = await submitAuthoritativeChessAction({
        actorUid: identity.uid,
        roomCode: String(body.roomCode || ''),
        actionType: body.actionType || 'move',
        move: movePayload,
        acceptDraw: Boolean(body.acceptDraw),
        timePresetId:
          body.timePresetId || newSettings.timePresetId
            ? String(body.timePresetId || newSettings.timePresetId)
            : undefined,
        initialTimeMs:
          body.initialTimeMs || newSettings.initialTimeMs
            ? Number(body.initialTimeMs || newSettings.initialTimeMs)
            : undefined,
        incrementSeconds:
          body.incrementSeconds !== undefined
            ? Number(body.incrementSeconds)
            : newSettings.incrementSeconds !== undefined
            ? Number(newSettings.incrementSeconds)
            : undefined,
        timeControlLabel:
          body.timeControlLabel || newSettings.timeControlLabel
            ? String(body.timeControlLabel || newSettings.timeControlLabel)
            : undefined,
        hostColorPreference:
          body.hostColorPreference ||
          (newSettings.hostColorPreference as 'w' | 'b' | 'white' | 'black' | 'random' | undefined),
      });
      return NextResponse.json({ room });
    }

    // Match Result & Profile Updates
    if (action === 'record_game') {
      const out = await recordGameMatchResult({
        userUid: identity.uid,
        username: String(body.username || 'Player'),
        coupleId: Number(body.coupleId || 0),
        opponentLabel: String(body.opponentLabel || ''),
        gameId: String(body.gameId || ''),
        mode: String(body.mode || 'single'),
        result: String(body.result || 'completed'),
        score: Number(body.score || 0),
        xpEarned: Number(body.xpEarned || 20),
        coinsEarned: Number(body.coinsEarned || 0),
        matchKey: body.matchKey ? String(body.matchKey) : undefined,
        durationSeconds: Number(body.durationSeconds || 60),
        details: body.details || {},
      });
      return NextResponse.json(out);
    }

    if (action === 'record_party_match') {
      const out = await recordPartyMatchResult({
        actorUid: identity.uid,
        roomCode: String(body.roomCode || ''),
        gameId: String(body.gameId || ''),
        durationSeconds: Number(body.durationSeconds || 180),
        standings: Array.isArray(body.standings) ? body.standings : [],
      });
      return NextResponse.json(out);
    }

    if (action === 'update_profile') {
      const updated = await updatePlayerProfileFields(
        identity.uid,
        body.updates || {}
      );
      return NextResponse.json({ profile: updated });
    }

    if (action === 'add_personalized') {
      const item = await addPersonalizedItem({
        creatorUid: identity.uid,
        category: String(body.category || 'quiz_question'),
        title: String(body.title || ''),
        payload: body.payload || {},
      });
      return NextResponse.json({ item });
    }

    // Universal Mailbox Actions
    if (action === 'get_mailbox') {
      const [mailbox, coupleContext] = await Promise.all([
        getMailboxForUser(identity.uid),
        getCoupleContextForUser(identity.uid),
      ]);
      return NextResponse.json({ mailbox, coupleContext });
    }

    if (action === 'mark_mailbox_read') {
      const mailbox = await markMailboxItemsRead({
        actorUid: identity.uid,
        invitationIds: Array.isArray(body.invitationIds)
          ? body.invitationIds.map((id: unknown) => Number(id))
          : undefined,
        markAll: Boolean(body.markAll),
      });
      return NextResponse.json({ mailbox });
    }

    if (action === 'dismiss_mailbox_items') {
      const mailbox = await dismissMailboxItems({
        actorUid: identity.uid,
        invitationIds: Array.isArray(body.invitationIds)
          ? body.invitationIds.map((id: unknown) => Number(id))
          : undefined,
        dismissCompletedAndExpired: Boolean(body.dismissCompletedAndExpired),
      });
      return NextResponse.json({ mailbox });
    }

    if (action === 'respond_mailbox_item') {
      const out = await respondToMailboxItem({
        actorUid: identity.uid,
        invitationId: Number(body.invitationId),
        accept: Boolean(body.accept),
      });
      return NextResponse.json(out);
    }

    if (action === 'send_couple_pairing_request') {
      const out = await sendCouplePairingRequestByUsername({
        senderUid: identity.uid,
        targetUsername: String(body.targetUsername || ''),
      });
      return NextResponse.json(out);
    }

    if (action === 'send_room_or_party_invite') {
      const out = await sendDirectRoomOrPartyInvitation({
        senderUid: identity.uid,
        roomCode: String(body.roomCode || ''),
        targetUsername: body.targetUsername ? String(body.targetUsername) : undefined,
        targetCoupleId: body.targetCoupleId ? Number(body.targetCoupleId) : undefined,
        inviteCategory:
          body.inviteCategory === '2v2_room' ||
          body.inviteCategory === 'party' ||
          body.inviteCategory === 'room_invite'
            ? body.inviteCategory
            : undefined,
      });
      return NextResponse.json(out);
    }

    // Couple Voice Chat Actions
    if (action === 'get_couple_voice_state') {
      const coupleVoiceState = await getCoupleVoiceChatState(identity.uid);
      return NextResponse.json({ coupleVoiceState });
    }

    if (action === 'issue_couple_livekit_token') {
      const tokenPayload = await issueCoupleLiveKitToken(identity.uid);
      return NextResponse.json(tokenPayload);
    }

    if (action === 'start_couple_voice_call') {
      const coupleVoiceState = await startCoupleVoiceCall(identity.uid);
      return NextResponse.json({ coupleVoiceState });
    }

    if (action === 'respond_couple_voice_call') {
      const coupleVoiceState = await respondCoupleVoiceCall({
        actorUid: identity.uid,
        callId: String(body.callId || ''),
        accept: Boolean(body.accept),
      });
      return NextResponse.json({ coupleVoiceState });
    }

    if (action === 'end_couple_voice_call') {
      const coupleVoiceState = await endCoupleVoiceCall({
        actorUid: identity.uid,
        callId: body.callId ? String(body.callId) : undefined,
      });
      return NextResponse.json({ coupleVoiceState });
    }

    if (action === 'sync_couple_voice_signaling') {
      const coupleVoiceState = await syncCoupleVoiceSignaling({
        actorUid: identity.uid,
        callId: String(body.callId || ''),
        offer: body.offer,
        answer: body.answer,
        iceCandidate: body.iceCandidate,
        micMuted:
          typeof body.micMuted === 'boolean' ? body.micMuted : undefined,
        speakerDeafened:
          typeof body.speakerDeafened === 'boolean'
            ? body.speakerDeafened
            : undefined,
        speakingLevel:
          typeof body.speakingLevel === 'number'
            ? body.speakingLevel
            : undefined,
      });
      return NextResponse.json({ coupleVoiceState });
    }

    if (action === 'test_livekit_diagnostics') {
      const diagnostics = await testLiveKitAndVoiceDiagnostics(identity.uid);
      return NextResponse.json({ diagnostics });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Request failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


