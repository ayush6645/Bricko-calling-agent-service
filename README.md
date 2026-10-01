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
WhatsApp caller → Meta (SIP/TLS + SRTP-SDES, Opus) → Asterisk gateway (gateway/)
               → AudioSocket TCP (8 kHz PCM) → Bricko Voice Core (src/) → Gemini Live

src/
├── api/                       # Telephony Ingress (AudioSocket TCP server)
├── voice/                     # Voice AI Provider (Gemini Live WebSocket), playout, call actions
├── infrastructure/            # Typed Configuration & Logger
├── prompts.ts                 # Real Estate Persona & Rules
└── main.ts                    # Service Bootstrap Entry Point

gateway/
├── templates/                 # Asterisk configs, rendered from gateway/.env at container start
├── entrypoint.sh              # Validates env + TLS files, renders templates, starts Asterisk
└── docker-compose.yml
```

## WhatsApp Gateway Deployment (VM)
1. Point a DNS A record (e.g. `sip.yourdomain.com`) at the VM's public IP.
2. Issue a certificate for it (e.g. `certbot certonly --standalone -d sip.yourdomain.com`) and copy
   `fullchain.pem` + `privkey.pem` into `gateway/certs/`.
3. `cp gateway/.env.example gateway/.env` and fill in the values; open the TLS port and the RTP
   UDP range in the VM firewall.
4. Start the agent on the same VM with `HOST=127.0.0.1` (`npm run build && npm start`), then the
   gateway: `cd gateway && docker compose up -d --build`.
5. Verify TLS: `openssl s_client -connect sip.yourdomain.com:5061` should show your certificate.
6. Register the gateway with Meta: `npm run meta:sip` (dry run), then `npm run meta:sip -- --apply`.
7. Call the number from WhatsApp and watch `docker logs -f bricko-whatsapp-gateway`.
