import { useState } from 'react';

function App() {
  const [message] = useState('Welcome to Multiplayer Tic-Tac-Toe');

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>{message}</h1>
      <p>Game UI and Nakama integration will be implemented next.</p>
    </div>
  );
}

export default App;
