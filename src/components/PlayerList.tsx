import { Player, getTopCard } from '@/types';
import Card from './Card';

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
  matchingPlayerId?: string;
}

function PlayerList({ players, currentPlayerId, matchingPlayerId }: PlayerListProps) {
  return (
    <div className="player-list">
      {players.map((player) => {
        const isCurrentPlayer = player.id === currentPlayerId;
        const isMatching = player.id === matchingPlayerId;
        const topCard = getTopCard(player);
        const stackSize = player.card_stack?.length || 0;

        return (
          <div
            key={player.id}
            className={`player-item ${isCurrentPlayer ? 'is-current' : ''} ${isMatching ? 'is-matching' : ''}`}
          >
            <div className="player-info">
              <span className="player-name">
                {player.name}
                {isCurrentPlayer && <span className="you-indicator">(You)</span>}
              </span>
              <span className="player-score">{player.score} pts</span>
            </div>
            <div className="player-card-area">
              {topCard ? (
                <>
                  <Card card={topCard} size="small" highlighted={isMatching} />
                  {stackSize > 1 && <span className="stack-indicator">+{stackSize - 1}</span>}
                </>
              ) : (
                <div className="no-card">No card</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PlayerList;
