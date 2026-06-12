[README.md](https://github.com/user-attachments/files/28881941/README.md)
# OfflineArcade

OfflineArcade is a modern, responsive, and fully offline-capable web application containing a collection of classic retro games. Designed as a Progressive Web App (PWA) with a premium glassmorphic dark-mode interface, it allows users to play alone, against smart AI bots, or with friends over local WebRTC peer-to-peer connections.

## Features

- **📶 100% Offline Capability**: Uses a Service Worker (`sw.js`) and a pre-session loading engine to cache all HTML, CSS, JavaScript, icons, and game assets locally. Once opened, it can be played anywhere without an internet connection.
- **📡 WebRTC P2P Multiplayer**: Connect two devices directly (over the same network or mobile hotspots) via QR code scanning or copy-paste code exchange. Features ICE/STUN configurations optimized for symmetric NAT traversal.
- **📊 Local Statistics & Personalization**: Tracks high scores, selects custom avatars (with iOS-specific Apple logo support), manages mute settings, and displays total playtime counters for each game.
- **🎵 Synthesized Retro Sounds**: Uses the Web Audio API to dynamically generate old-school arcade sound effects on-the-fly without downloading large audio files.
- **📱 Responsive Glassmorphism Design**: Tailored layout that centers and scales beautifully on mobile viewports, tablets, and desktop displays, with full support for light and dark modes.

## Games Included

1. **Paper.io**: Capture grid territory, avoid self-intersection, and cut enemy trails using WASD/Arrow keys or swipe gestures. Powered by a custom BFS boundary-tracing flood-fill algorithm and featuring smart pathfinding AI bots.
2. **Pong**: A refined version of the classic arcade game. Includes custom-synthesized paddles, stable frame-delta countdowns, and realistic Magnus-effect spin physics (rotation matrix) with air-friction decay.
3. **2048**: Combine numbered tiles to reach the 2048 goal. Features smooth responsive CSS transitions, tile scaling on merge, and instant P2P state synchronization.
4. **Tic Tac Toe**: Play the classic 3x3 game against a smart AI bot or a friend over WebRTC.
5. **Block Smasher**: Control a paddle, bounce a ball, and smash blocks to survive as long as possible.
6. **Escape Road** & **Drive Mad**: WebGL/Unity-based game wrappers structured for offline arcade integration.

## Getting Started

Since the app relies on Service Workers and WebRTC, it must be run under a secure context (`https://` or `http://localhost`).

### Local Development

To run the project locally, launch a local web server in the root directory:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (installed globally)
npx http-server -p 8000
```

Open `http://localhost:8000` in your web browser.

## Licenses & Credits

- **OfflineArcade Base Template**:
  - Copyright (c) 2026 Grayson Brown ([Grayson-Brown Codepen](https://codepen.io/Grayson-Brown/pen/pvgejad))
  - Modified and published by Jannes-Br ([GitHub](https://github.com/Jannes-Br))
  - Licensed under the MIT License (see `LICENSE` or files for terms).

- **Escape Road (WebGL Wrapper)**:
  - Original code and assets by Thorge Mrowinski ([GitHub Repository](https://github.com/thorge-mrk/Games.Escape_Road))
  - Modified and integrated under the MIT License (see [Escape Road License](games/escape-road/LICENSE)).

- **Drive Mad (WebGL Wrapper)**:
  - Original code and assets by Thorge Mrowinski ([GitHub Repository](https://github.com/thorge-mrk/Drive-Mad))
  - Modified and integrated under the MIT License (see [Drive Mad License](games/drive-mad/LICENSE)).
