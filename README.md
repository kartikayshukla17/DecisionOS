# DecisionOS

DecisionOS is a full-stack web application that serves as an AI-powered platform integrating workflows and background job processing. Built to capture and process formal decisions and action items, it leverages Retrieval-Augmented Generation (RAG) capabilities to provide an intelligent copilot for past decisions.

## Tech Stack

### Frontend (`web/`)
The frontend is built with modern, high-performance web technologies:
- **Framework**: Next.js 16 (React 19) with Server-Side Rendering (SSR)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4, `next-themes` (Dark/Light mode)
- **State Management & Data Fetching**: TanStack React Query
- **Database/Auth Client**: `@supabase/ssr` & `@supabase/supabase-js`
- **Icons**: Lucide React

### Backend (`api/`)
The backend provides robust APIs and handles heavy AI processing / scheduled tasks:
- **Framework**: NestJS 11
- **Language**: TypeScript
- **Authentication**: Passport.js (JWT-based)
- **Database & Queue**: Supabase (PostgreSQL) and `pg-boss` for background job processing directly within Postgres
- **AI Integrations**: Google GenAI (`gemini-embedding-001` / `text-embedding-004`) and Groq (`groq-sdk`) for RAG and inference
- **Validation**: Zod

### Database
- **Provider**: Supabase (PostgreSQL)
- **Features**: Uses `pgvector` for storing embeddings and performing vector similarity searches. Raw data is processed and structured into formal decisions and action items (commitments).

## Integrations
- **GitHub**: Fully integrated for ingesting repository events, backfilling data, parsing permissions, and tracking decisions.
- **Gmail / Google Calendar**: Database structure is prepared for future integrations.

## Setup and Development

1. **Install Dependencies**:
   Run `npm install` inside both `web/` and `api/` directories.
2. **Environment Variables**:
   Set up your `.env` (API) and `.env.local` (Web) files using the provided examples.
3. **Database**:
   Run the SQL scripts (`migration_001.sql`, `supabase_schema.sql`, etc.) in your Supabase SQL editor to initialize the schema, extensions (`vector`), and policies.
4. **Run Locally**:
   - For backend: `cd api && npm run start:dev`
   - For frontend: `cd web && npm run dev`
