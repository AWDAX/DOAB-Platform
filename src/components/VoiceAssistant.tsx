import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Mic, MicOff, Send, X, Maximize2, Minimize2, 
  Minus, History, Plus, Trash2, MessageSquarePlus, Volume2, VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AIOrbFace from './AIOrbFace';
import { FormattedChatText } from './FormattedChatText';
import Tooltip from './Tooltip';
import { playClick } from '../utils/soundFx';
import { useDOABChat } from '../hooks/useDOABChat';
import ConfirmationModal from './ConfirmationModal';

const ROTATING_SUGGESTIONS = [
  { label: 'Safe Route to MG Road', query: 'What is the safest route to MG Road avoiding flooded wards?' },
  { label: 'Drought Tanker Dispatch', query: 'Are there any active water tanker work orders in Ward 08?' },
  { label: 'Verify Road Clearance', query: 'Show me citizen back-check verification for Ring Road North.' },
  { label: 'Precipitation Telemetry', query: 'What is the current rainfall probability for Ward 14?' },
  { label: 'Emergency Drainage Reroute', query: 'Compute bypass corridor around waterlogged MG Road junction.' }
];

export default function VoiceAssistant() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

  const {
    messages,
    sessions,
    activeSessionId,
    setActiveSessionId,
    newChat,
    deleteSession,
    clearAllSessions,
    sendMessage,
    isThinking,
    draft,
    setDraft
  } = useDOABChat();

  // Sync inputVal with persistent draft for active session
  useEffect(() => {
    setInputVal(draft || '');
  }, [draft, activeSessionId]);

  // Rotate single fading suggestion every 3.5 seconds (automatically paused when typing)
  useEffect(() => {
    if (inputVal.trim().length > 0) return;
    const interval = setInterval(() => {
      setSuggestionIdx((prev) => (prev + 1) % ROTATING_SUGGESTIONS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [inputVal]);

  // Draggable AI Orb Screen Constraints (Strictly bounded inside viewport)
  const [orbConstraints, setOrbConstraints] = useState({ top: 0, left: 0, right: 0, bottom: 0 });

  useEffect(() => {
    const updateOrbConstraints = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const orbSize = 54;
      const rightPadding = w < 640 ? 14 : w < 768 ? 24 : 32;
      const bottomPadding = w < 768 ? 108 : 28;

      // The button default position is at:
      // right = rightPadding, bottom = bottomPadding
      // In Framer Motion, left constraint is how far left (negative) it can move from its origin.
      // right constraint is how far right (positive) it can move.
      // top constraint is how far up (negative) it can move.
      // bottom constraint is how far down (positive) it can move.
      const maxLeft = -(w - rightPadding - orbSize - 12);
      const maxRight = rightPadding - 12;
      const maxTop = -(h - bottomPadding - orbSize - 12);
      const maxBottom = bottomPadding - 12;

      setOrbConstraints({
        left: maxLeft,
        right: maxRight,
        top: maxTop,
        bottom: maxBottom
      });
    };

    updateOrbConstraints();
    window.addEventListener('resize', updateOrbConstraints);
    return () => window.removeEventListener('resize', updateOrbConstraints);
  }, []);

  // Window Draggable Position
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });

  // Playful Easter Egg: If dragged/moved 2-3 times, orb smiles and giggles like a happy child
  const dragMoveCountRef = useRef(0);
  const [isOrbGiggling, setIsOrbGiggling] = useState(false);
  const giggleTimeoutRef = useRef<any>(null);
  const dragStartTimeRef = useRef<number>(0);

  const handleOrbDragStart = () => {
    dragStartTimeRef.current = Date.now();
  };

  const handleOrbDragEnd = (_: any, info: any) => {
    const elapsed = Date.now() - dragStartTimeRef.current;
    const distanceMoved = Math.sqrt((info?.offset?.x || 0) ** 2 + (info?.offset?.y || 0) ** 2);

    // Only count genuine drags (moved more than 15px)
    if (distanceMoved > 15 || elapsed > 300) {
      dragMoveCountRef.current += 1;
      if (dragMoveCountRef.current >= 2) {
        // Trigger a gentle, subtle acknowledgement smile (non-intrusive)
        setIsOrbGiggling(true);
        if (giggleTimeoutRef.current) clearTimeout(giggleTimeoutRef.current);
        giggleTimeoutRef.current = setTimeout(() => {
          setIsOrbGiggling(false);
        }, 1200);

        dragMoveCountRef.current = 0; // reset counter
      }
    }
  };

  // Window Resizable Size (Multi-directional 4-corner & edge resizing)
  type ResizeDirection = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';
  const [size, setSize] = useState({ w: 420, h: 580 });
  const [resizeDir, setResizeDir] = useState<ResizeDirection | null>(null);
  const resizeStartRef = useRef({
    mouseX: 0,
    mouseY: 0,
    startW: 420,
    startH: 580,
    startX: 0,
    startY: 0
  });
  
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Read Aloud / Text-to-Speech handler with Saystack-style animated outline rings
  const handleToggleReadAloud = (messageId: string, text: string) => {
    playClick();
    if (!('speechSynthesis' in window)) return;

    if (playingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setPlayingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Select best natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onstart = () => {
      setPlayingMessageId(messageId);
    };
    utterance.onend = () => {
      setPlayingMessageId(null);
    };
    utterance.onerror = () => {
      setPlayingMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Web Speech API STT
  const baseSpeechTextRef = useRef('');

  const toggleListening = () => {
    playClick();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported on this browser.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      // Capture currently typed/spoken text to append future speech seamlessly
      const currentInput = inputVal.trim();
      baseSpeechTextRef.current = currentInput ? currentInput + ' ' : '';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          const combined = baseSpeechTextRef.current + transcript;
          setInputVal(combined);
          setDraft(combined);
          // Keep input view scrolled to the newest spoken words so text remains visible
          if (inputRef.current) {
            inputRef.current.scrollLeft = inputRef.current.scrollWidth;
          }
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (_) {
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
      }
    };
  }, []);

  const handleSend = () => {
    if (!inputVal.trim()) return;
    playClick();
    const textToSend = inputVal;
    setInputVal('');
    setDraft('');
    sendMessage(textToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Dragging Logic
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isFullScreen) return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { mouseX: clientX, mouseY: clientY, startX: currentPosRef.current.x, startY: currentPosRef.current.y };
  };

  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const dx = clientX - dragStartRef.current.mouseX;
      const dy = clientY - dragStartRef.current.mouseY;

      // Base unconstrained candidate position
      let candX = dragStartRef.current.startX + dx;
      let candY = dragStartRef.current.startY + dy;

      // Strictly clamp within viewport borders so the window can NEVER leave the screen
      const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
      const initialRightOffset = typeof window !== 'undefined' && winW < 768 ? 8 : 32; // 0.5rem or 2rem
      const initialBottomOffset = typeof window !== 'undefined' && winW < 768 ? 72 : 32;

      // The window's default unshifted top-left:
      // defaultLeft = winW - initialRightOffset - size.w
      // defaultTop = winH - initialBottomOffset - size.h
      const defaultLeft = winW - initialRightOffset - size.w;
      const defaultTop = winH - initialBottomOffset - size.h;

      // Margins from screen edges (8px padding from viewport edges)
      const minScreenX = 8;
      const maxScreenX = winW - size.w - 8;
      const minScreenY = 8;
      const maxScreenY = winH - size.h - 8;

      // Allowed position offsets:
      const minOffsetX = minScreenX - defaultLeft;
      const maxOffsetX = maxScreenX - defaultLeft;
      const minOffsetY = minScreenY - defaultTop;
      const maxOffsetY = maxScreenY - defaultTop;

      const clampedX = Math.max(Math.min(candX, maxOffsetX), minOffsetX);
      const clampedY = Math.max(Math.min(candY, maxOffsetY), minOffsetY);

      setPosition({ x: clampedX, y: clampedY });
      currentPosRef.current = { x: clampedX, y: clampedY };
    };

    const handleDragEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  // Resizing Logic (4 Corners & 4 Edges)
  const handleResizeStart = (e: React.MouseEvent, direction: ResizeDirection) => {
    if (isFullScreen) return;
    e.preventDefault();
    e.stopPropagation();
    setResizeDir(direction);
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startW: size.w,
      startH: size.h,
      startX: currentPosRef.current.x,
      startY: currentPosRef.current.y
    };
  };

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!resizeDir) return;
      const dx = e.clientX - resizeStartRef.current.mouseX;
      const dy = e.clientY - resizeStartRef.current.mouseY;
      const { startW, startH, startX, startY } = resizeStartRef.current;

      const minW = 340;
      const maxW = Math.min(900, window.innerWidth - 32);
      const minH = 420;
      const maxH = Math.min(920, window.innerHeight - 32);

      let newW = startW;
      let newH = startH;
      let newX = startX;
      let newY = startY;

      // Horizontal resizing
      if (resizeDir === 'nw' || resizeDir === 'w' || resizeDir === 'sw') {
        newW = Math.max(minW, Math.min(maxW, startW - dx));
      } else if (resizeDir === 'ne' || resizeDir === 'e' || resizeDir === 'se') {
        newW = Math.max(minW, Math.min(maxW, startW + dx));
        newX = startX + (newW - startW);
      }

      // Vertical resizing
      if (resizeDir === 'nw' || resizeDir === 'n' || resizeDir === 'ne') {
        newH = Math.max(minH, Math.min(maxH, startH - dy));
      } else if (resizeDir === 'sw' || resizeDir === 's' || resizeDir === 'se') {
        newH = Math.max(minH, Math.min(maxH, startH + dy));
        newY = startY + (newH - startH);
      }

      setSize({ w: newW, h: newH });
      setPosition({ x: newX, y: newY });
      currentPosRef.current = { x: newX, y: newY };
    };

    const handleResizeEnd = () => setResizeDir(null);

    if (resizeDir) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [resizeDir]);

  // Listen for global custom event to trigger Assistant from Sidebar or shortcuts
  useEffect(() => {
    const handleOpenAssistant = () => {
      setIsOpen(true);
      try {
        localStorage.removeItem('doab_has_unread_ai_response');
        window.dispatchEvent(new CustomEvent('doab:ai-read'));
      } catch (_) {}
    };
    window.addEventListener('doab:open-assistant', handleOpenAssistant);
    return () => window.removeEventListener('doab:open-assistant', handleOpenAssistant);
  }, []);

  // Also clear unread status when modal opens
  useEffect(() => {
    if (isOpen) {
      try {
        localStorage.removeItem('doab_has_unread_ai_response');
        window.dispatchEvent(new CustomEvent('doab:ai-read'));
      } catch (_) {}
    }
  }, [isOpen]);

  const activeOrbState = isListening ? 'listening' : isThinking ? 'thinking' : 'idle';
  const currentSuggestion = ROTATING_SUGGESTIONS[suggestionIdx];

  const isOnAssistantPage = location.pathname === '/assistant';
  const isOnMapPage = location.pathname === '/';
  const isAuthOrLanding = location.pathname === '/login' || location.pathname === '/landing' || location.pathname === '/team';
  const shouldHideOrb = isOnAssistantPage || isOnMapPage || isAuthOrLanding || isOpen;

  return (
    <>
      {/* Touch & Desktop Draggable Floating Action Button (AI Orb FAB) */}
      {!isOnAssistantPage && !isAuthOrLanding && (
        <motion.button 
          id="tour-ai-copilot"
          drag
          dragMomentum={false}
          dragElastic={0.15}
          dragConstraints={orbConstraints}
          onDragStart={handleOrbDragStart}
          onDragEnd={handleOrbDragEnd}
          whileDrag={{ scale: 1.08, cursor: 'grabbing' }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={isOrbGiggling ? { 
            scale: [1, 1.06, 1],
            transition: { duration: 0.5 }
          } : undefined}
          onClick={() => { playClick(); setIsOpen(true); }}
          className={`fixed bottom-[calc(env(safe-area-inset-bottom)+6.75rem)] md:bottom-7 right-3.5 sm:right-6 md:right-8 h-[54px] w-[54px] sm:h-[56px] sm:w-[56px] rounded-full shadow-[0_8px_28px_rgba(0,0,0,0.22)] flex items-center justify-center z-40 bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden cursor-grab touch-none origin-center ${
            shouldHideOrb ? 'scale-0 opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-label="Open DOAB Assistant (Draggable)"
          title={isOrbGiggling ? "Hehe! (Giggling)" : "Open DOAB Assistant (Drag me around!)"}
        >
          <AIOrbFace state={isOrbGiggling ? 'giggle' : 'idle'} size={56} gaze={!isOpen} className="w-full h-full pointer-events-none" />
        </motion.button>
      )}

      {/* Assistant Draggable / Adaptive Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: isFullScreen ? '100vw' : typeof window !== 'undefined' && window.innerWidth < 768 ? 'calc(100vw - 1rem)' : `${size.w}px`,
              height: isFullScreen ? '100dvh' : typeof window !== 'undefined' && window.innerWidth < 768 ? 'min(78dvh, 580px)' : `${size.h}px`,
              x: isFullScreen || (typeof window !== 'undefined' && window.innerWidth < 768) ? 0 : position.x,
              y: isFullScreen || (typeof window !== 'undefined' && window.innerWidth < 768) ? 0 : position.y,
              right: isFullScreen ? 0 : typeof window !== 'undefined' && window.innerWidth < 768 ? '0.5rem' : '2rem',
              left: isFullScreen ? 0 : typeof window !== 'undefined' && window.innerWidth < 768 ? '0.5rem' : 'auto',
              bottom: isFullScreen ? 0 : typeof window !== 'undefined' && window.innerWidth < 768 ? 'calc(env(safe-area-inset-bottom) + 4.5rem)' : '2rem',
              top: isFullScreen ? 0 : 'auto',
              position: 'fixed'
            }}
            className={`neo-glass-card ${isFullScreen ? 'z-[200] rounded-none' : 'z-[100] rounded-3xl border border-[var(--border-color)]'} flex flex-col shadow-2xl ${isDragging ? 'cursor-grabbing' : ''}`}
          >
            {/* Top Drag Handle Bar */}
            <div 
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              className={`h-14 border-b border-[var(--border-color)] bg-[var(--bg-card)]/85 backdrop-blur-md flex items-center justify-between px-4 select-none ${
                isFullScreen ? '' : 'cursor-grab rounded-t-3xl'
              } ${isDragging ? 'cursor-grabbing bg-[var(--bg-main)]/95' : ''}`}
            >
              {/* Left Action Buttons: History & New Session */}
              <div className="flex items-center gap-2 z-10">
                <Tooltip content="History" position="bottom">
                  <button
                    onClick={() => { playClick(); setIsHistoryOpen(!isHistoryOpen); }}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isHistoryOpen 
                        ? 'bg-[var(--color-brand-accent)] text-white shadow-xs' 
                        : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/10'
                    }`}
                    aria-label="Mission History"
                  >
                    <History className="h-4.5 w-4.5" />
                  </button>
                </Tooltip>

                <Tooltip content="New Session" position="bottom">
                  <button
                    onClick={() => {
                      playClick();
                      newChat();
                      setIsHistoryOpen(false);
                      setTimeout(() => inputRef.current?.focus(), 80);
                    }}
                    className="p-1.5 px-2.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] flex items-center gap-1.5 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs select-none"
                    aria-label="Start New Mission"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">New</span>
                  </button>
                </Tooltip>
              </div>
                
              {/* Center Identity Section: In Full Expanded Window, centered with absolute inset-x; otherwise alongside controls */}
              <div className={isFullScreen ? "absolute inset-x-0 mx-auto w-fit flex items-center gap-2.5 pointer-events-none select-none z-0" : "flex items-center gap-2.5"}>
                {/* Header AI Orb Face with Status Tooltip */}
                <Tooltip content={isListening ? "Listening..." : isThinking ? "Analyzing..." : "Online"} position="bottom">
                  <div className="relative flex items-center justify-center cursor-pointer pointer-events-auto">
                    <div className="absolute inset-0 -m-1 rounded-full bg-[var(--color-brand-accent)]/20 blur-md pointer-events-none" />
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-black/5 dark:bg-white/10 flex items-center justify-center border border-[var(--border-color)] shrink-0 relative z-10">
                      <AIOrbFace state={activeOrbState} size={28} gaze={isOpen} />
                    </div>
                  </div>
                </Tooltip>

                <span className="font-bold tracking-tight text-[var(--text-main)] text-sm pointer-events-auto">
                  DOAB Assistant
                </span>
              </div>
              
              {/* Window Controls: Dedicated Minimize Button, Fullscreen, Close */}
              <div className="flex items-center gap-1.5">
                <Tooltip content="Minimize" position="bottom">
                  <button 
                    onClick={() => { playClick(); setIsOpen(false); }} 
                    className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--text-main)]/10 hover:text-[var(--text-main)] transition-colors cursor-pointer flex items-center justify-center"
                    aria-label="Minimize window"
                    title="Minimize window"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </Tooltip>

                <Tooltip content={isFullScreen ? "Restore" : "Expand"} position="bottom">
                  <button 
                    onClick={() => { playClick(); setIsFullScreen(!isFullScreen); }} 
                    className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--text-main)]/10 hover:text-[var(--text-main)] transition-colors cursor-pointer"
                    aria-label="Fullscreen toggle"
                  >
                    {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </button>
                </Tooltip>

                <Tooltip content="Close" shortcut="Esc" position="bottom">
                  <button 
                    onClick={() => { playClick(); setIsOpen(false); }} 
                    className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--danger-bg-hover)] hover:text-[var(--danger-text)] transition-colors cursor-pointer"
                    aria-label="Close Window"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Main Area: History Drawer or Chat Body */}
            <div className="flex-1 relative flex overflow-hidden">
              {/* Slide-out History Drawer */}
              <AnimatePresence>
                {isHistoryOpen && (
                  <motion.div
                    initial={{ x: -300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="absolute inset-y-0 left-0 w-72 z-20 bg-[var(--bg-card)] border-r border-[var(--border-color)] p-4 flex flex-col shadow-2xl"
                  >
                    <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-[var(--border-color)] gap-1.5">
                      <span className="text-[11px] font-mono uppercase font-bold text-[var(--text-muted)] tracking-wider truncate">
                        Missions
                      </span>
                      <div className="flex items-center gap-1">
                        {sessions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              setIsClearAllConfirmOpen(true);
                            }}
                            className="p-1 px-1.5 rounded-full text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 text-[10px] font-medium border border-rose-500/20 active:scale-98 transition-all cursor-pointer select-none flex items-center gap-1"
                            title="Clear consultation history"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span className="hidden sm:inline">Clear</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            playClick();
                            setIsHistoryOpen(false);
                          }}
                          className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/10 transition-colors cursor-pointer"
                          title="Close History"
                          aria-label="Close History"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
                      {sessions.map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => { playClick(); setActiveSessionId(s.id); setIsHistoryOpen(false); }}
                          className={`p-2.5 rounded-xl text-xs flex justify-between items-center cursor-pointer transition-colors ${
                            s.id === activeSessionId 
                              ? 'bg-[var(--text-main)] text-[var(--bg-card)] font-semibold shadow-xs' 
                              : 'text-[var(--text-muted)] hover:bg-[var(--text-main)]/5 hover:text-[var(--text-main)]'
                          }`}
                        >
                          <span className="truncate flex-1 font-medium">{s.title}</span>
                          {sessions.length > 1 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                playClick();
                                setSessionToDelete({ id: s.id, title: s.title });
                              }}
                              className="p-1 hover:text-[var(--danger-text)] opacity-60 hover:opacity-100 cursor-pointer ml-1.5 transition-colors"
                              title="Delete session"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Body */}
              <div className="flex-1 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto bg-[var(--bg-main)]/30 custom-scrollbar text-sm leading-relaxed">
                
                {/* Prominent SWATVA-style Welcome Face in empty/default state */}
                {messages.length <= 1 && (
                  <div className="flex flex-col items-center justify-center text-center py-6 px-4">
                    <div className="relative mb-3 group cursor-pointer" onClick={toggleListening}>
                      <div className="absolute inset-0 -m-3 rounded-full bg-[var(--color-brand-accent)]/20 blur-xl pointer-events-none transition-all group-hover:scale-120" />
                      <AIOrbFace size={64} state={activeOrbState} gaze={false} className="relative z-10 transition-transform group-hover:scale-105" />
                    </div>
                    <h4 className="text-sm font-bold tracking-tight text-[var(--text-main)]">
                      DOAB Civic Intelligence
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] max-w-xs mt-1 leading-relaxed">
                      Ask about flooded arteries, emergency water tanker orders, or verified road clearances.
                    </p>
                  </div>
                )}

                {/* Messages stream with Avatar Faces */}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2.5 max-w-[90%] ${
                      m.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'
                    }`}
                  >
                        {m.role === 'assistant' && (
                          <div className="relative shrink-0 mt-1">
                            {playingMessageId === m.id && (
                              <span className="absolute -inset-1 rounded-full border border-sky-400/80 animate-ping pointer-events-none" />
                            )}
                            <AIOrbFace 
                              size={24} 
                              state={playingMessageId === m.id ? 'speaking' : 'idle'} 
                              gaze={false}
                              className="relative z-10" 
                            />
                          </div>
                        )}
                    
                    <div className="flex flex-col gap-1 max-w-full">
                      <div
                        className={`p-3.5 sm:p-4 rounded-2xl shadow-2xs relative group/msg ${
                          m.role === 'user'
                            ? 'bg-[var(--text-main)] text-[var(--bg-card)] rounded-tr-xs font-medium'
                            : 'bg-[var(--bg-card)] text-[var(--text-main)] rounded-tl-xs border border-[var(--border-color)]'
                        } ${playingMessageId === m.id ? 'ring-2 ring-sky-400/40' : ''}`}
                      >
                        {m.role === 'assistant' ? (
                          <FormattedChatText content={m.content} />
                        ) : (
                          m.content
                        )}

                        {/* Saystack-style Read Aloud / Audio Playback Trigger */}
                        {m.role === 'assistant' && (
                          <button
                            type="button"
                            onClick={() => handleToggleReadAloud(m.id, m.content)}
                            className={`absolute bottom-1.5 right-2 p-1 rounded-lg text-xs transition-opacity cursor-pointer flex items-center gap-1 ${
                              playingMessageId === m.id
                                ? 'opacity-100 text-sky-500 bg-sky-500/10'
                                : 'opacity-0 group-hover/msg:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                            }`}
                            title={playingMessageId === m.id ? 'Stop reading' : 'Read aloud'}
                            aria-label={playingMessageId === m.id ? 'Stop reading' : 'Read aloud'}
                          >
                            {playingMessageId === m.id ? (
                              <>
                                <VolumeX className="h-3.5 w-3.5" />
                                <span className="text-[9px] font-mono font-bold">Stop</span>
                              </>
                            ) : (
                              <Volume2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-center gap-2.5 text-[var(--text-muted)]">
                    <AIOrbFace size={22} state="thinking" className="shrink-0" />
                    <span className="text-xs font-mono animate-pulse">Analyzing ward telemetry...</span>
                  </div>
                )}

                <div ref={chatBottomRef} />
              </div>
            </div>

            {/* Single Rotating Fading Suggestion (Zero Overflow-X, Auto-paused & hidden when typing) */}
            <AnimatePresence>
              {!inputVal.trim() && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="px-4 py-2 bg-[var(--bg-card)]/60 border-t border-[var(--border-color)] flex items-center gap-2 overflow-hidden"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5 text-[var(--color-brand-accent)] shrink-0 opacity-80" />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.button
                        key={currentSuggestion.query}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        onClick={() => { playClick(); sendMessage(currentSuggestion.query); }}
                        className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] truncate text-left cursor-pointer transition-colors block w-full"
                        title={`Click to ask: ${currentSuggestion.query}`}
                      >
                        "{currentSuggestion.query}"
                      </motion.button>
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className={`p-4 bg-[var(--bg-card)]/90 backdrop-blur-xl border-t border-[var(--border-color)] ${isFullScreen ? 'pb-10' : 'rounded-b-3xl'}`}>
              <div className="relative flex items-center">
                <input 
                  ref={inputRef}
                  type="text" 
                  value={inputVal}
                  onChange={(e) => {
                    setInputVal(e.target.value);
                    setDraft(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask DOAB Assistant (or tap Mic)..." 
                  className="w-full pl-4 pr-24 h-12 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-main)] focus:outline-none focus:ring-1 focus:ring-[var(--text-main)] focus:border-[var(--text-main)] text-sm text-[var(--text-main)] shadow-inner transition-shadow placeholder:text-[var(--text-muted)] font-normal"
                />
                
                {/* Right Button Cluster */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <Tooltip content="Voice" position="top">
                    <button 
                      onClick={toggleListening}
                      className={`h-8.5 w-8.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isListening 
                          ? 'bg-amber-500 text-white animate-pulse shadow-sm' 
                          : 'bg-[var(--text-main)] text-[var(--bg-card)] hover:opacity-90'
                      }`}
                      aria-label="Voice Input"
                    >
                      {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </button>
                  </Tooltip>

                  <Tooltip content="Send" shortcut="Enter" position="top">
                    <button 
                      onClick={handleSend}
                      disabled={!inputVal.trim()}
                      className="h-8.5 w-8.5 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] hover:opacity-90 disabled:opacity-30 flex items-center justify-center transition-opacity cursor-pointer"
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Multi-Directional 4-Corner & 4-Edge Resize Handles */}
            {!isFullScreen && (
              <>
                {/* 4 Corner Handles with Dynamic Bidirectional Cursors & Minimalist Hover Affordances */}
                {/* Top-Left Corner */}
                <div 
                  onMouseDown={(e) => handleResizeStart(e, 'nw')}
                  className="absolute -top-1 -left-1 w-6 h-6 cursor-nwse-resize z-50 flex items-start justify-start p-1.5 group/corner select-none"
                  title="Resize (Top-Left)"
                >
                  <div className="w-2.5 h-2.5 border-t-2 border-l-2 rounded-tl-sm border-transparent group-hover/corner:border-[var(--color-brand-accent)] transition-all opacity-0 group-hover/corner:opacity-100" />
                </div>

                {/* Top-Right Corner */}
                <div 
                  onMouseDown={(e) => handleResizeStart(e, 'ne')}
                  className="absolute -top-1 -right-1 w-6 h-6 cursor-nesw-resize z-50 flex items-start justify-end p-1.5 group/corner select-none"
                  title="Resize (Top-Right)"
                >
                  <div className="w-2.5 h-2.5 border-t-2 border-r-2 rounded-tr-sm border-transparent group-hover/corner:border-[var(--color-brand-accent)] transition-all opacity-0 group-hover/corner:opacity-100" />
                </div>

                {/* Bottom-Left Corner */}
                <div 
                  onMouseDown={(e) => handleResizeStart(e, 'sw')}
                  className="absolute -bottom-1 -left-1 w-6 h-6 cursor-nesw-resize z-50 flex items-end justify-start p-1.5 group/corner select-none"
                  title="Resize (Bottom-Left)"
                >
                  <div className="w-2.5 h-2.5 border-b-2 border-l-2 rounded-bl-sm border-transparent group-hover/corner:border-[var(--color-brand-accent)] transition-all opacity-0 group-hover/corner:opacity-100" />
                </div>

                {/* Bottom-Right Corner */}
                <div 
                  onMouseDown={(e) => handleResizeStart(e, 'se')}
                  className="absolute -bottom-1 -right-1 w-6 h-6 cursor-nwse-resize z-50 flex items-end justify-end p-1.5 group/corner select-none"
                  title="Resize (Bottom-Right)"
                >
                  <div className="w-2.5 h-2.5 border-b-2 border-r-2 rounded-br-sm border-transparent group-hover/corner:border-[var(--color-brand-accent)] transition-all opacity-0 group-hover/corner:opacity-100" />
                </div>

                {/* 4 Edge Handles */}
                <div 
                  onMouseDown={(e) => handleResizeStart(e, 'n')}
                  className="absolute -top-1 left-6 right-6 h-2.5 cursor-ns-resize z-40 select-none"
                  title="Resize (Top)"
                />
                <div 
                  onMouseDown={(e) => handleResizeStart(e, 's')}
                  className="absolute -bottom-1 left-6 right-6 h-2.5 cursor-ns-resize z-40 select-none"
                  title="Resize (Bottom)"
                />
                <div 
                  onMouseDown={(e) => handleResizeStart(e, 'w')}
                  className="absolute top-6 bottom-6 -left-1 w-2.5 cursor-ew-resize z-40 select-none"
                  title="Resize (Left)"
                />
                <div 
                  onMouseDown={(e) => handleResizeStart(e, 'e')}
                  className="absolute top-6 bottom-6 -right-1 w-2.5 cursor-ew-resize z-40 select-none"
                  title="Resize (Right)"
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal: Delete Single Session */}
      <ConfirmationModal
        isOpen={sessionToDelete !== null}
        title="Delete Consultation Session?"
        message={`Are you sure you want to delete "${sessionToDelete?.title}"? All telemetry dialogue in this session will be permanently erased.`}
        confirmLabel="Delete Session"
        cancelLabel="Keep Session"
        variant="danger"
        onConfirm={() => {
          if (sessionToDelete) {
            deleteSession(sessionToDelete.id);
            setSessionToDelete(null);
          }
        }}
        onCancel={() => setSessionToDelete(null)}
      />

      {/* Confirmation Modal: Clear All Sessions */}
      <ConfirmationModal
        isOpen={isClearAllConfirmOpen}
        title="Clear All Consultation History?"
        message="This will permanently wipe all your past mission inquiries and AI consultation history from this device."
        confirmLabel="Clear All History"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          clearAllSessions();
          setIsClearAllConfirmOpen(false);
        }}
        onCancel={() => setIsClearAllConfirmOpen(false)}
      />
    </>
  );
}
