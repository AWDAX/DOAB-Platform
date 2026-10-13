import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Send, Mic, MicOff, Plus, Clock, Download, Copy, Check, 
  Volume2, VolumeX, Maximize2, Minimize2, Trash2, Search,
  ChevronRight, X, MessageSquarePlus
} from 'lucide-react';
import AIOrbFace from '../components/AIOrbFace';
import { FormattedChatText } from '../components/FormattedChatText';
import { PageTourButton } from '../components/GuidedTour';
import { playClick } from '../utils/soundFx';
import { useDOABChat } from '../hooks/useDOABChat';
import ConfirmationModal from '../components/ConfirmationModal';
import { useSearchParams } from 'react-router-dom';

const ROTATING_SUGGESTIONS = [
  { label: 'Safe Bypass to MG Road', query: 'MG Road underpass avoid karne ke liye safest bypass corridor kaunsa hai?' },
  { label: 'Koramangala Waterlogging Depth', query: 'Koramangala 4th Block mein current waterlogging depth aur hazard level kya hai?' },
  { label: 'Ward Tanker Supply Status', query: 'Are there any emergency water tanker allocations scheduled for my ward today?' },
  { label: 'Silk Board Inundation Risk', query: 'Is Silk Board junction clear or is there waterlogging on the service road?' },
  { label: 'Drainage Overflow Alert', query: 'Nearest stormwater nallah overflow status and rainfall forecast for my area.' }
];

export default function AssistantPage() {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
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

  const [searchParams, setSearchParams] = useSearchParams();

  // Handle ?q= query parameter from global search bar
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.trim()) {
      setDraft(q.trim());
      setInputVal(q.trim());
      setSearchParams((prev) => {
        prev.delete('q');
        return prev;
      }, { replace: true });
    }
  }, [searchParams, setDraft, setSearchParams]);

  // Sync inputVal with persistent draft for active session
  useEffect(() => {
    setInputVal(draft || '');
  }, [draft, activeSessionId]);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggleFullscreen = useCallback(() => {
    playClick();
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          setIsFullScreen((prev) => !prev);
        });
      } else {
        setIsFullScreen((prev) => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {
          setIsFullScreen(false);
        });
      } else {
        setIsFullScreen(false);
      }
    }
  }, []);

  // Clear unread AI notifications when user visits Assistant page
  useEffect(() => {
    try {
      localStorage.removeItem('doab_has_unread_ai_response');
      window.dispatchEvent(new CustomEvent('doab:ai-read'));
    } catch (_) {}
  }, []);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Sync native fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Handle Speech-to-Text
  const handleToggleListening = useCallback(() => {
    playClick();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported on this browser.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputVal(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [isListening]);

  // Handle Read Aloud / Text-to-Speech
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

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onstart = () => setPlayingMessageId(messageId);
    utterance.onend = () => setPlayingMessageId(null);
    utterance.onerror = () => setPlayingMessageId(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (id: string, text: string) => {
    playClick();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || isThinking) return;
    const textToSend = inputVal;
    setInputVal('');
    setDraft('');
    sendMessage(textToSend);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleExportChat = () => {
    playClick();
    const exportText = messages.map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.role.toUpperCase()}:\n${m.content}\n`).join('\n---\n\n');
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doab-assistant-${activeSessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredSessions = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.messages.some(m => m.content.toLowerCase().includes(q))
    );
  }, [sessions, historySearch]);

  const orbState = isThinking 
    ? 'thinking' 
    : isListening 
      ? 'listening' 
      : playingMessageId 
        ? 'speaking' 
        : 'idle';

  return (
    <div 
      ref={containerRef}
      className={`w-full mx-auto flex flex-col min-h-0 flex-1 transition-all duration-300 ${
        isFullScreen 
          ? 'fixed inset-0 z-[9999] p-3 sm:p-6 md:p-8 pt-4 sm:pt-6 bg-[var(--bg-main)] h-[100dvh] max-h-[100dvh] overflow-hidden' 
          : 'h-full max-h-full max-w-6xl p-2 sm:p-4 md:p-6 pb-2 overflow-hidden'
      }`}
    >
      {/* Page Header Bar */}
      <div id="tour-assistant-header" className={`relative flex items-center justify-between gap-2 sm:gap-3 mb-2 sm:mb-3 shrink-0 ${isFullScreen ? 'min-h-12' : ''}`}>
        <div className={`hidden md:flex [@media(pointer:coarse)]:!hidden items-center gap-3 min-w-0 ${
          isFullScreen 
            ? 'absolute inset-x-0 mx-auto w-fit z-0 select-none' 
            : ''
        }`}>
          <div className="relative flex items-center justify-center shrink-0">
            <span
              aria-hidden="true"
              className="absolute inset-0 -m-1.5 rounded-full bg-[var(--color-brand-accent)]/20 blur-md pointer-events-none"
            />
            <div className="relative z-10 w-11 h-11 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center shadow-xs overflow-hidden">
              <AIOrbFace 
                state={isListening ? 'listening' : isThinking ? 'thinking' : 'idle'} 
                size={44} 
                gaze={true}
                className="w-full h-full pointer-events-none" 
              />
            </div>
          </div>
          <div className={`min-w-0 ${isFullScreen ? 'text-center' : ''}`}>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-main)] truncate">
              DOAB Operational Assistant
            </h1>
            <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">
              Dual-Climate Telemetry & Verified Emergency Routing
            </p>
          </div>
        </div>

        {/* Empty left spacer when fullscreen to balance layout */}
        {isFullScreen && <div className="hidden md:block w-10 z-10" />}

        {/* Action Controls Toolbar (Full-width balanced pills on Mobile/Touch, Right-aligned on Desktop) */}
        <div id="tour-assistant-actions" className="w-full md:w-auto [@media(pointer:coarse)]:w-full flex items-center justify-between md:justify-end gap-2 shrink-0 z-10">
          <PageTourButton pageKey="assistant" label="Assistant Guide" className="flex-1 sm:flex-initial justify-center" />

          <button
            type="button"
            onClick={() => {
              playClick();
              setIsHistoryOpen(false);
              newChat();
              setTimeout(() => inputRef.current?.focus(), 80);
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold bg-[var(--text-main)] text-[var(--bg-card)] hover:opacity-90 transition-all duration-200 cursor-pointer shadow-xs select-none whitespace-nowrap"
            title="Start New Session"
          >
            <Plus size={15} className="shrink-0" />
            <span>New Session</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playClick();
              setIsHistoryOpen(prev => !prev);
            }}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all duration-200 cursor-pointer select-none whitespace-nowrap ${
              isHistoryOpen
                ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-950 dark:border-white shadow-xs'
                : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] hover:border-[var(--text-main)]/40'
            }`}
            title="Past Sessions"
          >
            <Clock size={15} className="shrink-0" />
            <span>Sessions</span>
            {sessions.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-current/15 font-mono font-semibold leading-none">
                {sessions.length}
              </span>
            )}
          </button>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleExportChat}
              title="Export Conversation"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Download size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="hidden md:inline-flex [@media(pointer:coarse)]:!hidden items-center justify-center w-9 h-9 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer shadow-xs shrink-0"
          >
            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Main Assistant Body Container */}
      <div className="flex-1 relative rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]/80 backdrop-blur-xl shadow-sm flex flex-col min-h-0 overflow-hidden">
        
        {/* Past Sessions Slide-over Drawer (SWATVA Pattern) */}
        {isHistoryOpen && (
          <div className="absolute inset-0 z-30 bg-[var(--bg-card)]/98 backdrop-blur-2xl flex flex-col p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] gap-2 flex-wrap">
              <span className="text-xs font-bold tracking-tight text-[var(--text-main)] flex items-center gap-2">
                <Clock size={15} className="text-[var(--text-main)] dark:text-neutral-200 shrink-0" />
                <span>Mission & Consultation History</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsHistoryOpen(false);
                    newChat();
                    setTimeout(() => inputRef.current?.focus(), 80);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[var(--text-main)] text-[var(--bg-card)] text-xs font-semibold hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-xs select-none whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>New Session</span>
                </button>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setIsClearAllConfirmOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border border-rose-600/25 text-rose-700 dark:text-rose-300 bg-rose-950/[0.06] dark:bg-rose-500/[0.12] hover:bg-rose-500/20 active:scale-98 transition-all cursor-pointer select-none whitespace-nowrap"
                    title="Clear consultation history"
                  >
                    <Trash2 size={14} />
                    <span>Clear All</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsHistoryOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-main)]/30 hover:bg-[var(--text-main)]/5 active:scale-98 transition-all cursor-pointer select-none whitespace-nowrap"
                  aria-label="Close History"
                  title="Close History"
                >
                  <X size={14} />
                  <span>Close</span>
                </button>
              </div>
            </div>

            <div className="mt-3 relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search past inquiries..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto mt-3 space-y-1.5 custom-scrollbar pr-1">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    playClick();
                    setActiveSessionId(session.id);
                    setIsHistoryOpen(false);
                  }}
                  className={`group p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer select-none ${
                    session.id === activeSessionId
                      ? 'border-[var(--text-main)] bg-[var(--text-main)]/5 shadow-xs'
                      : 'border-[var(--border-color)] hover:border-[var(--text-main)]/30 hover:bg-[var(--text-main)]/5'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--text-main)] truncate">
                      {session.title || 'Civic Inundation Query'}
                    </p>
                    <p className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5">
                      {session.messages.length} messages • {new Date(session.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      playClick();
                      setSessionToDelete({ id: session.id, title: session.title || 'Civic Inundation Query' });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
                    title="Delete this consultation session"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversation Stream Scroll View */}
        <div id="tour-assistant-chat" className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8 space-y-5 custom-scrollbar min-h-0">
          {!messages.some((m) => m.role === 'user') ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-8 sm:py-12 px-4">
              <div 
                className="relative mb-5 group cursor-pointer" 
                onClick={handleToggleListening}
                title={isListening ? "Listening... (Click to stop)" : "Click to speak with DOAB Copilot"}
              >
                <div className="absolute inset-0 -m-5 rounded-full bg-[var(--text-main)]/10 blur-2xl pointer-events-none transition-all group-hover:scale-125 animate-pulse" />
                <AIOrbFace size={92} state={orbState} className="relative z-10 transition-transform group-hover:scale-105" />
              </div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-main)]">
                How can DOAB help you navigate or dispatch today?
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-md mt-1.5 leading-relaxed">
                Our dual-climate engine computes live low-lying waterlog corridors, high-ground ridgeline safe paths, and drought tanker telemetry.
              </p>
              
              <div className="mt-6 flex flex-col sm:flex-row flex-wrap justify-center gap-2 max-w-lg w-full">
                {ROTATING_SUGGESTIONS.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      playClick();
                      sendMessage(item.query);
                    }}
                    className="text-left text-xs px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] hover:border-[var(--text-main)]/40 hover:bg-[var(--text-main)]/5 transition-all cursor-pointer text-[var(--text-main)] flex items-center justify-between gap-2 shadow-2xs group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquarePlus size={13} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] shrink-0 transition-colors" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <ChevronRight size={13} className="text-[var(--text-muted)] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="flex justify-end items-start gap-2 group">
                  <button
                    type="button"
                    onClick={() => handleCopy(m.id, m.content)}
                    title="Copy text"
                    className="opacity-0 group-hover:opacity-100 p-1.5 mt-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--text-main)]/5 transition-all"
                  >
                    {copiedId === m.id ? <Check size={13} className="text-[var(--text-main)] dark:text-neutral-200" /> : <Copy size={13} />}
                  </button>
                  <div className="max-w-[85%] rounded-2xl rounded-br-xs px-4 sm:px-5 py-3 text-xs sm:text-sm bg-[var(--text-main)] text-[var(--bg-card)] leading-relaxed shadow-xs">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-3 sm:gap-3.5 max-w-[94%] group">
                  <div className="shrink-0 mt-0.5">
                    <AIOrbFace size={30} state={playingMessageId === m.id ? 'speaking' : 'idle'} gaze={false} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="rounded-2xl rounded-tl-xs px-4 sm:px-5 py-3.5 text-xs sm:text-sm leading-relaxed border border-[var(--border-color)] bg-[var(--bg-main)] text-[var(--text-main)] shadow-xs">
                      <FormattedChatText content={m.content} />
                    </div>

                    <div className="mt-1.5 flex items-center gap-2 px-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(m.id, m.content)}
                        className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedId === m.id ? <Check size={11} className="text-[var(--text-main)] dark:text-neutral-200" /> : <Copy size={11} />}
                        <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleReadAloud(m.id, m.content)}
                        className={`text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-colors ${
                          playingMessageId === m.id 
                            ? 'text-[var(--text-main)] dark:text-neutral-200 font-bold' 
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {playingMessageId === m.id ? (
                          <VolumeX size={11} className="animate-pulse" />
                        ) : (
                          <Volume2 size={11} />
                        )}
                        <span>{playingMessageId === m.id ? 'Stop Reading' : 'Read Aloud'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            )
          )}

          {isThinking && (
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-mono pl-1">
              <AIOrbFace size={26} state="thinking" className="shrink-0" />
              <span className="animate-pulse">Computing operational telemetry & routing model...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar Form */}
        <form
          id="tour-assistant-input"
          onSubmit={handleSubmit}
          className="p-3 sm:p-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]/60 shrink-0 flex items-center gap-2"
        >
          <div className={`flex-1 flex items-center rounded-2xl border transition-all duration-200 px-3.5 py-2.5 min-h-[46px] ${
            isListening
              ? 'border-[var(--text-main)] ring-2 ring-[var(--text-main)]/20 bg-[var(--text-main)]/5'
              : 'border-[var(--border-color)] bg-[var(--bg-card)] focus-within:border-[var(--text-main)]/80 focus-within:ring-2 focus-within:ring-[var(--text-main)]/20'
          }`}>
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setDraft(e.target.value);
              }}
              placeholder={isListening ? 'Listening… Speak your operational request' : 'Ask about safe elevation routes, waterlogged roads, or active tanker dispatches...'}
              disabled={isThinking}
              className="w-full bg-transparent text-xs sm:text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none border-none focus:ring-0 leading-relaxed"
            />
          </div>

          {/* Voice Input Mic Toggle */}
          <button
            type="button"
            onClick={handleToggleListening}
            title={isListening ? 'Stop Listening' : 'Voice Input'}
            className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              isListening
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-lg scale-105 animate-pulse'
                : 'border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-main)]/40'
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          {/* Send Message Button */}
          <button
            type="submit"
            disabled={!inputVal.trim() || isThinking}
            title="Send Message"
            className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              inputVal.trim() && !isThinking
                ? 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 shadow-md active:scale-95'
                : 'border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)] cursor-not-allowed opacity-40'
            }`}
          >
            <Send size={15} />
          </button>
        </form>
      </div>

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
    </div>
  );
}
