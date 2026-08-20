import { useState, useEffect } from 'react';
import { X, Circle, RotateCcw, HelpCircle, Trophy, User, Cpu, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Soft synthesizer sounds using Web Audio API for a polished, retro feel!
const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'win') {
      osc.type = 'triangle';
      // Arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        g.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.1);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.2);
        o.start(ctx.currentTime + idx * 0.1);
        o.stop(ctx.currentTime + idx * 0.1 + 0.25);
      });
    } else if (type === 'lose') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(293.66, ctx.currentTime); // D4
      osc.frequency.linearRampToValueAtTime(146.83, ctx.currentTime + 0.4); // D3
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else if (type === 'tie') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(349.23, ctx.currentTime); // F4
      osc.frequency.setValueAtTime(349.23, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (err) {
    console.warn("Web Audio API not supported or user gesture needed", err);
  }
};

export default function TicTacToe({ onClose }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [gameMode, setGameMode] = useState('ai_hard'); // 'ai_easy', 'ai_hard', 'local'
  const [scores, setScores] = useState({ playerX: 0, playerO: 0, ties: 0 });
  const [winningLine, setWinningLine] = useState([]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  const calculateWinner = (squares) => {
    for (let i = 0; i < winningCombinations.length; i++) {
      const [a, b, c] = winningCombinations[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: winningCombinations[i] };
      }
    }
    return null;
  };

  const isBoardFull = (squares) => {
    return squares.every(square => square !== null);
  };

  const winnerData = calculateWinner(board);
  const winner = winnerData?.winner;
  const gameEnded = winner || isBoardFull(board);

  // Auto handle scores and effects on end
  useEffect(() => {
    if (winner) {
      setWinningLine(winnerData.line);
      if (winner === 'X') {
        setScores(prev => ({ ...prev, playerX: prev.playerX + 1 }));
        playSound('win');
      } else {
        setScores(prev => ({ ...prev, playerO: prev.playerO + 1 }));
        playSound('lose');
      }
    } else if (isBoardFull(board)) {
      setScores(prev => ({ ...prev, ties: prev.ties + 1 }));
      playSound('tie');
    }
  }, [winner, board]);

  // AI moves
  useEffect(() => {
    if (gameEnded || isXNext || gameMode === 'local' || isAiThinking) return;

    setIsAiThinking(true);
    
    // Simulate thinking delay for immersion
    const delay = setTimeout(() => {
      let bestMove = -1;

      if (gameMode === 'ai_easy') {
        // Random available square
        const empties = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
        bestMove = empties[Math.floor(Math.random() * empties.length)];
      } else if (gameMode === 'ai_hard') {
        // Hard AI minimax-like or smart heuristics (Win > Block > Center > Corners > Sides)
        // 1. Can AI Win?
        bestMove = findStrategicMove('O', board);
        // 2. Can AI Block player?
        if (bestMove === -1) {
          bestMove = findStrategicMove('X', board);
        }
        // 3. Take center
        if (bestMove === -1 && board[4] === null) {
          bestMove = 4;
        }
        // 4. Take corners
        if (bestMove === -1) {
          const corners = [0, 2, 6, 8].filter(idx => board[idx] === null);
          if (corners.length > 0) {
            bestMove = corners[Math.floor(Math.random() * corners.length)];
          }
        }
        // 5. Take sides
        if (bestMove === -1) {
          const sides = [1, 3, 5, 7].filter(idx => board[idx] === null);
          if (sides.length > 0) {
            bestMove = sides[Math.floor(Math.random() * sides.length)];
          }
        }
      }

      if (bestMove !== -1) {
        playSound('tap');
        const newBoard = [...board];
        newBoard[bestMove] = 'O';
        setBoard(newBoard);
        setIsXNext(true);
      }
      setIsAiThinking(false);
    }, 600);

    return () => clearTimeout(delay);
  }, [isXNext, board, gameMode, gameEnded, isAiThinking]);

  // Find a winning/blocking move
  const findStrategicMove = (player, squares) => {
    for (let i = 0; i < winningCombinations.length; i++) {
      const [a, b, c] = winningCombinations[i];
      const vals = [squares[a], squares[b], squares[c]];
      const playerCount = vals.filter(v => v === player).length;
      const nullCount = vals.filter(v => v === null).length;
      
      if (playerCount === 2 && nullCount === 1) {
        if (squares[a] === null) return a;
        if (squares[b] === null) return b;
        if (squares[c] === null) return c;
      }
    }
    return -1;
  };

  const handleCellClick = (index) => {
    if (board[index] || gameEnded || isAiThinking || (!isXNext && gameMode !== 'local')) return;

    playSound('tap');
    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinningLine([]);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col relative">
        
        {/* Glowing header accent */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-violet-500 via-indigo-500 to-pink-500 animate-pulse" />

        {/* Top Info Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="text-indigo-400 animate-spin" size={16} />
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Secret Easter Egg Unlocked</span>
          </div>
          <button 
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-300 font-bold px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-all border border-slate-800"
          >
            Exit Game
          </button>
        </div>

        {/* Game Title & Mode Selector */}
        <div className="p-5 pb-0 flex flex-col items-center">
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2 mb-4 tracking-tight">
            Tic-Tac-Toe <span className="text-indigo-400">Classic</span>
          </h2>

          <div className="flex items-center bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/80 w-full">
            <button
              onClick={() => { setGameMode('ai_hard'); resetGame(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all uppercase ${
                gameMode === 'ai_hard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu size={12} />
              AI Hard
            </button>
            <button
              onClick={() => { setGameMode('ai_easy'); resetGame(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all uppercase ${
                gameMode === 'ai_easy' ? 'bg-indigo-600/80 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HelpCircle size={12} />
              AI Easy
            </button>
            <button
              onClick={() => { setGameMode('local'); resetGame(); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all uppercase ${
                gameMode === 'local' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <User size={12} />
              Local
            </button>
          </div>
        </div>

        {/* Score Board */}
        <div className="p-5 grid grid-cols-3 gap-3">
          <div className="bg-slate-950/40 border border-slate-800/80 p-2.5 rounded-2xl flex flex-col items-center">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Player (X)</span>
            <span className="text-sm font-black text-indigo-400 mt-1">{scores.playerX}</span>
          </div>
          <div className="bg-slate-950/40 border border-slate-800/80 p-2.5 rounded-2xl flex flex-col items-center">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Ties</span>
            <span className="text-sm font-black text-slate-400 mt-1">{scores.ties}</span>
          </div>
          <div className="bg-slate-950/40 border border-slate-800/80 p-2.5 rounded-2xl flex flex-col items-center">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              {gameMode === 'local' ? 'Player (O)' : 'AI (O)'}
            </span>
            <span className="text-sm font-black text-rose-400 mt-1">{scores.playerO}</span>
          </div>
        </div>

        {/* Interactive Grid */}
        <div className="px-5 pb-5 flex justify-center">
          <div className="grid grid-cols-3 gap-2.5 bg-slate-950 p-2.5 rounded-2xl border border-slate-850 shadow-inner w-full aspect-square">
            {board.map((cell, index) => {
              const isWinningCell = winningLine.includes(index);
              return (
                <button
                  key={index}
                  onClick={() => handleCellClick(index)}
                  disabled={cell !== null || gameEnded || isAiThinking}
                  className={`relative flex items-center justify-center rounded-xl font-bold transition-all ${
                    isWinningCell
                      ? 'bg-indigo-600/30 border border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : cell
                        ? 'bg-slate-900 border border-slate-800/60'
                        : 'bg-slate-900/40 hover:bg-slate-900 border border-slate-850 hover:border-slate-800/80 cursor-pointer active:scale-95'
                  }`}
                >
                  <AnimatePresence mode="popLayout">
                    {cell === 'X' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="text-indigo-400"
                      >
                        <X size={34} strokeWidth={2.5} />
                      </motion.div>
                    )}
                    {cell === 'O' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotate: 45 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="text-rose-400"
                      >
                        <Circle size={30} strokeWidth={2.5} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action controls */}
        <div className="p-5 bg-slate-950/40 border-t border-slate-850/80 flex flex-col gap-3">
          {/* Status Display */}
          <div className="text-center">
            {isAiThinking ? (
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase animate-pulse">AI is thinking...</span>
            ) : winner ? (
              <span className={`text-xs font-black tracking-widest uppercase flex items-center justify-center gap-1.5 ${
                winner === 'X' ? 'text-indigo-400' : 'text-rose-400'
              }`}>
                <Trophy size={14} className="animate-bounce" />
                {winner === 'X' ? 'Player X wins!' : 'Opponent O wins!'}
              </span>
            ) : isBoardFull(board) ? (
              <span className="text-xs font-black text-slate-400 tracking-widest uppercase">It's a draw!</span>
            ) : (
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                Turn: {isXNext ? 'Player X' : (gameMode === 'local' ? 'Player O' : 'AI (O)')}
              </span>
            )}
          </div>

          <button
            onClick={resetGame}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-750 hover:border-slate-650 transition-all active:scale-95 shadow-md"
          >
            <RotateCcw size={14} />
            Reset Match
          </button>
        </div>

      </div>
    </div>
  );
}
