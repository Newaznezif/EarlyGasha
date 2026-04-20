import React, { useState } from 'react';
import { User, Shield, Key, Save, X } from 'lucide-react';
import api from '../auth/api';
import { useAuth } from '../auth/AuthContext';

const ProfileModal = ({ isOpen, onClose }) => {
    const { user, setUser } = useAuth();
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        bio: user?.bio || '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.put('/auth/profile', formData);
            localStorage.setItem('user', JSON.stringify(res.data));
            if (setUser) setUser(res.data);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error("Profile update failed:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-card w-full max-w-md p-6 relative shadow-2xl border border-white/10">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <User className="text-primary w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Identity Configuration</h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Active Operator Node</p>
                    </div>
                </div>

                <form onSubmit={handleUpdate} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Personnel Name</label>
                        <input 
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                            placeholder="Operator Full Name"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Tactical Bio / Designation</label>
                        <textarea 
                            rows="2"
                            value={formData.bio}
                            onChange={(e) => setFormData({...formData, bio: e.target.value})}
                            placeholder="Mission designation or bio..."
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-tighter flex items-center gap-2">
                            <Key size={12} className="text-amber-500" /> Rotate Security Key (Password)
                        </label>
                        <input 
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            placeholder="Leave blank to keep current"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                        />
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                                success ? 'bg-emerald-600 text-white' : 'bg-primary hover:bg-primary-hover text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                            }`}
                        >
                            {loading ? 'Processing...' : success ? <><Save size={14}/> Node Synchronized</> : <><Save size={14}/> Update Matrix</>}
                        </button>
                    </div>
                    
                    <p className="text-[9px] text-center text-slate-600 italic">
                        Command Authority can monitor all profile modifications in real-time.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default ProfileModal;
