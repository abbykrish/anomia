import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
const SYMBOLS = ['◆', '★', '●', '■', '▲', '♥', '✦', '⬟'] as const;
type Symbol = typeof SYMBOLS[number];

interface Card {
  category: string;
  symbol: Symbol;
  isWild: boolean;
}

// Cached Supabase client (reused across requests in same instance)
let supabaseClient: SupabaseClient | null = null;

const getSupabase = () => {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing Supabase env vars');
    supabaseClient = createClient(url, key);
  }
  return supabaseClient;
};

// Utilities
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateDeck(categories: string[]): Card[] {
  const deck: Card[] = [];
  const shuffledCategories = shuffleArray([...categories]);
  const WILD_CARD_RATIO = 0.1;

  for (let i = 0; i < shuffledCategories.length; i++) {
    const category = shuffledCategories[i];
    if (!category) continue;

    const isWild = Math.random() < WILD_CARD_RATIO;
    const symbol = SYMBOLS[i % SYMBOLS.length]!;

    deck.push({
      category: isWild ? 'WILD' : category,
      symbol,
      isWild,
    });
  }

  return shuffleArray(deck);
}

// Route handlers
async function createGame(req: VercelRequest, res: VercelResponse) {
  const { hostName } = req.body;
  if (!hostName?.trim()) {
    return res.status(400).json({ error: 'Host name is required' });
  }

  const supabase = getSupabase();

  let code = generateGameCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await supabase
      .from('games')
      .select('id')
      .eq('code', code)
      .single();
    if (!existing) break;
    code = generateGameCode();
    attempts++;
  }

  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('text');

  if (catError || !categories?.length) {
    return res.status(500).json({ error: 'Failed to load categories' });
  }

  const deck = generateDeck(categories.map((c: { text: string }) => c.text));

  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({ code, status: 'waiting', deck, deck_index: 0, wild_equivalence: [] })
    .select()
    .single();

  if (gameError || !game) {
    return res.status(500).json({ error: 'Failed to create game' });
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ game_id: game.id, name: hostName.trim(), is_host: true, score: 0, card_stack: [] })
    .select()
    .single();

  if (playerError || !player) {
    await supabase.from('games').delete().eq('id', game.id);
    return res.status(500).json({ error: 'Failed to create player' });
  }

  await supabase.from('games').update({ host_id: player.id }).eq('id', game.id);

  return res.json({ game: { ...game, host_id: player.id }, player });
}

async function joinGame(req: VercelRequest, res: VercelResponse) {
  const { code, playerName } = req.body;

  if (!code?.trim() || code.trim().length !== 4) {
    return res.status(400).json({ error: 'Valid 4-letter game code is required' });
  }
  if (!playerName?.trim()) {
    return res.status(400).json({ error: 'Player name is required' });
  }

  const supabase = getSupabase();

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single();

  if (gameError || !game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  if (game.status !== 'waiting') {
    return res.status(400).json({ error: 'Game has already started' });
  }

  const { data: existingPlayer } = await supabase
    .from('players')
    .select('id')
    .eq('game_id', game.id)
    .eq('name', playerName.trim())
    .single();

  if (existingPlayer) {
    return res.status(400).json({ error: 'Player name already taken' });
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ game_id: game.id, name: playerName.trim(), is_host: false, score: 0, card_stack: [] })
    .select()
    .single();

  if (playerError || !player) {
    return res.status(500).json({ error: 'Failed to join game' });
  }

  return res.json({ game, player });
}

async function startGame(req: VercelRequest, res: VercelResponse) {
  const { gameId, playerId } = req.body;

  if (!gameId || !playerId) {
    return res.status(400).json({ error: 'Game ID and player ID required' });
  }

  const supabase = getSupabase();

  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();

  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.host_id !== playerId) return res.status(403).json({ error: 'Only host can start' });
  if (game.status !== 'waiting') return res.status(400).json({ error: 'Already started' });

  const { data: players } = await supabase.from('players').select('id').eq('game_id', gameId);
  if (!players || players.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 players' });
  }

  const { data: updatedGame } = await supabase
    .from('games')
    .update({ status: 'playing' })
    .eq('id', gameId)
    .select()
    .single();

  return res.json({ game: updatedGame });
}

// Helper to get top card from stack
function getTopCard(cardStack: Card[]): Card | null {
  return cardStack.length > 0 ? cardStack[0]! : null;
}

// Helper to find matches between players
function findMatch(
  players: any[],
  wildEquivalence: [Symbol, Symbol][],
  excludePlayerId?: string
): { player1: any; player2: any; symbol: Symbol } | null {
  const playersWithCards = players.filter(p => {
    const stack = p.card_stack as Card[] || [];
    return stack.length > 0 && (!excludePlayerId || p.id !== excludePlayerId);
  });

  for (let i = 0; i < playersWithCards.length; i++) {
    for (let j = i + 1; j < playersWithCards.length; j++) {
      const p1 = playersWithCards[i];
      const p2 = playersWithCards[j];
      const card1 = getTopCard(p1.card_stack as Card[]);
      const card2 = getTopCard(p2.card_stack as Card[]);

      if (!card1 || !card2) continue;

      // Direct match
      if (card1.symbol === card2.symbol) {
        return { player1: p1, player2: p2, symbol: card1.symbol };
      }

      // Wild equivalence match
      for (const [sym1, sym2] of wildEquivalence) {
        if (
          (card1.symbol === sym1 && card2.symbol === sym2) ||
          (card1.symbol === sym2 && card2.symbol === sym1)
        ) {
          return { player1: p1, player2: p2, symbol: card1.symbol };
        }
      }
    }
  }
  return null;
}

async function drawCard(req: VercelRequest, res: VercelResponse) {
  const { gameId, playerId } = req.body;

  if (!gameId || !playerId) {
    return res.status(400).json({ error: 'Game ID and player ID required' });
  }

  const supabase = getSupabase();

  // Fetch game and current player in parallel
  const [gameResult, playerResult] = await Promise.all([
    supabase.from('games').select('*').eq('id', gameId).single(),
    supabase.from('players').select('*').eq('id', playerId).single(),
  ]);

  const game = gameResult.data;
  const currentPlayer = playerResult.data;

  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (!currentPlayer) return res.status(404).json({ error: 'Player not found' });
  if (game.status !== 'playing') return res.status(400).json({ error: 'Game not in progress' });

  const deck = game.deck as Card[];
  if (game.deck_index >= deck.length) {
    return res.status(400).json({ error: 'No more cards' });
  }

  const card = deck[game.deck_index]!;
  let wildEquivalence = game.wild_equivalence as [Symbol, Symbol][];

  if (card.isWild) {
    const otherSymbols = SYMBOLS.filter((s) => s !== card.symbol);
    const randomSymbol = otherSymbols[Math.floor(Math.random() * otherSymbols.length)]!;
    wildEquivalence = [...wildEquivalence, [card.symbol, randomSymbol]];
  }

  // Push new card to TOP of stack (index 0)
  const currentStack = (currentPlayer.card_stack as Card[]) || [];
  const newStack = [card, ...currentStack];

  // Update player stack and game state in parallel
  await Promise.all([
    supabase.from('players').update({ card_stack: newStack }).eq('id', playerId),
    supabase.from('games').update({
      deck_index: game.deck_index + 1,
      wild_equivalence: wildEquivalence
    }).eq('id', gameId),
  ]);

  // Fetch all players to check for matches
  const { data: players } = await supabase.from('players').select('*').eq('game_id', gameId);

  let match: { opponentId: string; opponentName: string; symbol: Symbol } | undefined;

  if (players) {
    // Update the current player in the list with new stack
    const updatedPlayers = players.map(p =>
      p.id === playerId ? { ...p, card_stack: newStack } : p
    );

    for (const opponent of updatedPlayers.filter((p: any) => p.id !== playerId)) {
      const opponentCard = getTopCard(opponent.card_stack as Card[] || []);
      if (!opponentCard) continue;

      if (card.symbol === opponentCard.symbol) {
        match = { opponentId: opponent.id, opponentName: opponent.name, symbol: card.symbol };
        break;
      }

      for (const [sym1, sym2] of wildEquivalence) {
        if (
          (card.symbol === sym1 && opponentCard.symbol === sym2) ||
          (card.symbol === sym2 && opponentCard.symbol === sym1)
        ) {
          match = { opponentId: opponent.id, opponentName: opponent.name, symbol: card.symbol };
          break;
        }
      }
      if (match) break;
    }
  }

  return res.json({ card, match, wildEquivalence: card.isWild ? wildEquivalence : undefined });
}

async function claimWin(req: VercelRequest, res: VercelResponse) {
  const { gameId, winnerId, loserId } = req.body;

  if (!gameId || !winnerId || !loserId) {
    return res.status(400).json({ error: 'Game ID, winner ID, loser ID required' });
  }

  const supabase = getSupabase();

  // Fetch game and all players
  const [gameResult, playersResult] = await Promise.all([
    supabase.from('games').select('*').eq('id', gameId).single(),
    supabase.from('players').select('*').eq('game_id', gameId),
  ]);

  const game = gameResult.data;
  const players = playersResult.data;

  if (!game || !players) {
    return res.status(404).json({ error: 'Game or players not found' });
  }

  const winner = players.find((p: any) => p.id === winnerId);
  const loser = players.find((p: any) => p.id === loserId);

  if (!winner || !loser) {
    return res.status(404).json({ error: 'Players not found' });
  }

  // Pop top card from loser's stack (revealing card below)
  const loserStack = (loser.card_stack as Card[]) || [];
  const newLoserStack = loserStack.slice(1); // Remove top card

  // Update winner score and loser stack in parallel
  await Promise.all([
    supabase.from('players').update({ score: winner.score + 1 }).eq('id', winnerId),
    supabase.from('players').update({ card_stack: newLoserStack }).eq('id', loserId),
  ]);

  // Check for cascading match with loser's newly revealed card
  let cascadingMatch: { player1Id: string; player1Name: string; player2Id: string; player2Name: string; symbol: Symbol } | undefined;

  const revealedCard = getTopCard(newLoserStack);
  if (revealedCard) {
    const wildEquivalence = game.wild_equivalence as [Symbol, Symbol][];

    // Check against all other players (including winner)
    for (const opponent of players.filter(p => p.id !== loserId)) {
      const opponentStack = (opponent.card_stack as Card[]) || [];
      const opponentCard = getTopCard(opponentStack);
      if (!opponentCard) continue;

      let isMatch = revealedCard.symbol === opponentCard.symbol;

      if (!isMatch) {
        for (const [sym1, sym2] of wildEquivalence) {
          if (
            (revealedCard.symbol === sym1 && opponentCard.symbol === sym2) ||
            (revealedCard.symbol === sym2 && opponentCard.symbol === sym1)
          ) {
            isMatch = true;
            break;
          }
        }
      }

      if (isMatch) {
        cascadingMatch = {
          player1Id: loserId,
          player1Name: loser.name,
          player2Id: opponent.id,
          player2Name: opponent.name,
          symbol: revealedCard.symbol,
        };
        break;
      }
    }
  }

  return res.json({
    success: true,
    winnerId,
    loserId,
    newScore: winner.score + 1,
    loserNewTopCard: revealedCard,
    cascadingMatch,
  });
}

async function endGame(req: VercelRequest, res: VercelResponse) {
  const { gameId, playerId } = req.body;

  if (!gameId || !playerId) {
    return res.status(400).json({ error: 'Game ID and player ID required' });
  }

  const supabase = getSupabase();

  const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.host_id !== playerId) return res.status(403).json({ error: 'Only host can end game' });

  await supabase.from('games').update({ status: 'finished' }).eq('id', gameId);

  return res.json({ success: true });
}

// Cleanup old games (call periodically or via cron)
async function cleanupGames(req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabase();

  // Delete games older than 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('games')
    .delete()
    .lt('created_at', cutoff)
    .select('id');

  if (error) {
    return res.status(500).json({ error: 'Cleanup failed' });
  }

  return res.json({ deleted: data?.length || 0 });
}

// Main handler with routing
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url?.split('?')[0]?.replace('/api', '') || '';

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    switch (path) {
      case '/create-game':
        return createGame(req, res);
      case '/join-game':
        return joinGame(req, res);
      case '/start-game':
        return startGame(req, res);
      case '/draw-card':
        return drawCard(req, res);
      case '/claim-win':
        return claimWin(req, res);
      case '/end-game':
        return endGame(req, res);
      case '/cleanup':
        return cleanupGames(req, res);
      default:
        return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
