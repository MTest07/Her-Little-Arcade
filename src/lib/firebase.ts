import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

export async function syncPlayerProfileToFirestore(profile: {
  uid: string;
  email: string;
  emailVerified: boolean;
  username: string;
  usernameSetupCompleted: boolean;
  renameCards?: number;
  avatar: string;
  customPhotoUrl?: string;
  equippedSkin?: string;
  equippedBanner?: string;
  xp: number;
  level: number;
  coins: number;
  streak: number;
  wins: number;
  losses: number;
  draws: number;
  theme: string;
  presenceStatus?: string;
  activeRoomCode?: string;
}) {
  if (!auth.currentUser || auth.currentUser.uid !== profile.uid) {
    return;
  }
  if (!auth.currentUser.emailVerified) {
    return;
  }

  const cleanUid = profile.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  if (!cleanUid || cleanUid !== auth.currentUser.uid) {
    return;
  }

  const cleanUsername = (profile.username || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 20);
  const cleanAvatar = (profile.avatar || 'kitsune').slice(0, 64);
  const cleanCustomPhotoUrl =
    typeof profile.customPhotoUrl === 'string' && profile.customPhotoUrl.length <= 500_000
      ? profile.customPhotoUrl
      : '';
  const cleanSkin = (profile.equippedSkin || 'skin-classic-notebook').slice(0, 64);
  const cleanBanner = (profile.equippedBanner || 'banner-sketchbook-grid').slice(0, 64);
  const cleanTheme = (profile.theme || 'twilight-cocoa').slice(0, 64);
  const cleanPresence = ['online', 'in_queue', 'in_match', 'offline'].includes(
    profile.presenceStatus || ''
  )
    ? (profile.presenceStatus as string)
    : 'online';
  const cleanRoomCode = (profile.activeRoomCode || '').slice(0, 16);

  const publicFields = {
    username: cleanUsername,
    usernameSetupCompleted: Boolean(profile.usernameSetupCompleted),
    renameCards: Math.max(0, Math.min(1000, Math.floor(profile.renameCards || 0))),
    avatar: cleanAvatar,
    customPhotoUrl: cleanCustomPhotoUrl,
    equippedSkin: cleanSkin,
    equippedBanner: cleanBanner,
    xp: Math.max(0, Math.floor(profile.xp || 0)),
    level: Math.max(1, Math.floor(profile.level || 1)),
    coins: Math.max(0, Math.floor(profile.coins || 0)),
    streak: Math.max(0, Math.floor(profile.streak || 1)),
    wins: Math.max(0, Math.floor(profile.wins || 0)),
    losses: Math.max(0, Math.floor(profile.losses || 0)),
    draws: Math.max(0, Math.floor(profile.draws || 0)),
    theme: cleanTheme,
    presenceStatus: cleanPresence,
    activeRoomCode: cleanRoomCode,
    updatedAt: serverTimestamp(),
  };

  const publicPath = `users/${cleanUid}`;
  const publicDocRef = doc(db, 'users', cleanUid);

  try {
    const existingPublicSnap = await getDoc(publicDocRef);
    if (!existingPublicSnap.exists()) {
      await setDoc(publicDocRef, {
        uid: cleanUid,
        ...publicFields,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(publicDocRef, publicFields);
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, publicPath);
    }
  }

  const privatePath = `users/${cleanUid}/private/info`;
  const privateDocRef = doc(db, 'users', cleanUid, 'private', 'info');
  const cleanEmail = (profile.email || auth.currentUser.email || '').slice(0, 254);
  if (cleanEmail.length >= 3) {
    try {
      const existingPrivateSnap = await getDoc(privateDocRef);
      if (!existingPrivateSnap.exists()) {
        await setDoc(privateDocRef, {
          uid: cleanUid,
          email: cleanEmail,
          emailVerified: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(privateDocRef, {
          email: cleanEmail,
          emailVerified: true,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.WRITE, privatePath);
      }
    }
  }
}
