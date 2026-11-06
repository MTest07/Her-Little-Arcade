# Her Little Arcade — Real Authentication, Couple Pairing & 1v1 / 2v2 Multiplayer Upgrade

This upgrade transforms **Her Little Arcade** into a strictly authenticated, zero-mock multiplayer and solo gaming platform where every player registers their own account, pairs with a partner via a mutual confirmation flow to unlock a shared Couple Profile, and competes or collaborates in database-validated **1v1** and **2v2 Couple** rooms.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and product choices have been confirmed from your answers and are baked into this plan:

- **Confirmed Decision 1 — Provisioned Cloud SQL PostgreSQL + Firebase Auth + PostgreSQL RLS**: We will use the workspace's provisioned PostgreSQL database and Firebase Authentication (Email/Password registration, Email Verification, Password Reset, and Google Sign-In) with strict backend token/session verification, PostgreSQL Row Level Security (RLS) policies, and complete removal of all seeded/mock users (`Claire`, `Noah`, sample rooms, and fabricated scores).
- **Confirmed Decision 2 — Shared Couple Profile Scope**: Once two registered accounts mutually confirm a pairing, their shared Couple Profile displays both partners' avatars and usernames, a custom couple name, anniversary date, shared couple banner and bio, and combined couple XP, level, and win-loss record (while keeping individual coin wallets and personal game histories distinct so unpairing never deletes personal progress).
- **Confirmed Decision 3 — 2v2 Couple Mode Game Coverage**: All party, trivia, word, drawing, and cooperative multiplayer games (*Draw & Guess*, *Quiz Battle*, *Word Battle*, *Reaction Race*, *Truth or Dare*, *Higher or Lower*, *Escape the Maze*, *Cooking Together*, *Jigsaw Puzzle Together*, and *Treasure Hunt*) will support **2v2 Couple Mode** (4 authenticated players across 2 paired couples) alongside **1v1 Mode**, while classic two-player board duels (*Tic-Tac-Toe*, *Connect Four*, *Battleship*, and *Chess*) enforce pure **1v1 Mode**.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Mandatory Individual Account Gate**: Unauthenticated visitors see a dedicated onboarding & sign-in gateway before entering the arcade. Players can register with Email & Password (with verification & password reset) or Continue with Google, automatically provisioning a fresh, zero-stat personal profile in PostgreSQL.
  2. **Mutual Couple Account Pairing (`Pair with Partner`)**: Any registered player without an active partner can generate a unique pairing code or shareable invitation link. Their partner enters the code to review the requester's profile, and both accounts confirm the pairing to activate a shared Couple Profile. Either partner can unpair at any time without losing personal stats, coins, or match history.
  3. **Database-Backed Multiplayer Room System (`Create Room` & `Join Group`)**:
     - **Create Room**: Generates a unique database-backed room number, lets the host choose the game, mode (`1v1` or `2v2 Couple`), and game settings, and provides a prominent shareable room code and host `Start Game` button.
     - **Join Group**: Validates any entered room number against PostgreSQL in real time, previews room metadata (game, mode, host, connected players/couples, slot availability) before joining, and surfaces clear errors for invalid, expired, or full rooms.
  4. **1v1 & 2v2 Couple Multiplayer Modes**: Records individual match statistics in `1v1 Mode` and full team scores + couple-versus-couple match records in `2v2 Couple Mode`.
  5. **Strict Zero-Mock Data & Empty States**: Purges all hardcoded sample users, fake online indicators, and seeded records. Leaderboards, match histories, rooms, and custom content render clean, actionable empty states until real authenticated activity occurs.
- **Target Audience / Persona**: Couples and friends who want a cozy, private online arcade where their real accounts, relationship milestones, and head-to-head or couple-vs-couple game records are authentically tracked.
- **Key Value**: Replaces simulated single-session placeholders with real multi-account identity, verifiable partner pairing, and authentic database-synchronized rooms and leaderboards.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Account Creation & Verification Gate**:
     - On arrival without an active session, the user lands on a full-viewport **Arcade Welcome & Authentication Gate** featuring Sign Up with Email & Password, Sign In with Email, Forgot Password, and Continue with Google.
     - Completing registration immediately creates a fresh database profile (`0 XP`, `Level 1`, `0 Wins`, starter coins) and displays email verification status with a one-click resend verification action and secure Sign Out control in the header and profile.
  2. **Pair with Partner Flow**:
     - Inside the **Profile** and **Couple Hub** panel, an unpaired player clicks **Pair with Partner** to generate a unique 6-character pairing code and invitation URL (`?pair=CODE`).
     - The second registered partner enters the code, previews the inviter's username and avatar, and submits their acceptance.
     - Both users confirm the pairing (inviter confirms pending acceptance or auto-confirms via mutual handshake), unlocking the **Shared Couple Profile** editor (custom couple name, anniversary date, banner theme, and bio) and combined Couple XP/Level/Win-Loss dashboard.
     - An **Unpair Account** button with confirmation dialog cleanly dissolves the active pairing while preserving each user's personal profile and match history.
  3. **Multiplayer `Create Room` vs. `Join Group` Workflow**:
     - Opening **Multiplayer** presents two primary tabs/cards: **Create Room** and **Join Group**.
     - **Create Room**: The host picks one of the 14 multiplayer games, selects `1v1 Mode` (2 player slots) or `2v2 Couple Mode` (4 player slots / 2 couples, enabled on supported party, trivia, word, drawing, and co-op games), configures game settings, and generates a unique persisted room number. The lobby displays connected players/couples, ready states, optional WebRTC voice chat, and a host-only **Start Game** button once required slots are ready.
     - **Join Group**: A player enters a room number and clicks **Look Up Room**. The backend validates the code against PostgreSQL:
       - If the room does not exist, has expired/finished, or is already at capacity (`2/2` for 1v1 or `4/4` for 2v2), an explicit error banner explains why.
       - If valid and open, a **Room Preview Card** displays the host, selected game, mode (`1v1` or `2v2 Couple`), and currently connected players (plus an option to join with your paired partner in 2v2 mode) before the user clicks **Confirm & Join Room**.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Warm Twilight Arcade Sanctuary — tactile, cozy dark-mode gaming lounge with crisp tabular telemetry and high-contrast game boards.
  - *Color Palette & Mood*:
    - Dominant Canvas (`60%`): Deep Warm Obsidian (`bg-stone-950` / `#0C0A09`)
    - Structural Surfaces (`30%`): Cocoa Slate panels (`bg-stone-900` / `#1C1917`) with subtle `1px` borders (`border-stone-800`)
    - Accent Budget (`10%`): Warm Amber Gold (`bg-amber-500` / `text-amber-300`) for primary CTAs, Coral Rose (`text-rose-300`) for Couple Pairing highlights, and Mint Teal (`text-teal-300`) for live voice/room indicators.
  - *Typography & Hierarchy*:
    - Display / Headings: `Plus Jakarta Sans` (bold, tight tracking, balanced headline wrapping)
    - Body Copy: `DM Sans` (clean, legible at 14px–16px)
    - Scores, Clocks, Room Codes & Leaderboards: `JetBrains Mono` with `tabular-nums`
  - *Component Styling & Layout*:
    - Adheres to the 3-zone Top Bar Contract (Brand wordmark | 5 single-line navigation links | Authenticated Player & Sign Out action).
    - Single-elevation cards (`rounded-2xl border border-stone-800 bg-stone-900/90 p-5`) with zero nested card-in-card clutter and unboxed metadata using `·` separators.
- **Interactive Feedback & Motion**:
  - Instant skeleton loading states while validating room codes or pairing codes, explicit error banners for invalid/full rooms, and celebratory audio-visual feedback when a couple pairing or match completes.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Strict Authentication Gate & Zero-Mock Database Cleanse**
  - *Chosen Approach*: Remove all fallback guest/mock profiles (`player-claire`, `player-noah`), delete all pre-seeded mock database rows, and require an authenticated user session before accessing the arcade.
  - *Why*: Guarantees every profile, room participant, pairing, and leaderboard row corresponds to a real registered user account.
  - *Alternatives Considered*: Allowing anonymous guest play was rejected because the specification requires every player to create their own individual account before accessing the arcade.
- **Decision 2: Two-Step Mutual Couple Pairing with Non-Destructive Unpairing**
  - *Chosen Approach*: Introduce a dedicated `couple_pairings` table tracking `requester_uid`, `partner_uid`, `pairing_code`, `status` (`pending_partner` → `pending_requester_confirm` → `active` → `unpaired`), and shared couple metadata (`couple_name`, `anniversary_date`, `bio`, `banner_theme`, `couple_xp`, `couple_wins`, `couple_losses`). Enforce at most one active pairing per user.
  - *Why*: Ensures both partners explicitly consent to pairing, aggregates couple-level progression cleanly, and allows unpairing by flipping status without deleting either individual's account or personal `game_records`.
- **Decision 3: PostgreSQL Row Level Security (RLS) + Server-Enforced Session Context**
  - *Chosen Approach*: Enable PostgreSQL Row Level Security (RLS) policies on user-owned and couple-owned tables and pass the verified authenticated UID into backend database transactions alongside strict API-layer authorization checks.
  - *Why*: Satisfies defense-in-depth authorization so users can only mutate their own profile, their active couple pairing, or rooms in which they are an authenticated participant.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        CLIENT APPLICATION (Next.js)                        │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 1. Auth Gate & Session Context                                       │  │
│  │    • Email/Password Sign Up & Sign In   • Email Verification Banner  │  │
│  │    • Continue with Google (OAuth)       • Forgot Password & Logout   │  │
│  └──────────────────────────────────┬───────────────────────────────────┘  │
│                                     ▼                                      │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ 2. Couple Pairing    │  │ 3. Multiplayer Hub   │  │ 4. 21 Game       │  │
│  │    & Couple Profile  │  │    • Create Room     │  │    Arenas        │  │
│  │    • Generate Code   │  │      (1v1 / 2v2)     │  │    • 7 Solo      │  │
│  │    • Enter & Accept  │  │    • Join Group      │  │    • 14 Multi    │  │
│  │    • Mutual Confirm  │  │      (DB Lookup &    │  │      (1v1 & 2v2  │  │
│  │    • Couple Editor   │  │       Slot Check)    │  │       Team HUD)  │  │
│  │    • Unpair Action   │  │    • Host Start Game │  │    • Real Stats  │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └────────┬─────────┘  │
└─────────────┼─────────────────────────┼───────────────────────┼────────────┘
              │ Bearer Token / Session  │                       │
              ▼                         ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   BACKEND API & AUTH GUARD (/api/arcade)                   │
│  • Verifies Firebase ID Token / Signed Account Credentials                 │
│  • Enforces Authorization & Sets PostgreSQL RLS `app.current_user_uid`     │
└───────────────────────────────────────┬────────────────────────────────────┘
                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                CLOUD SQL POSTGRESQL (Drizzle ORM + RLS)                    │
│  ┌──────────────┐ ┌─────────────────┐ ┌──────────────┐ ┌────────────────┐  │
│  │ users        │ │ couple_pairings │ │ rooms        │ │ game_records   │  │
│  │ • uid (PK)   │ │ • pairing_code  │ │ • room_code  │ │ • user_uid     │  │
│  │ • email      │ │ • user_a_uid    │ │ • mode       │ │ • couple_id    │  │
│  │ • username   │ │ • user_b_uid    │ │   (1v1/2v2)  │ │ • opponent_info│  │
│  │ • password   │ │ • a_confirmed   │ │ • max_players│ │ • mode (1v1 /  │  │
│  │   _hash      │ │ • b_confirmed   │ │ • status     │ │   2v2_couple)  │  │
│  │ • verified   │ │ • status        │ │ • players    │ │ • score / xp   │  │
│  │ • xp / coins │ │ • couple_name   │ │ • teams_json │ └────────────────┘  │
│  └──────────────┘ └─────────────────┘ └──────────────┘                     │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **`users`**: Stores individual registered accounts (`uid`, `email`, `username`, `passwordHash` for direct PostgreSQL email/password auth fallback when Firebase Console Email provider is not toggled, `emailVerified`, `avatar`, `xp` starting at `0`, `level` starting at `1`, `coins` starting at `100`, `streak` starting at `1`, `favoriteGames`, `unlockedItems`, `petState`).
  - **`couple_pairings`**: Stores partner invitations and active couple profiles (`id`, `pairingCode`, `requesterUid`, `partnerUid`, `requesterConfirmed`, `partnerConfirmed`, `status` [`pending` | `awaiting_confirm` | `active` | `unpaired`], `coupleName`, `anniversaryDate`, `coupleBio`, `coupleBanner`, `coupleXp`, `coupleLevel`, `coupleWins`, `coupleLosses`, `coupleDraws`, `createdAt`, `updatedAt`).
  - **`rooms`**: Stores multiplayer rooms (`roomCode` unique, `gameId`, `mode` [`1v1` | `2v2` | `coop`], `maxPlayers` [`2` or `4`], `hostUid`, `hostName`, `status` [`lobby` | `playing` | `finished` | `expired`], `playersJson`, `teamsJson` for 2v2 Couple pairings, `settingsJson`, `gameStateJson`, `chatJson`, `voiceParticipantsJson`, `updatedAt`).
  - **`game_records`**: Stores individual and couple match results (`userUid`, `username`, `coupleId`, `gameId`, `mode` [`single` | `1v1` | `2v2` | `coop`], `result` [`win` | `loss` | `draw` | `completed`], `score`, `xpEarned`, `coinsEarned`, `details`, `createdAt`).
  - **`personalized_content` & `daily_challenges`**: Scoped to the authenticated user and their active paired partner so custom photos, trivia, and Truth or Dare decks are automatically shared between paired partners.

- **Interactive Component & State Mapping**:
  - **Authentication Gate (`AuthGateway`)**: Blocks unauthenticated access to arcade views; handles Email/Password registration, login, password reset, email verification status, Google OAuth popup login, and complete state cleanup on logout.
  - **Couple Pairing Manager (`CouplePairingPanel`)**: Handles generating a unique pairing code, looking up a partner's code, accepting an invitation, mutually confirming the link, editing the shared Couple Profile (couple name, anniversary date, banner, bio), and unpairing.
  - **Multiplayer Room Controller (`MultiplayerLobbyManager`)**:
    - *Create Room Flow*: Selects game, toggles `1v1 Mode` vs `2v2 Couple Mode` (based on game capability), sets custom rules, persists room to PostgreSQL, and enables the host's `Start Game` button when required players are present.
    - *Join Group Flow*: Queries `GET /api/arcade?roomCode=...`, displays a live preview of room status and connected players/couples, validates capacity and couple requirements for `2v2`, and executes an atomic join mutation.
  - **1v1 & 2v2 Game Arena HUD (`MultiplayerGameArena` & `ChessArena`)**: Displays individual avatars in `1v1 Mode` or dual Couple Team banners (Couple A with both partners' avatars vs. Couple B with both partners' avatars) in `2v2 Couple Mode`, rotating active turns across team members and recording both individual and couple match results to PostgreSQL upon completion.
