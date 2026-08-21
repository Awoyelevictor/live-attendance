import { useState, useEffect } from 'react';
import { Play, RotateCcw, Bot, User, Award, ShieldAlert, AlertCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const activeColors = ['w', 'b'];

const initialBoardState = [
  ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
  ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
  ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
];

const pieceSymbols = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟'
};

const pieceNames = {
  k: 'King', q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn'
};

export default function ChatChess({ message, currentUser, onUpdate }) {
  const gameState = JSON.parse(message.text);
  const {
    board = initialBoardState,
    turn = 'w',
    playerWhite = '',
    playerWhiteName = 'White',
    playerBlack = '',
    playerBlackName = 'Black',
    winner = null,
    isAi = false,
    gameEnded = false,
    history = []
  } = gameState;

  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');

  const isWhiteUser = currentUser?._id === playerWhite;
  const isBlackUser = currentUser?._id === playerBlack;
  const myTurn = (turn === 'w' && isWhiteUser) || (turn === 'b' && isBlackUser);

  // Auto AI move handling
  useEffect(() => {
    if (!gameEnded && isAi && turn === 'b') {
      const timer = setTimeout(() => {
        makeAiMove();
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [turn, isAi, gameEnded]);

  // General move generation
  const getMoves = (row, col, currentBoard = board) => {
    const piece = currentBoard[row][col];
    if (!piece) return [];
    const color = piece[0]; // 'w' or 'b'
    const type = piece[1]; // 'p', 'r', 'n', 'b', 'q', 'k'
    const moves = [];

    const isOpponent = (r, c) => {
      const p = currentBoard[r][c];
      return p && p[0] !== color;
    };

    const isEmpty = (r, c) => {
      return !currentBoard[r][c];
    };

    const isValidCoord = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

    if (type === 'p') {
      // Pawn movements
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;

      // Single forward
      if (isValidCoord(row + dir, col) && isEmpty(row + dir, col)) {
        moves.push([row + dir, col]);
        // Double forward
        if (row === startRow && isValidCoord(row + 2 * dir, col) && isEmpty(row + 2 * dir, col)) {
          moves.push([row + 2 * dir, col]);
        }
      }

      // Diagonals captures
      if (isValidCoord(row + dir, col - 1) && isOpponent(row + dir, col - 1)) {
        moves.push([row + dir, col - 1]);
      }
      if (isValidCoord(row + dir, col + 1) && isOpponent(row + dir, col + 1)) {
        moves.push([row + dir, col + 1]);
      }
    }

    if (type === 'r' || type === 'q') {
      // Rook vectors
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      dirs.forEach(([dr, dc]) => {
        let r = row + dr;
        let c = col + dc;
        while (isValidCoord(r, c)) {
          if (isEmpty(r, c)) {
            moves.push([r, c]);
          } else {
            if (isOpponent(r, c)) moves.push([r, c]);
            break;
          }
          r += dr;
          c += dc;
        }
      });
    }

    if (type === 'b' || type === 'q') {
      // Bishop vectors
      const dirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      dirs.forEach(([dr, dc]) => {
        let r = row + dr;
        let c = col + dc;
        while (isValidCoord(r, c)) {
          if (isEmpty(r, c)) {
            moves.push([r, c]);
          } else {
            if (isOpponent(r, c)) moves.push([r, c]);
            break;
          }
          r += dr;
          c += dc;
        }
      });
    }

    if (type === 'n') {
      // Knight jumps
      const jumps = [
        [2, 1], [2, -1], [-2, 1], [-2, -1],
        [1, 2], [1, -2], [-1, 2], [-1, -2]
      ];
      jumps.forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (isValidCoord(r, c) && (isEmpty(r, c) || isOpponent(r, c))) {
          moves.push([r, c]);
        }
      });
    }

    if (type === 'k') {
      // King steps
      const steps = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
      ];
      steps.forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (isValidCoord(r, c) && (isEmpty(r, c) || isOpponent(r, c))) {
          moves.push([r, c]);
        }
      });
    }

    return moves;
  };

  const handleSquareClick = (row, col) => {
    if (gameEnded) return;

    // Check if selecting valid own piece
    const piece = board[row][col];
    if (selectedSquare) {
      const [selRow, selCol] = selectedSquare;
      const isMoveValid = validMoves.some(([r, c]) => r === row && c === col);

      if (isMoveValid) {
        executeMove(selRow, selCol, row, col);
        return;
      }
    }

    // Attempt to select piece
    if (piece && piece[0] === turn) {
      if (isAi && turn === 'b') return; // Cannot play as black if opponent is AI
      if (!isWhiteUser && turn === 'w') return; // White moves white
      if (!isBlackUser && turn === 'b' && !isAi) return; // Black moves black (multiplayer)

      setSelectedSquare([row, col]);
      setValidMoves(getMoves(row, col));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const executeMove = (fromRow, fromCol, toRow, toCol) => {
    const piece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];
    const newBoard = board.map(row => [...row]);

    // Handle Pawn promotion automatically to Queen
    let movedPiece = piece;
    if (piece[1] === 'p' && (toRow === 0 || toRow === 7)) {
      movedPiece = piece[0] + 'q'; // Promoted to Queen
    }

    newBoard[toRow][toCol] = movedPiece;
    newBoard[fromRow][fromCol] = null;

    // Update history
    const moveNotation = `${pieceNames[piece[1]]} from ${String.fromCharCode(97 + fromCol)}${8 - fromRow} to ${String.fromCharCode(97 + toCol)}${8 - toRow}${targetPiece ? ' (Captured ' + pieceNames[targetPiece[1]] + ')' : ''}`;
    const newHistory = [...history, moveNotation].slice(-6); // Limit logs to last 6 for UI elegance

    // Toggle turn
    const nextTurn = turn === 'w' ? 'b' : 'w';

    // Verify if game ends (e.g. King captured)
    let gameWinner = null;
    let ended = false;
    let isKingCaptured = true;

    // Fast check if any king remains
    let whiteKing = false;
    let blackKing = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (newBoard[r][c] === 'wk') whiteKing = true;
        if (newBoard[r][c] === 'bk') blackKing = true;
      }
    }

    if (!whiteKing) {
      gameWinner = 'black';
      ended = true;
    } else if (!blackKing) {
      gameWinner = 'white';
      ended = true;
    }

    setSelectedSquare(null);
    setValidMoves([]);

    onUpdate(message._id, {
      ...gameState,
      board: newBoard,
      turn: nextTurn,
      winner: gameWinner,
      gameEnded: ended,
      history: newHistory
    });
  };

  const makeAiMove = () => {
    // Generate all valid black moves
    const allMoves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece[0] === 'b') {
          const moves = getMoves(r, c);
          moves.forEach(([tr, tc]) => {
            allMoves.push({ from: [r, c], to: [tr, tc], capture: !!board[tr][tc], piece });
          });
        }
      }
    }

    if (allMoves.length === 0) {
      // Checkmate or draw
      onUpdate(message._id, {
        ...gameState,
        winner: 'white',
        gameEnded: true,
        history: [...history, 'No moves left for AI. White wins!']
      });
      return;
    }

    // Smart prioritizer: capture first, otherwise choose standard random move
    const captures = allMoves.filter(m => m.capture);
    const chosenMove = captures.length > 0 
      ? captures[Math.floor(Math.random() * captures.length)] 
      : allMoves[Math.floor(Math.random() * allMoves.length)];

    executeMove(chosenMove.from[0], chosenMove.from[1], chosenMove.to[0], chosenMove.to[1]);
  };

  const handleToggleAi = () => {
    // Restart game in AI mode
    onUpdate(message._id, {
      ...gameState,
      board: initialBoardState,
      turn: 'w',
      isAi: !isAi,
      playerBlack: isAi ? '' : 'bot_chess_ai',
      playerBlackName: isAi ? 'Friend' : 'Chess AI Bot 🤖',
      winner: null,
      gameEnded: false,
      history: ['New match vs AI Bot initialized!']
    });
  };

  const handleResetGame = () => {
    onUpdate(message._id, {
      ...gameState,
      board: initialBoardState,
      turn: 'w',
      winner: null,
      gameEnded: false,
      history: ['Match reset. Ready to play!']
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 w-full max-w-[340px] sm:max-w-[420px] shadow-2xl space-y-4 text-slate-100 select-none">
      
      {/* Title & Game Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide">Grandmaster Chess</h4>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold">Live Secure Lobby</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleAi}
            className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
              isAi 
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                : 'bg-slate-800 text-slate-400 border-slate-700/60 hover:text-white'
            }`}
          >
            <Bot size={11} />
            {isAi ? 'AI Mode' : 'vs AI Bot'}
          </button>
          
          <button
            onClick={handleResetGame}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700/60 transition-all cursor-pointer"
            title="Reset Chess Match"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Players status */}
      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className={`p-2 rounded-xl border transition-all ${
          turn === 'w' && !gameEnded 
            ? 'bg-white/5 border-white/20 shadow-md ring-1 ring-white/10' 
            : 'bg-slate-950/20 border-slate-850/60 opacity-60'
        }`}>
          <div className="flex items-center justify-center gap-1.5 font-bold text-white">
            <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400 shrink-0" />
            <span className="truncate max-w-[100px]">{playerWhiteName}</span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-0.5">White Piece</span>
        </div>

        <div className={`p-2 rounded-xl border transition-all ${
          turn === 'b' && !gameEnded 
            ? 'bg-indigo-500/10 border-indigo-500/20 shadow-md ring-1 ring-indigo-500/10' 
            : 'bg-slate-950/20 border-slate-850/60 opacity-60'
        }`}>
          <div className="flex items-center justify-center gap-1.5 font-bold text-white">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-700 shrink-0" />
            <span className="truncate max-w-[100px]">{playerBlackName}</span>
          </div>
          <span className="text-[9px] text-slate-400 block mt-0.5">Black Piece</span>
        </div>
      </div>

      {/* Chess Board Grid */}
      <div className="aspect-square bg-slate-950 rounded-2xl border border-slate-800 p-1 shadow-inner relative">
        <div className="grid grid-cols-8 grid-rows-8 h-full w-full rounded-xl overflow-hidden">
          {board.map((row, rIdx) => 
            row.map((piece, cIdx) => {
              const isDark = (rIdx + cIdx) % 2 === 1;
              const isSelected = selectedSquare && selectedSquare[0] === rIdx && selectedSquare[1] === cIdx;
              const isValidTarget = validMoves.some(([r, c]) => r === rIdx && c === cIdx);

              return (
                <div
                  key={`${rIdx}-${cIdx}`}
                  onClick={() => handleSquareClick(rIdx, cIdx)}
                  className={`relative flex items-center justify-center transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-amber-500/40 z-10 scale-105 shadow-md' 
                      : isValidTarget 
                        ? (isDark ? 'bg-indigo-950/80' : 'bg-indigo-900/60')
                        : isDark 
                          ? 'bg-slate-800 hover:bg-slate-750' 
                          : 'bg-slate-300 hover:bg-slate-250'
                  }`}
                >
                  {/* Real Unicode Chess Piece */}
                  {piece && (
                    <span className={`text-2xl sm:text-3xl font-normal select-none transition-transform ${
                      piece[0] === 'w' 
                        ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)]' 
                        : 'text-slate-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]'
                    } ${myTurn && piece[0] === turn ? 'hover:scale-110 active:scale-95' : ''}`}>
                      {pieceSymbols[piece]}
                    </span>
                  )}

                  {/* Dot for valid targets */}
                  {isValidTarget && !piece && (
                    <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-indigo-400/70 shadow-sm animate-pulse" />
                  )}

                  {/* Border overlay for attacks */}
                  {isValidTarget && piece && (
                    <div className="absolute inset-0 border-2 border-red-500/60 rounded-sm" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Game End Overlay */}
        <AnimatePresence>
          {gameEnded && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center space-y-4 p-4 text-center z-20"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Award size={28} />
              </div>
              <div>
                <h4 className="text-base font-bold text-white uppercase tracking-wider">Checkmate Announced!</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Winner: <span className="font-extrabold text-amber-400 uppercase">{winner}</span>
                </p>
              </div>
              <button
                onClick={handleResetGame}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Play Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* History Log Panel */}
      <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-800/60 text-[10px] space-y-1.5">
        <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider border-b border-slate-850 pb-1">
          <span>Match Move Log</span>
          <span>
            {gameEnded ? 'Ended' : myTurn ? 'Your Turn ⚡' : 'Waiting...'}
          </span>
        </div>
        <div className="max-h-[64px] overflow-y-auto space-y-1 custom-scrollbar text-slate-400">
          {history.length === 0 ? (
            <div className="italic text-slate-500 text-center py-1">No moves recorded yet. Type or tap piece to start.</div>
          ) : (
            history.map((log, idx) => (
              <div key={idx} className="flex items-center gap-1.5 leading-normal">
                <span className="text-[9px] text-slate-600 font-mono">#{idx+1}</span>
                <span>{log}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
