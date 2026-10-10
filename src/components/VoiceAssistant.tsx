import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, MicOff, Send, X, Maximize2, Minimize2, 
  Minus, History, Plus, Trash2, Compass, Volume2, VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AIOrbFace from './AIOrbFace';
import Tooltip from './Tooltip';
import { playClick } from '../utils/soundFx';
import { useDOABChat } from '../hooks/useDOABChat';

const ROTATING_SUGGESTIONS = [
  { label: 'Safe Route to MG Road', query: 'What is the safest route to MG Road avoiding flooded wards?' },
  { label: 'Drought Tanker Dispatch', query: 'Are there any active water tanker work orders in Ward 08?' },
  { label: 'Verify Road Clearance', query: 'Show me citizen back-check verification for Ring Road North.' },
  { label: 'Precipitation Telemetry', query: 'What is the current rainfall probability for Ward 14?' },
  { label: 'Emergency Drainage Reroute', query: 'Compute bypass corridor around waterlogged MG Road junction.' }
];

export default function VoiceAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [suggestionIdx, setSuggestionIdx] = useState(0);

  const {
    messages,
    sessions,
    activeSessionId,
    setActiveSessionId,
    newChat,
    deleteSession,
    sendMessage,
    isThinking
  } = useDOABChat();

  // Rotate single fading suggestion every 3.5 seconds (automatically paused when typing)
  useEffect(() => {
    if (inputVal.trim().length > 0) return;
    const interval = setInterval(() => {
      setSuggestionIdx((prev) => (prev + 1) % ROTATING_SUGGESTIONS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [inputVal]);

  // Window Draggable Position
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startX: 0, startY: 0 });
  const currentPosRef = useRef({ x: 0, y: 0 });

  // Window Resizable Size
  const [size, setSize] = useState({ w: 420, h: 580 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ startW: 420, startH: 580 });
  
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputVal(transcript);
          sendMessage(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [sendMessage]);

  const toggleListening = () => {
    playClick();
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported on this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSend = () => {
    if (!inputVal.trim()) return;
    playClick();
    sendMessage(inputVal);
    setInputVal('');
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
      const newX = dragStartRef.current.startX + dx;
      const newY = dragStartRef.current.startY + dy;
      setPosition({ x: newX, y: newY });
      currentPosRef.current = { x: newX, y: newY };
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

  // Resizing Logic
  const handleResizeStart = (e: React.MouseEvent) => {
    if (isFullScreen) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    dragStartRef.current.mouseX = e.clientX;
    dragStartRef.current.mouseY = e.clientY;
    resizeStartRef.current = { startW: size.w, startH: size.h };
  };

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      const newW = Math.max(340, Math.min(850, resizeStartRef.current.startW - dx));
      const newH = Math.max(420, Math.min(900, resizeStartRef.current.startH - dy));
      setSize({ w: newW, h: newH });
    };
    const handleResizeEnd = () => setIsResizing(false);

    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  const activeOrbState = isListening ? 'listening' : isThinking ? 'thinking' : 'idle';
  const currentSuggestion = ROTATING_SUGGESTIONS[suggestionIdx];

  return (
    <>
      {/* Floating Action Button (AI Orb FAB) */}
      <button 
        onClick={() => { playClick(); setIsOpen(true); }}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] md:bottom-6 right-4 md:right-8 h-[54px] w-[54px] rounded-full shadow-[0_6px_24px_rgba(0,0,0,0.14)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 bg-[var(--bg-card)] border border-[var(--border-color)] overflow-hidden cursor-pointer ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        }`}
        aria-label="Open DOAB Assistant"
        title="Open DOAB Assistant"
      >
        <AIOrbFace state="idle" size={54} className="w-full h-full" />
      </button>

      {/* Assistant Draggable Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{
              width: isFullScreen ? '100vw' : `${size.w}px`,
              height: isFullScreen ? '100dvh' : `${size.h}px`,
              x: isFullScreen ? 0 : position.x,
              y: isFullScreen ? 0 : position.y,
              right: isFullScreen ? 0 : '2rem',
              bottom: isFullScreen ? 0 : '2rem',
              position: 'fixed'
            }}
            className={`neo-glass-card z-50 flex flex-col shadow-2xl ${
              isFullScreen ? 'rounded-none' : 'rounded-3xl border border-[var(--border-color)]'
            } ${isDragging ? 'cursor-grabbing' : ''}`}
          >
            {/* Top Drag Handle Bar */}
            <div 
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              className={`h-14 border-b border-[var(--border-color)] bg-[var(--bg-card)]/85 backdrop-blur-md flex items-center justify-between px-4 select-none ${
                isFullScreen ? '' : 'cursor-grab rounded-t-3xl'
              } ${isDragging ? 'cursor-grabbing bg-[var(--bg-main)]/95' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Tooltip content="History" position="bottom">
                  <button
                    onClick={() => { playClick(); setIsHistoryOpen(!isHistoryOpen); }}
                    className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/10 transition-colors cursor-pointer"
                    aria-label="Mission History"
                  >
                    <History className="h-4.5 w-4.5" />
                  </button>
                </Tooltip>
                
                {/* Header AI Orb Face with Status Tooltip */}
                <Tooltip content={isListening ? "Listening..." : isThinking ? "Analyzing..." : "Online"} position="bottom">
                  <div className="relative flex items-center justify-center cursor-pointer">
                    <div className="absolute inset-0 -m-1 rounded-full bg-[var(--color-brand-accent)]/20 blur-md pointer-events-none" />
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-black/5 dark:bg-white/10 flex items-center justify-center border border-[var(--border-color)] shrink-0 relative z-10">
                      <AIOrbFace state={activeOrbState} size={28} />
                    </div>
                  </div>
                </Tooltip>

                <span className="font-bold tracking-tight text-[var(--text-main)] text-sm">
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
                    <div className="flex justify-between items-center mb-3.5 pb-2.5 border-b border-[var(--border-color)]">
                      <span className="text-xs font-mono uppercase font-bold text-[var(--text-muted)]">Mission History</span>
                      <button 
                        onClick={() => { playClick(); newChat(); setIsHistoryOpen(false); }} 
                        className="px-2.5 py-1 rounded-xl bg-[var(--text-main)] text-[var(--bg-card)] flex items-center gap-1.5 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                      >
                        <Plus className="h-3.5 w-3.5" /> New Mission
                      </button>
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
                              onClick={(e) => { e.stopPropagation(); playClick(); deleteSession(s.id); }}
                              className="p-1 hover:text-[var(--danger-text)] opacity-60 hover:opacity-100 cursor-pointer ml-1.5 transition-colors"
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
                      <AIOrbFace size={64} state={activeOrbState} className="relative z-10 transition-transform group-hover:scale-105" />
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
                {(() => {
                  const lastAssistantMsgId = messages.filter(m => m.role === 'assistant').slice(-1)[0]?.id;
                  return messages.map((m) => {
                    const isLastAssistant = m.id === lastAssistantMsgId;
                    const isHovered = hoveredMsgId === m.id;
                    const shouldGaze = isLastAssistant || isHovered;

                    return (
                      <div
                        key={m.id}
                        onMouseEnter={() => setHoveredMsgId(m.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
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
                              state={playingMessageId === m.id ? 'speaking' : isHovered ? 'smile' : 'done'} 
                              gaze={shouldGaze}
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
                        {m.content}

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
                );
              });
            })()}

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
                  <Compass className="h-3.5 w-3.5 text-[var(--color-brand-accent)] shrink-0" />
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
                  type="text" 
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
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

            {/* Top-Left Resize Handle */}
            {!isFullScreen && (
              <div 
                onMouseDown={handleResizeStart}
                className="absolute top-0 left-0 w-5 h-5 cursor-nwse-resize z-50"
                title="Resize window"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
