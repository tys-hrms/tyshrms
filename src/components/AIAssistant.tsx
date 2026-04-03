import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
}

export default function AIAssistant() {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'ai', text: `Hello ${session.currentUser?.name.split(' ')[0] || ''}, I am your workspace AI. How can I assist you with operations today?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMsg: Message = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);

    // Mock AI response
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev, 
        { 
          id: (Date.now() + 1).toString(), 
          sender: 'ai', 
          text: "I do not have a live API key configured right now. Please have the Administrator update the AI Integration Key in System Settings." 
        }
      ]);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-slate-900/80 backdrop-blur-md border border-slate-700 hover:border-emerald-500 rounded-2xl flex items-center justify-center text-slate-300 shadow-xl transition-all active:scale-95 group"
        title="AI Assistant"
      >
        <Bot className="w-5 h-5 group-hover:text-emerald-500 transition-colors" />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] z-[100] bg-slate-950/95 backdrop-blur-3xl border border-slate-800 rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex flex-col animate-in slide-in-from-bottom-8 duration-300">
          {/* Header */}
          <div className="h-16 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center relative">
                <Bot className="w-5 h-5 text-emerald-500" />
                <div className="absolute top-0 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-widest uppercase">Workspace AI</h3>
                <p className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Online
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors p-2 rounded-xl hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${
                  msg.sender === 'user' 
                    ? 'bg-custom-blue text-white rounded-tr-sm shadow-md shadow-custom-blue/20' 
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm'
                }`}>
                  <div className="flex items-center gap-2 mb-1 opacity-50">
                    {msg.sender === 'user' ? <UserIcon className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {msg.sender === 'user' ? 'You' : 'AI'}
                    </span>
                  </div>
                  <p className="leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm p-4 flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={endOfMessagesRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-slate-900/80 border-t border-slate-800 relative shrink-0">
             <input 
               type="text" 
               value={input}
               onChange={e => setInput(e.target.value)}
               onKeyDown={handleKeyDown}
               placeholder="Ask anything about today's tasks..."
               className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-4 pr-12 py-3.5 text-sm text-white focus:border-emerald-500 outline-none transition-colors"
             />
             <button 
               onClick={handleSend}
               disabled={!input.trim()}
               className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-custom-blue hover:text-blue-400 disabled:text-slate-700 transition-colors"
             >
               <Send className="w-4 h-4" />
             </button>
          </div>
        </div>
      )}
    </>
  );
}
