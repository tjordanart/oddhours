# Odd Hours

A five-round, 2–6 player cooperative observation game. Players join with a room code, inspect a shared illustrated room with a few player-specific details, talk through what they see, and vote for the exact object that feels wrong.

## About This Project

Odd Hours was created for the **AI Skills Studio X OpenAI Multiplayer Game Challenge** on Handshake. The game was designed and developed with **ChatGPT and Codex**, using AI-assisted development to take the concept from idea to a working multiplayer web game.

**Live Demo:** https://oddhours.onrender.com/

## Run locally

Requires Node.js 20 or newer. From this folder, run:

```sh
npm start
```

Then open `http://localhost:3000`. To play across separate devices, the server must be reachable by both devices; localhost is only for trying the interface on one computer.

## Put it on a public URL

The included `render.yaml` is a Render Blueprint. To deploy:

1. Put this `odd-hours` folder in a GitHub repository.
2. In Render, choose **New → Blueprint**, connect the repository, and select this folder's `render.yaml`.
3. Deploy the `odd-hours` web service. Render will provide a public `onrender.com` URL to share with players.

No accounts are required for players. The host and players use the same public URL and a six-character room code.

## Current multiplayer scope

Room state lives in the Node server's memory. Run a single server instance; restarting or redeploying it clears active rooms. The free Render service may sleep when unused, which also clears rooms when it restarts. This keeps the first playable version dependency-free; longer-lived matches need persistent shared storage.

Round content and illustrations are hand-authored in `server.js` and `app.js`. Each round gives at least one player a view of the intended anomaly, while other details can vary by player as harmless decoys.
