import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { io } from 'socket.io-client';
import CustomAudioPlayer from '../components/CustomAudioPlayer';
import ChatTicTacToe from '../components/ChatTicTacToe';
import ChatLudo from '../components/ChatLudo';
import LudoInvite from '../components/LudoInvite';
import { Share,  Mic, Square, Trash2,  
  Search, 
  Send, 
  Paperclip, 
  Loader2, 
  X, 
  Megaphone, 
  MessageSquare, 
  User, 
  Clock, 
  Check, 
  CheckCheck, 
  Filter, 
  Sparkles,
  Shield,
  Circle, ChevronLeft,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sendTestNotification } from '../lib/pushNotifications';

export default function Messages() {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'admins', 'workers'
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  
  // Voice Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  
  // Message Context Menu (Long press)
  const [contextMenu, setContextMenu] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const longPressTimeoutRef = useRef(null);

  // Real-time socket states
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  let typingTimeoutRef = useRef(null);
  
  // High-fidelity local thread previews containing last message + timestamp + unread count simulation
  const [threadsData, setThreadsData] = useState({});

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchPartners();
    api.get('/messages/settings/status').then(res => setChatEnabled(res.data.chatEnabled)).catch(() => {});
    const interval = setInterval(() => {
      if (selectedPartner || isBroadcast) {
        fetchMessages();
      }
      refreshThreadPreviews();
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedPartner, isBroadcast]);

  // Handle URL query parameters (e.g. ?senderId=xyz or ?type=broadcast) & SW Notification Clicks
  useEffect(() => {
    if (partners.length === 0) return;

    const parseAndSelectFromURL = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const senderIdParam = searchParams.get('senderId') || searchParams.get('chat');
      const typeParam = searchParams.get('type');

      if (typeParam === 'broadcast') {
        setIsBroadcast(true);
        setSelectedPartner(null);
      } else if (senderIdParam) {
        const found = partners.find(p => p._id === senderIdParam);
        if (found) {
          setSelectedPartner(found);
          setIsBroadcast(false);
        }
      }
    };

    parseAndSelectFromURL();

    const handleSwMessage = (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        const targetUrl = event.data.url || event.data.targetPath;
        if (targetUrl) {
          try {
            const urlObj = new URL(targetUrl, window.location.origin);
            const senderId = urlObj.searchParams.get('senderId') || urlObj.searchParams.get('chat');
            const type = urlObj.searchParams.get('type');
            if (type === 'broadcast') {
              setIsBroadcast(true);
              setSelectedPartner(null);
            } else if (senderId) {
              const found = partners.find(p => p._id === senderId);
              if (found) {
                setSelectedPartner(found);
                setIsBroadcast(false);
              }
            }
          } catch (e) {
            console.warn('URL parse error:', e);
          }
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }
    window.addEventListener('popstate', parseAndSelectFromURL);

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
      window.removeEventListener('popstate', parseAndSelectFromURL);
    };
  }, [partners]);

  // Initialize Socket.io
  useEffect(() => {
    if (!user) return;
    
    const newSocket = io();
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      newSocket.emit('user_connected', user._id);
    });
    
    newSocket.on('online_users', (users) => {
      setOnlineUsers(users);
    });
    
    newSocket.on('user_typing', (senderId) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.add(senderId);
        return newSet;
      });
    });
    
    newSocket.on('user_stopped_typing', (senderId) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(senderId);
        return newSet;
      });
    });
    
    newSocket.on('receive_message', (message) => {
      setMessages(prev => {
        const index = prev.findIndex(m => m._id === message._id);
        if (index !== -1) {
          const newMessages = [...prev];
          newMessages[index] = message;
          return newMessages;
        }
        
        // If viewing the broadcast channel
        if (message.isBroadcast && isBroadcast) {
          return [...prev, message];
        }
        
        // If viewing the correct direct chat
        if (!message.isBroadcast && selectedPartner && 
           (message.sender === selectedPartner._id || message.sender._id === selectedPartner._id || 
            message.receiver === selectedPartner._id || message.receiver._id === selectedPartner._id)) {
            
           // If we are currently chatting with them, we can instantly mark it read in the DB
           if (message.sender === selectedPartner._id || message.sender._id === selectedPartner._id) {
             api.put(`/messages/${selectedPartner._id}/read`).catch(console.error);
             newSocket.emit('mark_read', { senderId: selectedPartner._id, receiverId: user._id });
           }

           return [...prev, message];
        }
        
        return prev;
      });
      refreshThreadPreviews();
    });

    newSocket.on('messages_read', (readerId) => {
      setMessages(prev => prev.map(m => {
        if (m.receiver === readerId || m.receiver?._id === readerId) {
          return { ...m, read: true };
        }
        return m;
      }));
    });

    return () => newSocket.disconnect();
  }, [user, selectedPartner, isBroadcast]);

  useEffect(() => {
    fetchMessages();
  }, [selectedPartner, isBroadcast]);

  // Push Notifications Subscription check
  useEffect(() => {
    // If permission is already granted and preference is saved, sync subscription in background
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      import('../lib/pushNotifications').then(({ subscribeToPush }) => {
        const pref = localStorage.getItem('attendly_notification_pref') || 'always';
        subscribeToPush(pref).catch(() => {});
      });
    }
  }, []);

  // Update thread-level previews whenever messages list changes for current chat
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const partnerId = isBroadcast ? 'broadcast' : selectedPartner?._id;
      if (partnerId) {
        setThreadsData(prev => ({
          ...prev,
          [partnerId]: {
            text: lastMsg.text || 'Sent an attachment',
            time: new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: false
          }
        }));
      }
    }
  }, [messages]);

  const fetchPartners = async () => {
    try {
      const res = await api.get('/messages/users');
      setPartners(res.data);
      
      // Populate initial random last message templates to make UI look highly active and production-ready
      const initialThreads = {};
      res.data.forEach((p) => {
        initialThreads[p._id] = {
          text: 'Start a conversation...',
          time: '',
          unread: false
        };
      });
      initialThreads['broadcast'] = {
        text: 'Announcements and updates',
        time: '',
        unread: false
      };
      setThreadsData(initialThreads);
      
      // Fetch real previews immediately
      try {
        const previewRes = await api.get('/messages/threads/previews');
        setThreadsData(prev => ({
          ...prev,
          ...previewRes.data
        }));
      } catch (e) {
        console.warn('Failed to load initial threads', e);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshThreadPreviews = async () => {
    // Fetch and update last messages in background for active chat partners
    try {
      if (partners.length === 0) return;
      const res = await api.get('/messages/threads/previews');
      setThreadsData(prev => ({
        ...prev,
        ...res.data
      }));
    } catch (e) {
      console.warn('Background thread sync issue:', e);
    }
  };

  const fetchMessages = async () => {
    if (!selectedPartner && !isBroadcast) return;
    try {
      const targetId = isBroadcast ? 'broadcast' : selectedPartner._id;
      const res = await api.get(`/messages/${targetId}`);
      const filtered = isBroadcast ? res.data.filter(m => m.isBroadcast) : res.data.filter(m => !m.isBroadcast);
      setMessages(filtered);
      scrollToBottom();
      
      // Mark as read if direct chat
      if (!isBroadcast && selectedPartner && socket) {
        // Find if we have unread messages from them
        const hasUnread = filtered.some(m => !m.read && (m.sender === selectedPartner._id || m.sender._id === selectedPartner._id));
        if (hasUnread) {
          await api.put(`/messages/${selectedPartner._id}/read`);
          socket.emit('mark_read', { senderId: selectedPartner._id, receiverId: user._id });
        }
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (socket && selectedPartner && !isBroadcast) {
      socket.emit('typing', { senderId: user._id, receiverId: selectedPartner._id });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { senderId: user._id, receiverId: selectedPartner._id });
      }, 2000);
    }
  };

  const sendMessage = async (e, customText = null) => {
    if (e) e.preventDefault();
    const textToSend = customText !== null ? customText : newMessage;
    if ((!textToSend.trim() && !mediaPreview) || (!selectedPartner && !isBroadcast)) return;

    if (textToSend.trim().toLowerCase() === '/game' && !isBroadcast && selectedPartner) {
      const initialGameState = {
        type: 'tictactoe',
        board: Array(9).fill(null),
        isXNext: true,
        playerX: user._id,
        playerXName: user.name,
        playerO: selectedPartner._id,
        playerOName: selectedPartner.name,
        winner: null,
        winningLine: [],
        scores: { playerX: 0, playerO: 0, ties: 0 },
        gameEnded: false
      };

      setSending(true);
      try {
        if (socket && selectedPartner) {
          socket.emit('stop_typing', { senderId: user._id, receiverId: selectedPartner._id });
        }
        const res = await api.post('/messages', {
          receiver: selectedPartner._id,
          text: JSON.stringify(initialGameState),
          isBroadcast: false
        });
        
        if (socket) {
          socket.emit('send_message', res.data);
        }
        
        if (customText === null) {
          setNewMessage('');
        }
        removeMedia();
        setMessages(prev => [...prev, res.data]);
        refreshThreadPreviews();
      } catch (err) {
        console.error('Failed to send game', err);
      } finally {
        setSending(false);
      }
      return;
    }

    if (textToSend.trim().toLowerCase() === '/ludo' && !isBroadcast && selectedPartner) {
      const initialGameState = {
        type: 'ludo',
        status: 'lobby',
        hostId: user._id,
        hostName: user.name,
        players: [
          { id: user._id, name: user.name, color: 'red', isAi: false }
        ],
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
      };

      setSending(true);
      try {
        if (socket && selectedPartner) {
          socket.emit('stop_typing', { senderId: user._id, receiverId: selectedPartner._id });
        }
        const res = await api.post('/messages', {
          receiver: selectedPartner._id,
          text: JSON.stringify(initialGameState),
          isBroadcast: false
        });
        
        if (socket) {
          socket.emit('send_message', res.data);
        }
        
        if (customText === null) {
          setNewMessage('');
        }
        removeMedia();
        setMessages(prev => [...prev, res.data]);
        refreshThreadPreviews();
      } catch (err) {
        console.error('Failed to send ludo', err);
      } finally {
        setSending(false);
      }
      return;
    }

    if (socket && selectedPartner && !isBroadcast) {
      socket.emit('stop_typing', { senderId: user._id, receiverId: selectedPartner._id });
    }

    setSending(true);
    try {
      const res = await api.post('/messages', {
        receiver: isBroadcast ? null : selectedPartner._id,
        text: textToSend,
        mediaUrl: mediaPreview,
        isBroadcast
      });
      
      if (socket) {
        socket.emit('send_message', res.data);
      }
      
      if (customText === null) {
        setNewMessage('');
      }
      removeMedia();
      fetchMessages();
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  const handleGameUpdate = async (messageId, updatedGameState) => {
    try {
      const res = await api.put(`/messages/${messageId}`, {
        text: JSON.stringify(updatedGameState)
      });
      
      setMessages(prev => prev.map(m => m._id === messageId ? res.data : m));
      
      if (socket) {
        socket.emit('send_message', res.data);
      }
    } catch (err) {
      console.error('Failed to update game state', err);
    }
  };

  const handleJoinLudoSuccess = (updatedGameMessageOrState) => {
    if (socket) {
      socket.emit('send_message', updatedGameMessageOrState);
    }
    
    try {
      const stateObj = typeof updatedGameMessageOrState.text === 'string'
        ? JSON.parse(updatedGameMessageOrState.text)
        : updatedGameMessageOrState;
        
      const hostId = stateObj.hostId;
      if (hostId && hostId !== user._id) {
        const foundPartner = partners.find(p => p._id === hostId);
        if (foundPartner && (!selectedPartner || selectedPartner._id !== hostId)) {
          setSelectedPartner(foundPartner);
          setIsBroadcast(false);
        }
      }
    } catch (e) {
      console.warn('Could not automatically navigate to game thread:', e);
    }

    fetchMessages();
  };

  const toggleChatEnabled = async () => {
    try {
      const res = await api.put('/messages/settings/status', { chatEnabled: !chatEnabled });
      setChatEnabled(res.data.chatEnabled);
    } catch (err) {
      console.error(err);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const durationSeconds = Math.round((Date.now() - recordingStartTimeRef.current) / 1000) || 1;
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setMediaPreview(`${reader.result}#duration=${durationSeconds}`);
        };
        stream.getTracks().forEach(t => t.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Mic access denied', err);
      alert('Microphone access is required to send voice notes.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const deleteMessage = async (id) => {
    try {
      await api.delete(`/messages/${id}`);
      setMessages(messages.filter(m => m._id !== id));
      refreshThreadPreviews();
      setContextMenu(null);
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  const handleTouchStart = (e, msg) => {
    longPressTimeoutRef.current = setTimeout(() => {
      setContextMenu({
        messageId: msg._id,
        isMine: msg.sender?._id === user._id || msg.sender === user._id,
        x: e.touches ? e.touches[0].clientX : e.clientX,
        y: e.touches ? e.touches[0].clientY : e.clientY,
        msg
      });
    }, 600); // 600ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
  };

  const forwardMessage = (partner) => {
    if (!forwardingMessage) return;
    
    api.post('/messages', {
      receiver: partner._id,
      text: forwardingMessage.text,
      mediaUrl: forwardingMessage.mediaUrl,
      isBroadcast: false
    }).then(res => {
      if (socket) socket.emit('send_message', res.data);
      setForwardingMessage(null);
      refreshThreadPreviews();
      alert(`Message forwarded to ${partner.name}`);
    }).catch(err => {
      console.error('Failed to forward', err);
    });
  };

  // Filter partners by tab choice & search query
  const filteredPartners = partners.filter(p => {
    if (!p || typeof p.name !== 'string') return false;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.email && typeof p.email === 'string' && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (p.role && typeof p.role === 'string' && p.role.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (activeTab === 'admins') {
      return matchesSearch && (p.role === 'admin' || p.role === 'supervisor');
    }
    if (activeTab === 'workers' || activeTab === 'trainees') {
      return matchesSearch && (p.role === 'trainee' || p.role === 'worker');
    }
    return matchesSearch;
  });

  // Dynamic Contextual Quick Replies
  const quickReplies = isBroadcast 
    ? ["Team, please review the roster", "Shift reminder for this afternoon", "Great job on hitting our daily targets!", "Schedule updates published"]
    : ["Got it, thank you!", "On my way to the shift now", "Approved", "Please check-in via geolocation", "Can you update your schedule?"];

  return (
    <div className="h-[calc(100vh-140px)] min-h-[500px] flex gap-6 max-w-7xl mx-auto px-4 md:px-6 relative overflow-hidden">
      {/* Thread Directory Side Pane */}
      <div className={`w-full md:w-80 lg:w-96 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl flex-col overflow-hidden shrink-0 shadow-xl shadow-black/40 ${selectedPartner || isBroadcast ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header Block with Search */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <MessageSquare className="text-indigo-500" size={18} />
              <span>Team Discussions</span>
            </h2>
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
              {partners.length} Users
            </span>
          </div>
          
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950/40 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Directory Filters */}
          <div className="flex gap-1 bg-slate-950/60 p-1 rounded-lg text-xs">
            <button 
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1 px-1.5 rounded-md font-semibold text-center transition-all ${activeTab === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              All
            </button>
            <button 
              onClick={() => setActiveTab('admins')}
              className={`flex-1 py-1 px-1.5 rounded-md font-semibold text-center transition-all ${activeTab === 'admins' ? 'bg-purple-600/30 text-purple-300 font-bold border border-purple-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              Supervisors/Admin
            </button>
            <button 
              onClick={() => setActiveTab('trainees')}
              className={`flex-1 py-1 px-1.5 rounded-md font-semibold text-center transition-all ${activeTab === 'trainees' || activeTab === 'workers' ? 'bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              Trainees
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          
          {/* Admin Broadcast Trigger Card */}
          {user?.role === 'admin' && (
            <button
              onClick={() => { setIsBroadcast(true); setSelectedPartner(null); }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${
                isBroadcast 
                  ? 'bg-rose-500/10 border-rose-500/30 shadow-sm' 
                  : 'bg-transparent border-transparent hover:bg-slate-800/40'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/10">
                <Megaphone size={18} />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-bold ${isBroadcast ? 'text-rose-400' : 'text-slate-200'}`}>
                    Broadcast All Staff
                  </span>
                  <span className="text-[9px] text-slate-500 whitespace-nowrap">
                    {threadsData['broadcast']?.time || '09:00 AM'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {threadsData['broadcast']?.text || 'Send message to everyone...'}
                </p>
              </div>
            </button>
          )}

          {/* Render Active Conversation Partners */}
          {filteredPartners.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No matching conversations found
            </div>
          ) : (
            filteredPartners.map(partner => {
              const isActive = !isBroadcast && selectedPartner?._id === partner._id;
              const hasUnread = threadsData[partner._id]?.unread;
              const lastText = threadsData[partner._id]?.text || 'No messages yet';
              const lastTime = threadsData[partner._id]?.time || '';
              const isOnline = onlineUsers.includes(partner._id);
              const isTyping = typingUsers.has(partner._id);

              return (
                <button
                  key={partner._id}
                  onClick={() => { setSelectedPartner(partner); setIsBroadcast(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${
                    isActive 
                      ? 'bg-indigo-600/10 border-indigo-500/30 shadow-sm' 
                      : 'bg-transparent border-transparent hover:bg-slate-800/40'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700/50 flex items-center justify-center overflow-hidden">
                      {partner.avatar ? (
                        <img src={partner.avatar} alt={partner.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-xs font-bold text-slate-300">
                          {(partner.name?.[0] || 'U').toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* Live online status */}
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                    )}
                  </div>

                  <div className="text-left flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-xs font-semibold truncate ${isActive ? 'text-indigo-400 font-bold' : 'text-slate-200'}`}>
                          {partner.name}
                        </span>
                        {partner.role === 'admin' && (
                          <Shield className="text-rose-500 shrink-0" size={10} />
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500 whitespace-nowrap">
                        {lastTime}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-[11px] truncate flex-1 ${hasUnread ? 'text-slate-200 font-medium' : 'text-slate-400'}`}>
                        {isTyping ? <span className="text-indigo-400 animate-pulse italic">Typing...</span> : lastText}
                      </p>
                      {hasUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 animate-pulse" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Primary Message Stream Pane */}
      <div className={`flex-1 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl flex-col overflow-hidden shadow-xl shadow-black/40 ${!selectedPartner && !isBroadcast ? 'hidden md:flex' : 'flex'}`}>
        
        {selectedPartner || isBroadcast ? (
          <>
            {/* Thread Header details */}
            <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/30">
              <div className="flex items-center gap-3">
                <button 
                  className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-200 transition-colors"
                  onClick={() => { setSelectedPartner(null); setIsBroadcast(false); }}
                >
                  <ChevronLeft size={20} />
                </button>
                {isBroadcast ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/10">
                      <Megaphone size={18} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-200">Global Announcement Board</h3>
                      <p className="text-[10px] text-slate-400">Broadcasting directly to all active staff channels</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="relative w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                      {selectedPartner.avatar ? (
                        <img src={selectedPartner.avatar} alt={selectedPartner.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-xs font-bold text-slate-300">
                          {(selectedPartner.name?.[0] || 'U').toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-slate-200">{selectedPartner.name}</h3>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          selectedPartner.role === 'admin' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          selectedPartner.role === 'supervisor' ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' :
                          'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                        }`}>
                          {selectedPartner.role === 'trainee' || selectedPartner.role === 'worker' ? 'Trainee' : selectedPartner.role}
                        </span>
                      </div>
                      <p className={`text-[10px] flex items-center gap-1 mt-0.5 ${onlineUsers.includes(selectedPartner._id) ? 'text-emerald-500' : 'text-slate-500'}`}>
                        {onlineUsers.includes(selectedPartner._id) ? (
                          <>
                            <Circle size={6} fill="currentColor" className="animate-pulse" />
                            <span>{typingUsers.has(selectedPartner._id) ? 'Typing...' : 'Online now'}</span>
                          </>
                        ) : (
                          <span>Offline</span>
                        )}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {user?.role === 'admin' && (
                  <button
                    onClick={toggleChatEnabled}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors shrink-0 ${
                      chatEnabled 
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20'
                    }`}
                    title="Toggle Chat for all non-admin users"
                  >
                    <Shield size={13} />
                    <span className="hidden sm:inline">{chatEnabled ? 'Chat Enabled' : 'Chat Disabled'}</span>
                  </button>
                )}
                {/* Test Notification Action */}
                <button
                  onClick={async () => {
                    try {
                      await sendTestNotification();
                      alert('Test notification sent successfully!');
                    } catch (e) {
                      alert(e.response?.data?.message || 'Failed to send test push. Please allow notifications in your browser first.');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-medium transition-colors shrink-0"
                  title="Send a test push notification to this device"
                >
                  <Bell size={13} />
                  <span className="hidden sm:inline">Test Notification</span>
                </button>
              </div>
            </div>

            {/* Message Bubble Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col custom-scrollbar bg-slate-950/10">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-600 border border-slate-800">
                    <MessageSquare size={20} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-slate-400">Conversation started</p>
                    <p className="text-[10px] text-slate-500">Send your first message or choose a quick reply</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.sender?._id === user._id || msg.sender === user._id;
                  const isGame = msg.text && msg.text.startsWith('{"type":"tictactoe"');
                  const isLudoGame = msg.text && msg.text.startsWith('{"type":"ludo"');
                  const isLudoInvite = msg.text && msg.text.startsWith('{"type":"ludo_invite"');
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      key={msg._id || idx}
                      className={`flex flex-col max-w-[70%] ${isMine ? 'self-end items-end' : 'self-start items-start'}`}
                    >
                      <div 
                        className={isGame || isLudoGame || isLudoInvite ? "relative group cursor-pointer" : `px-4 py-2.5 rounded-2xl relative group cursor-pointer ${
                          isMine 
                            ? (isBroadcast ? 'bg-rose-600 text-white rounded-br-sm' : 'bg-indigo-600 text-slate-100 rounded-br-sm') 
                            : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/50'
                        }`}
                        onTouchStart={(e) => handleTouchStart(e, msg)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchEnd}
                        onMouseDown={(e) => handleTouchStart(e, msg)}
                        onMouseUp={handleTouchEnd}
                        onMouseLeave={handleTouchEnd}
                        onContextMenu={(e) => { e.preventDefault(); handleTouchStart(e, msg); }}
                      >
                        {(isMine || user?.role === 'admin') && (
                          <button
                            onClick={() => deleteMessage(msg._id)}
                            className={`absolute top-1/2 -translate-y-1/2 ${isMine ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-slate-800 text-rose-400 hover:bg-rose-500/10 transition-all border border-slate-700`}
                            title="Delete message"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                        
                        {/* Sender Label for Received Broadcasts */}
                        {!isMine && isBroadcast && (
                          <p className="text-[9px] font-bold text-rose-400 mb-1 tracking-wider">
                            ANNOUNCEMENT FROM {msg.sender?.name?.toUpperCase()}
                          </p>
                        )}

                        {/* Image/Audio attachment rendering */}
                        {msg.mediaUrl && (
                          <div className="mb-2 max-w-sm rounded-lg overflow-hidden border border-slate-900 shadow-sm bg-slate-950/50">
                            {msg.mediaUrl.startsWith('data:audio') ? (
                              <CustomAudioPlayer src={msg.mediaUrl} isMine={isMine} />
                            ) : (
                              <img 
                                src={msg.mediaUrl} 
                                alt="Attached Media" 
                                className="w-full max-h-48 object-cover cursor-pointer hover:brightness-95 transition-all" 
                                onClick={() => window.open(msg.mediaUrl)}
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>
                        )}

                        {msg.text && (
                          isGame ? (
                            <ChatTicTacToe message={msg} currentUser={user} onUpdate={handleGameUpdate} />
                          ) : isLudoGame ? (
                            <ChatLudo message={msg} currentUser={user} onUpdate={handleGameUpdate} />
                          ) : isLudoInvite ? (
                            <LudoInvite message={msg} currentUser={user} onJoinSuccess={handleJoinLudoSuccess} />
                          ) : (
                            <p className="text-xs whitespace-pre-wrap leading-relaxed">
                              {msg.text}
                            </p>
                          )
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 mt-1 px-1 text-[9px] text-slate-500">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMine && (
                          msg.read ? (
                            <CheckCheck size={11} className="text-indigo-400" />
                          ) : (
                            <Check size={11} className="text-slate-400" />
                          )
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
              {selectedPartner && typingUsers.has(selectedPartner._id) && (
                <div className="flex items-center gap-2 self-start mb-2">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/50">
                    <span className="text-[9px] font-bold text-slate-400">
                      {(selectedPartner.name?.[0] || 'U').toUpperCase()}
                    </span>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/50 px-3 py-2.5 rounded-2xl rounded-bl-sm flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input & Reply Options Panel */}
            <div className="p-4 bg-slate-950/30 border-t border-slate-800/80 space-y-3">
              
              {/* Contextual Quick Reply Pill Row */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 shrink-0 select-none no-scrollbar">
                <span className="text-[10px] text-slate-500 font-semibold uppercase flex items-center gap-1 shrink-0 mr-1">
                  <Sparkles size={11} className="text-amber-500" />
                  <span>Reply:</span>
                </span>
                {quickReplies.map((replyText, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(null, replyText)}
                    disabled={sending}
                    className="text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 py-1 px-2.5 rounded-full border border-slate-700/50 hover:border-slate-600 transition-all whitespace-nowrap shrink-0"
                  >
                    {replyText}
                  </button>
                ))}
              </div>

              {/* Upload Previews */}
              <AnimatePresence>
                {mediaPreview && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative inline-block border border-slate-700 p-1.5 bg-slate-900 rounded-xl"
                  >
                    {mediaPreview.startsWith('data:audio') ? (
                      <CustomAudioPlayer src={mediaPreview} isMine={true} />
                    ) : (
                      <img src={mediaPreview} alt="Pending attachment" className="h-16 rounded-lg object-cover border border-slate-800" referrerPolicy="no-referrer" />
                    )}
                    <button 
                      onClick={removeMedia} 
                      className="absolute -top-1.5 -right-1.5 bg-slate-800 text-slate-300 p-1 rounded-full hover:bg-rose-600 transition-all border border-slate-700"
                    >
                      <X size={10} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Core Chat Composer Form */}
              {!chatEnabled && user?.role !== 'admin' ? (
                <div className="flex items-center justify-center p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs font-medium">
                  Chat has been disabled by administrators.
                </div>
              ) : (
                <form onSubmit={(e) => sendMessage(e)} className="flex items-end gap-2.5">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*,audio/*" 
                    className="hidden" 
                  />
                  
                  {isRecording ? (
                    <div className="flex-1 flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl py-2.5 px-4 text-rose-400">
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-bold tracking-wider font-mono">
                        00:{recordingTime.toString().padStart(2, '0')}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-rose-500/50 flex-1 text-center">Recording Audio...</span>
                      <button 
                        type="button" 
                        onClick={stopRecording}
                        className="bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded-lg transition-colors shadow-lg"
                      >
                        <Square size={14} fill="currentColor" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all shrink-0 border border-slate-800 bg-slate-950/20"
                        title="Attach file"
                      >
                        <Paperclip size={18} />
                      </button>

                      <textarea
                        value={newMessage}
                        onChange={handleTyping}
                        placeholder={isBroadcast ? "Compose high-priority broadcast announcement..." : "Type your secure message..."}
                        className="flex-1 bg-slate-950/40 border border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-none max-h-32"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage(e);
                          }
                        }}
                      />

                      {!newMessage.trim() && !mediaPreview ? (
                        <button 
                          type="button"
                          onClick={startRecording}
                          className="p-3 rounded-xl shrink-0 transition-all flex items-center justify-center bg-slate-800 text-slate-300 hover:text-indigo-400 border border-slate-700"
                          title="Record voice note"
                        >
                          <Mic size={18} />
                        </button>
                      ) : (
                        <button 
                          type="submit"
                          disabled={sending}
                          className={`p-3 rounded-xl shrink-0 transition-all flex items-center justify-center ${
                            sending 
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-800' 
                              : (isBroadcast 
                                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/10' 
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10')
                          }`}
                        >
                          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                        </button>
                      )}
                    </>
                  )}
                </form>
              )}
            </div>
          </>
        ) : (
          /* Empty Welcoming Dashboard */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6">
            <div className="w-16 h-16 rounded-full bg-slate-950/50 flex items-center justify-center mb-4 border border-slate-800/80 text-slate-500">
              <MessageSquare size={26} className="text-slate-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-300 mb-1">Corporate Communications</h3>
            <p className="text-xs text-slate-500 text-center max-w-sm leading-relaxed">
              Select a colleague or compose a broadcast announcement on the left panel to engage in secure messaging.
            </p>
          </div>
        )}
      </div>
      {/* Context Menu / Forwarding Dialog */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={() => setContextMenu(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="absolute bg-slate-900 border border-slate-700 shadow-2xl rounded-xl py-2 min-w-48 overflow-hidden"
              style={{
                top: Math.min(contextMenu.y, window.innerHeight - 150),
                left: Math.min(contextMenu.x, window.innerWidth - 200)
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setForwardingMessage(contextMenu.msg);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors"
              >
                <Share size={14} className="text-slate-400" />
                Forward Message
              </button>
              
              {(contextMenu.isMine || user?.role === 'admin') && (
                <button
                  onClick={() => deleteMessage(contextMenu.messageId)}
                  className="w-full text-left px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 transition-colors border-t border-slate-800 mt-1 pt-3"
                >
                  <Trash2 size={14} />
                  Delete Message
                </button>
              )}
            </motion.div>
          </motion.div>
        )}

        {forwardingMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setForwardingMessage(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-200">Forward Message</h3>
                <button onClick={() => setForwardingMessage(null)} className="text-slate-500 hover:text-slate-300">
                  <X size={18} />
                </button>
              </div>
              
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 mb-6">
                <p className="text-xs text-slate-300 italic line-clamp-3">
                  "{forwardingMessage.text || 'Media Attachment'}"
                </p>
              </div>
              
              <h4 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Select Recipient</h4>
              <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1 pr-2">
                {partners.map(p => (
                  <button
                    key={p._id}
                    onClick={() => forwardMessage(p)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-slate-800 rounded-xl transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-300">
                          {(p.name?.[0] || 'U').toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">{p.name}</p>
                      <p className="text-[10px] text-slate-500 capitalize">{p.role}</p>
                    </div>
                    <Share size={14} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
