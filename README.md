# ANOMIA - Mobile Multiplayer Word Game

A real-time multiplayer web app for playing ANOMIA on mobile phones. Players join via code, draw cards with categories and symbols, and race to name something in their opponent's category when symbols match.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **API**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime
- **Deployment**: Vercel

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Settings > API** and note down:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 2. Set Up Database

1. Go to **SQL Editor** in Supabase dashboard
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run in the SQL Editor
4. This creates the tables, policies, and seeds initial categories

### 3. Enable Realtime

1. Go to **Database > Replication** in Supabase
2. Ensure `games` and `players` tables have realtime enabled
3. The migration script should have done this, but verify it's active

### 4. Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill in your Supabase credentials in .env.local

# Start development server
npm run dev
```

### 5. Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Add environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

## Managing Categories

Categories are stored in the `categories` table in Supabase. You can easily add, edit, or remove them:

1. Go to your Supabase dashboard
2. Navigate to **Table Editor > categories**
3. Add/edit/delete rows directly in the UI

This allows you to customize the game without redeploying.

## Game Flow

1. **Host creates game** → Gets a 4-letter code
2. **Players join** with code + name
3. **Host starts game** (minimum 2 players)
4. Each player taps **"Draw"** to get a card (category + symbol)
5. When two players' symbols match → **Face-off!**
6. First to shout a valid answer wins
7. Winner taps **"I Won"** → Opponent confirms → Winner gets point
8. Loser must draw a new card (potentially triggering more matches!)

## Wild Cards

~10% of cards are **Wild Cards**. When drawn:
- Two random symbols become "equivalent" until the next wild card
- This means matches can occur between different symbols
- Adds unpredictability to the game!

## Project Structure

```
anomia/
├── api/                    # Vercel serverless functions
│   ├── _lib/              # Shared API utilities
│   ├── create-game.ts     # Create new game
│   ├── join-game.ts       # Join existing game
│   ├── start-game.ts      # Start the game (host only)
│   ├── draw-card.ts       # Draw a card
│   └── claim-win.ts       # Claim victory in a face-off
├── src/
│   ├── components/        # React components
│   │   ├── Home.tsx       # Create/join game screen
│   │   ├── Lobby.tsx      # Waiting room
│   │   ├── Game.tsx       # Main gameplay
│   │   ├── Card.tsx       # Card display
│   │   └── PlayerList.tsx # Player list with cards
│   ├── context/           # React context
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities
│   └── types/             # TypeScript types
├── supabase/
│   └── migrations/        # Database schema
└── vercel.json            # Vercel configuration
```

## License

MIT
