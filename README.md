# 🏏 CRICKET DOODLE 3D — Ants vs Grasshoppers Multiplayer

A real-time 3D multiplayer cricket game inspired by Google Doodle Cricket, built with **Three.js**, **Socket.IO**, and **Node.js**.

---

## 🌟 Key Features

### 🐜 Team Ants vs 🦗 Team Grasshoppers
- **Ants (Team A)**: Tenacious runners, disciplined shot-makers, featuring procedural ant geometry with antennae, segmented body, and cricket pads/bats.
- **Grasshoppers (Team B)**: High-flying pacers and agile fielders with long hind jump-legs, compound eyes, and translucent wings.
- **Full 11-Player Squads**: If not enough human players join, AI bots seamlessly fill empty team slots up to 11 players per side.

### 🎮 Two Game Modes
1. **🏆 Team Match (Ants vs Grasshoppers)**
   - Friends join via a shared **Room Code**.
   - Choose your side (Ants or Grasshoppers).
   - **Toss System**: Captain calls Heads or Tails and elects to Bat or Bowl first.
   - **Captain Authority**: Captain decides batting order and selects which bowler delivers each over!
   - 1st Innings & 2nd Innings Target Chase with full cricket rules.
2. **⚡ Single Batting Mode**
   - Individual queue rotation.
   - One human player bats, another bowls, while remaining human/bot players field.
   - When a batsman gets out or overs conclude, the next player takes the crease.
   - High-score leaderboard determines the match champion!

### 🏏 True Cricket Batting Mechanics
- **Shot Types**:
  - **Drive**: Classic ground stroke through covers or down the ground.
  - **Loft**: High-arc aerial shot with maximum sixer potential.
  - **Sweep**: Low horizontal sweep behind square on the leg side.
  - **Cut**: Sharp shot past point off short deliveries.
  - **Defend**: Solid block against dangerous yorkers.
- **Timing & Power Bar**: Real-time oscillating precision bar — time your swing in the green/gold sweet spot for maximum runs!
- **Direction Control**: Steer your shot towards off side, straight, or leg side.

### ⚾ Pitch-Target Bowling Mechanics
- **Interactive Pitch Map**: Tap or click anywhere on the 22-yard pitch to set exact line and length.
- **Lengths**: Yorker zone, Good length, Bouncer zone.
- **Lines**: Off stump, Middle stump, Leg stump.
- **Delivery Styles**: Pace, Spin (with lateral deviation), Yorker, Bouncer.

### 📜 Complete Cricket Rules
- Configurable overs (2, 5, or 10 overs).
- 6 legal balls per over.
- Scoring: 0 (dot), 1, 2, 3, 4 (boundary), 6 (maximum).
- Extras: Wide ball (extra run + re-bowl), No Ball.
- Dismissals: **Bowled**, **Caught**, **LBW**, **Stumped**, **Run Out**.
- Strike rotation on odd runs & change of ends after each over.
- Full real-time scoreboard & comprehensive match scorecard modal.

---

## 🚀 How to Play

### Local Development
```bash
npm install
npm start
```
Open `http://localhost:3000` in your web browser.

### Multiplayer with Friends
1. Enter your nickname.
2. Enter or generate a **Room Code** (e.g., `CRIC-101`) and share it with friends.
3. Select your mode (**Team Match** or **Single Batting**) and number of overs.
4. Join **Team Ants** or **Team Grasshoppers**.
5. Once ready, click **START TOSS** to begin!
