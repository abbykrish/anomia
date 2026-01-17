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
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<Game | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  const updatePlayer = useCallback((playerId: string, updates: Partial<Player>) => {
    setPlayers(prev =>
      prev.map(p => (p.id === playerId ? { ...p, ...updates } : p))
    );
    if (player?.id === playerId) {
      setPlayer(prev => (prev ? { ...prev, ...updates } : null));
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
