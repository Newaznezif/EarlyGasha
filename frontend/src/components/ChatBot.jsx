import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Send, X, Bot, User, Loader2 } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

const ChatBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'bot', content: 'Hello! I am EarlyGasha AI. Ask me about humanitarian risks in East Africa.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE}/chat`, { message: input });
            setMessages(prev => [...prev, { role: 'bot', content: response.data.response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', content: 'Sorry, I am having trouble connecting to the intelligence engine.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[2000]">
            {!isOpen ? (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 transition-all transform hover:scale-110 flex items-center justify-center"
                >
                    <MessageSquare size={24} />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                    </span>
                </button>
            ) : (
                <div className="w-96 h-[500px] glass-card rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-white/10 animate-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="p-4 bg-slate-800/80 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Bot size={20} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm">Gasha Intelligence</h3>
                                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                    Autonomous Agent Online
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-grow overflow-y-auto p-4 space-y-4">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                                    m.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-tr-none' 
                                    : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                                }`}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 border border-white/5 p-3 rounded-2xl rounded-tl-none">
                                    <Loader2 size={16} className="animate-spin text-blue-400" />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-white/5 bg-slate-800/30">
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Analyze Tigray region..."
                                className="flex-grow bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                            />
                            <button 
                                onClick={handleSend}
                                disabled={loading}
                                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatBot;
