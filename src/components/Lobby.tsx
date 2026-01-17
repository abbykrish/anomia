import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameContext } from '@/context/GameContext';
import { supabase } from '@/lib/supabase';
import { Player, Game } from '@/types';

function Lobby() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { game, player, players, setGame, setPlayers } = useGameContext();
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  // Fetch initial players and subscribe to changes
  useEffect(() => {
    if (!gameId) return;

    // Fetch initial players
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching players:', error);
        return;
      }

      setPlayers(data as Player[]);
    };

    fetchPlayers();

    // Subscribe to player changes
    const playersSubscription = supabase
      .channel(`players:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPlayers((prev) => [...prev, payload.new as Player]);
          } else if (payload.eventType === 'UPDATE') {
            setPlayers((prev) =>
              prev.map((p) => (p.id === payload.new.id ? (payload.new as Player) : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to game changes
    const gameSubscription = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const updatedGame = payload.new as Game;
          setGame(updatedGame);

          if (updatedGame.status === 'playing') {
            navigate(`/game/${gameId}`);
          }
        }
      )
      .subscribe();

    return () => {
      playersSubscription.unsubscribe();
      gameSubscription.unsubscribe();
    };
  }, [gameId, navigate, setGame, setPlayers]);

  const handleStartGame = async () => {
    if (!game || !player) return;

    setStarting(true);
    setError('');

    try {
      const response = await fetch('/api/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id, playerId: player.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start game');
      }

      // Navigation will happen via subscription
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game');
      setStarting(false);
    }
  };

  if (!game || !player) {
    return (
      <div className="lobby">
        <p>Loading...</p>
      </div>
    );
  }

  const isHost = player.is_host;
  const canStart = players.length >= 2;

  return (
    <div className="lobby">
      <div className="game-code">
        <p>Game Code</p>
        <h2>{game.code}</h2>
        <p className="hint">Share this code with friends</p>
      </div>

      <div className="players-list">
        <h3>Players ({players.length})</h3>
        <ul>
          {players.map((p) => (
            <li key={p.id} className={p.id === player.id ? 'current-player' : ''}>
              {p.name}
              {p.is_host && <span className="host-badge">Host</span>}
              {p.id === player.id && <span className="you-badge">You</span>}
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="error">{error}</p>}

      {isHost ? (
        <div className="host-controls">
          {!canStart && (
            <p className="hint">Need at least 2 players to start</p>
          )}
          <button
            className="btn btn-primary"
            onClick={handleStartGame}
            disabled={!canStart || starting}
          >
            {starting ? 'Starting...' : 'Start Game'}
          </button>
        </div>
      ) : (
        <p className="waiting">Waiting for host to start the game...</p>
      )}
    </div>
  );
}

export default Lobby;
