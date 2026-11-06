'use client';

import React, { useState } from 'react';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
} from 'firebase/auth';
import { auth, googleAuthProvider, syncPlayerProfileToFirestore } from '@/src/lib/firebase';
import { HERO_BANNER_IMAGE } from '@/src/lib/arcade-data';
import {
  X,
  Mail,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { ArcadeCircularLoader, ArcadeInlineSpinner } from './ArcadeLoader';

export interface PlayerProfile {
  uid: string;
  email: string;
  username: string;
  usernameSetupCompleted: boolean;
  renameCards?: number;
  emailVerified: boolean;
  avatar: string;
  xp: number;
  level: number;
  coins: number;
  streak: number;
  wins: number;
  losses: number;
  draws: number;
  theme: string;
  favoriteGames: string[];
  unlockedItems: string[];
  petState: {
    name: string;
    hunger: number;
    happiness: number;
    energy: number;
    accessory: string;
    stage: number;
    googleDisplayName?: string;
  };
  isOnline?: boolean;
  presenceStatus?: string;
  activeRoomCode?: string;
}

export function normalizePlayerProfile(raw: Record<string, unknown>): PlayerProfile {
  const rawUsername = String(raw.username || '').trim();
  const setupDone = Boolean(
    raw.usernameSetupCompleted !== false && rawUsername.length >= 3
  );
  return {
    uid: String(raw.uid || ''),
    email: String(raw.email || ''),
    username: setupDone ? rawUsername : '',
    usernameSetupCompleted: setupDone,
    renameCards: Number(raw.renameCards ?? 0),
    emailVerified: Boolean(raw.emailVerified),
    avatar: String(raw.avatar || 'kitsune'),
    xp: Number(raw.xp ?? 0),
    level: Number(raw.level ?? 1),
    coins: Number(raw.coins ?? 0),
    streak: Number(raw.streak ?? 1),
    wins: Number(raw.wins ?? 0),
    losses: Number(raw.losses ?? 0),
    draws: Number(raw.draws ?? 0),
    theme: String(raw.theme || 'twilight-cocoa'),
    favoriteGames: safeParseJson(raw.favoriteGames, []),
    unlockedItems: safeParseJson(raw.unlockedItems, [
      'avatar-kitsune',
      'avatar-star-cat',
      'theme-twilight-cocoa',
      'pet-bell-collar',
    ]),
    petState: safeParseJson(raw.petState, {
      name: 'Mochi',
      hunger: 85,
      happiness: 90,
      energy: 90,
      accessory: 'bell-collar',
      stage: 1,
    }),
    isOnline: raw.isOnline !== undefined ? Boolean(raw.isOnline) : true,
    presenceStatus: String(raw.presenceStatus || 'online'),
    activeRoomCode: String(raw.activeRoomCode || ''),
  };
}

interface AuthModalProps {
  isOpen: boolean;
  isFullPageGate?: boolean;
  onClose: () => void;
  currentUser: PlayerProfile | null;
  sessionToken: string;
  onAuthenticated: (profile: PlayerProfile, token: string, verificationCodeHint?: string) => void;
  onProfileUpdated?: (profile: PlayerProfile) => void;
  onLogout: () => void;
}

export function AuthModal({
  isOpen,
  isFullPageGate = false,
  onClose,
  currentUser,
  sessionToken,
  onAuthenticated,
  onProfileUpdated,
  onLogout,
}: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'verify'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Dedicated Choose Your Username or Rename Card input (always starts empty for new username setup)
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [newUsernameAvail, setNewUsernameAvail] = useState<{
    checking: boolean;
    available: boolean | null;
    reason: string;
  }>({ checking: false, available: null, reason: '' });

  const [verificationInput, setVerificationInput] = useState('');
  const [dispatchedVerifyCode, setDispatchedVerifyCode] = useState<string | null>(null);

  // Password reset state
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen && !isFullPageGate) return null;

  const isUsernameOnboarding = Boolean(
    currentUser && (!currentUser.usernameSetupCompleted || !currentUser.username)
  );

  async function checkUsernameLive(
    candidate: string,
    targetSetter: React.Dispatch<
      React.SetStateAction<{ checking: boolean; available: boolean | null; reason: string }>
    >,
    excludeUid?: string
  ) {
    const clean = candidate.trim();
    if (!clean) {
      targetSetter({ checking: false, available: null, reason: '' });
      return;
    }
    if (clean.length < 3 || clean.length > 20 || !/^[a-zA-Z0-9_-]{3,20}$/.test(clean)) {
      targetSetter({
        checking: false,
        available: false,
        reason: 'Username must be 3–20 characters (letters, numbers, _ or -).',
      });
      return;
    }
    targetSetter({ checking: true, available: null, reason: 'Checking database availability...' });
    try {
      const url = `/api/arcade?checkUsername=${encodeURIComponent(clean)}${
        excludeUid ? `&uid=${encodeURIComponent(excludeUid)}` : ''
      }`;
      const res = await fetch(url);
      const data = await res.json();
      targetSetter({
        checking: false,
        available: Boolean(data.available && data.valid),
        reason: String(data.reason || ''),
      });
    } catch {
      targetSetter({ checking: false, available: null, reason: '' });
    }
  }

  async function handleCompleteInitialUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg(null);
    setStatusMsg(null);

    const desired = newUsernameInput.trim();
    if (!desired) {
      setErrorMsg('Please manually enter your preferred username to continue.');
      return;
    }
    if (desired.length < 3 || desired.length > 20 || !/^[a-zA-Z0-9_-]{3,20}$/.test(desired)) {
      setErrorMsg(
        'Username must be between 3 and 20 characters and contain only letters, numbers, underscores (_), or hyphens (-).'
      );
      return;
    }

    setLoading(true);
    try {
      // 1. Validate availability against the actual PostgreSQL database
      const checkRes = await fetch(
        `/api/arcade?checkUsername=${encodeURIComponent(desired)}&uid=${encodeURIComponent(
          currentUser.uid
        )}`
      );
      const checkData = await checkRes.json();
      if (!checkData.valid || !checkData.available) {
        setNewUsernameAvail({
          checking: false,
          available: false,
          reason: String(checkData.reason || 'That username is already taken.'),
        });
        throw new Error(
          checkData.reason || `Username "${desired}" is already taken. Please choose another.`
        );
      }

      // 2. Save the chosen username to the user's profile only after validation succeeds
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'complete_username_setup',
          username: desired,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(data.error || 'Failed to save your chosen username.');
      }
      const updated = normalizePlayerProfile(data.profile);
      await syncPlayerProfileToFirestore(updated).catch(() => {});
      setStatusMsg(`Username "@${updated.username}" confirmed! Entering Her Little Arcade...`);
      onProfileUpdated?.(updated);
      if (!isFullPageGate) onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save username.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUseRenameCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'use_rename_card',
          username: newUsernameInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(data.error || 'Failed to use Rename Card.');
      }
      const updated = normalizePlayerProfile(data.profile);
      await syncPlayerProfileToFirestore(updated).catch(() => {});
      onProfileUpdated?.(updated);
      setNewUsernameInput('');
      setStatusMsg(
        `Username updated to "${updated.username}" using 1 Official Rename Card!`
      );
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to change username.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const userEmail = cred.user.email || `${cred.user.uid}@herlittlearcade.app`;
      // Google account displayName is passed only as optional profile info, NEVER as arcade username
      const googleDisplayName = cred.user.displayName || undefined;

      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: 'oauth_sync',
          uid: cred.user.uid,
          email: userEmail,
          googleDisplayName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(data.error || 'Could not synchronize Google account');
      }
      const profile = normalizePlayerProfile(data.profile);
      await syncPlayerProfileToFirestore(profile).catch(() => {});
      // Never pre-fill username with Google account name
      setNewUsernameInput('');
      setNewUsernameAvail({ checking: false, available: null, reason: '' });
      onAuthenticated(profile, data.sessionToken || idToken);
      if (!isFullPageGate && profile.usernameSetupCompleted && profile.username) {
        onClose();
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('Google sign-in popup was closed before completing.');
      } else {
        setErrorMsg(
          'Google popup was blocked by the browser preview frame. Please use Email & Password registration or sign-in below.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (mode === 'reset') {
      setLoading(true);
      try {
        if (resetStep === 'request') {
          await sendPasswordResetEmail(auth, cleanEmail).catch(() => {});
          const res = await fetch('/api/arcade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'request_password_reset',
              email: cleanEmail,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Could not find an account with that email.');
          }
          setResetStep('confirm');
          setResetCodeInput(data.resetToken || '');
          setStatusMsg(
            `Password reset code generated (${data.resetToken}). Enter the code and your new password below.`
          );
        } else {
          const res = await fetch('/api/arcade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'complete_password_reset',
              email: cleanEmail,
              resetToken: resetCodeInput,
              newPassword: newPasswordInput,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data.profile) {
            throw new Error(data.error || 'Password reset failed.');
          }
          const profile = normalizePlayerProfile(data.profile);
          setStatusMsg('Your password has been updated and your account is signed in.');
          setNewUsernameInput('');
          onAuthenticated(profile, data.sessionToken);
          if (!isFullPageGate && profile.usernameSetupCompleted && profile.username) {
            onClose();
          }
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Password reset failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        let firebaseUid: string | undefined;
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          firebaseUid = cred.user.uid;
          await sendEmailVerification(cred.user).catch(() => {});
        } catch {
          // Proceed with PostgreSQL account creation and PBKDF2 password hashing
        }

        const res = await fetch('/api/arcade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'register_email',
            email: cleanEmail,
            password,
            firebaseUid,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.profile) {
          throw new Error(data.error || 'Account registration failed.');
        }

        const profile = normalizePlayerProfile(data.profile);
        setDispatchedVerifyCode(data.verificationCode || null);
        // Always start username input empty and transition to Choose Your Username screen
        setNewUsernameInput('');
        setNewUsernameAvail({ checking: false, available: null, reason: '' });
        onAuthenticated(profile, data.sessionToken, data.verificationCode);
      } else {
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, password).catch(() => {});
        } catch {
          // Handled by PostgreSQL credential verification
        }

        const res = await fetch('/api/arcade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'signin_email',
            email: cleanEmail,
            password,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.profile) {
          throw new Error(data.error || 'Invalid email or password.');
        }

        const profile = normalizePlayerProfile(data.profile);
        setNewUsernameInput('');
        setNewUsernameAvail({ checking: false, available: null, reason: '' });
        onAuthenticated(profile, data.sessionToken);
        if (!isFullPageGate && profile.usernameSetupCompleted && profile.username) {
          onClose();
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setLoading(true);
    try {
      const res = await fetch('/api/arcade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          action: 'verify_email',
          code: verificationInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.profile) {
        throw new Error(data.error || 'Verification failed.');
      }
      const updated = normalizePlayerProfile(data.profile);
      onProfileUpdated?.(updated);
      setStatusMsg('Email verified! +15 bonus XP added to your player profile.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not verify code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOutClick() {
    await signOut(auth).catch(() => {});
    setNewUsernameInput('');
    setNewUsernameAvail({ checking: false, available: null, reason: '' });
    setErrorMsg(null);
    setStatusMsg(null);
    onLogout();
    if (!isFullPageGate) onClose();
  }

  /* ==========================================================================
     DEDICATED "CHOOSE YOUR USERNAME" ONBOARDING SCREEN
     (Mandatory for both Google and Email/Password users before entering arcade)
     ========================================================================== */
  const usernameOnboardingCard = currentUser ? (
    <div
      id="choose-username-screen"
      className="relative w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900 p-6 text-stone-100 shadow-2xl"
    >
      <div className="border-b border-stone-800 pb-4">
        <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
          Mandatory Onboarding Step · Account Setup
        </div>
        <h2 id="auth-modal-title" className="mt-1 text-2xl font-bold tracking-tight text-stone-100">
          Choose Your Username
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-stone-400">
          Please manually enter your preferred arcade username. Your username is validated against the database for uniqueness and is required before entering Her Little Arcade.
        </p>
      </div>

      {/* Unboxed clean account summary */}
      <div className="mt-4 space-y-1 border-b border-stone-800 pb-4 text-xs">
        <div className="text-stone-300">
          Signed in Email: <strong className="text-stone-100">{currentUser.email}</strong>
        </div>
        {currentUser.petState?.googleDisplayName && (
          <div className="text-stone-400">
            Google Account Name (Optional Profile Info):{' '}
            <span className="font-semibold text-stone-200">
              {currentUser.petState.googleDisplayName}
            </span>
            <span className="block text-[11px] text-amber-300">
              Note: Your Google account name is never automatically used as your arcade username.
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleCompleteInitialUsername} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="choose-username-input"
            className="block text-xs font-semibold text-stone-200"
          >
            Enter Your Preferred Arcade Username
          </label>
          <p className="mt-0.5 text-[11px] text-stone-400">
            3–20 characters · Letters, numbers, underscores (_), or hyphens (-). Initial username setup is free; future changes require an Official Rename Card (10,000 Coins).
          </p>

          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-500" />
              <input
                id="choose-username-input"
                type="text"
                maxLength={20}
                autoFocus
                value={newUsernameInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewUsernameInput(val);
                  setErrorMsg(null);
                  checkUsernameLive(val, setNewUsernameAvail, currentUser.uid);
                }}
                placeholder="Type your unique username..."
                className="w-full rounded-lg border border-stone-800 bg-stone-950 py-2 pl-9 pr-3 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              disabled={loading || newUsernameAvail.checking || !newUsernameInput.trim()}
              onClick={() =>
                checkUsernameLive(newUsernameInput, setNewUsernameAvail, currentUser.uid)
              }
              className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs font-semibold text-stone-200 hover:border-amber-500 whitespace-nowrap shrink-0"
            >
              {newUsernameAvail.checking ? (
                <ArcadeInlineSpinner size={14} label="Checking..." />
              ) : (
                'Check'
              )}
            </button>
          </div>

          {newUsernameAvail.reason && (
            <p
              className={`mt-2 text-xs font-medium ${
                newUsernameAvail.available
                  ? 'text-emerald-400'
                  : newUsernameAvail.available === false
                  ? 'text-rose-400'
                  : 'text-stone-400'
              }`}
            >
              {newUsernameAvail.reason}
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2 text-xs font-medium text-rose-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusMsg && (
          <div className="flex items-start gap-2 text-xs font-medium text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{statusMsg}</span>
          </div>
        )}

        {loading && (
          <ArcadeCircularLoader
            active={loading}
            variant="compact"
            messages={[
              'Verifying your unique username...',
              'Preparing your arcade...',
              'Almost there!',
            ]}
            subtitle="Checking PostgreSQL player directory"
          />
        )}

        <button
          type="submit"
          disabled={loading || newUsernameAvail.available === false}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-stone-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? (
            <ArcadeInlineSpinner size={16} label="Validating & Saving Username..." />
          ) : (
            'Confirm Username & Enter Arcade'
          )}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between border-t border-stone-800 pt-4 text-xs text-stone-400">
        <span>Starting balance: 0 Coins</span>
        <button
          type="button"
          onClick={handleSignOutClick}
          className="flex items-center gap-1 font-medium text-rose-300 hover:underline"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out / Switch Account</span>
        </button>
      </div>
    </div>
  ) : null;

  /* ==========================================================================
     STANDARD AUTHENTICATION & ACCOUNT SECURITY MODAL CARD
     ========================================================================== */
  const cardContent = isUsernameOnboarding ? (
    usernameOnboardingCard
  ) : (
    <div className="relative w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900 p-6 text-stone-100 shadow-2xl">
      <div className="flex items-center justify-between border-b border-stone-800 pb-4">
        <div>
          <h2 id="auth-modal-title" className="text-xl font-bold tracking-tight text-stone-100">
            {currentUser
              ? 'Account Security & Username Settings'
              : mode === 'signup'
              ? 'Create Your Arcade Account'
              : mode === 'signin'
              ? 'Sign In to Her Little Arcade'
              : mode === 'reset'
              ? 'Reset Account Password'
              : 'Verify Your Email Address'}
          </h2>
          <p className="mt-1 text-xs text-stone-400">
            {currentUser
              ? 'Manage your verified email, Official Rename Cards, or sign out.'
              : 'Register or sign in with Email or Google. You will choose your unique arcade username on the next screen.'}
          </p>
        </div>
        {!isFullPageGate && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="rounded-lg p-2 text-stone-400 hover:bg-stone-800 hover:text-stone-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Mode Switcher Tabs (Only when unauthenticated) */}
      {!currentUser && mode !== 'reset' && (
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl border border-stone-800 bg-stone-950 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
              setStatusMsg(null);
            }}
            className={`rounded-lg py-2 text-xs font-bold transition-colors whitespace-nowrap ${
              mode === 'signup'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-stone-100'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
              setStatusMsg(null);
            }}
            className={`rounded-lg py-2 text-xs font-bold transition-colors whitespace-nowrap ${
              mode === 'signin'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-stone-100'
            }`}
          >
            Sign In
          </button>
        </div>
      )}

      {currentUser && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="text-xs">
              <p className="font-bold text-stone-100">
                @{currentUser.username} · Lv.{currentUser.level} · {currentUser.coins} Coins
              </p>
              <p className="text-stone-400">{currentUser.email}</p>
              {currentUser.petState?.googleDisplayName && (
                <p className="text-[11px] text-stone-400">
                  Google Account: {currentUser.petState.googleDisplayName}
                </p>
              )}
              <p className="mt-1 text-[11px]">
                {currentUser.emailVerified ? (
                  <span className="font-semibold text-emerald-400">✓ Email Verified</span>
                ) : (
                  <span className="font-semibold text-amber-300">
                    Pending Email Verification
                  </span>
                )}
                <span className="ml-2 text-stone-400">
                  · Rename Cards: <strong>{currentUser.renameCards || 0}</strong>
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOutClick}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25 whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Rename Card Username Change (when user owns >= 1 Rename Card) */}
          {(currentUser.renameCards || 0) > 0 && (
            <form
              onSubmit={handleUseRenameCardSubmit}
              className="space-y-2 border-b border-stone-800 pb-3"
            >
              <div className="text-xs font-bold text-amber-300">
                Use Official Rename Card ({currentUser.renameCards} Available)
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={20}
                  value={newUsernameInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewUsernameInput(val);
                    checkUsernameLive(val, setNewUsernameAvail, currentUser.uid);
                  }}
                  placeholder="Enter new unique username"
                  className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-1.5 text-xs text-stone-100 focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-stone-950 hover:bg-amber-400 whitespace-nowrap shrink-0"
                >
                  Use 1 Rename Card
                </button>
              </div>
              {newUsernameAvail.reason && (
                <p
                  className={`text-[11px] ${
                    newUsernameAvail.available
                      ? 'text-emerald-400'
                      : newUsernameAvail.available === false
                      ? 'text-rose-400'
                      : 'text-stone-400'
                  }`}
                >
                  {newUsernameAvail.reason}
                </p>
              )}
            </form>
          )}

          {!currentUser.emailVerified && (
            <form onSubmit={handleVerifyEmailSubmit} className="space-y-2">
              <label htmlFor="verify-code-input" className="block text-xs font-medium text-stone-300">
                Enter 6-Character Email Verification Code
                {dispatchedVerifyCode ? ` (Dispatched Code: ${dispatchedVerifyCode})` : ''}
              </label>
              <div className="flex gap-2">
                <input
                  id="verify-code-input"
                  type="text"
                  maxLength={6}
                  value={verificationInput}
                  onChange={(e) => setVerificationInput(e.target.value.toUpperCase())}
                  placeholder={dispatchedVerifyCode || '6-char code'}
                  className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-1.5 font-mono text-xs uppercase text-stone-100 focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1 rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-bold text-stone-950 hover:bg-teal-400 whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verify Email</span>
                </button>
              </div>
            </form>
          )}

          {errorMsg && (
            <div className="flex items-start gap-2 text-xs text-rose-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div className="flex items-start gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* Unauthenticated Sign Up / Sign In / Reset Controls */}
      {!currentUser && (
        <>
          {mode !== 'reset' && mode !== 'verify' && (
            <div className="mt-4">
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-100 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96Z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          <div className="my-4 flex items-center gap-3 text-xs text-stone-500">
            <div className="h-px flex-1 bg-stone-800" />
            <span>or with Email &amp; Password</span>
            <div className="h-px flex-1 bg-stone-800" />
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-stone-300">
                Email Address
              </label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-500" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-stone-800 bg-stone-950 py-2 pl-9 pr-3 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-password" className="block text-xs font-medium text-stone-300">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset');
                        setResetStep('request');
                        setErrorMsg(null);
                        setStatusMsg(null);
                      }}
                      className="text-xs text-amber-400 hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-500" />
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-lg border border-stone-800 bg-stone-950 py-2 pl-9 pr-3 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {mode === 'reset' && resetStep === 'confirm' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label htmlFor="reset-code-field" className="block text-xs font-medium text-stone-300">
                    6-Character Reset Code
                  </label>
                  <div className="relative mt-1">
                    <KeyRound className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-500" />
                    <input
                      id="reset-code-field"
                      type="text"
                      value={resetCodeInput}
                      onChange={(e) => setResetCodeInput(e.target.value.toUpperCase())}
                      placeholder="Enter reset code"
                      className="w-full rounded-lg border border-stone-800 bg-stone-950 py-2 pl-9 pr-3 font-mono text-sm uppercase text-stone-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="reset-new-password" className="block text-xs font-medium text-stone-300">
                    New Password
                  </label>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-500" />
                    <input
                      id="reset-new-password"
                      type="password"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-lg border border-stone-800 bg-stone-950 py-2 pl-9 pr-3 text-sm text-stone-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-start gap-2 text-xs font-medium text-rose-400">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {statusMsg && (
              <div className="flex items-start gap-2 text-xs font-medium text-emerald-400">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{statusMsg}</span>
              </div>
            )}

            {loading && (
              <ArcadeCircularLoader
                active={loading}
                variant="compact"
                messages={[
                  mode === 'signup'
                    ? 'Creating your arcade notebook...'
                    : mode === 'signin'
                    ? 'Signing in to Her Little Arcade...'
                    : 'Updating account security...',
                  'Getting everything ready...',
                  'Almost there!',
                ]}
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-stone-950 transition-colors hover:bg-amber-400 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {loading ? (
                <ArcadeInlineSpinner size={16} label="Authenticating..." />
              ) : mode === 'signup' ? (
                'Continue to Choose Username'
              ) : mode === 'signin' ? (
                'Sign In with Email'
              ) : resetStep === 'request' ? (
                'Send Password Reset Code'
              ) : (
                'Confirm New Password'
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-center gap-4 border-t border-stone-800 pt-4 text-xs text-stone-400">
            {mode !== 'signin' && (
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                  setStatusMsg(null);
                }}
                className="font-medium text-amber-400 hover:underline"
              >
                Already have an account? Sign In
              </button>
            )}
            {mode !== 'signup' && (
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                  setStatusMsg(null);
                }}
                className="font-medium text-amber-400 hover:underline"
              >
                Need an account? Sign Up
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (isFullPageGate) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-950 text-stone-100">
        <header className="flex items-center justify-between gap-8 border-b border-stone-800 bg-stone-950 px-6 py-4">
          <span className="text-xl font-bold tracking-tight text-amber-300 whitespace-nowrap shrink-0">
            Her Little Arcade
          </span>
          <span className="sketch-annotation text-sm">
            Working Sheet · Solo &amp; Couple Multiplayer Sanctuary
          </span>
        </header>

        <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-start gap-10 px-4 py-10 lg:grid-cols-12 lg:px-8">
          <div className="space-y-6 lg:col-span-6">
            {/* Cluster of blue margin notes + simple line drawing */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="sketch-annotation text-sm">
                * Note: Every player signs in with their own personal notebook &amp; chosen username.
              </div>
              <svg
                className="h-10 w-24 shrink-0 text-stone-700"
                viewBox="0 0 120 44"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="6"
                  y="10"
                  width="36"
                  height="24"
                  rx="6"
                  stroke="#38352f"
                  strokeWidth="1.8"
                />
                <circle cx="17" cy="22" r="3" fill="#9e3a2e" />
                <circle cx="31" cy="22" r="3" fill="#344c69" />
                <path
                  d="M44 22 C 56 12, 64 32, 76 22"
                  stroke="#344c69"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <rect
                  x="78"
                  y="10"
                  width="36"
                  height="24"
                  rx="6"
                  stroke="#38352f"
                  strokeWidth="1.8"
                />
                <circle cx="89" cy="22" r="3" fill="#344c69" />
                <circle cx="103" cy="22" r="3" fill="#9e3a2e" />
              </svg>
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-stone-100 sm:text-4xl lg:-rotate-1">
                {isUsernameOnboarding
                  ? 'Choose your unique player username to enter Her Little Arcade.'
                  : 'Create your personal arcade account to start playing together.'}
              </h1>
              {/* Irregular hand-drawn underline */}
              <svg
                className="mt-1 h-5 w-72 max-w-full"
                viewBox="0 0 300 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 12 C 78 5, 190 16, 286 8"
                  stroke="#9e3a2e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <path
                  d="M26 17 C 110 13, 210 18, 260 14"
                  stroke="#344c69"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <p className="text-base leading-relaxed text-stone-300">
              Every player registers their own profile and chooses a unique username. Once inside, generate a partner code in{' '}
              <span className="sketch-highlight font-semibold">Pair with Partner</span> to unlock your shared Couple Profile and compete in 1v1 or 2v2 Couple multiplayer rooms.
            </p>

            {/* Drawn bracket above unboxed key facts */}
            <div>
              <svg
                className="h-5 w-full text-stone-600"
                viewBox="0 0 400 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8 16 C 8 6, 190 10, 200 3 C 210 10, 392 6, 392 16"
                  stroke="#38352f"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 text-xs">
                <div>
                  <div className="font-bold text-stone-100">21 Playable Games</div>
                  <div className="text-stone-400">7 Solo · 14 Multiplayer</div>
                </div>
                <div>
                  <div className="font-bold text-stone-100">Mutual Pairing</div>
                  <div className="text-stone-400">Shared Couple Profile</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="font-bold text-stone-100">1v1 &amp; 2v2 Rooms</div>
                  <div className="text-stone-400">Verified Room Codes</div>
                </div>
              </div>
            </div>

            {/* Taped Reference Image Mount */}
            <div className="sketch-photo-mount lg:rotate-1">
              <div className="sketch-tape" aria-hidden="true" />
              <img
                src={HERO_BANNER_IMAGE}
                alt="Her Little Arcade tabletop cabinet and controllers"
                width={640}
                height={360}
                referrerPolicy="no-referrer"
                className="h-52 w-full rounded object-cover"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-stone-400">
                <span>Fig 1. Tabletop arcade reference sheet</span>
                <span className="sketch-annotation">
                  {isUsernameOnboarding
                    ? '→ Pick your unique username on the right'
                    : '→ Register or Sign In on the right'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:col-span-6">{cardContent}</div>
        </main>

        <footer className="mt-8 border-t border-stone-800 px-6 py-6">
          <div className="mx-auto max-w-6xl space-y-3">
            <p className="sketch-correction text-xl font-bold tracking-tight">
              Pick up a pencil, register your player sheet, and invite your partner to play.
            </p>
            <div className="grid grid-cols-2 gap-4 border-t border-stone-800 pt-3 text-xs text-stone-400 sm:grid-cols-4">
              <span>Her Little Arcade · Working Sheet</span>
              <span>7 Single-Player Games</span>
              <span>14 Multiplayer Games (1v1 &amp; 2v2)</span>
              <span>PostgreSQL &amp; OAuth Verified</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {cardContent}
    </div>
  );
}

function safeParseJson<T>(val: unknown, fallback: T): T {
  if (typeof val !== 'string') return (val as T) ?? fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}
