# Her Little Arcade — Camera Studio, Partner-Only 1v1 & 3–10 Couple Party Games

This update introduces a live camera capture and crop studio for profile pictures, refines 1v1 mode into an exclusive partner-versus-partner duel system with backend enforcement, expands Multiplayer into eight dedicated top-level sidebar sections, and launches a complete **Party Games** multiplayer mode where **3 to 10 paired couples (6 to 20 players)** compete together across **12 playable multi-round party games**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX decisions incorporate your confirmed choices and govern the implementation:

- **Confirmed Decision 1 — Party Room Couple Entry & Readiness Flow**: When one partner creates or joins a Party Room (`3–10 couples`), an invitation is automatically sent to their paired partner. Each couple occupies a dedicated Couple Team Slot (`Slot 1` through `Slot 10`) and counts toward the **3-couple minimum** once both partners have joined the room and clicked **Ready**.
- **Confirmed Decision 2 — Party Game Placement-Tiered XP Rewards**: Party Games award **XP only** (`0 Coins` and `0 Couple Trophies`, keeping the competitive 2v2 Trophy Road and Couple Leaderboard completely separate) using a configurable placement-tiered rule:
  - **1st Place Couple**: `+60 XP` per partner
  - **2nd Place Couple**: `+45 XP` per partner
  - **3rd Place Couple**: `+35 XP` per partner
  - **All Other Participating Couples**: `+25 XP` per partner
- **Confirmed Decision 3 — Eight Dedicated Top-Level Multiplayer Sidebar Sections**: The sidebar navigation will expose separate top-level entries for each Multiplayer section: **1v1 Games**, **2v2 Games**, **Party Games**, **Create Room**, **Join Group**, **Matchmaking**, **Invitations**, and **Voice Chat**.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Dual-Mode Profile Picture Studio (Upload Photo & Take Photo)**: Adds a privacy-first live camera capture flow alongside device file upload, supporting front/rear camera switching, live preview, capture/retake, interactive zoom/pan square cropping, and real-time preview inside the player's equipped animated avatar frame and profile banner.
  2. **Partner-Exclusive 1v1 Mode**: Transforms 1v1 into an intimate **You vs. Your Partner** experience. Removes username search, public/private room creation, and third-party invitations from 1v1 both in the UI and on the server.
  3. **Party Games Mode (3–10 Couples / 6–20 Players)**: Introduces a social multi-couple party lobby, public/private party room browser, host controls, live text/voice chat, and **12 authentic, multi-round playable party games** with real-time team scoring and couple podium ceremonies.
  4. **Clear Multiplayer Navigation**: Gives each of the eight multiplayer functions its own direct top-level sidebar entry so players can jump straight into 1v1 partner duels, 2v2 ranked couple matches, 3–10 couple party games, room management, matchmaking, invitations, or voice chat.
- **Target Audience / Persona**: Paired couples looking for private 1v1 duels with their partner, competitive 2v2 matches against rival couples, or lively 3–10 couple game nights with friends.
- **Key Value**: Establishes clear boundaries between intimate 1v1 partner play, competitive 2v2 ranked play, and large-group 3–10 couple social party play while preserving economy integrity.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Profile Picture Studio (`Upload Photo` | `Take Photo`)**:
   - In the Profile Customization studio, the player sees two explicit mode buttons: **Upload Photo** and **Take Photo**.
   - **Privacy-First Camera Lifecycle**: Selecting **Take Photo** requests `navigator.mediaDevices.getUserMedia` with `facingMode: 'user'` (front camera by default). No camera stream is ever opened until the user clicks **Take Photo**.
   - **Camera Controls**: Displays the live video feed with a **Switch Camera (Front / Rear)** button, a **Capture Photo** shutter button, and clear fallback messaging if camera permission is denied, no webcam is detected, or the browser does not support `mediaDevices`.
   - **Retake, Crop & Live Cosmetic Preview**: After capturing a frame, the camera stream immediately stops (`track.stop()`), and the captured still enters the interactive crop & position stage with a **Retake Photo** button. Below the cropper, a live composite preview renders the cropped photo inside the user's currently equipped **Animated Avatar Frame** over their equipped **Profile Banner** before saving to backend storage. Closing the modal or switching tabs always terminates any active camera tracks.

2. **Partner-Only 1v1 Duel Flow (`You VS Your Partner`)**:
   - Selecting any 1v1 game opens the streamlined **Partner Duel Modal**:
     - **Left Card (`YOU`)**: Displays the authenticated user's avatar, `@username`, equipped animated skin frame, and online badge.
     - **Center Badge (`VS`)**: Hand-sketched duel emblem with `XP Only · 0 Coins · 0 Trophies`.
     - **Right Card (`YOUR PARTNER`)**: Automatically resolves the user's actively paired partner from their Couple Pairing record, displaying their avatar, `@username`, equipped skin frame, and live online/offline status.
   - **Unpaired Gate**: If the user does not have an active couple pairing, the modal displays a clear explanation that Couple Pairing is mandatory for 1v1 and provides a one-click **Pair with Partner** button.
   - **Invitation Lifecycle**: Clicking **Challenge Your Partner** sends a direct `1v1` invitation to the paired partner (`pending`, `accepted`, `declined`, `expired`, and `cancelled` states shown in real time, with a **Cancel Challenge** option while pending). If the partner is offline, an unavailable notice is shown. Once the partner accepts, both players automatically enter the 1v1 match arena.

3. **Party Games Flow (`3–10 Couples` / `6–20 Players`)**:
   - **Step 1 — Browse the 12 Party Games**: Selecting **Party Games** in the sidebar displays the 12-game Party Library with round rules, couple capacity (`3–10 Couples · 6–20 Players`), and XP reward tiers.
   - **Step 2 — Create or Join a Party Room**: Players can create a **Public** or **Private** Party Room (generating a unique party room code) or browse open public parties in the **Public Party Browser**.
   - **Step 3 — Auto-Partner Invitation & 10-Couple Lobby Grid**: When a player creates or joins a Party Room, their paired partner automatically receives a Party Team invite. The Party Lobby displays:
     - Party game artwork, title, round settings, and `X/10 Couples Joined (Y/20 Players)` counter.
     - Room code with **Copy Code** and **Share Invite Link** buttons.
     - **10 Couple Team Cards**: Each occupied slot shows the Couple Name, Couple Banner backdrop, both partners' avatars, `@usernames`, equipped skin frames, online badges, and individual/couple **Ready** status (`Waiting for Partner`, `Joined · Not Ready`, or `Couple Ready ✓`).
     - **Host Controls**: The host can switch the selected party game, adjust round count/timers, remove a participant/couple, and click **Start Party Game** once at least **3 complete couples (6 players)** have joined and marked Ready.
     - **Integrated Party Chat & Voice**: Built-in room text chat and WebRTC/synthesized voice channel controls for all participating couples.

4. **The 12 Playable Party Games (Multi-Round & Real-Time Synchronized)**:
   - **01. Couple Quiz Showdown**: Timed multi-round trivia across general knowledge, pop culture, logic puzzles, and couple brainteasers where both partners can coordinate and lock in their team answer for speed + accuracy points.
   - **02. Draw & Guess Party**: Rotating shared canvas where the designated artist draws an assigned secret prompt while all couples race to submit the correct guess; faster guesses earn higher couple points.
   - **03. Charades Challenge**: Silent clue-acting rounds where the acting partner selects gesture/mime clue cards and visual stage actions without prohibited words while their partner and rival couples race the clock.
   - **04. Word Association Battle**: High-tempo word-chain relay where couples must submit valid, non-repeated semantic word links before the fuse runs out; duplicate or slow words lose streak multipliers.
   - **05. Emoji Decode**: Multi-round emoji cipher boards representing movies, idioms, songs, and objects; couples decode the exact phrase under time pressure with progressive hint reveals.
   - **06. Reaction Rumble**: Synchronized reflex and coordination mini-rounds (signal flash targets, dual-partner rhythm taps, decoy avoidance) where both partners' millisecond reaction scores combine into the couple's round score.
   - **07. Memory Mayhem**: Escalating grid memory rounds where couples flip and match paired symbol/pattern tiles under a shared move and time budget.
   - **08. Two Truths & A Lie**: Statement-deception party game where couples craft two truths and one convincing lie (or select from curated prompt decks) and earn points for fooling rival couples and spotting others' lies.
   - **09. Puzzle Rush**: Timed sequence, pattern matrix, cipher, and spatial logic sprints where couples race to solve randomized valid boards for fastest-completion bonuses.
   - **10. Treasure Hunt Party**: Branching island map adventure where couples solve riddles and mini-challenges across interconnected nodes to uncover the buried treasure chest first.
   - **11. Story Chain**: Collaborative comedy storytelling where each couple adds the next sentence using required wildcard words, followed by a live peer-voting phase where couples vote on the funniest contributions.
   - **12. Quickfire Challenge**: Rapid-fire 5-stage medley combining math blitz, color-word Stroop test, odd-one-out, pattern recall, and trivia sprints into a cumulative team gauntlet.

### Visual Identity & Theme
- **Aesthetic Direction**: Preserves the tactile **Warm Sketchbook & Cozy Arcade Notebook** aesthetic (`--dp-color-ground`, `--dp-color-ink`, `--dp-color-accent`, `--dp-color-highlight`) paired with dark-slate arena surfaces (`#1C1917` / `#0F172A`), tabular numerals (`font-mono tabular-nums`), and zero-pill unboxed metadata discipline.
- **Interactive Feedback & Motion**: Uses compositor-only GSAP transitions (`transform`, `opacity`) for modal entrances, camera shutter flash, 1v1 VS card reveals, party lobby slot updates, round countdowns, and the final Couple Podium scoreboard.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Strict Backend Enforcement for Partner-Only 1v1**:
  - *Chosen Approach*: Update the server-side `sendGameInvitation`, `createMultiplayerRoom`, and `joinMultiplayerRoom` handlers so `1v1` mode rejects any target user who is not the caller's active paired partner and rejects standalone `1v1` room creation.
  - *Why*: Guarantees partner-only 1v1 privacy at the API layer rather than relying solely on hiding UI buttons.
- **Decision 2 — Dedicated Party Room & Couple Slot Engine (`3–10 Couples`)**:
  - *Chosen Approach*: Extend the room engine with `mode: 'party'`, `minCouples: 3`, `maxCouples: 10`, `maxPlayers: 20`, and structured `partyCouples` slots (`coupleId`, `coupleName`, `coupleBanner`, `coupleSkin`, `partnerA`, `partnerB`, `teamScore`, `partnerContributions`, `bothJoined`, `bothReady`).
  - *Why*: Prevents duplicate couple entries, ensures both partners of each couple are validated against their active couple pairing, and tracks both individual partner contributions and combined couple scores.
- **Decision 3 — Isolated Party Economy & Match Ledger**:
  - *Chosen Approach*: Store completed party sessions in a dedicated `party_matches` history table and award placement-tiered XP (`+60 / +45 / +35 / +25 XP`) with `0 Coins` and `0 Trophies`.
  - *Why*: Protects the 2v2 Couple Trophy Leaderboard and Trophy Road from inflation while rewarding social party participation with balanced XP progression.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        PERSISTENT TOP PROGRESSION HUD                               │
│     [LEVEL 1..300 + Horizontal XP Bar]        [Custom Coin SVG + 5M Capacity Bar]   │
└──────────────────────────────────────────┬──────────────────────────────────────────┘
                                           │
┌──────────────────────────────────────────▼──────────────────────────────────────────┐
│                 SCROLLBAR-FREE SIDEBAR NAVIGATION (TOP-LEVEL ITEMS)                 │
│  • Home / Single Player                                                             │
│  • 1v1 Games (Partner-Only)   • 2v2 Games (Ranked Couple)  • Party Games (3–10 Duo) │
│  • Create Room (2v2 / Party)  • Join Group (Code/Browser)  • Matchmaking (2v2)      │
│  • Invitations                • Voice Chat                 • Shop (5 Pages) & Inv.  │
└───────┬──────────────────────────┬───────────────────────────────┬──────────────────┘
        │                          │                               │
┌───────▼──────────┐    ┌──────────▼─────────────┐     ┌───────────▼──────────────────┐
│ PROFILE CAMERA   │    │ PARTNER-ONLY 1V1 DUEL  │     │ PARTY GAMES HUB & ARENA      │
│ & CROP STUDIO    │    │ MODAL (PlayGameSetup)  │     │ (3–10 Couples / 6–20 Users)  │
│ • Upload Photo   │    │ • You vs Paired Partner│     │ • 12-Game Party Library      │
│ • Take Photo     │    │ • Live Partner Status  │     │ • Public/Private Party Rooms │
│ • Front/Rear Cam │    │ • Challenge Partner    │     │ • Auto Partner Team Invite   │
│ • Retake & Crop  │    │ • Pending/Accepted/    │     │ • 10-Couple Readiness Grid   │
│ • Frame + Banner │    │   Declined/Cancelled   │     │ • 12 Multi-Round Party Games │
│   Live Preview   │    │ • XP Only (0 Coins/🏆) │     │ • Live Couple Scoreboard     │
└───────┬──────────┘    └──────────┬─────────────┘     └───────────┬──────────────────┘
        │                          │                               │
        └──────────────────────────┼───────────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                 NEXT.JS API ROUTES (/api/arcade) & DRIZZLE REPOSITORY               │
│  • Partner-Only 1v1 Validation (Active Couple Check, Target === Paired Partner)     │
│  • Party Room Engine (3–10 Couples Capacity, Auto Partner Invite, Host Controls)    │
│  • Real-Time Party State Sync (Round Seed, Submissions, Individual + Team Scores)   │
│  • Party Match Ledger (Placement XP: +60/+45/+35/+25 XP · 0 Coins · 0 Trophies)     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

1. **Party Games Catalog (`PARTY_GAMES`)**:
   - Defines all 12 party games (`couple-quiz-showdown`, `draw-and-guess-party`, `charades-challenge`, `word-association-battle`, `emoji-decode`, `reaction-rumble`, `memory-mayhem`, `two-truths-and-a-lie`, `puzzle-rush`, `treasure-hunt-party`, `story-chain`, `quickfire-challenge`) with `minCouples: 3`, `maxCouples: 10`, `minPlayers: 6`, `maxPlayers: 20`, round count, and placement XP table.
2. **Party Room State (`mode: 'party'`)**:
   - `teams`: Up to 10 `PartyCoupleTeam` records containing `coupleId`, `coupleName`, `coupleBanner`, `equippedCoupleSkin`, `members` (both paired partners with `uid`, `username`, `avatar`, `equippedSkin`, `online`, `ready`, `individualScore`), `coupleReady` (`members.length === 2 && members.every(m => m.ready)`), and `teamScore`.
   - `gameState`: Synchronized multi-round state (`roundNumber`, `totalRounds`, `phase`, `sessionSeed`, `currentPrompt`, `drawStrokes`, `submissionsByUid`, `votesByUid`, `roundScoresByCouple`, `paused`, `disconnectedUids`).
3. **Party Match History (`party_matches` table)**:
   - Stores `id`, `roomCode`, `gameId`, `hostCoupleId`, `participatingCouplesCount`, `winnerCoupleId`, `winnerCoupleName`, `standingsJson` (couple rankings + individual partner contributions), `xpAwardedByUidJson`, and `createdAt`.

### Interactive Component & State Mapping

- **Camera Capture & Crop Modal**:
  - Clicking **Take Photo** invokes `navigator.mediaDevices.getUserMedia({ video: { facingMode } })` and attaches the stream to `<video autoPlay playsInline muted />`.
  - Clicking **Switch Camera** toggles `facingMode` between `'user'` and `'environment'`, stopping the previous stream before starting the new one.
  - Clicking **Capture** draws the current video frame onto an offscreen canvas, stops all media tracks immediately, and loads the data URL into the interactive zoom/offset square cropper with a **Retake Photo** button and live **Avatar Frame + Profile Banner** preview.
- **1v1 Partner Duel Modal**:
  - Queries the user's active couple pairing and renders the **You vs. Your Partner** comparison card.
  - Clicking **Challenge Your Partner** calls `action: 'send_game_invitation'` with `inviteType: '1v1'`; backend verifies `targetUid === pairedPartnerUid` and creates a 2-seat partner duel room.
  - Supports **Cancel Challenge** (`action: 'cancel_game_invitation'`) while pending and auto-launches the selected 1v1 game as soon as the partner accepts.
- **Party Lobby & 12 Party Game Engines**:
  - Creating or joining a Party Room seats the player in their couple's team slot and automatically sends a `party_partner_invite` to their paired partner so both partners join the same couple team.
  - Host controls allow changing the party game, configuring rounds, kicking disruptive participants, and starting the match once `readyCouplesCount >= 3` (and `<= 10`).
  - Finishing a party game displays the **Couple Podium & Contribution Breakdown** (showing each couple's rank, total score, and both partners' individual points) and persists placement-tiered XP (`+60 / +45 / +35 / +25 XP`, `0 Coins`, `0 Trophies`) to the database.
