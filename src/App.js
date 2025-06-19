import React, { useState, useEffect } from 'react';

function App() {
  // Configurations: [{ name: string, keys: [string] }]
  const [configs, setConfigs] = useState(() => {
    const saved = localStorage.getItem('keybindConfigs');
    return saved ? JSON.parse(saved) : [{ name: 'Default', keys: ['f'] }];
  });
  const [selectedConfigIdx, setSelectedConfigIdx] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalKeys, setModalKeys] = useState([]);

  // Game state
  const boundKeys = configs[selectedConfigIdx]?.keys || [];
  const [progress, setProgress] = useState(0);
  const [promptKey, setPromptKey] = useState('');

  // High score state
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('keybindHighScore');
    return saved ? Number(saved) : 0;
  });

  // Session state
  const SESSION_LENGTH = 180; // 3 minutes in seconds
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(SESSION_LENGTH);
  const [intervalId, setIntervalId] = useState(null);

  // Difficulty state
  const difficulties = Array.from({ length: 10 }, (_, i) => ({
    label: `Difficulty ${i + 1}`,
    speed: 1 + (i + 1) * 0.1, // 1.1, 1.2, ... 2.0
    multiplier: 1 + (i + 1) * 0.1
  }));
  const [difficultyIdx, setDifficultyIdx] = useState(0);
  const currentDifficulty = difficulties[difficultyIdx];

  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('keybindSoundEnabled');
    return saved === null ? true : saved === 'true';
  });
  const successAudio = React.useRef(null);
  const failAudio = React.useRef(null);

  // Session details state
  const [sessionDetails, setSessionDetails] = useState([]);
  const [showSessionDetails, setShowSessionDetails] = useState(false);

  // Sorting state for session details
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  // Save configs to localStorage
  useEffect(() => {
    localStorage.setItem('keybindConfigs', JSON.stringify(configs));
  }, [configs]);

  // Update high score in localStorage
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('keybindHighScore', score);
    }
  }, [score, highScore]);

  // Sync sound preference with localStorage
  useEffect(() => {
    localStorage.setItem('keybindSoundEnabled', soundEnabled);
  }, [soundEnabled]);

  // Choose next prompt key, never repeat the same key twice in a row
  const chooseNextPromptKey = () => {
    if (boundKeys.length === 0) return;
    let nextKey;
    if (boundKeys.length === 1) {
      nextKey = boundKeys[0];
    } else {
      do {
        const randomIndex = Math.floor(Math.random() * boundKeys.length);
        nextKey = boundKeys[randomIndex];
      } while (nextKey === promptKey);
    }
    setPromptKey(nextKey);
  };

  // Start session
  const startSession = () => {
    setScore(0);
    setProgress(0);
    setSessionTime(SESSION_LENGTH);
    setSessionActive(true);
    setSessionDetails([]);
  };

  // Stop session
  const stopSession = () => {
    setSessionActive(false);
    setSessionTime(SESSION_LENGTH);
    setProgress(0);
  };

  // Session timer and progress
  useEffect(() => {
    if (!sessionActive) return;
    if (intervalId) clearInterval(intervalId);
    const id = setInterval(() => {
      setSessionTime(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    setIntervalId(id);
    return () => clearInterval(id);
  }, [sessionActive]);

  // End session if time runs out or bar fills up
  useEffect(() => {
    if (!sessionActive) return;
    if (sessionTime === 0 || progress >= 100) {
      setSessionActive(false);
      if (intervalId) clearInterval(intervalId);
    }
  }, [sessionTime, progress, sessionActive]);

  // Progress bar fill only during session, with difficulty speed
  useEffect(() => {
    if (!sessionActive) return;
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + currentDifficulty.speed, 100));
    }, 100);
    return () => clearInterval(interval);
  }, [sessionActive, currentDifficulty]);

  // Flash color state for prompt key
  const [flashColor, setFlashColor] = useState('');

  // Only allow key presses and progress if session is active
  useEffect(() => {
    if (!sessionActive) return;
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      setSessionDetails(prev => [
        ...prev,
        { prompt: promptKey, pressed: key, correct: key === promptKey }
      ]);
      if (key === promptKey) {
        setProgress(prev => Math.max(prev - 10, 0));
        setScore(prev => prev + Math.round(10 * currentDifficulty.multiplier));
        setFlashColor('green');
        if (soundEnabled && successAudio.current) {
          successAudio.current.currentTime = 0;
          successAudio.current.play();
        }
        setTimeout(() => {
          setFlashColor('');
          chooseNextPromptKey();
        }, 150);
      } else {
        setProgress(prev => boundKeys.includes(key) ? Math.min(prev + 2, 100) : prev);
        setFlashColor('red');
        if (soundEnabled && failAudio.current) {
          failAudio.current.currentTime = 0;
          failAudio.current.play();
        }
        setTimeout(() => {
          setFlashColor('');
          chooseNextPromptKey();
        }, 150);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boundKeys, promptKey, sessionActive, currentDifficulty, soundEnabled]);

  useEffect(() => {
    if (boundKeys.length > 0 && !promptKey) {
      chooseNextPromptKey();
    }
  }, [boundKeys, promptKey]);

  // When selectedConfigIdx changes, pick a new promptKey from the new config
  useEffect(() => {
    if (configs[selectedConfigIdx]?.keys?.length > 0) {
      const keys = configs[selectedConfigIdx].keys;
      const randomIndex = Math.floor(Math.random() * keys.length);
      setPromptKey(keys[randomIndex]);
    } else {
      setPromptKey('');
    }
    // Reset progress if you want, or leave as is
  }, [selectedConfigIdx, configs]);

  // Modal handlers
  const openModal = () => {
    setModalName(configs[selectedConfigIdx]?.name || '');
    setModalKeys([...boundKeys]);
    setModalOpen(true);
    setShowDeleteConfirm(false);
  };
  const closeModal = () => setModalOpen(false);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleModalKeyAdd = (e) => {
    e.preventDefault();
    const key = e.key.toLowerCase();
    if (!modalKeys.includes(key) && /^[a-z0-9]$/.test(key) && modalKeys.length < 100) {
      setModalKeys(prev => [...prev, key]);
    }
  };
  const handleModalKeyRemove = (key) => {
    setModalKeys(prev => prev.filter(k => k !== key));
  };

  const handleModalSave = () => {
    const trimmedName = modalName.trim().slice(0, 200) || 'Unnamed';
    const newConfig = { name: trimmedName, keys: modalKeys.slice(0, 100) };
    setConfigs(prev => {
      const updated = [...prev];
      updated[selectedConfigIdx] = newConfig;
      return updated;
    });
    setModalOpen(false);
  };

  const handleNewConfig = () => {
    setConfigs(prev => [...prev, { name: 'New Config', keys: [] }]);
    setSelectedConfigIdx(configs.length);
    setModalName('New Config');
    setModalKeys([]);
    setModalOpen(true);
    setShowDeleteConfirm(false);
  };

  const handleDeleteConfig = () => {
    if (configs.length === 1) return; // Don't allow deleting last config
    setConfigs(prev => {
      const updated = prev.filter((_, idx) => idx !== selectedConfigIdx);
      return updated;
    });
    setSelectedConfigIdx(0);
    setModalOpen(false);
    setShowDeleteConfirm(false);
  };

  // Clear high score and current score
  const clearHighScore = () => {
    setHighScore(0);
    setScore(0);
    localStorage.setItem('keybindHighScore', 0);
  };

  // Sorted session details
  const sortedSessionDetails = React.useMemo(() => {
    if (!sortColumn) return sessionDetails;
    const sorted = [...sessionDetails].sort((a, b) => {
      if (a[sortColumn] < b[sortColumn]) return sortDirection === 'asc' ? -1 : 1;
      if (a[sortColumn] > b[sortColumn]) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [sessionDetails, sortColumn, sortDirection]);

  const handleSort = (col) => {
    if (sortColumn === col) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
        <h1 className="text-3xl font-bold text-center text-white mb-6 drop-shadow">Keybind Trainer</h1>
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <label className="text-white font-medium">Config:</label>
              <select
                className="rounded px-2 py-1 bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={selectedConfigIdx}
                onChange={e => setSelectedConfigIdx(Number(e.target.value))}
              >
                {configs.map((cfg, idx) => (
                  <option key={idx} value={idx}>{cfg.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={openModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded shadow transition">Edit Config</button>
              <button onClick={handleNewConfig} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1 rounded shadow transition">New Config</button>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <label className="text-white font-medium">Difficulty:</label>
            <select
              className="rounded px-2 py-1 bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={difficultyIdx}
              onChange={e => setDifficultyIdx(Number(e.target.value))}
              disabled={sessionActive}
            >
              {difficulties.map((d, i) => (
                <option key={i} value={i}>{d.label}</option>
              ))}
            </select>
            <span className="text-xs text-slate-300 ml-2">Each difficulty adds 10% speed but gives 10% more points.</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-slate-300">Current keybinds:</span>
            {boundKeys.map(k => (
              <span key={k} className="bg-slate-700 text-white px-2 py-1 rounded font-mono text-lg shadow">{k.toUpperCase()}</span>
            ))}
          </div>
        </div>
        {/* Sound toggle - moved to top right of card for visibility */}
        <div className="flex justify-end mb-2">
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={e => setSoundEnabled(e.target.checked)}
              className="accent-blue-500 w-4 h-4"
            />
            <span className="text-sm">Sound</span>
          </label>
        </div>
        <div className="mb-6">
          <div className="flex gap-4 mb-2">
            <button onClick={startSession} disabled={sessionActive} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded shadow transition">Start Session</button>
            <button onClick={stopSession} disabled={!sessionActive} className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded shadow transition">Stop Session</button>
            <div className="ml-auto text-slate-200 font-mono text-lg flex items-center">
              <span className="mr-1">⏱</span>
              {String(Math.floor(sessionTime / 60)).padStart(2, '0')}:{String(sessionTime % 60).padStart(2, '0')}
            </div>
          </div>
          <div className="w-full h-6 bg-slate-700 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-100 ${progress < 70 ? 'bg-green-400' : progress < 90 ? 'bg-yellow-400' : 'bg-red-500'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 mb-4">
          <button
            className="self-end mb-2 px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs shadow transition"
            onClick={() => setShowSessionDetails(true)}
            disabled={sessionDetails.length === 0}
          >
            Session Details
          </button>
          <p className="text-slate-200 text-lg">Score: <span className="font-bold text-white">{score}</span> &nbsp; | &nbsp; High Score: <span className="font-bold text-yellow-300">{highScore}</span>
            <button onClick={clearHighScore} className="ml-4 px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs shadow transition">Clear High Score</button>
          </p>
          {!sessionActive && <p className="text-red-400 font-semibold">Session stopped or ended.</p>}
        </div>
        {promptKey && sessionActive && (
          <div className="flex flex-col items-center my-6">
            <span className="text-slate-300 text-lg mb-2">Press:</span>
            <span className={`text-6xl font-extrabold px-8 py-4 rounded-xl border-4 shadow-xl bg-slate-900 drop-shadow-lg ${
              flashColor === 'green' ? 'border-green-500 bg-green-100 text-green-700 animate-pulse' :
              flashColor === 'red' ? 'border-red-500 bg-red-100 text-red-700 animate-pulse' :
              'border-blue-500 text-blue-400'
            }`}>
              {promptKey.toUpperCase()}
            </span>
          </div>
        )}
      </div>
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 min-w-[320px] max-w-[90vw] relative border border-slate-200">
            <h2 className="text-2xl font-bold mb-4 text-slate-800">Edit Config</h2>
            <label className="block mb-2 text-slate-700 font-medium">
              Config Name:
              <input
                type="text"
                value={modalName}
                maxLength={200}
                onChange={e => setModalName(e.target.value.slice(0, 200))}
                className="ml-2 px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
              />
              <span className="ml-2 text-xs text-slate-400">{modalName.length}/200</span>
            </label>
            <div className="mb-2">
              <label className="text-slate-700 font-medium">Add Key:</label>
              <input
                type="text"
                maxLength={1}
                onKeyDown={handleModalKeyAdd}
                placeholder="Press a key"
                className="ml-2 px-2 py-1 rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 w-20 text-center"
                disabled={modalKeys.length >= 100}
              />
              <span className="ml-2 text-xs text-slate-400">{modalKeys.length}/100</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {modalKeys.map(k => (
                <span key={k} className="bg-slate-200 text-slate-800 px-2 py-1 rounded font-mono text-lg shadow flex items-center">
                  {k.toUpperCase()}
                  <button
                    onClick={() => handleModalKeyRemove(k)}
                    className="ml-1 text-red-500 hover:text-red-700 font-bold text-lg"
                    title="Remove"
                  >×</button>
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <div>
                <button onClick={handleModalSave} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded shadow mr-2">Save</button>
                <button onClick={closeModal} className="bg-slate-400 hover:bg-slate-500 text-white px-4 py-1 rounded shadow">Cancel</button>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded shadow ml-4"
                disabled={configs.length === 1}
              >Delete</button>
            </div>
            {showDeleteConfirm && (
              <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-xl">
                <p className="font-bold text-slate-800 mb-4">Are you sure you want to delete this config?</p>
                <div>
                  <button onClick={handleDeleteConfig} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded shadow mr-2">Yes, Delete</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="bg-slate-400 hover:bg-slate-500 text-white px-4 py-1 rounded shadow">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Session Details Modal */}
      {showSessionDetails && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 min-w-[320px] max-w-[90vw] relative border border-slate-200 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-slate-800">Session Details</h2>
            <table className="w-full text-left mb-4">
              <thead>
                <tr>
                  <th className="py-1 px-2 border-b border-slate-300 cursor-pointer select-none" onClick={() => handleSort('prompt')}>
                    Prompt {sortColumn === 'prompt' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-1 px-2 border-b border-slate-300 cursor-pointer select-none" onClick={() => handleSort('pressed')}>
                    Pressed {sortColumn === 'pressed' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-1 px-2 border-b border-slate-300 cursor-pointer select-none" onClick={() => handleSort('correct')}>
                    Result {sortColumn === 'correct' && (sortDirection === 'asc' ? '▲' : '▼')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSessionDetails.map((entry, idx) => (
                  <tr key={idx} className={entry.correct ? 'bg-green-50' : 'bg-red-50'}>
                    <td className="py-1 px-2 font-mono">{entry.prompt.toUpperCase()}</td>
                    <td className="py-1 px-2 font-mono">{entry.pressed.toUpperCase()}</td>
                    <td className="py-1 px-2">{entry.correct ? <span className="text-green-600 font-bold">Correct</span> : <span className="text-red-600 font-bold">Wrong</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setShowSessionDetails(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded shadow">Close</button>
          </div>
        </div>
      )}
      {/* Audio element for success sound */}
      <audio ref={successAudio} src="/success.wav" preload="auto" />
      {/* Audio element for fail sound */}
      <audio ref={failAudio} src="/fail.mp3" preload="auto" />
    </div>
  );
}

export default App;
