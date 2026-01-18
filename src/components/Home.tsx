import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameContext } from '@/context/GameContext';

function Home() {
  const navigate = useNavigate();
  const { code: codeParam } = useParams<{ code?: string }>();
  const { setGame, setPlayer } = useGameContext();
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If we have a code param from /join/:code, auto-switch to join mode
  useEffect(() => {
    if (codeParam) {
      setMode('join');
      setCode(codeParam.toUpperCase());
    }
  }, [codeParam]);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/create-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostName: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create game');
      }

      setGame(data.game);
      setPlayer(data.player);
      navigate(`/lobby/${data.game.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!code.trim() || code.trim().length !== 4) {
      setError('Please enter a valid 4-letter code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/join-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase(), playerName: name.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join game');
      }

      setGame(data.game);
      setPlayer(data.player);
      navigate(`/lobby/${data.game.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'menu') {
    return (
      <div className="home">
        <h1 className="title">ANOMIA</h1>
        <p className="subtitle">The fast-paced word game</p>
        <div className="button-group">
          <button className="btn btn-primary" onClick={() => setMode('create')}>
            Create Game
          </button>
          <button className="btn btn-secondary" onClick={() => setMode('join')}>
            Join Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <button className="back-btn" onClick={() => { setMode('menu'); setError(''); }}>
        ← Back
      </button>
      <h1 className="title">{mode === 'create' ? 'Create Game' : 'Join Game'}</h1>

      <div className="form">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          maxLength={20}
        />

        {mode === 'join' && (
          <input
            type="text"
            placeholder="Game code (e.g., ABCD)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="input"
            maxLength={4}
          />
        )}

        {error && <p className="error">{error}</p>}

        <button
          className="btn btn-primary"
          onClick={mode === 'create' ? handleCreate : handleJoin}
          disabled={loading}
        >
          {loading ? 'Loading...' : mode === 'create' ? 'Create' : 'Join'}
        </button>
      </div>
    </div>
  );
}

export default Home;
