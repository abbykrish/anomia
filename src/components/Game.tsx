import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useGameContext } from '@/context/GameContext';
import { supabase } from '@/lib/supabase';
import { Player, Game as GameType, Symbol, getTopCard } from '@/types';
import Card from './Card';
import PlayerList from './PlayerList';

interface MatchState {
  opponentId: string;
  opponentName: string;
  symbol: Symbol;
}

interface WinClaim {
  claimerId: string;
  claimerName: string;
}

function Game() {
  const { gameId } = useParams<{ gameId: string }>();
  const { game, player, players, setGame, setPlayers, updatePlayer } = useGameContext();
  const [drawing, setDrawing] = useState(false);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [winClaim, setWinClaim] = useState<WinClaim | null>(null);
  const [error, setError] = useState('');

  // Fetch initial data if not available
  useEffect(() => {
    if (!gameId) return;

    const fetchGameData = async () => {
      if (!game) {
        const { data: gameData } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();
        if (gameData) setGame(gameData as GameType);
      }

      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });

      if (playersData) setPlayers(playersData as Player[]);
    };

    fetchGameData();
  }, [gameId, game, setGame, setPlayers]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!gameId) return;

    // Subscribe to player changes
    const playersChannel = supabase
      .channel(`game-players:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedPlayer = payload.new as Player;
            updatePlayer(updatedPlayer.id, updatedPlayer);

            // Check for new matches when another player's card changes
            const myTopCard = player ? getTopCard(player) : null;
            const theirTopCard = getTopCard(updatedPlayer);
            if (player && updatedPlayer.id !== player.id && theirTopCard && myTopCard) {
              if (theirTopCard.symbol === myTopCard.symbol) {
                setMatch({
                  opponentId: updatedPlayer.id,
                  opponentName: updatedPlayer.name,
                  symbol: theirTopCard.symbol,
                });
              }
            }
          }
        }
      )
      .subscribe();

    // Subscribe to broadcast events (win claims)
    const broadcastChannel = supabase
      .channel(`game-events:${gameId}`)
      .on('broadcast', { event: 'win_claim' }, (payload) => {
        const { claimerId, claimerName, opponentId } = payload.payload as {
          claimerId: string;
          claimerName: string;
          opponentId: string;
        };

        if (player && opponentId === player.id) {
          setWinClaim({ claimerId, claimerName });
        }
      })
      .on('broadcast', { event: 'win_confirmed' }, (payload) => {
        const { winnerId, loserId } = payload.payload as {
          winnerId: string;
          loserId: string;
        };

        // Clear match state for both players
        if (player && (winnerId === player.id || loserId === player.id)) {
          setMatch(null);
          setWinClaim(null);
        }
      })
      .subscribe();

    return () => {
      playersChannel.unsubscribe();
      broadcastChannel.unsubscribe();
    };
  }, [gameId, player, updatePlayer]);

  const handleDrawCard = useCallback(async () => {
    if (!game || !player || drawing) return;

    setDrawing(true);
    setError('');

    try {
      const response = await fetch('/api/draw-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id, playerId: player.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to draw card');
      }

      // Update local player state - add card to top of stack
      const currentStack = player.card_stack || [];
      updatePlayer(player.id, { card_stack: [data.card, ...currentStack] });

      // Check for match
      if (data.match) {
        setMatch(data.match);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to draw card');
    } finally {
      setDrawing(false);
    }
  }, [game, player, drawing, updatePlayer]);

  const handleClaimWin = useCallback(async () => {
    if (!game || !player || !match) return;

    // Broadcast win claim to opponent
    await supabase.channel(`game-events:${gameId}`).send({
      type: 'broadcast',
      event: 'win_claim',
      payload: {
        claimerId: player.id,
        claimerName: player.name,
        opponentId: match.opponentId,
      },
    });
  }, [game, player, match, gameId]);

  const handleConfirmWin = useCallback(async (confirmed: boolean) => {
    if (!game || !player || !winClaim) return;

    if (confirmed) {
      try {
        const response = await fetch('/api/claim-win', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: game.id,
            winnerId: winClaim.claimerId,
            loserId: player.id,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to confirm win');
        }

        // Broadcast win confirmed
        await supabase.channel(`game-events:${gameId}`).send({
          type: 'broadcast',
          event: 'win_confirmed',
          payload: {
            winnerId: winClaim.claimerId,
            loserId: player.id,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to confirm win');
      }
    }

    setWinClaim(null);
    setMatch(null);
  }, [game, player, winClaim, gameId]);

  if (!game || !player) {
    return <div className="game-loading">Loading...</div>;
  }

  const currentPlayerData = players.find((p) => p.id === player.id);
  const topCard = currentPlayerData ? getTopCard(currentPlayerData) : null;
  const hasCard = topCard !== null;

  return (
    <div className="game">
      <header className="game-header">
        <span className="game-code">Code: {game.code}</span>
        <span className="player-name">{player.name}</span>
      </header>

      <div className="game-content">
        {/* Your card section */}
        <section className="your-card-section">
          <h3>Your Card {currentPlayerData && currentPlayerData.card_stack.length > 1 && <span className="stack-count">({currentPlayerData.card_stack.length} cards)</span>}</h3>
          {topCard ? (
            <Card
              card={topCard}
              highlighted={match !== null}
            />
          ) : (
            <div className="no-card-placeholder">
              <p>No card yet</p>
              <button
                className="btn btn-primary btn-large"
                onClick={handleDrawCard}
                disabled={drawing}
              >
                {drawing ? 'Drawing...' : 'Draw Card'}
              </button>
            </div>
          )}

          {hasCard && !match && (
            <button
              className="btn btn-secondary"
              onClick={handleDrawCard}
              disabled={drawing}
            >
              {drawing ? 'Drawing...' : 'Draw New Card'}
            </button>
          )}
        </section>

        {/* Match alert */}
        {match && !winClaim && (
          <div className="match-alert">
            <h2>MATCH!</h2>
            <p>
              You and <strong>{match.opponentName}</strong> have matching symbols!
            </p>
            <p className="match-hint">
              Quick! Name something in their category!
            </p>
            <button className="btn btn-success btn-large" onClick={handleClaimWin}>
              I Won!
            </button>
          </div>
        )}

        {/* Win claim confirmation (for the opponent) */}
        {winClaim && (
          <div className="win-claim-modal">
            <h2>Win Claimed</h2>
            <p>
              <strong>{winClaim.claimerName}</strong> claims they won!
            </p>
            <p>Did they correctly name something in your category?</p>
            <div className="button-group">
              <button
                className="btn btn-success"
                onClick={() => handleConfirmWin(true)}
              >
                Yes, they won
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleConfirmWin(false)}
              >
                No, invalid
              </button>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && <p className="error">{error}</p>}

        {/* Other players */}
        <section className="other-players-section">
          <h3>All Players</h3>
          <PlayerList
            players={players}
            currentPlayerId={player.id}
            matchingPlayerId={match?.opponentId}
          />
        </section>
      </div>
    </div>
  );
}

export default Game;
