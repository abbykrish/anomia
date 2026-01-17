import { Card as CardType, WildCard as WildCardType } from '@/types';

interface CardProps {
  card: CardType;
  size?: 'small' | 'large';
  highlighted?: boolean;
}

function Card({ card, size = 'large', highlighted = false }: CardProps) {
  const className = `card card-${size} ${highlighted ? 'card-highlighted' : ''}`;

  return (
    <div className={className}>
      <div className="card-symbol">{card.symbol}</div>
      <div className="card-category">{card.category}</div>
    </div>
  );
}

// Separate component for displaying the active wild card
interface WildCardDisplayProps {
  wildCard: WildCardType;
}

export function WildCardDisplay({ wildCard }: WildCardDisplayProps) {
  return (
    <div className="card card-wild">
      <div className="wild-label">WILD!</div>
      <div className="wild-symbols">
        <span className="card-symbol">{wildCard.symbol1}</span>
        <span className="wild-equals">=</span>
        <span className="card-symbol">{wildCard.symbol2}</span>
      </div>
      <div className="wild-hint">These symbols now match!</div>
    </div>
  );
}

export default Card;
