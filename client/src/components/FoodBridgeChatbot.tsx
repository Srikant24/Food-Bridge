import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '../services/api';
import { 
  Bot, 
  X, 
  Send, 
  ArrowRight, 
  Utensils,
  Sparkles,
  Minimize2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: 'gemini' | 'rule-based-fallback';
  draft?: {
    title: string;
    quantityMeals: number;
    quantityKg: number;
    foodCategory: string;
    dietaryType: string;
    storageRequirement: string;
    city: string;
    description: string;
  };
}

export const FoodBridgeChatbot: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hello! I am FoodBridge AI. I can parse surplus food descriptions in plain English, explain our 5-factor matching algorithm, verify safety temperatures, or guide your NGO donation request. How can I help you today?',
    }
  ]);

  const [showTooltip, setShowTooltip] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-5).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await apiClient.post('/api/ai/chat', {
        message: textToSend.trim(),
        history: historyPayload,
      });

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: res.data.reply,
        source: res.data.source,
        draft: res.data.draft,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'I am currently unable to reach the AI engine. Please verify the backend server is active on port 5000.',
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handlePopulateDraft = (draft: any) => {
    setIsOpen(false);
    navigate('/donations/create', { state: { prefilledDraft: draft } });
  };

  return (
    <>
      {/* Floating Circular Assistant Launcher */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5"
          >
            {/* Context Tooltip Pill: High-contrast & Dismissible */}
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="hidden md:flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-full bg-white border border-forest/20 shadow-lg text-xs font-bold text-darkink backdrop-blur-md select-none"
              >
                <Sparkles className="w-3.5 h-3.5 text-apricot shrink-0" />
                <span>Need help listing food?</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(false);
                  }}
                  className="p-1 rounded-full hover:bg-cream text-darkink/60 hover:text-darkink transition-colors cursor-pointer"
                  aria-label="Dismiss tooltip"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}

            <button
              onClick={() => setIsOpen(true)}
              className="relative w-13 h-13 rounded-full bg-forest hover:bg-forest-700 text-white shadow-editorial hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center border-2 border-white group cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
              aria-label="Open FoodBridge AI Assistant"
            >
              <Bot className="w-6 h-6 text-white transition-transform group-hover:rotate-12" />

              {/* Status dot */}
              <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-apricot border-2 border-white ring-1 ring-forest/30" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Floating Chat Panel with Spring Opening */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 40 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[95vw] sm:w-[420px] h-[600px] max-h-[86vh] rounded-3xl border border-sage/80 shadow-2xl flex flex-col overflow-hidden bg-white/95 backdrop-blur-lg"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-forest via-forest to-emerald-900 text-white flex items-center justify-between border-b border-forest-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-forest-900 text-lime flex items-center justify-center border border-lime/30 shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-display font-extrabold text-sm flex items-center gap-1.5">
                    FoodBridge <span className="text-lime">AI Assistant</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-lime border border-lime/30">
                      Live
                    </span>
                  </div>
                  <p className="text-[11px] text-charcoal-300 font-medium">
                    Surplus Parsing & Safety Guidance
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-charcoal-300 hover:text-white hover:bg-forest-800/60 transition-colors"
                  aria-label="Minimize Chat"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-xl text-charcoal-300 hover:text-white hover:bg-forest-800/60 transition-colors"
                  aria-label="Close Chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-gradient-to-b from-ivory/50 via-white to-white">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`p-3.5 rounded-2xl max-w-[88%] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-forest text-white rounded-br-xs shadow-sm font-medium'
                        : 'bg-white text-charcoal-800 border border-sage/80 rounded-bl-xs shadow-xs'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>

                    {/* Structured Draft Preview Pill if extracted */}
                    {msg.draft && (
                      <div className="mt-3 p-3 rounded-xl bg-ivory border border-emerald-300 shadow-sm space-y-2 text-charcoal-900">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
                            Extracted Listing Draft
                          </span>
                          <span className="font-bold text-[11px] text-forest">
                            {msg.draft.quantityMeals} Meals
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-charcoal-900">{msg.draft.title}</div>
                        <div className="text-[10px] text-charcoal-500">
                          Category: {msg.draft.foodCategory.replace('_', ' ')} • {msg.draft.storageRequirement.replace('_', ' ')}
                        </div>
                        <button
                          onClick={() => handlePopulateDraft(msg.draft)}
                          className="w-full py-2 px-3 rounded-lg bg-forest hover:bg-forest-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors border border-forest/20"
                        >
                          <Utensils className="w-3.5 h-3.5 text-white" />
                          <span>Pre-fill in Create Listing Form</span>
                          <ArrowRight className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    )}
                  </div>

                  {msg.source && (
                    <span className="text-[9px] text-charcoal-400 mt-0.5 px-1 font-mono">
                      powered by {msg.source}
                    </span>
                  )}
                </div>
              ))}

              {/* Animated Typing Indicator */}
              {loading && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-white border border-sage/80 max-w-[120px] shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips (FoodBridge 3.0 Prompts) */}
            <div className="px-3 py-2 bg-cream/90 border-t border-sage/70 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { label: 'Create a food listing', prompt: 'I want to create a food listing. I have 40 portions of fresh cooked rice and dal prepared 1 hour ago.' },
                { label: 'Find nearby NGOs', prompt: 'Find nearby verified NGOs and community kitchens in Delhi NCR ready to receive food.' },
                { label: 'Show urgent donations', prompt: 'Show urgent donations with less than 3 hours remaining before expiry.' },
                { label: 'Explain matching scores', prompt: 'Explain how the 5-factor matching algorithm calculates the percentage score.' }
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(chip.prompt)}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white border border-emerald-200/80 hover:border-emerald-500 hover:bg-emerald-50/70 text-[11px] text-forest font-semibold transition-all duration-200 shrink-0 shadow-2xs hover:scale-105 active:scale-95 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Input Box */}
            <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-sage/70 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question or describe surplus meals..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-sage/90 text-xs bg-ivory/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-2.5 rounded-xl bg-forest hover:bg-forest-700 text-white disabled:opacity-40 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-1"
                aria-label="Send message"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
