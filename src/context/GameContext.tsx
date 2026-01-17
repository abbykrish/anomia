import { createContext, useContext, useState, ReactNode, useCallback, Dispatch, SetStateAction } from 'react';
import { Game, Player } from '@/types';

interface GameContextType {
  game: Game | null;
  player: Player | null;
  players: Player[];
  setGame: (game: Game | null) => void;
  setPlayer: (player: Player | null) => void;
  setPlayers: Dispatch<SetStateAction<Player[]>>;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  getStoredPlayerId: () => string | null;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Storage key for player ID
const PLAYER_ID_KEY = 'anomia_player_id';

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<Game | null>(null);
  const [player, setPlayerState] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  // Wrap setPlayer to also persist to localStorage
  const setPlayer = useCallback((newPlayer: Player | null) => {
    setPlayerState(newPlayer);
    if (newPlayer) {
      localStorage.setItem(PLAYER_ID_KEY, newPlayer.id);
    } else {
      localStorage.removeItem(PLAYER_ID_KEY);
    }
  }, []);

  // Get stored player ID from localStorage
  const getStoredPlayerId = useCallback(() => {
    return localStorage.getItem(PLAYER_ID_KEY);
  }, []);

  const updatePlayer = useCallback((playerId: string, updates: Partial<Player>) => {
    setPlayers(prev =>
      prev.map(p => (p.id === playerId ? { ...p, ...updates } : p))
    );
    if (player?.id === playerId) {
      setPlayerState(prev => (prev ? { ...prev, ...updates } : null));
    }
  }, [player?.id]);

  return (
    <GameContext.Provider
      value={{
        game,
        player,
        players,
        setGame,
        setPlayer,
        setPlayers,
        updatePlayer,
        getStoredPlayerId,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}
