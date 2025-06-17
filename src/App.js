import React, { useState, useEffect } from 'react';

function App() {
  const [progress, setProgress] = useState(0);
  const [boundKeys, setBoundKeys] = useState(['f']); // Default keys
  const [promptKey, setPromptKey] = useState('');
  const chooseNextPromptKey = () => {
  if (boundKeys.length === 0) return;
  const randomIndex = Math.floor(Math.random() * boundKeys.length);
  setPromptKey(boundKeys[randomIndex]);
};

  // Game loop: bar fills over time
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 1, 100));
    }, 100); // increase every 100ms

    return () => clearInterval(interval);
  }, []);

useEffect(() => {
  const handleKeyDown = (e) => {
    const key = e.key.toLowerCase();

    if (key === promptKey) {
      setProgress(prev => Math.max(prev - 10, 0));
      chooseNextPromptKey(); // pick a new target after success
    } else if (boundKeys.includes(key)) {
      // Optional: add a penalty or do nothing
      setProgress(prev => Math.min(prev + 2, 100)); // mild penalty
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [boundKeys, promptKey]);

useEffect(() => {
  if (boundKeys.length > 0 && !promptKey) {
    chooseNextPromptKey();
  }
}, [boundKeys, promptKey]);

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>Keybind Trainer</h1>
<div style={{ marginBottom: '1rem' }}>
  <label>Press a key to add to keybinds: </label>
  <input
    type="text"
    maxLength={1}
    onKeyDown={(e) => {
      e.preventDefault();
      const key = e.key.toLowerCase();
      setBoundKeys(prev => prev.includes(key) ? prev : [...prev, key]);
    }}
    placeholder="Press a key"
    style={{ textAlign: 'center', width: '80px' }}
  />
  <p>Current keybinds: {boundKeys.map(k => <strong key={k}>{k.toUpperCase()} </strong>)}</p>
  <button onClick={() => setBoundKeys([])}>Clear Keybinds</button>
</div>
      <div style={{
        height: '30px',
        width: '60%',
        margin: '1rem auto',
        background: '#ddd',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: progress < 70 ? 'limegreen' : progress < 90 ? 'orange' : 'red',
          transition: 'width 0.1s linear'
        }}></div>
      </div>
      <p>Progress: {progress}%</p>
      {promptKey && (
  <div style={{ margin: '1rem', fontSize: '2rem' }}>
    Press: <strong>{promptKey.toUpperCase()}</strong>
  </div>
)}
    </div>
  );
}

export default App;
