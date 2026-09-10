# Wobble House — 3D Local Multiplayer Party Game

A playful soft-bodied 3D party game with squishy characters, flexible spines, floppy limbs, and a cluttered 10-player apartment playground.

---

## 🕹️ Game Features & Mechanics

- **Uniform Locomotion**: 4.5 m/s uniform speed across all players (zero exhaustion penalties).
- **Movement Suite**:
  - `W A S D` / Touch Joystick: Directional locomotion.
  - `Space`: Jump.
  - `F`: **Sleep / Flat Flop** (belly flop to slide under beds).
  - `Ctrl` / `Shift`: **Crawl / Crouch** (crawl under dining and coffee tables).
  - `C`: **Sit** on chairs/beds/floor.
  - `E`: **Grab / Interact** (reaches floppy rubbery arms).
  - `Q / Z`: **Spine Physics** (pitch/duck forward or bend backwards awkwardly).
  - `V`: **Perspective Toggle** for Runners (First-Person Eye-Level $\leftrightarrow$ Third-Person Over-The-Shoulder).
- **The Hitter Role**:
  - Assigned randomly via a fair round-robin lobby rotation pool.
  - Holds a permanent wooden baseball bat with loose ragdoll arm swing (`Left Click` / `Space`, 0.8s cooldown).
  - **Peep Darkness Filter**: Top 85% of screen is pitch black; only the bottom 15% strip shows feet, floor, and bat tip.
  - **Thermal Impact Echo**: Bumping chest/head-first or swinging into furniture lights up radiant neon cyan fading to thermal orange/yellow outlines for 2.5 seconds.
- **The Runners Role**:
  - 100 Base HP (25 HP damage per bat hit = 4 hits to knock out).
  - **Panic Sprint Animation**: When struck, arms fling wildly into the air flapping for 3.0 seconds with high-pitched shrieks while bolting away.
- **Cluttered 10-Player Apartment Room**:
  - Bunk beds and daybeds (jumpable surfaces with crawlable under-bed clearance).
  - Dining & coffee tables (low clearance crawl spaces).
  - Tripping props (stools, cushions, and dynamic bouncy yoga balls).
  - Rotating ceiling fans.
- **Audio Engine**: Procedural Web Audio synthesizer generating screams, wooden bat thwacks, whooshes, yoga ball boings, and victory fanfares without external audio assets.

---

## 🚀 Quickstart (Run Locally)

### 1. Start the Server
Open terminal in the `game` folder and run:
```bash
npm start
```

### 2. Open in Browser
Visit [http://localhost:3000](http://localhost:3000) in Chrome, Edge, or Firefox.

- **Instant Solo Test**: Click **"⚡ SOLO TEST (9 AI BOTS)"** to spawn 9 slapstick ragdoll bots that run, hide, flap arms, and scream!
- **Multiplayer LAN / Local Test**: Open multiple browser tabs with different nicknames in the same room code (e.g. `LOBBY-1`).

---

## 🌐 How to Deploy to the Web

### Deploying the Game Server to Render.com (Recommended)

1. Push this `game` repository to your **GitHub / GitLab** account.
2. Log into [Render.com](https://render.com) and click **"New +" $\rightarrow$ "Web Service"**.
3. Select your repository.
4. Configure the settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. Click **Create Web Service**.
6. Render will provide a live HTTPS URL (e.g. `https://hittlers-game.onrender.com`) that supports persistent WebSockets!

*(Optional: You can also use the included `deployment/render.yaml` or `deployment/Dockerfile` for 1-click Blueprints).*

---

## 🗄️ Using Supabase for Auth, Leaderboards & 3D Model Storage

### 1. Setting up Supabase Database & Auth
1. Create a free project at [Supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in the Supabase Dashboard.
3. Paste and run the contents of [`deployment/supabase_setup.sql`](./deployment/supabase_setup.sql).
4. This will create:
   - `profiles` table (tracks usernames, custom skins, escape records, clean sweeps).
   - `match_history` table (round stats and duration).
   - `leaderboard` view.
   - `game-assets` storage bucket.

### 2. How to Store & Stream 3D Models (.glb / .gltf)

1. **Optimize your 3D models in Blender**:
   - Keep polycount low (< 10k triangles per character).
   - Export as binary **`.glb`** format with embedded textures.
2. **Compress with DRACO / meshopt**:
   - Use `gltf-transform` to compress 20MB models down to ~500KB:
     ```bash
     npx @gltf-transform/cli optimize input.glb output.glb --draco.mesh
     ```
3. **Upload to Supabase Storage Bucket**:
   - In Supabase Dashboard, go to **Storage $\rightarrow$ `game-assets`**.
   - Upload your `character_ragdoll.glb` or furniture models.
   - Copy the public CDN URL (e.g. `https://your-project.supabase.co/storage/v1/object/public/game-assets/character.glb`).
4. **Load in Three.js**:
   - Three.js `GLTFLoader` will stream the model directly from the Supabase CDN URL:
     ```javascript
     import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

     const loader = new GLTFLoader();
     loader.load('https://your-project.supabase.co/storage/v1/object/public/game-assets/character.glb', (gltf) => {
       scene.add(gltf.scene);
     });
     ```

---

## 📁 Project Structure

```
game/
├── package.json               # Node.js dependencies & scripts
├── README.md                  # Complete documentation & deployment guide
├── server/
│   └── index.js               # Express + Socket.io 60Hz multiplayer game loop
├── client/
│   ├── index.html             # HTML entry point with Three.js importmap & HUD
│   ├── src/
│   │   ├── main.js            # Main game orchestrator & client loop
│   │   ├── styles.css         # Peep Darkness overlay, HUD, and mobile touch UI
│   │   └── engine/
│   │       ├── Apartment.js   # 3D Cluttered room, bunk beds, tables, thermal echo
│   │       ├── RagdollAvatar.js # Rubbery avatar, spine physics, flail & bat poses
│   │       ├── Physics.js     # Collision detection, under-table crawling, yoga balls
│   │       ├── CameraManager.js # 1st/3rd person & Hitter low-angle strip cameras
│   │       ├── AudioEngine.js # Procedural slapstick Web Audio synthesizer
│   │       └── NetworkClient.js # Socket.io synchronization client
│   └── public/
│       └── assets/            # Static assets & 3D models
└── deployment/
    ├── render.yaml            # Render.com Blueprint configuration
    ├── Dockerfile             # Production container definition
    └── supabase_setup.sql     # Supabase SQL schema & storage bucket policies
```
