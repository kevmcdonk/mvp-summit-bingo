# Agents Guide: MVP Summit Bingo (Next.js + TypeScript + Cosmos DB)

This document defines the implementation blueprint for building the MVP Summit Bingo web app.

## Project Goal
Build a Next.js web app where authenticated users mark phrases on a personal 5x5 bingo card. Progress is stored in Cosmos DB, and milestone events display high-impact UI feedback:

- Any completed line: show a large flashing HOUSE banner.
- Full card completed: show a large flashing BINGO banner.

Each user gets a unique randomized card generated from a shared phrase pool.

## Required Tech Stack
- Framework: Next.js (App Router)
- Language: TypeScript
- Authentication: Microsoft login (Microsoft Entra ID)
- Database: Azure Cosmos DB (NoSQL API)
- UI: Responsive web UI for desktop and mobile
- Hosting target: Azure-friendly deployment

## Core Functional Requirements
1. Authentication
- Users sign in with their own Microsoft account.
- No anonymous gameplay.
- Sessions must persist securely.

2. Bingo Card
- Card is 5 rows x 5 columns.
- Each square displays one phrase.
- Card assignment is unique per user and random from phrase pool.
- User can toggle a square as heard/unheard.

3. Persistence
- Square state changes are stored in Cosmos DB immediately.
- User progress survives refresh, logout, and re-login.
- Data model supports multiple users concurrently.

4. Win Detection
- Detect completed lines (horizontal, vertical, diagonal).
- On first achieved line, display HOUSE banner with strong visual emphasis.
- Detect full-card completion.
- On full completion, display BINGO banner with stronger visual emphasis.

5. Admin Page
- Admin-only page.
- Shows each user and their current card status:
  - Marked square count
  - Line completion count
  - Full-card completion status
  - Last activity time
- Allow admin to configure the available bingo phrases which are held in the database.

## Suggested App Routes
- / : Sign-in landing or auto-redirect based on auth state.
- /play : Main bingo board for authenticated users.
- /admin : Admin dashboard (role-restricted).
- /api/* : Server endpoints for card state and admin summaries.

## Data Model (Cosmos DB)
Use separate containers or logical partitioning by user id.

### Phrase
- id: string
- text: string
- isActive: boolean
- category: string | null

### UserProfile
- id: string (user object id from Entra ID)
- email: string
- displayName: string
- roles: string[]
- createdAt: string (ISO)
- updatedAt: string (ISO)

### BingoCard
- id: string (card id)
- userId: string
- phrases: string[] (25 phrase ids in board order)
- generatedAt: string (ISO)

### BingoProgress
- id: string (progress id)
- userId: string
- cardId: string
- markedIndexes: number[] (0-24)
- linesCompleted: number
- hasHouse: boolean
- hasBingo: boolean
- updatedAt: string (ISO)

### ActivityEvent (optional, for admin analytics)
- id: string
- userId: string
- eventType: string (MARK, UNMARK, HOUSE, BINGO)
- metadata: object
- createdAt: string (ISO)

## Randomization Rules
- Build each card by sampling 25 unique phrases from active phrase pool.
- If phrase pool has fewer than 25 active entries, fail with clear setup error.
- Card generation must be deterministic per user once created (do not reshuffle on each login).

## Win Detection Rules
Given markedIndexes as a set of positions 0..24:
- Horizontal lines:
  - [0,1,2,3,4]
  - [5,6,7,8,9]
  - [10,11,12,13,14]
  - [15,16,17,18,19]
  - [20,21,22,23,24]
- Vertical lines:
  - [0,5,10,15,20]
  - [1,6,11,16,21]
  - [2,7,12,17,22]
  - [3,8,13,18,23]
  - [4,9,14,19,24]
- Diagonals:
  - [0,6,12,18,24]
  - [4,8,12,16,20]

Rules:
- hasHouse becomes true when at least one line is complete.
- hasBingo becomes true when all 25 positions are marked.
- HOUSE and BINGO banners should reappear for returning users if already achieved.

## Security and Authorization
- Use Microsoft identity claims to identify users.
- Admin access is restricted by role claim or allowlist from environment config.
- Never trust client-side admin flags.
- All writes must be validated server-side using authenticated user identity.

## API Contracts (Suggested)
- GET /api/card
  - Returns card + current progress for current user.
- POST /api/card/toggle
  - Body: { index: number, marked: boolean }
  - Returns updated progress including hasHouse/hasBingo.
- GET /api/admin/status
  - Admin only.
  - Returns list of users and progress summary.

## Environment Variables (Suggested)
- NEXTAUTH_URL
- NEXTAUTH_SECRET
- AZURE_AD_CLIENT_ID
- AZURE_AD_CLIENT_SECRET
- AZURE_AD_TENANT_ID
- COSMOS_ENDPOINT
- COSMOS_KEY
- COSMOS_DATABASE
- COSMOS_CONTAINER_PHRASES
- COSMOS_CONTAINER_USERS
- COSMOS_CONTAINER_CARDS
- COSMOS_CONTAINER_PROGRESS
- ADMIN_EMAIL_ALLOWLIST (comma-separated)

## UX Requirements
- Strong visual feedback for marking/unmarking a square.
- HOUSE: full-width, high-contrast flashing banner with animated text.
- BINGO: larger, celebratory, higher-priority flashing banner than HOUSE.
- Accessibility:
  - Keyboard operable card squares.
  - Focus-visible states.
  - ARIA labels on card cells and status banners.
- Mobile-first layout with responsive 5x5 grid.

## Testing Requirements
- Unit tests:
  - line detection logic
  - full card detection logic
  - card generation uniqueness
- Integration tests:
  - authenticated user can fetch and update card
  - progress persists to Cosmos DB
  - admin endpoint denies non-admin users
- Optional E2E:
  - login -> mark squares -> trigger HOUSE -> trigger BINGO

## Delivery Checklist
- Next.js app boots with TypeScript strict mode.
- Microsoft login works end-to-end.
- Cosmos DB collections/containers initialized.
- User receives unique card on first visit.
- Marking squares persists and reloads correctly.
- HOUSE and BINGO triggers are accurate.
- Admin dashboard displays all user statuses.
- Basic automated tests added and passing.
