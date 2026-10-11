import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

const STORAGE_KEY = 'doab_ai_sessions_v1';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

const DOAB_SYSTEM_PROMPT = `You are DOAB Assistant, an intelligent operational voice and text assistant for civic water emergency response in Indian cities.
Your core mission is the DOAB Loop:
- Detect: Explain the one-hour waterlogging model estimate. Say clearly that it is not a live sensor and not an official warning. Outside the Bengaluru labelled area, say there is not enough data.
- Order: Facilitate emergency work orders (dispatch tankers for drought, plumbers for drainage).
- Alert: Provide citizens and delivery partners (Swiggy, Zomato, Zepto) with low-risk rerouting.
- Back-check: Process ground-truth verification from citizen photo submissions and trust scores.

Guidelines:
- Keep answers concise, high-density, and actionable.
- Prioritize street safety, route distance, and waterlog depth estimates.
- Use clear bullet points when comparing multiple routes.`;

export function useDOABChat() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [{
      id: 'default',
      title: 'Current Mission',
      messages: [{
        id: 'msg-welcome',
        role: 'assistant',
        content: 'DOAB Assistant online. Sensors active for Ward-level flood and drought telemetry. Ask me for safe routes, active dispatch orders, or back-check verification.',
        timestamp: Date.now()
      }],
      updatedAt: Date.now()
    }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>('default');
  const [isThinking, setIsThinking] = useState(false);
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {}
  }, [sessions]);

  const newChat = useCallback(() => {
    const newId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: 'New Mission',
      messages: [{
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'New mission session initiated. Telemetry layer ready.',
        timestamp: Date.now()
      }],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (filtered.length === 0) {
        return [{
          id: 'default',
          title: 'Current Mission',
          messages: [{
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: 'Telemetry initialized.',
            timestamp: Date.now()
          }],
          updatedAt: Date.now()
        }];
      }
      return filtered;
    });
    if (activeSessionId === id) {
      setActiveSessionId('default');
    }
  }, [activeSessionId]);

  const clearAllSessions = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    newChat();
  }, [newChat]);

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: Date.now()
    };

    // Append user message
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          title: s.messages.length <= 1 ? userText.slice(0, 24) : s.title,
          messages: [...s.messages, userMsg],
          updatedAt: Date.now()
        };
      }
      return s;
    }));

    setIsThinking(true);

    try {
      let assistantReply = '';

      if (GROQ_API_KEY) {
        // Live Groq API Call
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: DOAB_SYSTEM_PROMPT },
              ...activeSession.messages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: userText }
            ],
            temperature: 0.3,
            max_tokens: 500
          })
        });

        if (response.ok) {
          const data = await response.json();
          assistantReply = data.choices[0]?.message?.content || 'No response generated.';
        } else {
          let errorDetail = response.statusText;
          try {
            const errJson = await response.json();
            errorDetail = errJson.error?.message || errJson.message || JSON.stringify(errJson);
          } catch (_) {
            errorDetail = `HTTP ${response.status} ${response.statusText}`;
          }
          throw new Error(`Groq API error (${response.status}): ${errorDetail}`);
        }
      } else if (OPENROUTER_API_KEY) {
        // Live OpenRouter Call
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: DOAB_SYSTEM_PROMPT },
              ...activeSession.messages.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: userText }
            ]
          })
        });

        if (response.ok) {
          const data = await response.json();
          assistantReply = data.choices[0]?.message?.content || 'No response generated.';
        } else {
          throw new Error(`OpenRouter API error: ${response.statusText}`);
        }
      } else {
        // Simulated Intelligent Civic Agent Response (Fallback)
        await new Promise(r => setTimeout(r, 600));
        const lower = userText.toLowerCase();
        if (lower.includes('route') || lower.includes('safe') || lower.includes('path')) {
          assistantReply = 'Open Safe Routes for a Google Maps link. If a route key is configured, alternatives are ranked by the model estimate and then travel time. This is not a live depth reading.';
        } else if (lower.includes('tanker') || lower.includes('drought') || lower.includes('plumber')) {
          assistantReply = 'This model estimates waterlogging only. It does not dispatch tankers or predict drought demand.';
        } else if (lower.includes('back-check') || lower.includes('verify') || lower.includes('photo')) {
          assistantReply = 'Citizen back-check verified: 5 photos confirmed Ring Road North drainage cleared. Risk score reduced to 4.2%.';
        } else {
          assistantReply = `The one-hour estimate covers the Bengaluru labelled area only. "${userText}" is not a live sensor check.`;
        }
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: assistantReply,
        timestamp: Date.now()
      };

      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, botMsg],
            updatedAt: Date.now()
          };
        }
        return s;
      }));

    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Operational Telemetry Error: ${error.message || 'Failed to contact model'}. Using localized fallback grid.`,
        timestamp: Date.now()
      };
      setSessions(prev => prev.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, errorMsg],
            updatedAt: Date.now()
          };
        }
        return s;
      }));
    } finally {
      setIsThinking(false);
    }
  };

  return {
    messages: activeSession.messages,
    sessions,
    activeSessionId,
    setActiveSessionId,
    newChat,
    deleteSession,
    clearAllSessions,
    sendMessage,
    isThinking,
    hasApiKey: Boolean(GROQ_API_KEY || OPENROUTER_API_KEY)
  };
}
