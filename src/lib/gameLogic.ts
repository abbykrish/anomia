import { Card, Symbol, SYMBOLS, Player, getTopCard } from '@/types';

const WILD_CARD_RATIO = 0.1; // 10% wild cards

export function generateDeck(categories: string[]): Card[] {
  const deck: Card[] = [];
  const shuffledCategories = shuffleArray([...categories]);

  for (let i = 0; i < shuffledCategories.length; i++) {
    const category = shuffledCategories[i];
    if (!category) continue;

    const isWild = Math.random() < WILD_CARD_RATIO;
    const symbol = SYMBOLS[i % SYMBOLS.length] as Symbol;

    deck.push({
      category: isWild ? 'WILD' : category,
      symbol,
      isWild,
    });
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

export function checkForMatch(
  players: Player[],
  wildEquivalence: [Symbol, Symbol][]
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

      const symbol1 = card1.symbol;
      const symbol2 = card2.symbol;

      // Direct match
      if (symbol1 === symbol2) {
        return { player1: p1!, player2: p2!, symbol: symbol1 };
      }

      // Wild equivalence match
      for (const [wildSym1, wildSym2] of wildEquivalence) {
        if (
          (symbol1 === wildSym1 && symbol2 === wildSym2) ||
          (symbol1 === wildSym2 && symbol2 === wildSym1)
        ) {
          return { player1: p1!, player2: p2!, symbol: symbol1 };
        }
      }
    }
  }

  return null;
}

export function addWildEquivalence(
  currentEquivalence: [Symbol, Symbol][],
  newWildSymbol: Symbol
): [Symbol, Symbol][] {
  // When a wild card is drawn, pick a random other symbol to make equivalent
  const otherSymbols = SYMBOLS.filter(s => s !== newWildSymbol);
  const randomSymbol = otherSymbols[Math.floor(Math.random() * otherSymbols.length)] as Symbol;

  return [...currentEquivalence, [newWildSymbol, randomSymbol]];
}
