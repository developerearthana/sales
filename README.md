# Sales Automation Multi-Agent Orchestration

This project is a Vercel starter pack for a coordinated sales automation system using a multi-agent manager.

## Stack

- Vercel Serverless Functions
- Node.js / TypeScript
- Supabase Postgres as central memory
- LangGraph-style orchestration manager
- Direct API integration for CRM, email, WhatsApp, and voice

## Getting started

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set environment variables for Supabase and direct provider keys
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `HUBSPOT_API_KEY`
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM`
   - `TWILIO_VOICE_FROM`
3. Run locally: `npm run dev`

If Vercel prompts for login, run:

```bash
npx vercel login
```

Open `http://localhost:3000/` to view a small API landing page. This project is currently built as an API backend rather than a full UI app.

Or use a token:

```bash
set VERCEL_TOKEN=your_token_here
npm run dev
```

## Provider wiring

- HubSpot handles CRM lead lookup and upsert.
- SendGrid sends outbound messages from the configured sender address.
- Twilio sends WhatsApp messages and initiates voice calls.

## Manager endpoints

- `POST /api/orchestrator` — route a lead task to a specialist agent
- `POST /api/agents/research` — collect lead details and enrich CRM state
- `POST /api/agents/outbound` — send a personalized cold email
- `POST /api/agents/engagement` — record WhatsApp/social engagement
- `POST /api/agents/voice` — trigger a voice follow-up call
- `GET /api/testFlow` — view a sample lead payload
- `POST /api/testFlow` — execute a sample discovery-to-outbound workflow via the orchestrator

## Project layout

- `src/api/` — serverless routes for orchestration and agents
- `src/lib/` — shared utilities for config, Supabase, and agent management
- `supabase/schema.sql` — initial table schema for lead state and embeddings
