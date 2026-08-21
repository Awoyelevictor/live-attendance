import { useState } from 'react';
import { X, Circle, RotateCcw, Trophy } from 'lucide-react';
import { motion } from 'motion/react';

export default function ChatTicTacToe({ message, currentUser, onUpdate }) {
  let gameState;
  try {
    gameState = JSON.parse(message.text);
  } catch (err) {
    return <div className="text-xs text-red-400">Failed to load game.</div>;
  }

  const {
    board,
    isXNext,
    playerX,
    playerXName,
    playerO,
    playerOName,
    winner,
    winningLine = [],
    scores = { playerX: 0, playerO: 0, ties: 0 },
    gameEnded
  } = gameState;

  const isCurrentPlayerX = currentUser?._id === playerX;
  const isCurrentPlayerO = currentUser?._id === playerO;
  
  const isMyTurn = (isXNext && isCurrentPlayerX) || (!isXNext && isCurrentPlayerO);
  const mySymbol = isCurrentPlayerX ? 'X' : isCurrentPlayerO ? 'O' : null;

  const winningCombinations = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  const checkWinner = (squares) => {
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

  const handleCellClick = (index) => {
    if (board[index] || winner || gameEnded || !isMyTurn) return;

    const newBoard = [...board];
    newBoard[index] = mySymbol;

    const winnerResult = checkWinner(newBoard);
    let newWinner = null;
    let newWinningLine = [];
    let newScores = { ...scores };
    let isEnded = false;

    if (winnerResult) {
      newWinner = winnerResult.winner;
      newWinningLine = winnerResult.line;
      isEnded = true;
      if (newWinner === 'X') {
        newScores.playerX += 1;
      } else {
        newScores.playerO += 1;
      }
    } else if (isBoardFull(newBoard)) {
      isEnded = true;
      newScores.ties += 1;
    }

    const updatedGameState = {
      ...gameState,
      board: newBoard,
      isXNext: !isXNext,
      winner: newWinner,
      winningLine: newWinningLine,
      scores: newScores,
      gameEnded: isEnded
    };

    onUpdate(message._id, updatedGameState);
  };

  const handlePlayAgain = () => {
    const updatedGameState = {
      ...gameState,
      board: Array(9).fill(null),
      isXNext: Math.random() > 0.5, // Randomize who goes first next
      winner: null,
      winningLine: [],
      gameEnded: false
    };

    onUpdate(message._id, updatedGameState);
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4 w-[280px] text-slate-100 shadow-xl overflow-hidden relative">
      {/* Dynamic top bar with role indicators */}
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2.5 text-center flex items-center justify-between">
        <span className={isCurrentPlayerX ? "text-indigo-400 font-black" : ""}>
          X: {playerXName?.split(' ')[0] || 'Player X'} {isCurrentPlayerX && '(You)'}
        </span>
        <span className="text-slate-700">|</span>
        <span className={isCurrentPlayerO ? "text-rose-400 font-black" : ""}>
          O: {playerOName?.split(' ')[0] || 'Player O'} {isCurrentPlayerO && '(You)'}
        </span>
      </div>

      {/* Mini Scoreboard */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-center mb-3">
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-500 font-bold uppercase">X Wins</span>
          <span className="text-xs font-black text-indigo-400">{scores.playerX}</span>
        </div>
        <div className="flex flex-col border-x border-slate-850">
          <span className="text-[8px] text-slate-500 font-bold uppercase">Ties</span>
          <span className="text-xs font-black text-slate-400">{scores.ties}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] text-slate-500 font-bold uppercase">O Wins</span>
          <span className="text-xs font-black text-rose-400">{scores.playerO}</span>
        </div>
      </div>

      {/* The 3x3 Grid */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2 rounded-xl border border-slate-850 shadow-inner aspect-square mb-3">
        {board.map((cell, index) => {
          const isWinningCell = winningLine.includes(index);
          const canClick = !cell && !winner && !gameEnded && isMyTurn;
          return (
            <button
              key={index}
              onClick={() => handleCellClick(index)}
              disabled={cell !== null || !!winner || gameEnded || !isMyTurn}
              className={`relative flex items-center justify-center rounded-lg font-bold transition-all h-[70px] ${
                isWinningCell
                  ? 'bg-indigo-600/30 border border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.15)]'
                  : cell
                    ? 'bg-slate-900 border border-slate-850/60'
                    : canClick
                      ? 'bg-slate-900/40 hover:bg-slate-900 border border-slate-850 hover:border-indigo-500/40 cursor-pointer active:scale-95'
                      : 'bg-slate-900/20 border border-slate-850/40 cursor-not-allowed opacity-70'
              }`}
            >
              {cell === 'X' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-indigo-400"
                >
                  <X size={26} strokeWidth={3} />
                </motion.div>
              )}
              {cell === 'O' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-rose-400"
                >
                  <Circle size={22} strokeWidth={3} />
                </motion.div>
              )}
            </button>
          );
        })}
      </div>

      {/* Turn & Status Footer */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-center">
          {winner ? (
            <span className={`text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-1 ${
              (winner === 'X' && isCurrentPlayerX) || (winner === 'O' && isCurrentPlayerO)
                ? 'text-emerald-400 animate-pulse'
                : 'text-rose-400'
            }`}>
              <Trophy size={11} />
              {winner === 'X'
                ? (isCurrentPlayerX ? 'You Won! 🎉' : `${playerXName?.split(' ')[0]} Won!`)
                : (isCurrentPlayerO ? 'You Won! 🎉' : `${playerOName?.split(' ')[0]} Won!`)}
            </span>
          ) : gameEnded ? (
            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">It's a draw!</span>
          ) : (
            <span className={`text-[9px] font-bold tracking-wider uppercase ${isMyTurn ? 'text-indigo-400' : 'text-slate-500'}`}>
              {isMyTurn 
                ? "⚡ Your Turn!" 
                : `Waiting for ${isXNext ? (playerXName?.split(' ')[0] || 'X') : (playerOName?.split(' ')[0] || 'O')}...`}
            </span>
          )}
        </div>

        {(winner || gameEnded) && (
          <button
            onClick={handlePlayAgain}
            className="w-full bg-slate-800 hover:bg-slate-750 text-slate-200 text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1 border border-slate-700/80 transition-all active:scale-95"
          >
            <RotateCcw size={11} />
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}
