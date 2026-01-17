export const SYMBOLS = ['◆', '★', '●', '■', '▲', '♥', '✦', '⬟'] as const;
export type Symbol = typeof SYMBOLS[number];

export interface Card {
  category: string;
  symbol: Symbol;
}

// Wild card shows two symbols that are now equivalent
export interface WildCard {
  symbol1: Symbol;
  symbol2: Symbol;
}

export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface Game {
  id: string;
  code: string;
  status: GameStatus;
  host_id: string;
  deck: (Card | WildCard)[];  // Deck contains regular cards and wild cards
  deck_index: number;
  active_wild: WildCard | null;  // Current active wild card (visible to all)
  created_at: string;
}

// Type guard to check if a deck item is a wild card
export function isWildCard(card: Card | WildCard): card is WildCard {
  return 'symbol1' in card && 'symbol2' in card;
}

export interface Player {
  id: string;
  game_id: string;
  name: string;
  card_stack: Card[];  // Stack of cards - top card (index 0) is visible
  score: number;
  is_host: boolean;
  created_at: string;
}

// Helper to get the visible (top) card
export function getTopCard(player: Player): Card | null {
  return player.card_stack.length > 0 ? player.card_stack[0]! : null;
}

export interface Category {
  id: string;
  text: string;
  created_at: string;
}

// Real-time broadcast event types
export interface MatchEvent {
  type: 'match';
  player1_id: string;
  player2_id: string;
  symbol: Symbol;
}

export interface WinClaimEvent {
  type: 'win_claim';
  claimer_id: string;
  opponent_id: string;
}

export interface WinConfirmEvent {
  type: 'win_confirm';
  winner_id: string;
  loser_id: string;
  confirmed: boolean;
}

export type GameEvent = MatchEvent | WinClaimEvent | WinConfirmEvent;

// API request/response types
export interface CreateGameRequest {
  hostName: string;
}

export interface CreateGameResponse {
  game: Game;
  player: Player;
}

export interface JoinGameRequest {
  code: string;
  playerName: string;
}

export interface JoinGameResponse {
  game: Game;
  player: Player;
}

export interface DrawCardResponse {
  card: Card;
  match?: {
    opponentId: string;
    opponentName: string;
    symbol: Symbol;
  };
}

export interface ClaimWinRequest {
  claimerId: string;
  opponentId: string;
  gameId: string;
}

// Database row types (as returned from Supabase)
export interface DbGame {
  id: string;
  code: string;
  status: GameStatus;
  host_id: string;
  deck: Card[];
  deck_index: number;
  wild_equivalence: [Symbol, Symbol][];
  created_at: string;
}

export interface DbPlayer {
  id: string;
  game_id: string;
  name: string;
  card_stack: Card[];
  score: number;
  is_host: boolean;
  created_at: string;
}

export interface DbCategory {
  id: string;
  text: string;
  created_at: string;
}
