import { useState, useEffect } from 'react';
import { Play, RotateCcw, Trophy, UserPlus, Bot, Shield, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import api from '../lib/api';

// Coords of the 52 track cells in clockwise order starting from (6, 0)
const TRACK_COORDS = [
  { r: 6, c: 0 }, { r: 6, c: 1 }, { r: 6, c: 2 }, { r: 6, c: 3 }, { r: 6, c: 4 }, { r: 6, c: 5 },
  { r: 5, c: 6 }, { r: 4, c: 6 }, { r: 3, c: 6 }, { r: 2, c: 6 }, { r: 1, c: 6 }, { r: 0, c: 6 },
  { r: 0, c: 7 },
  { r: 0, c: 8 }, { r: 1, c: 8 }, { r: 2, c: 8 }, { r: 3, c: 8 }, { r: 4, c: 8 }, { r: 5, c: 8 },
  { r: 6, c: 9 }, { r: 6, c: 10 }, { r: 6, c: 11 }, { r: 6, c: 12 }, { r: 6, c: 13 }, { r: 6, c: 14 },
  { r: 7, c: 14 },
  { r: 8, c: 14 }, { r: 8, c: 13 }, { r: 8, c: 12 }, { r: 8, c: 11 }, { r: 8, c: 10 }, { r: 8, c: 9 },
  { r: 9, c: 8 }, { r: 10, c: 8 }, { r: 11, c: 8 }, { r: 12, c: 8 }, { r: 13, c: 8 }, { r: 14, c: 8 },
  { r: 14, c: 7 },
  { r: 14, c: 6 }, { r: 14, c: 5 }, { r: 14, c: 4 }, { r: 14, c: 3 }, { r: 14, c: 2 }, { r: 14, c: 1 },
  { r: 13, c: 6 }, { r: 12, c: 6 }, { r: 11, c: 6 }, { r: 10, c: 6 }, { r: 9, c: 6 },
  { r: 8, c: 5 }, { r: 8, c: 4 }, { r: 8, c: 3 }, { r: 8, c: 2 }, { r: 8, c: 1 }, { r: 8, c: 0 },
  { r: 7, c: 0 }
];

// Safe track indexes
const SAFE_INDEXES = [1, 9, 14, 22, 27, 35, 40, 48];

export function getTokenCoords(color, position, tokenIndex = 0) {
  if (position < 0) {
    // Standard home positions inside colored yards
    if (color === 'red') {
      const positions = [{ r: 2, c: 2 }, { r: 2, c: 3 }, { r: 3, c: 2 }, { r: 3, c: 3 }];
      return positions[tokenIndex];
    }
    if (color === 'green') {
      const positions = [{ r: 2, c: 11 }, { r: 2, c: 12 }, { r: 3, c: 11 }, { r: 3, c: 12 }];
      return positions[tokenIndex];
    }
    if (color === 'yellow') {
      const positions = [{ r: 11, c: 11 }, { r: 11, c: 12 }, { r: 12, c: 11 }, { r: 12, c: 12 }];
      return positions[tokenIndex];
    }
    if (color === 'blue') {
      const positions = [{ r: 11, c: 2 }, { r: 11, c: 3 }, { r: 12, c: 2 }, { r: 12, c: 3 }];
      return positions[tokenIndex];
    }
  }

  if (position === 56) {
    // Home Center
    if (color === 'red') return { r: 7, c: 6 };
    if (color === 'green') return { r: 6, c: 7 };
    if (color === 'yellow') return { r: 7, c: 8 };
    if (color === 'blue') return { r: 8, c: 7 };
  }

  if (position >= 51 && position <= 55) {
    // Colored finishing paths
    const step = position - 51;
    if (color === 'red') return { r: 7, c: 1 + step };
    if (color === 'green') return { r: 1 + step, c: 7 };
    if (color === 'yellow') return { r: 7, c: 13 - step };
    if (color === 'blue') return { r: 13 - step, c: 7 };
  }

  // Main track starting offsets
  let startOffset = 0;
  if (color === 'red') startOffset = 1;
  if (color === 'green') startOffset = 14;
  if (color === 'yellow') startOffset = 27;
  if (color === 'blue') startOffset = 40;

  const trackIndex = (startOffset + position) % 52;
  return TRACK_COORDS[trackIndex];
}

export default function ChatLudo({ message, currentUser, onUpdate }) {
  const [isRolling, setIsRolling] = useState(false);
  const [partners, setPartners] = useState([]);
  const [invitedUserIds, setInvitedUserIds] = useState(new Set());
  const [showInviteList, setShowInviteList] = useState(false);

  let gameState;
  try {
    gameState = JSON.parse(message.text);
  } catch (err) {
    return <div className="text-xs text-red-400">Failed to load Ludo game.</div>;
  }

  const {
    status = 'lobby',
    players = [],
    tokens = { red: [-1,-1,-1,-1], green: [-1,-1,-1,-1], yellow: [-1,-1,-1,-1], blue: [-1,-1,-1,-1] },
    currentTurn = 'red',
    currentRoll = null,
    hasRolled = false,
    consecutiveSixes = 0,
    winner = null,
    gameEnded = false
  } = gameState;

  const getNextTurnColor = (color, currentPlayers = players) => {
    const currentIndex = activeColors.indexOf(color);
    for (let i = 1; i <= 4; i++) {
      const candidateColor = activeColors[(currentIndex + i) % 4];
      if (currentPlayers.some(p => p.color === candidateColor)) {
        return candidateColor;
      }
    }
    return color; // Fallback
  };

  useEffect(() => {
    if (status === 'lobby' && currentUser?._id === gameState.hostId) {
      api.get('/messages/users')
        .then(res => {
          // Filter out users already in the match
          const joinedIds = players.map(p => p.id);
          const candidates = res.data.filter(u => !joinedIds.includes(u._id));
          setPartners(candidates);
        })
        .catch(err => console.warn('Failed to fetch invitation candidates:', err));
    }
  }, [status, players, gameState.hostId, currentUser?._id]);

  const activeColors = ['red', 'green', 'yellow', 'blue'];
  const colorLabels = { red: 'Red', green: 'Green', yellow: 'Yellow', blue: 'Blue' };
  const colorBgs = {
    red: 'bg-red-600',
    green: 'bg-emerald-600',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-600'
  };

  const myPlayer = players.find(p => p.id === currentUser?._id);
  const myColor = myPlayer?.color;
  const isMyTurn = myColor === currentTurn;

  // Find if current turn player is an AI bot
  const currentTurnPlayer = players.find(p => p.color === currentTurn);
  const isCurrentTurnAi = currentTurnPlayer?.isAi;

  // Sound generator
  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'roll') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } else if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.13);
      } else if (type === 'capture') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.26);
      }
    } catch (e) {}
  };

  // Check if a move is legal
  const getLegalMoves = (color, roll) => {
    if (!roll) return [];
    const colorTokens = tokens[color] || [];
    return colorTokens.map((pos, idx) => {
      if (pos === -1 && roll !== 6) return null; // Needs a 6 to enter
      if (pos + roll > 56) return null; // Exact move only to enter Home Center
      return idx;
    }).filter(v => v !== null);
  };

  // Auto AI Play triggers
  useEffect(() => {
    if (status !== 'playing' || gameEnded || !isCurrentTurnAi) return;

    const aiDelay = setTimeout(() => {
      if (!hasRolled) {
        // AI rolls!
        handleRollDie(true);
      } else {
        // AI moves!
        const legalIndices = getLegalMoves(currentTurn, currentRoll);
        if (legalIndices.length === 0) {
          // No legal moves, pass turn
          passTurn(currentTurn, currentRoll, tokens);
        } else {
          // Select move with heuristics
          let selectedTokenIdx = legalIndices[0];

          // Priority 1: Bring token out of home on a 6
          const homeToken = legalIndices.find(idx => tokens[currentTurn][idx] === -1);
          if (currentRoll === 6 && homeToken !== undefined) {
            selectedTokenIdx = homeToken;
          } else {
            // Priority 2: Select capture moves
            const captureMove = legalIndices.find(idx => {
              const nextPos = tokens[currentTurn][idx] + currentRoll;
              const nextCoord = getTokenCoords(currentTurn, nextPos);
              return hasOpponentAt(nextCoord, currentTurn);
            });
            if (captureMove !== undefined) {
              selectedTokenIdx = captureMove;
            } else {
              // Priority 3: Move furthest advanced token
              let maxPos = -2;
              legalIndices.forEach(idx => {
                if (tokens[currentTurn][idx] > maxPos) {
                  maxPos = tokens[currentTurn][idx];
                  selectedTokenIdx = idx;
                }
              });
            }
          }

          // Execute AI move
          setTimeout(() => {
            moveToken(currentTurn, selectedTokenIdx, currentRoll);
          }, 600);
        }
      }
    }, 1000);

    return () => clearTimeout(aiDelay);
  }, [status, currentTurn, hasRolled, currentRoll, isCurrentTurnAi, gameEnded]);

  const hasOpponentAt = (coord, myColor) => {
    for (const color of activeColors) {
      if (color === myColor) continue;
      const opponentPositions = tokens[color] || [];
      for (const pos of opponentPositions) {
        if (pos >= 0 && pos < 51) {
          const opponentCoord = getTokenCoords(color, pos);
          if (opponentCoord.r === coord.r && opponentCoord.c === coord.c) {
            // Ensure not a safe zone
            const isSafe = isSafeTrackCell(opponentCoord);
            if (!isSafe) return true;
          }
        }
      }
    }
    return false;
  };

  const isSafeTrackCell = (coord) => {
    const trackIndex = TRACK_COORDS.findIndex(c => c.r === coord.r && c.c === coord.c);
    return trackIndex !== -1 && SAFE_INDEXES.includes(trackIndex);
  };

  const handleJoinLobby = () => {
    if (players.length >= 4) return;
    const existingColors = players.map(p => p.color);
    const availableColor = activeColors.find(c => !existingColors.includes(c));
    
    const updatedPlayers = [
      ...players,
      { id: currentUser._id, name: currentUser.name, color: availableColor, isAi: false }
    ];

    onUpdate(message._id, {
      ...gameState,
      players: updatedPlayers
    });
  };

  const handleAddBot = () => {
    if (players.length >= 4) return;
    const existingColors = players.map(p => p.color);
    const availableColor = activeColors.find(c => !existingColors.includes(c));

    const updatedPlayers = [
      ...players,
      { id: `bot_${availableColor}_${Date.now()}`, name: `${colorLabels[availableColor]} Bot 🤖`, color: availableColor, isAi: true }
    ];

    onUpdate(message._id, {
      ...gameState,
      players: updatedPlayers
    });
  };

  const handleRemoveBot = (botId) => {
    const updatedPlayers = players.filter(p => p.id !== botId);
    onUpdate(message._id, {
      ...gameState,
      players: updatedPlayers
    });
  };

  const handleStartGame = (autoFillBots = false) => {
    let updatedPlayers = [...players];
    if (autoFillBots) {
      const existingColors = updatedPlayers.map(p => p.color);
      activeColors.forEach(c => {
        if (!existingColors.includes(c)) {
          updatedPlayers.push({
            id: `bot_${c}_${Date.now()}`,
            name: `${colorLabels[c]} Bot 🤖`,
            color: c,
            isAi: true
          });
        }
      });
    }

    const startingPlayer = updatedPlayers.find(p => p.color === 'red') || updatedPlayers[0];
    const startColor = startingPlayer ? startingPlayer.color : 'red';

    onUpdate(message._id, {
      ...gameState,
      status: 'playing',
      players: updatedPlayers,
      currentTurn: startColor,
      hasRolled: false,
      currentRoll: null
    });
  };

  const handleRollDie = (aiOverride = false) => {
    if (isRolling || hasRolled || gameEnded) return;
    if (!aiOverride && !isMyTurn) return;

    playSound('roll');
    setIsRolling(true);

    setTimeout(() => {
      const rollValue = Math.floor(Math.random() * 6) + 1;
      setIsRolling(false);

      const nextState = {
        ...gameState,
        currentRoll: rollValue,
        hasRolled: true
      };

      // Check if there are any valid moves for this player
      const legalMoves = getLegalMoves(currentTurn, rollValue);
      if (legalMoves.length === 0) {
        // No legal moves, pass turn immediately
        passTurn(currentTurn, rollValue, tokens, nextState);
      } else {
        onUpdate(message._id, nextState);
      }
    }, 500);
  };

  const passTurn = (color, roll, currentTokens, stateObj = gameState) => {
    const nextColor = getNextTurnColor(color, stateObj.players || players);

    onUpdate(message._id, {
      ...stateObj,
      currentTurn: nextColor,
      currentRoll: null,
      hasRolled: false,
      consecutiveSixes: 0
    });
  };

  const moveToken = (color, tokenIdx, roll) => {
    const currentPos = tokens[color][tokenIdx];
    let nextPos = currentPos;

    if (currentPos === -1 && roll === 6) {
      nextPos = 0; // Starts at track position 0
    } else if (currentPos >= 0) {
      nextPos = currentPos + roll;
    }

    playSound('move');

    // Make copy of tokens
    const newTokens = JSON.parse(JSON.stringify(tokens));
    newTokens[color][tokenIdx] = nextPos;

    // Check for captures on land coordinate
    const landCoord = getTokenCoords(color, nextPos);
    let capturedAny = false;

    if (nextPos >= 0 && nextPos < 51) {
      const isSafe = isSafeTrackCell(landCoord);
      if (!isSafe) {
        // Check standard opponents
        activeColors.forEach(opponentColor => {
          if (opponentColor === color) return;
          const opponentPositions = newTokens[opponentColor] || [];
          opponentPositions.forEach((oPos, oIdx) => {
            if (oPos >= 0 && oPos < 51) {
              const oCoord = getTokenCoords(opponentColor, oPos);
              if (oCoord.r === landCoord.r && oCoord.c === landCoord.c) {
                // CAPTURED!
                newTokens[opponentColor][oIdx] = -1;
                capturedAny = true;
              }
            }
          });
        });
      }
    }

    if (capturedAny) {
      playSound('capture');
    }

    // Check Win Condition
    const hasWon = newTokens[color].every(pos => pos === 56);
    if (hasWon) {
      onUpdate(message._id, {
        ...gameState,
        tokens: newTokens,
        winner: color,
        gameEnded: true,
        currentRoll: null,
        hasRolled: false
      });
      return;
    }

    // Rolling a 6 grants an extra turn
    const isConsecutiveSix = roll === 6;
    const nextConsecutive = isConsecutiveSix ? consecutiveSixes + 1 : 0;

    if (nextConsecutive === 3) {
      // 3 consecutive sixes ends turn automatically
      const nextColor = getNextTurnColor(color);
      onUpdate(message._id, {
        ...gameState,
        tokens: newTokens,
        currentTurn: nextColor,
        currentRoll: null,
        hasRolled: false,
        consecutiveSixes: 0
      });
    } else if (isConsecutiveSix) {
      // Keep turn, roll again
      onUpdate(message._id, {
        ...gameState,
        tokens: newTokens,
        currentRoll: null,
        hasRolled: false,
        consecutiveSixes: nextConsecutive
      });
    } else {
      // Standard pass turn
      const nextColor = getNextTurnColor(color);
      onUpdate(message._id, {
        ...gameState,
        tokens: newTokens,
        currentTurn: nextColor,
        currentRoll: null,
        hasRolled: false,
        consecutiveSixes: 0
      });
    }
  };

  const handlePlayAgain = () => {
    onUpdate(message._id, {
      ...gameState,
      status: 'playing',
      tokens: {
        red: [-1, -1, -1, -1],
        green: [-1, -1, -1, -1],
        yellow: [-1, -1, -1, -1],
        blue: [-1, -1, -1, -1]
      },
      currentTurn: 'red',
      currentRoll: null,
      hasRolled: false,
      consecutiveSixes: 0,
      winner: null,
      gameEnded: false
    });
  };

  // Group tokens by their absolute coordinate to prevent visual stacking overlap
  const getGroupedTokens = () => {
    const list = [];
    activeColors.forEach(color => {
      const positions = tokens[color] || [];
      positions.forEach((pos, idx) => {
        const coords = getTokenCoords(color, pos, idx);
        list.push({ color, pos, idx, key: `${color}_${idx}`, coords });
      });
    });

    const groups = {};
    list.forEach(item => {
      const gKey = `${item.coords.r}_${item.coords.c}`;
      if (!groups[gKey]) groups[gKey] = [];
      groups[gKey].push(item);
    });
    return groups;
  };

  const groupedTokens = getGroupedTokens();

  // Draw cells helper
  const renderLudoGrid = () => {
    const cells = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const cellTokens = groupedTokens[`${r}_${c}`] || [];

        // Check cell colors and borders
        let cellBg = 'bg-slate-950/20 border border-slate-800/40';
        let safeStar = false;

        // Red Home Yard (0-5, 0-5)
        if (r < 6 && c < 6) {
          cellBg = 'bg-red-500/10 border border-red-500/25';
          if ((r === 1 || r === 4) && (c === 1 || c === 4)) {
            cellBg = 'bg-red-500/40 border-2 border-red-500';
          }
        }
        // Green Home Yard (0-5, 9-14)
        else if (r < 6 && c >= 9) {
          cellBg = 'bg-emerald-500/10 border border-emerald-500/25';
          if ((r === 1 || r === 4) && (c === 10 || c === 13)) {
            cellBg = 'bg-emerald-500/40 border-2 border-emerald-500';
          }
        }
        // Yellow Home Yard (9-14, 9-14)
        else if (r >= 9 && c >= 9) {
          cellBg = 'bg-yellow-500/10 border border-yellow-500/25';
          if ((r === 10 || r === 13) && (c === 10 || c === 13)) {
            cellBg = 'bg-yellow-500/40 border-2 border-yellow-500';
          }
        }
        // Blue Home Yard (9-14, 0-5)
        else if (r >= 9 && c < 6) {
          cellBg = 'bg-blue-500/10 border border-blue-500/25';
          if ((r === 10 || r === 13) && (c === 10 || c === 13) || ((r === 10 || r === 13) && (c === 1 || c === 4))) {
            cellBg = 'bg-blue-500/40 border-2 border-blue-500';
          }
        }
        // Finishing Paths & Start squares
        else if (r === 7 && c >= 1 && c <= 5) cellBg = 'bg-red-600/60 border border-red-500/40';
        else if (c === 7 && r >= 1 && r <= 5) cellBg = 'bg-emerald-600/60 border border-emerald-500/40';
        else if (r === 7 && c >= 9 && c <= 13) cellBg = 'bg-yellow-600/60 border border-yellow-500/40';
        else if (c === 7 && r >= 9 && r <= 13) cellBg = 'bg-blue-600/60 border border-blue-500/40';
        
        // Starts
        else if (r === 6 && c === 1) cellBg = 'bg-red-500 border border-red-400 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
        else if (r === 1 && c === 8) cellBg = 'bg-emerald-500 border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
        else if (r === 8 && c === 13) cellBg = 'bg-yellow-500 border border-yellow-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
        else if (r === 13 && c === 6) cellBg = 'bg-blue-500 border border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.4)]';

        // Safe space stars
        const trackIdx = TRACK_COORDS.findIndex(co => co.r === r && co.c === c);
        if (trackIdx !== -1 && SAFE_INDEXES.includes(trackIdx)) {
          safeStar = true;
          cellBg = 'bg-slate-800 border border-slate-700/80';
        }

        // Center Triangle Home slots
        if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
          if (r === 7 && c === 6) cellBg = 'bg-red-600 border border-red-500';
          else if (r === 6 && c === 7) cellBg = 'bg-emerald-600 border border-emerald-500';
          else if (r === 7 && c === 8) cellBg = 'bg-yellow-500 border border-yellow-400';
          else if (r === 8 && c === 7) cellBg = 'bg-blue-600 border border-blue-500';
          else cellBg = 'bg-slate-900 border border-slate-800';
        }

        cells.push(
          <div
            key={`cell_${r}_${c}`}
            className={`w-[18px] h-[18px] relative flex items-center justify-center ${cellBg}`}
            style={{ gridRowStart: r + 1, gridColumnStart: c + 1 }}
          >
            {safeStar && (
              <Shield size={8} className="text-slate-400 animate-pulse absolute" />
            )}

            {/* Tokens rendering */}
            {cellTokens.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                {cellTokens.map((t, idx) => {
                  const isMoveable = status === 'playing' && isMyTurn && hasRolled && getLegalMoves(myColor, currentRoll).includes(t.idx);
                  return (
                    <motion.button
                      key={t.key}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMoveable) moveToken(myColor, t.idx, currentRoll);
                      }}
                      disabled={!isMoveable}
                      initial={{ scale: 0.5 }}
                      animate={{ 
                        scale: 1, 
                        y: cellTokens.length > 1 ? (idx - (cellTokens.length - 1)/2) * 3 : 0,
                        x: cellTokens.length > 1 ? (idx - (cellTokens.length - 1)/2) * 3 : 0
                      }}
                      className={`w-[12px] h-[12px] rounded-full border border-slate-100 flex items-center justify-center font-black text-[7px] text-white select-none relative ${colorBgs[t.color]} ${
                        isMoveable 
                          ? 'animate-bounce cursor-pointer shadow-[0_0_8px_#ffffff] scale-125 z-10' 
                          : 'shadow-[0_1px_2px_rgba(0,0,0,0.3)]'
                      }`}
                    >
                      {t.idx + 1}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        );
      }
    }
    return cells;
  };

  if (status === 'lobby') {
    return (
      <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4.5 w-[280px] text-slate-100 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-red-500 via-emerald-500 via-yellow-500 to-blue-500 animate-pulse" />
        
        <div className="text-center mb-3">
          <h3 className="text-sm font-black tracking-wide text-slate-200">Ludo Multiplayer Lobby 🎲</h3>
          <p className="text-[10px] text-slate-500">Host: {gameState.hostName}</p>
        </div>

        {/* Joined Players */}
        <div className="space-y-1.5 mb-4">
          {activeColors.map(color => {
            const player = players.find(p => p.color === color);
            return (
              <div 
                key={color} 
                className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-850/80"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colorBgs[color]} border border-white/10`} />
                  <span className="text-xs font-semibold text-slate-300">
                    {player ? player.name : `Empty Slot`}
                  </span>
                </div>
                {player ? (
                  <span className="text-[8px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1.5">
                    {player.isAi ? 'AI Bot' : 'Joined'}
                    {player.isAi && currentUser?._id === gameState.hostId && (
                      <button
                        onClick={() => handleRemoveBot(player.id)}
                        className="text-[10px] text-red-400 hover:text-red-300 font-extrabold px-1 select-none cursor-pointer"
                        title="Remove Bot"
                      >
                        ✕
                      </button>
                    )}
                  </span>
                ) : (
                  currentUser?._id === gameState.hostId && (
                    <button
                      onClick={handleAddBot}
                      className="text-[8px] bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-black tracking-wide transition-all"
                    >
                      + Bot
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>

        {/* Invite Friends */}
        {currentUser?._id === gameState.hostId && partners.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowInviteList(!showInviteList)}
              className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mb-2 select-none"
            >
              <span>{showInviteList ? 'Hide Invite List' : 'Invite Players 🎲'}</span>
              <span>{showInviteList ? '▲' : '▼'}</span>
            </button>
            {showInviteList && (
              <div className="max-h-[110px] overflow-y-auto space-y-1.5 p-2 bg-slate-950/40 rounded-xl border border-slate-850/80 no-scrollbar">
                {partners.map(p => {
                  const hasBeenInvited = invitedUserIds.has(p._id);
                  return (
                    <div key={p._id} className="flex items-center justify-between gap-2 p-1 hover:bg-slate-900/40 rounded-lg">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-slate-850 text-[9px] font-bold text-slate-400 flex items-center justify-center border border-slate-700/50 shrink-0 uppercase">
                          {(p.name?.[0] || 'U')}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-300 truncate max-w-[100px]">{p.name}</span>
                      </div>
                      <button
                        onClick={async () => {
                          if (hasBeenInvited) return;
                          try {
                            const invitePayload = {
                              type: 'ludo_invite',
                              gameMessageId: message._id,
                              hostName: currentUser.name,
                              hostId: currentUser._id
                            };
                            await api.post('/messages', {
                              receiver: p._id,
                              text: JSON.stringify(invitePayload)
                            });
                            setInvitedUserIds(prev => {
                              const next = new Set(prev);
                              next.add(p._id);
                              return next;
                            });
                          } catch (err) {
                            console.error('Failed to send invite:', err);
                          }
                        }}
                        disabled={hasBeenInvited}
                        className={`text-[8px] font-black tracking-wide px-2 py-1 rounded transition-all ${
                          hasBeenInvited
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/10'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                        }`}
                      >
                        {hasBeenInvited ? 'Invited ✓' : 'Invite'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          {!myPlayer && players.length < 4 && (
            <button
              onClick={handleJoinLobby}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <UserPlus size={14} />
              Join Game
            </button>
          )}

          {currentUser?._id === gameState.hostId && players.length >= 2 && (
            <button
              onClick={() => handleStartGame(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all border border-indigo-500/20"
            >
              <Play size={14} />
              Start Match ({players.length} Players)
            </button>
          )}

          {currentUser?._id === gameState.hostId && players.length < 4 && (
            <button
              onClick={() => handleStartGame(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all border border-emerald-500/20"
            >
              <Bot size={14} />
              {players.length === 1 ? 'Start with 3 AI Bots' : 'Fill empty with Bots & Start'}
            </button>
          )}

          {currentUser?._id === gameState.hostId && players.length < 2 && (
            <div className="text-[10px] text-center text-slate-400 italic bg-slate-950/20 py-2 px-3 rounded-xl border border-slate-850/60 mt-1">
              Add at least 1 Bot or invite a friend to play!
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4 w-[280px] text-slate-100 shadow-xl overflow-hidden relative select-none">
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-red-500 via-emerald-500 via-yellow-500 to-blue-500 animate-pulse" />
      
      {/* Turn indicator header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-850 pb-2">
        <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 flex items-center gap-1">
          Ludo Match 🎲
        </span>
        <span className={`text-[9px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full ${colorBgs[currentTurn]} text-white`}>
          {colorLabels[currentTurn]}'s Turn
        </span>
      </div>

      {/* Grid container */}
      <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-850 shadow-inner w-full flex justify-center mb-4">
        <div className="grid grid-cols-15 grid-rows-15 gap-[1px] bg-slate-900 overflow-hidden w-[240px] h-[240px] rounded-lg">
          {renderLudoGrid()}
        </div>
      </div>

      {/* Controller & Roller */}
      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 shadow-inner flex items-center justify-between gap-3">
        <div className="flex flex-col justify-center gap-0.5">
          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Status</span>
          {winner ? (
            <span className={`text-[10px] font-black tracking-widest uppercase flex items-center gap-1 ${
              winner === myColor ? 'text-emerald-400' : 'text-slate-400'
            }`}>
              <Trophy size={11} className="animate-bounce" />
              {colorLabels[winner]} Wins!
            </span>
          ) : isRolling ? (
            <span className="text-[10px] font-bold text-slate-400 animate-pulse">Rolling...</span>
          ) : isMyTurn && !hasRolled ? (
            <span className="text-[10px] font-bold text-indigo-400 animate-pulse">⚡ Roll Now!</span>
          ) : hasRolled ? (
            <span className="text-[10px] font-bold text-slate-400">Rolled a {currentRoll}!</span>
          ) : (
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
              {currentTurnPlayer?.name?.split(' ')[0] || 'Opponent'}
            </span>
          )}
        </div>

        {/* Die Face Button */}
        <button
          onClick={() => handleRollDie()}
          disabled={hasRolled || isRolling || gameEnded || !isMyTurn || isCurrentTurnAi}
          className={`w-12 h-12 rounded-xl flex items-center justify-center font-black border text-lg transition-all ${
            isMyTurn && !hasRolled 
              ? 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)] cursor-pointer active:scale-90 animate-pulse' 
              : 'bg-slate-900 border-slate-800 text-slate-400 cursor-not-allowed opacity-80'
          }`}
        >
          {isRolling ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.15 }}
              className="text-indigo-400 text-xl font-light"
            >
              🎲
            </motion.div>
          ) : currentRoll ? (
            <span className="text-slate-100">{currentRoll}</span>
          ) : (
            <span className="text-slate-500">🎲</span>
          )}
        </button>
      </div>

      {winner && (
        <button
          onClick={handlePlayAgain}
          className="w-full mt-3 bg-slate-800 hover:bg-slate-750 text-slate-200 text-[10px] font-bold py-2 rounded-lg flex items-center justify-center gap-1 border border-slate-700/85 transition-all active:scale-95"
        >
          <RotateCcw size={11} />
          Play Again
        </button>
      )}
    </div>
  );
}
