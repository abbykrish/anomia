import { Card as CardType } from '@/types';

interface CardProps {
  card: CardType;
  size?: 'small' | 'large';
  highlighted?: boolean;
}

function Card({ card, size = 'large', highlighted = false }: CardProps) {
  const className = `card card-${size} ${card.isWild ? 'card-wild' : ''} ${highlighted ? 'card-highlighted' : ''}`;

  return (
    <div className={className}>
      <div className="card-symbol">{card.symbol}</div>
      <div className="card-category">
        {card.isWild ? (
          <>
            <span className="wild-label">WILD!</span>
            <span className="wild-hint">Symbols now match</span>
          </>
        ) : (
          card.category
        )}
      </div>
    </div>
  );
}

export default Card;
