# Odd Hours — Multiplayer Observation Game

**Personal Project · AI Skills Studio × OpenAI Multiplayer Game Challenge**

A cooperative multiplayer observation game where players inspect illustrated rooms, discuss suspicious details, and vote on the object that feels out of place.

**Live Demo:** [Play Odd Hours](https://oddhours.onrender.com/)

## Overview

Odd Hours is a five-round, cooperative web game for 2–6 players. Players join a shared room using a six-character code and examine illustrated scenes containing player-specific visual details.

Players discuss what they observe and work together to identify the intended anomaly. Some details vary between players as decoys, encouraging communication and careful observation.

Created for the AI Skills Studio × OpenAI Multiplayer Game Challenge on Handshake, the game was developed with ChatGPT and Codex as AI-assisted development tools.

## Features

- Cooperative gameplay for 2–6 players
- Five-round game structure
- Room creation and joining with a six-character code
- Shared multiplayer game sessions
- Illustrated rooms with player-specific visual details
- Anomaly identification and player voting
- Harmless decoys that encourage discussion
- Browser-based gameplay without player accounts
- Public deployment on Render

## Technology

- **JavaScript** — Game logic and interactive gameplay
- **Node.js** — Server-side runtime
- **Express** — Web server
- **HTML and CSS** — Game interface and styling
- **Render** — Public hosting and deployment
- **ChatGPT and Codex** — AI-assisted development

## Play Locally

**Requirements:** Node.js 20 or newer.

1. Clone or download the repository.
2. Open a terminal in the project folder.
3. Start the server:

```bash
npm start
```

4. Open `http://localhost:3000` in your browser.

To play across multiple devices, the server must be reachable by each device. The local address works for testing on the same computer.

## Deployment

The repository includes a `render.yaml` Blueprint configuration for deploying the game to Render.

Once deployed, players can open the public URL, create or join a room, and play together using the room code.

## Current Limitations

- Active room state is stored in server memory and is lost when the server restarts or redeploys.
- The game is designed to run on a single server instance.
- Render's free service may sleep when inactive, potentially interrupting active rooms.
- Round content and illustrations are currently authored directly in `server.js` and `app.js`.
- Persistent shared storage would be needed to support more
