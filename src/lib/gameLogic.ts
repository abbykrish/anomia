import { Card, WildCard, Symbol, SYMBOLS, Player, getTopCard } from '@/types';

type DeckItem = Card | WildCard;
const WILD_CARD_RATIO = 0.1; // 10% wild cards

export function generateDeck(categories: string[]): DeckItem[] {
  const deck: DeckItem[] = [];
  const shuffledCategories = shuffleArray([...categories]);

  for (let i = 0; i < shuffledCategories.length; i++) {
    const category = shuffledCategories[i];
    if (!category) continue;

    const shouldBeWild = Math.random() < WILD_CARD_RATIO;

    if (shouldBeWild) {
      // Wild card: pick two different random symbols
      const shuffledSymbols = shuffleArray([...SYMBOLS]);
      deck.push({
        symbol1: shuffledSymbols[0] as Symbol,
        symbol2: shuffledSymbols[1] as Symbol,
      });
    } else {
      // Regular card with category and symbol
      const symbol = SYMBOLS[i % SYMBOLS.length] as Symbol;
      deck.push({
        category,
        symbol,
      });
    }
  }

  return shuffleArray(deck);
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as T, shuffled[i] as T];
  }
  return shuffled;
}

export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I and O to avoid confusion
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Check if two symbols match (either directly or via active wild card)
export function symbolsMatch(sym1: Symbol, sym2: Symbol, activeWild: WildCard | null): boolean {
  // Direct match
  if (sym1 === sym2) return true;

  // Wild equivalence match
  if (activeWild) {
    if (
      (sym1 === activeWild.symbol1 && sym2 === activeWild.symbol2) ||
      (sym1 === activeWild.symbol2 && sym2 === activeWild.symbol1)
    ) {
      return true;
    }
  }

  return false;
}

export function checkForMatch(
  players: Player[],
  activeWild: WildCard | null
): { player1: Player; player2: Player; symbol: Symbol } | null {
  // Get players with cards
  const playersWithCards = players.filter(p => getTopCard(p) !== null);

  for (let i = 0; i < playersWithCards.length; i++) {
    for (let j = i + 1; j < playersWithCards.length; j++) {
      const p1 = playersWithCards[i];
      const p2 = playersWithCards[j];

      const card1 = p1 ? getTopCard(p1) : null;
      const card2 = p2 ? getTopCard(p2) : null;

      if (!card1 || !card2) continue;

      if (symbolsMatch(card1.symbol, card2.symbol, activeWild)) {
        return { player1: p1!, player2: p2!, symbol: card1.symbol };
      }
    }
  }

  return null;
}
