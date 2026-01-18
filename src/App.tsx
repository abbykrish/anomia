import { Routes, Route } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';

function App() {
  return (
    <GameProvider>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join/:code" element={<Home />} />
          <Route path="/lobby/:gameId" element={<Lobby />} />
          <Route path="/game/:gameId" element={<Game />} />
        </Routes>
      </div>
    </GameProvider>
  );
}

export default App;
