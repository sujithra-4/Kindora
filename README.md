# Kindora (MERN)

## Project Structure

- `backend/` - Node.js + Express + MongoDB + Socket.IO APIs
- `frontend/` - React + Vite client

## Quick Start

### 1) Backend

1. Copy `backend/.env.example` to `backend/.env` and update values.
2. Install dependencies:
   - `cd backend`
   - `npm install`
3. Start server:
   - `npm run dev`

### 2) Frontend

1. Copy `frontend/.env.example` to `frontend/.env`.
2. Install dependencies:
   - `cd frontend`
   - `npm install`
3. Start app:
   - `npm run dev`

## Core APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/donations`
- `GET /api/donations/nearby`
- `POST /api/donations/:id/accept`
- `PUT /api/donations/:id/status`
