import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Shield, Check, Users } from 'lucide-react';
import api from '../lib/api';

export default function LudoInvite({ message, currentUser, onJoinSuccess }) {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  let inviteData;
  try {
    inviteData = JSON.parse(message.text);
  } catch (err) {
    return (
      <div className="text-xs text-red-400 p-2 bg-red-950/20 border border-red-900/30 rounded-xl">
        Failed to load Ludo invitation.
      </div>
    );
  }

  const { hostName, hostId, gameMessageId } = inviteData;
  const isHost = hostId === currentUser?._id;

  const fetchGameDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/messages/detail/${gameMessageId}`);
      if (res.data && res.data.text) {
        setGameState(JSON.parse(res.data.text));
      }
    } catch (err) {
      console.error('Failed to load game details for invitation:', err);
      setError('Game not found or expired.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameDetails();
    // Poll for updates to show live players
    const interval = setInterval(fetchGameDetails, 10000);
    return () => clearInterval(interval);
  }, [gameMessageId]);

  const handleJoin = async () => {
    if (joining) return;
    try {
      setJoining(true);
      setStatusMessage('Joining...');
      
      const res = await api.get(`/messages/detail/${gameMessageId}`);
      const gameMsg = res.data;
      const parsedState = JSON.parse(gameMsg.text);

      if (parsedState.players.length >= 4) {
        setStatusMessage('Match is already full!');
        setJoining(false);
        return;
      }

      if (parsedState.players.some(p => p.id === currentUser?._id)) {
        setStatusMessage('Already in this match!');
        setJoining(false);
        if (onJoinSuccess) {
          onJoinSuccess(parsedState);
        }
        return;
      }

      const activeColors = ['red', 'green', 'yellow', 'blue'];
      const existingColors = parsedState.players.map(p => p.color);
      const availableColor = activeColors.find(c => !existingColors.includes(c));

      const updatedPlayers = [
        ...parsedState.players,
        { id: currentUser._id, name: currentUser.name, color: availableColor, isAi: false }
      ];

      const updatedGameState = {
        ...parsedState,
        players: updatedPlayers
      };

      const updateRes = await api.put(`/messages/${gameMessageId}`, {
        text: JSON.stringify(updatedGameState)
      });

      setGameState(updatedGameState);
      setStatusMessage('Joined successfully!');
      
      if (onJoinSuccess) {
        onJoinSuccess(updateRes.data, availableColor);
      }
    } catch (err) {
      console.error('Failed to join match:', err);
      setStatusMessage('Failed to join match');
    } finally {
      setJoining(false);
    }
  };

  const colorBgs = {
    red: 'bg-red-500',
    green: 'bg-emerald-500',
    yellow: 'bg-yellow-500',
    blue: 'bg-blue-500'
  };

  if (loading && !gameState) {
    return (
      <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4 w-[240px] text-slate-400 text-xs items-center justify-center gap-2">
        <span className="animate-spin text-indigo-400">🎲</span>
        <span>Loading invitation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col bg-slate-900 border border-slate-850 rounded-2xl p-3.5 w-[240px] text-slate-500 text-[10px] items-center justify-center border-dashed">
        <span className="text-sm mb-1">⚠️</span>
        <span>This Ludo match is no longer available</span>
      </div>
    );
  }

  const players = gameState?.players || [];
  const hasJoined = players.some(p => p.id === currentUser?._id);
  const isFull = players.length >= 4;

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4 w-[250px] text-slate-100 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-red-500 via-emerald-500 via-yellow-500 to-blue-500 animate-pulse" />
      
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-xl bg-slate-950/60 flex items-center justify-center text-lg shadow-inner">
          🎲
        </div>
        <div>
          <h4 className="text-xs font-black tracking-wide text-slate-200">LUDO MULTIPLAYER</h4>
          <p className="text-[10px] text-slate-400">Host: {hostName}</p>
        </div>
      </div>

      {/* Players list */}
      <div className="bg-slate-950/45 border border-slate-850/65 rounded-xl p-2.5 mb-3 space-y-1.5">
        <div className="flex items-center justify-between text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-1">
          <span>Players Joined ({players.length}/4)</span>
          <Users size={10} />
        </div>
        
        {players.map((p, i) => (
          <div key={p.id || i} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${colorBgs[p.color] || 'bg-slate-500'}`} />
            <span className="text-[11px] font-semibold text-slate-300 truncate max-w-[170px]">
              {p.name} {p.id === currentUser?._id && <span className="text-indigo-400 text-[9px] font-normal">(You)</span>}
            </span>
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-[10px] text-slate-500 italic">No players joined yet</p>
        )}
      </div>

      {statusMessage && (
        <p className={`text-[10px] text-center font-bold mb-2.5 ${
          statusMessage.includes('successfully') ? 'text-emerald-400' : 'text-indigo-400'
        }`}>
          {statusMessage}
        </p>
      )}

      {isHost ? (
        <div className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-wider py-1.5 border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
          Awaiting other players
        </div>
      ) : hasJoined ? (
        <button
          onClick={() => {
            if (onJoinSuccess) onJoinSuccess(gameState);
          }}
          className="w-full bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-black py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 border border-slate-700/50 transition-all active:scale-95"
        >
          <Check size={12} className="text-emerald-400" />
          You are joined! Go to lobby
        </button>
      ) : isFull ? (
        <div className="text-center text-[9px] text-slate-500 font-bold uppercase tracking-wider py-1.5 border border-slate-800 rounded-xl bg-slate-950/20">
          Match is Full (4/4)
        </div>
      ) : (
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
        >
          <UserPlus size={12} />
          Join Ludo Match
        </button>
      )}
    </div>
  );
}
