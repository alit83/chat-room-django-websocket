# Chat Room

A WhatsApp/Telegram-inspired chat web UI built with React, TypeScript, Vite, and Tailwind CSS. Frontend-only demo with mock conversations.

## Features

- Two-panel layout: chat list sidebar + active conversation
- Black & red theme with glass-style panels
- Custom animated cursor (desktop, respects `prefers-reduced-motion`)
- Message bubble animations, hover effects, typing indicator on input focus
- Search chats by name or last message
- Send messages (Enter to send, Shift+Enter for newline)
- Responsive mobile layout with slide transitions

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4
- Mock data in `src/data/mockChats.ts`
