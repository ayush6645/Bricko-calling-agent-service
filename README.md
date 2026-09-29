# Bricko Voice Core

High-performance, minimal real-time voice AI engine for WhatsApp and VoIP telephony.
Built with Node.js, TypeScript, and Google Gemini Live API.

## Features
- **Zero Third-Party SaaS Lock-in**: Connects directly to Google Gemini Live over secure WebSockets.
- **Universal Telephony Ingress**: Speaks standard AudioSocket protocol; integrates with Asterisk, WhatsApp, or VoIP PBX.
- **Natural Hindi / Hinglish First**: Tailored for Indian real estate consultations with the mature male voice (Charon).
- **Auto-Hangup Detection**: Gracefully disconnects when the caller finishes or says goodbye.
- **Strictly Modular**: Every source file is under 70 lines of code.

## Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Run in development mode
npm run dev

# 3. In another terminal, test locally with the call simulator
npm run test:call
```

## Architecture
```text
src/
├── api/                       # Telephony Ingress (AudioSocket TCP server)
├── voice/                     # Voice AI Provider (Gemini Live WebSocket)
├── infrastructure/            # Typed Configuration & Logger
├── prompts.ts                 # Real Estate Persona & Rules
└── main.ts                    # Service Bootstrap Entry Point
```
