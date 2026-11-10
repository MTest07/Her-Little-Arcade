# Profile Customization, Animated Avatar Frames, Banners & Collectible Chest System — Her Little Arcade

This plan upgrades **Her Little Arcade** with a scrollbar-free responsive sidebar, custom profile picture uploading and cropping, bespoke per-skin animated avatar frames, a 5-rarity **Profile Banners** cosmetic layer, a 5-tier **Collectible Chest & Key System** with tier-distinct GSAP card-reveal animations, and a unified 4-category **Inventory** backed by atomic server-side transactions.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product and technical decisions incorporate your confirmed Phase 1 answers:

- **Confirmed Decision 1 — Duplicate Cosmetic Reward Conversion**: When a chest rolls a Skin or Banner that the player already owns, the server automatically converts the duplicate into **Arcade Coins** scaled by the item's rarity tier (**Common**: `+35 Coins`, **Uncommon**: `+75 Coins`, **Rare**: `+160 Coins`, **Epic**: `+320 Coins`, **Legendary**: `+650 Coins`), clearly badged during the card-reveal sequence and recorded in the player's coin ledger.
- **Confirmed Decision 2 — Challenge Key Progression**: Completed and verified challenges award Chest Keys matching their period and difficulty:
  - **Daily Challenges (Easy · 24h)**: Award **Common Keys** (or **Uncommon Keys** on higher-target daily objectives).
  - **Weekly Challenges (Medium · 7d)**: Award **Rare Keys** or **Epic Keys**.
  - **Monthly Challenges (Hard · 1m)**: Award **Legendary Keys**.
- **Confirmed Decision 3 — Profile Picture Storage & Cropping**: Uploaded profile pictures (`PNG`, `JPG`, `JPEG`, `WebP` up to `5 MB`) use an interactive client-side zoom/pan square crop studio and are stored and served through the built-in authenticated backend and database storage layer, keeping the uploaded image strictly separate from equipped avatar frames and banners.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Scrollbar-Free Sidebar**: Eliminates both vertical and horizontal scrollbars inside the desktop/tablet collapsible sidebar and mobile drawer while keeping smooth mouse-wheel, trackpad, and touch scrolling when items exceed viewport height.
  2. **Three-Layer Independent Profile Architecture**: Decouples player customization into three non-destructive layers that compose together everywhere profiles appear:
     - **Layer 1 (Background)**: Rectangular **Profile Banner** (5 rarities: Legendary, Epic, Rare, Uncommon, Common).
     - **Layer 2 (Center Subject)**: Uploaded custom **Profile Picture** (with interactive crop/zoom studio, or fallback cozy character portrait).
     - **Layer 3 (Foreground Frame & FX)**: Equipped **Skin Avatar Frame** featuring a unique per-skin SVG/GSAP animation (orbiting stars, drifting sakura petals, solar eclipse corona, clockwork gears, botanical vines, wax seal pulse, etc.).
  3. **5-Tier Chest & Custom Key Ecosystem**: Expands the Shop with **Common**, **Uncommon**, **Rare**, **Epic**, and **Legendary** Chests and matching custom-illustrated **Keys**. Players can purchase chests with Coins or unlock them using Keys earned from completed Daily, Weekly, and Monthly Challenges.
  4. **Server-Authoritative GSAP Card-Draw Opening Experience**: Every chest tier plays its own distinct GSAP opening and card-drawing sequence (with an instant **Skip Animation** button that reveals the server-determined reward immediately).
  5. **4-Category Persistent Inventory**: Organizes all owned items into **Skins**, **Banners**, **Chests**, and **Keys** with live preview, equip/unequip controls, and quantity badges.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Sidebar Navigation (Zero Visible Scrollbars)**
   - Hides native scrollbar tracks and thumbs across WebKit, Firefox, and Chromium (`scrollbar-width: none`, `-ms-overflow-style: none`, `::-webkit-scrollbar { display: none }`) and prevents horizontal overflow caused by hover micro-shifts while preserving vertical wheel/touch scrolling.

2. **Profile Picture Upload, Crop & Layer Independence**
   - In **Profile & Couple** and **Account Settings**, clicking **Upload Profile Picture** opens an interactive **Crop & Preview Studio**:
     - Validates file format (`PNG`, `JPG`, `JPEG`, `WebP`) and size ($\le 5\text{ MB}$).
     - Provides zoom slider and drag-to-reposition square framing with live preview inside the player's currently equipped **Skin Avatar Frame** and **Profile Banner**.
     - Includes **Save Picture**, **Replace Picture**, and **Remove Uploaded Picture** (reverting cleanly to the player's chosen character icon without affecting their equipped skin or banner).

3. **Skin-Based Avatar Frames & Unique Per-Skin Animations**
   - Every skin in the 5-rarity catalog renders a bespoke SVG + CSS/GSAP animated frame around the user's profile picture:
     - *Sovereign Solar Eclipse (Legendary)*: Rotating golden eclipse corona with orbiting solar flares.
     - *Imperial Gilded Constellation (Legendary)*: Twinkling astrolabe rings and orbiting starlight nodes.
     - *Celestial Waltz Aura (Epic)*: Dual orbiting comet ribbons in rose and indigo.
     - *Astral Origami Crane (Epic)*: Floating folded paper cranes and shimmering gold leaf particles.
     - *Moonlit Sakura Pavilion (Epic)*: Gently drifting cherry blossom petals and soft lantern glow.
     - *Paper Lantern Harmony (Rare)*: Warm swaying festival lanterns and rising ember motes.
     - *Starlight Cartographer (Rare)*: Sweeping brass compass needle and cardinal star glints.
     - *Pressed Clover Herbarium (Uncommon)*: Breathing botanical vine border with emerging four-leaf clovers.
     - *Strawberry Postmark Stamp (Uncommon)*: Perforated stamp frame with a gentle wax-seal pulse.
     - *Warm Sketchbook Margin & Twine Keepsake (Common)*: Hand-sketched graphite corner ticks and subtle paper-tape shimmer.
   - Respects `prefers-reduced-motion` by rendering the full decorative frame artwork in a static, crisp posture when reduced motion is enabled.

4. **Profile Banners (5 Rarity Tiers)**
   - Adds 10 distinct rectangular **Profile Banners** spanning **Legendary**, **Epic**, **Rare**, **Uncommon**, and **Common** rarities, each with custom layered SVG/canvas artwork, title, lore description, and rarity badge.
   - Positioned as the horizontal backdrop behind the player's avatar and animated skin frame on Individual Profiles, Couple Profiles, 2v2 Team Lobbies, Leaderboards, and the Live Preview Studio.
   - Players can independently preview, equip, and unequip any owned banner without altering their skin or profile photo.

5. **Chest Shop, Custom Keys & GSAP Card-Draw Reveal**
   - **5 Chest Tiers & Transparent Drop Tables**:
     - **Common Chest** (`100 Coins` or `1 Common Key`): 70% Common, 25% Uncommon, 5% Rare.
     - **Uncommon Chest** (`220 Coins` or `1 Uncommon Key`): 30% Common, 50% Uncommon, 17% Rare, 3% Epic.
     - **Rare Chest** (`450 Coins` or `1 Rare Key`): 15% Uncommon, 65% Rare, 17% Epic, 3% Legendary.
     - **Epic Chest** (`850 Coins` or `1 Epic Key`): 20% Rare, 68% Epic, 12% Legendary.
     - **Legendary Chest** (`1,500 Coins` or `1 Legendary Key`): 25% Epic, 75% Legendary.
   - **Custom Key Progression**: 5 custom-crafted SVG key designs progressing from a simple wrought-iron notebook key (Common) and clover-engraved brass key (Uncommon) to a sapphire compass key (Rare), amethyst sakura key with glowing runes (Epic), and a radiant solar-crest key with animated aura (Legendary).
   - **5 Distinct GSAP Opening & Card-Draw Sequences**:
     - *Common*: Sketchbook parcel unties and slides out a single crisp keepsake card.
     - *Uncommon*: Botanical clasp snaps open with leaf confetti and a vertical card lift + flip.
     - *Rare*: Brass astrolabe lock rotates 180°, releasing a sapphire light beam as the reward card spirals to center stage.
     - *Epic*: Double lacquer doors part with sakura/comet particles, elevating a glowing tarot-style card that flips with a shockwave ring.
     - *Legendary*: Multi-stage cinematic sequence—the chest levitates with golden shockwaves, the solar lock shatters into starlight, three orbital energy rings converge into a radiant prism card, and the Legendary reward is unveiled with full banner/frame live preview.
     - Includes an always-accessible **Skip Animation** button after the server returns the outcome.

6. **Unified 4-Category Inventory**
   - Dedicated **Inventory** view inside the Shop & Profile hub with 4 tabs: **Skins**, **Banners**, **Chests**, and **Keys**.
   - Displays artwork, rarity, quantity owned (for Chests and Keys), ownership/equipped badges, and direct **Preview**, **Equip / Unequip**, or **Open Chest** actions.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Server-Authoritative Chest Rolls Before Animation Playback**
  - *Chosen Approach*: When a player clicks **Open with Key** or **Buy & Open with Coins**, the client first executes an atomic `POST /api/arcade` transaction (`open_chest` or `buy_chest`). The server verifies balance/key ownership, deducts the cost, rolls the rarity and item from the chest's pool, checks ownership, converts duplicates into rarity-scaled Coins if already owned, persists the ledger record, and returns the sealed result payload. The GSAP chest-opening animation then dramatizes that exact server-verified reward.
  - *Why*: Guarantees zero client-side tampering, prevents double-spending or refresh exploits, and allows instant **Skip Animation** without altering the outcome.

- **Decision 2 — Three-Layer Composable Profile Header & Avatar Component**
  - *Chosen Approach*: Build a reusable `<ProfileBannerAndAvatar />` and `<AnimatedSkinnedAvatar />` component system that accepts `{ photoUrl, fallbackAvatar, skinId, bannerId, size }`.
  - *Why*: Ensures changing a profile picture, equipping a new skin frame, or swapping a banner never overwrites or mutates the other two layers, and renders consistently across Sidebar, Profile, Couple Profile, Matchmaking Modals, and Leaderboards.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        HER LITTLE ARCADE FRONTEND                          │
│                                                                            │
│  ┌──────────────────────┐   ┌───────────────────────────────────────────┐  │
│  │ Scrollbar-Free       │   │ Three-Layer Profile & Avatar System       │  │
│  │ ArcadeSidebar        │   │  • Layer 1: ProfileBannerArtwork (5 Tiers)│  │
│  │  • Hidden Scrollbars │   │  • Layer 2: Uploaded Photo / Crop Studio  │  │
│  │  • Wheel/Touch Scroll│   │  • Layer 3: AnimatedSkinAvatarFrame (GSAP)│  │
│  └──────────────────────┘   └───────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Collectible Shop, Chests, Custom Keys & 4-Tab Inventory              │  │
│  │  ┌────────────────┐ ┌────────────────┐ ┌──────────────────────────┐  │  │
│  │  │ Chest Boutique │ │ 4-Tab Inventory│ │ GSAP Chest Opening Modal │  │  │
│  │  │ • 5 Chest Tiers│ │ • Skins        │ │ • 5 Tier-Unique Timelines│  │  │
│  │  │ • Drop Odds UI │ │ • Banners      │ │ • Card-Draw Flip Reveal  │  │  │
│  │  │ • Coin / Key   │ │ • Chests (Qty) │ │ • Duplicate -> Coins Note│  │  │
│  │  │   Triggers     │ │ • Keys (Qty)   │ │ • Instant Skip Button    │  │  │
│  │  └───────┬────────┘ └───────┬────────┘ └────────────┬─────────────┘  │  │
│  └──────────┼──────────────────┼───────────────────────┼────────────────┘  │
└─────────────┼──────────────────┼───────────────────────┼───────────────────┘
              │                  │                       │
              ▼                  ▼                       ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   SERVER API & ATOMIC REPOSITORY (/api/arcade)             │
│                                                                            │
│  • upload_profile_photo / remove_profile_photo (Validated Base64/Data URL) │
│  • equip_banner / purchase_banner (Persisted on User & Couple Profiles)    │
│  • claim_challenge (Grants XP + Tier-Matched Chest Key: Common..Legendary) │
│  • buy_chest / open_chest (Atomic Coin/Key Deduction + Server RNG Roll +   │
│    Duplicate-to-Coin Conversion + Chest Opening Ledger Record)             │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State Extensions

- **User Profile Extensions**:
  - `customPhotoUrl`: Cropped uploaded profile image data/URL (empty string when using default character icon).
  - `equippedBanner`: Equipped banner ID (default `'banner-warm-sketchbook'`).
  - `unlockedBannersJson`: Array of owned banner IDs.
  - `chestInventoryJson`: Map of owned unopened chests by tier (`{ Common, Uncommon, Rare, Epic, Legendary }`).
  - `keyInventoryJson`: Map of owned chest keys by tier (`{ Common, Uncommon, Rare, Epic, Legendary }`).
- **Chest Opening History Table (`chestOpenings`)**:
  - Records `userUid`, `chestTier`, `unlockMethod` (`coins` or `key`), `rewardType` (`skin` or `banner`), `rewardId`, `rewardRarity`, `wasDuplicate`, `duplicateCoinsAwarded`, and `createdAt`.
- **Challenge Key Rewards**:
  - Each challenge definition in `ARCADE_CHALLENGE_CATALOG` includes `keyRewardTier` (`Common` / `Uncommon` for Daily, `Rare` / `Epic` for Weekly, `Legendary` for Monthly) and `keyRewardCount: 1`, awarded atomically upon claiming a completed challenge.
