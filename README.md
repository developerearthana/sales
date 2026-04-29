# Sales Automation Multi-Agent Orchestration

This project is a Vercel starter pack for a coordinated sales automation system using a multi-agent manager.

## Architecture Overview

This system is built as a backend-first, opinionated CRM layer with a multi-agent workflow that supports lead scouting, outreach, engagement, voice follow-up, and human review.

### Prompt-chain design

- **Lead Scout**: Turns natural-language requirements into a structured prospect profile.
- **Researcher**: Enriches CRM state and checks for existing contact data.
- **Closer**: Generates human-like outreach sequences and flags price/integration signals for review.
- **Orchestrator**: Routes tasks through the agent network while persisting funnel state.
- **Human Loop**: Allows manual review and pause/resume behavior for leads that require a seller to intervene.

## Stack

- Vercel Serverless Functions
- Node.js / TypeScript
- Supabase Postgres as shared CRM memory
- Prompt-chain agent persona architecture
- HubSpot, SendGrid, Twilio orchestration with human-in-the-loop notifications

## Getting started

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set environment variables
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `HUBSPOT_API_KEY`
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_WHATSAPP_FROM`
   - `TWILIO_VOICE_FROM`
   - `APOLLO_API_KEY` (optional)
   - `FIRECRAWL_API_KEY` (optional)
   - `INSTANTLY_API_KEY` (optional)
   - `RETELL_API_KEY` (optional)
   - `WATI_API_KEY` (optional)
   - `SMARTLEAD_API_KEY` (optional)
3. Run locally: `npm run dev`

If Vercel prompts for login, run:

```bash
npx vercel login
```

Open `http://localhost:3000/` to view the API landing page.

## Human-in-the-Loop Mobile CRM

This project now supports human review signals that can be surfaced in a mobile or dashboard experience:

- Price/integration signals pause automation automatically
- Review reasons and assignment metadata are stored on the lead record
- A notifications endpoint exposes pending review items for live dashboards
- Human actions can resolve review state and resume automation

## Lead funnel states

The CRM now tracks lead funnel state in Supabase, including:

- `scouting`
- `new`
- `outreach_sent`
- `engaged`
- `call_scheduled`
- `copy_generated`
- `human_review`

## Manager endpoints

- `POST /api/orchestrator` — route a lead task to a specialist agent
- `POST /api/agents/leadScout` — parse a natural-language lead brief into a structured prospect profile
- `POST /api/agents/research` — collect lead details and enrich CRM state
- `POST /api/agents/outbound` — send a personalized cold email
- `POST /api/agents/engagement` — record a WhatsApp/social engagement event
- `POST /api/agents/voice` — trigger a voice follow-up call
- `POST /api/agents/closer` — generate high-conversion email variations and flag human review when needed
- `GET /api/leads` — fetch lead records for dashboard/UIs
- `GET /api/notifications` — fetch workflow notifications and human-review items
- `POST /api/humanLoop` — resolve human review actions and resume automation
- `GET /api/testFlow` — view a sample lead payload and recommended agent flows

## Project layout

- `src/api/` — serverless routes for orchestration, lead workflows, and notifications
- `src/lib/` — shared utilities for config, state, prompt parsing, and agent actions
- `supabase/schema.sql` — CRM schema for lead state, review metadata, notifications, and embeddings

## Recommended 2026 stack

| Layer | Recommended Technology |
| :--- | :--- |
| **Frontend** | Next.js 15 + Tailwind + Lucide Icons |
| **Orchestration** | LangGraph-style prompt chains for cyclical agent flows |
| **Database** | Supabase (PostgreSQL + realtime subscriptions) |
| **Voice/Phone** | Retell AI + Twilio |
| **Messaging** | Wati / Twilio for WhatsApp management |

## Next step

For a world-class cross-platform product, build a React/Next.js dashboard that consumes `/api/leads`, `/api/notifications`, and `/api/humanLoop` while also supporting a mobile-first review experience.

