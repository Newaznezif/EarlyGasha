import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Bell, MapPin, 
  ShieldAlert, Users, Radio, Globe, 
  Search, X, Plus, ChevronRight, 
  Volume2, Image as ImageIcon, CheckCircle2,
  Clock, Hash, Lock, MoreVertical, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import api, { getWebSocketUrl } from '../auth/api';

const Card = ({ children, className = "" }) => (
  <div className={`glass-card overflow-hidden relative group transition-all duration-500 ${className}`}>
    {children}
  </div>
);

const Badge = ({ children, variant = "default" }) => {
  const styles = {
    default: "bg-slate-800 text-slate-300 border-slate-700",
    critical: "bg-red-500/20 text-red-500 border-red-500/30",
    urgent: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    info: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    success: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
  };
  return (
    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${styles[variant] || styles.default}`}>
      {children}
    </span>
  );
};

export default function CommunicationHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Incident Form State
  const [incidentForm, setIncidentForm] = useState({ region_id: "", title: "", content: "", severity: "INFO" });
  // Alert Form State
  const [alertForm, setAlertForm] = useState({ region_id: "", severity: "INFO", channels: "WEB", message: "" });
  
  const wsRef = useRef(null);
  const [wsStatus, setWsStatus] = useState('disconnected');
  
  const [view, setView] = useState('chat'); // chat, incidents, alerts
  const chatEndRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [roomsRes, incidentsRes, alertsRes] = await Promise.all([
          api.get('/comm/rooms'),
          api.get('/comm/incidents'),
          api.get('/comm/alerts')
        ]);
        setRooms(roomsRes.data);
        setIncidents(incidentsRes.data);
        setAlerts(alertsRes.data);
        
        if (roomsRes.data.length > 0) {
          setActiveRoom(roomsRes.data[0]);
        }
      } catch (err) {
        console.error("Comm hydration failure:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (activeRoom) {
      fetchMessages();
      connectWebSocket(activeRoom.id);
      return () => {
        if (wsRef.current) wsRef.current.close();
      };
    }
  }, [activeRoom]);

  const connectWebSocket = (roomId) => {
    if (wsRef.current) wsRef.current.close();
    
    const wsUrl = getWebSocketUrl(`/ws/chat/${roomId}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus('connected');
    ws.onclose = () => setWsStatus('disconnected');
    ws.onmessage = (event) => {
        const message = jsonSafeParse(event.data);
        if (!message) return;
        
        if (message.type === 'chat_message' && message.data.room_id === roomId) {
            setMessages(prev => {
                if (prev.find(m => m.id === message.data.id)) return prev;
                return [...prev, message.data];
            });
        } else if (message.type === 'incident_update') {
            setIncidents(prev => [message.data, ...prev]);
        } else if (message.type === 'crisis_alert') {
            setAlerts(prev => [message.data, ...prev]);
        }
    };
  };

  const jsonSafeParse = (data) => {
    try { return JSON.parse(data); }
    catch (e) { return null; }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!activeRoom) return;
    try {
      const res = await api.get(`/comm/rooms/${activeRoom.id}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error("Message sync error:", err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom || isSending) return;
    
    setIsSending(true);
    try {
      await api.post(`/comm/rooms/${activeRoom.id}/messages`, { content: newMessage });
      setNewMessage("");
      fetchMessages();
    } catch (err) {
      console.error("Transmission failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handlePostIncident = async (e) => {
    e.preventDefault();
    try {
        await api.post('/comm/incidents', incidentForm);
        setShowIncidentModal(false);
        setIncidentForm({ region_id: "", title: "", content: "", severity: "INFO" });
    } catch (err) {
        console.error("Incident logging failure:", err);
    }
  };

  const handleTriggerAlert = async (e) => {
    e.preventDefault();
    try {
        await api.post('/comm/alerts', alertForm);
        setAlertForm({ region_id: "", severity: "INFO", channels: "WEB", message: "" });
    } catch (err) {
        console.error("Alert dispatch failure:", err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <span className="font-mono text-primary tracking-[0.5em] text-xs animate-pulse">ESTABLISHING SECURE COMMS LINK...</span>
    </div>
  );

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-edge bg-element/50 backdrop-blur-xl z-10 shrink-0">
        <div className="flex items-center gap-4">
           <button 
             onClick={() => navigate(-1)}
             className="p-2 hover:bg-slate-800 rounded-xl border border-edge transition-colors"
           >
             <Radio className="w-5 h-5 text-primary" />
           </button>
           <button 
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 hover:bg-slate-800 rounded-xl border border-edge transition-colors"
           >
              <Users className="w-5 h-5 text-primary" />
           </button>
           <div>
              <h1 className="text-xl font-black text-default tracking-tighter uppercase flex items-center gap-2">
                 Real-Time Crisis Communication Hub
                 <Badge variant={wsStatus === 'connected' ? "success" : "critical"}>
                    {wsStatus === 'connected' ? 'Link Stable' : 'Link Interrupted'}
                 </Badge>
              </h1>
              <div className="flex items-center gap-4 text-[10px] text-muted font-bold">
                 <span className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-emerald-500" /> End-to-End Encrypted</span>
                 <span className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-blue-500" /> Auto-Translation Active</span>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-2">
            {['chat', 'incidents', 'alerts'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  view === v ? 'bg-primary text-black' : 'text-muted hover:text-default bg-element/30'
                }`}
              >
                {v}
              </button>
            ))}
        </div>
      </header>

      <div className="flex flex-grow overflow-hidden relative">
        {/* Sidebar: Rooms */}
        <div className={`
            absolute lg:relative z-40 h-full w-80 border-r border-edge flex flex-col bg-black lg:bg-element/20 shrink-0 transition-transform duration-300
            ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
           <div className="p-4 border-b border-edge">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                 <input 
                    type="text" 
                    placeholder="Search Channels..." 
                    className="w-full pl-10 pr-4 py-2 bg-black/40 border border-edge rounded-xl text-xs focus:outline-none focus:border-primary/50"
                 />
              </div>
           </div>

           <div className="p-4 flex-grow overflow-y-auto custom-scrollbar">
              <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center justify-between">
                 Active Coordination Rooms
                 <Plus className="w-4 h-4 cursor-pointer hover:text-primary transition-colors" />
              </h3>
              <div className="space-y-1">
                 {rooms.map(room => (
                   <button
                      key={room.id}
                      onClick={() => { setActiveRoom(room); setShowSidebar(false); }}
                      className={`w-full p-3 rounded-2xl flex items-start gap-3 transition-all ${
                        activeRoom?.id === room.id ? 'bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5' : 'hover:bg-slate-800/50'
                      }`}
                   >
                      <div className={`p-2 rounded-xl ${room.is_private ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                         {room.is_private ? <Lock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                         <span className={`text-xs font-bold ${activeRoom?.id === room.id ? 'text-primary' : 'text-slate-300'}`}>{room.name}</span>
                         <span className="text-[10px] text-muted truncate w-full">{room.description}</span>
                      </div>
                   </button>
                 ))}
              </div>
           </div>

           <div className="p-4 border-t border-edge bg-slate-900/50">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-black text-black">
                    {user?.name?.[0]?.toUpperCase()}
                 </div>
                 <div className="flex flex-col">
                    <span className="text-xs font-bold text-default">{user?.name}</span>
                    <span className="text-[10px] text-primary uppercase font-black">{user?.role?.replace('_', ' ')}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow flex flex-col relative bg-gradient-to-b from-transparent to-primary/5">
           {view === 'chat' && activeRoom && (
             <>
               {/* Messages Area */}
               <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
                       <MessageSquare className="w-20 h-20 mb-4" />
                       <p className="font-mono text-xs uppercase tracking-[0.3em]">Channel Established. Awaiting Transmissions.</p>
                    </div>
                  ) : (
                    messages.map((m, i) => (
                      <div key={i} className={`flex items-start gap-4 ${m.sender_name === user?.name ? 'flex-row-reverse' : ''}`}>
                         <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center font-black text-xs ${
                           m.role === 'system_admin' ? 'bg-red-500 text-white' : 
                           m.role === 'field_officer' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-black'
                         }`}>
                            {m.sender_name[0].toUpperCase()}
                         </div>
                         <div className={`flex flex-col max-w-[70%] gap-1 ${m.sender_name === user?.name ? 'items-end' : ''}`}>
                            <div className="flex items-center gap-2 px-1">
                               <span className="text-[10px] font-black text-default uppercase tracking-tight">{m.sender_name}</span>
                               <span className="text-[9px] text-muted font-mono">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className={`p-4 rounded-3xl text-xs leading-relaxed ${
                              m.sender_name === user?.name 
                               ? 'bg-primary text-black rounded-tr-none font-bold shadow-xl shadow-primary/10' 
                               : 'bg-element border border-edge text-default rounded-tl-none backdrop-blur-md'
                            }`}>
                               {m.content}
                               {m.translated_content && (
                                 <div className="mt-2 pt-2 border-t border-white/10 text-[10px] italic opacity-80 flex items-center gap-2">
                                    <Globe className="w-3 h-3" /> {m.translated_content}
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
               </div>

               {/* Input Area */}
               <div className="p-6 shrink-0">
                  <form onSubmit={handleSendMessage} className="relative group">
                     <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent scale-x-0 group-focus-within:scale-x-100 transition-transform duration-700" />
                     <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Transmit to ${activeRoom.name}...`}
                        className="w-full bg-element/50 border border-edge rounded-3xl px-6 py-5 text-sm focus:outline-none focus:border-primary/50 backdrop-blur-xl transition-all shadow-2xl"
                     />
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                         <button type="button" className="p-2 text-muted hover:text-primary transition-colors"><ImageIcon className="w-4 h-4" /></button>
                         <button 
                            disabled={!newMessage.trim() || isSending}
                            className="p-3 bg-primary text-black rounded-2xl hover:scale-110 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                         >
                            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                         </button>
                     </div>
                  </form>
               </div>
             </>
           )}

           {view === 'incidents' && (
              <div className="flex-grow overflow-y-auto p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                 <div className="flex justify-between items-end">
                    <div>
                       <h2 className="text-3xl font-black text-default tracking-tighter uppercase">Incident Feed</h2>
                       <p className="text-sm text-muted">Real-time ground truth updates and verified telemetry.</p>
                    </div>
                    {user?.role !== 'system_admin' && (
                       <button 
                          onClick={() => setShowIncidentModal(true)}
                          className="px-6 py-3 bg-primary text-black font-black uppercase text-xs tracking-widest rounded-2xl flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-primary/20"
                       >
                          <Plus className="w-4 h-4" /> Log Incident
                       </button>
                    )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {incidents.map((u, i) => (
                       <Card key={i}>
                          <div className="p-6">
                             <div className="flex justify-between items-start mb-4">
                                <Badge variant={u.severity.toLowerCase()}>{u.severity}</Badge>
                                <span className="text-[10px] text-muted font-mono">{new Date(u.timestamp).toLocaleString()}</span>
                             </div>
                             <h4 className="text-xl font-black text-default uppercase tracking-tight mb-2">{u.title}</h4>
                             <p className="text-sm text-slate-400 leading-relaxed mb-6">{u.content}</p>
                             
                             <div className="flex items-center justify-between pt-4 border-t border-edge">
                                <div className="flex items-center gap-2">
                                   <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black">{u.sender[0]}</div>
                                   <div className="flex flex-col">
                                      <span className="text-[10px] font-bold text-default">{u.sender}</span>
                                      <span className="text-[8px] text-primary uppercase font-black">Field Operator</span>
                                   </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-primary font-black uppercase">
                                   <MapPin className="w-3 h-3" /> {u.region}
                                </div>
                             </div>
                          </div>
                          {u.geotag && (
                             <div className="h-1 w-full bg-slate-800">
                                <div className={`h-full ${u.severity === 'CRITICAL' ? 'bg-red-500' : 'bg-primary'}`} style={{width: '60%'}} />
                             </div>
                          )}
                       </Card>
                    ))}
                 </div>
              </div>
           )}

           {view === 'alerts' && (
              <div className="flex-grow overflow-y-auto p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                 <div className="max-w-4xl mx-auto space-y-12">
                    <div className="text-center space-y-4">
                       <ShieldAlert className="w-20 h-20 text-red-500 mx-auto animate-pulse" />
                       <h2 className="text-4xl font-black text-default tracking-tighter uppercase font-outline-2">Broadcasting Command Center</h2>
                       <p className="text-muted max-w-xl mx-auto">Trigger system-wide alerts across Web, SMS, and WhatsApp channels for immediate response mobilization.</p>
                    </div>

                    {user?.role !== 'field_officer' && (
                       <Card className="p-8 border-red-500/20 bg-red-500/5">
                          <h3 className="text-lg font-black text-default uppercase mb-8 flex items-center gap-3">
                             <Bell className="text-red-500" /> Dispatch New Priority Alert
                          </h3>
                          <form onSubmit={handleTriggerAlert} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-6">
                                <div>
                                   <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Target Region</label>
                                   <select 
                                      required
                                      value={alertForm.region_id}
                                      onChange={e => setAlertForm({...alertForm, region_id: e.target.value})}
                                      className="w-full p-4 bg-slate-900 border border-edge rounded-2xl text-xs text-default outline-none"
                                   >
                                      <option value="">Select Region...</option>
                                      {regions.map(r => <option key={r.id} value={r.id}>{r.region}</option>)}
                                   </select>
                                </div>
                                <div>
                                   <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Severity Protocol</label>
                                   <div className="flex gap-2">
                                      {['INFO', 'URGENT', 'CRITICAL'].map(s => (
                                        <button 
                                          key={s} 
                                          type="button"
                                          onClick={() => setAlertForm({...alertForm, severity: s})}
                                          className={`flex-1 py-3 text-[10px] font-black border rounded-xl transition-all ${
                                            alertForm.severity === s ? 'border-red-500/50 text-red-500 bg-red-500/10' : 'border-edge text-muted'
                                          }`}>{s}</button>
                                      ))}
                                   </div>
                                </div>
                             </div>
                             <div className="space-y-6">
                                <div>
                                   <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Messaging Channels</label>
                                   <div className="flex flex-wrap gap-2">
                                      {['WEB', 'MOBILE', 'SMS', 'WHATSAPP'].map(c => (
                                        <button 
                                          key={c} 
                                          type="button"
                                          onClick={() => setAlertForm({...alertForm, channels: c})}
                                          className={`px-4 py-2 border rounded-lg text-[9px] font-black transition-all uppercase ${
                                            alertForm.channels === c ? 'bg-primary text-black border-primary' : 'bg-slate-800 border-edge text-muted'
                                          }`}
                                        >{c}</button>
                                      ))}
                                   </div>
                                </div>
                                <div>
                                   <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Broadcast Content</label>
                                   <textarea 
                                      required
                                      value={alertForm.message}
                                      onChange={e => setAlertForm({...alertForm, message: e.target.value})}
                                      className="w-full p-4 bg-slate-900 border border-edge rounded-2xl text-xs text-default h-24 resize-none outline-none focus:border-red-500/50" 
                                      placeholder="Enter critical instructions..."
                                   ></textarea>
                                </div>
                             </div>
                             <button type="submit" className="col-span-1 md:col-span-2 py-4 bg-red-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-2xl shadow-red-500/20 hover:scale-[1.02] transition-transform">
                                Execute System Broadcast
                             </button>
                          </form>
                       </Card>
                    )}

                    <div className="space-y-6">
                       <h3 className="text-sm font-black uppercase text-slate-500 tracking-widest">Alert History & Status</h3>
                       <div className="space-y-3">
                          {alerts.map((a, i) => (
                            <div key={i} className="p-5 bg-element border border-edge rounded-3xl flex items-center justify-between group hover:border-red-500/30 transition-all">
                               <div className="flex items-center gap-6">
                                  <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                                     <Volume2 className="animate-bounce" />
                                  </div>
                                  <div>
                                     <div className="flex items-center gap-3 mb-1">
                                        <span className="text-xs font-black text-default uppercase">{a.severity} Protocol Active</span>
                                        <Badge variant="default">{a.channels}</Badge>
                                     </div>
                                     <p className="text-[11px] text-muted">{a.message}</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <div className="text-[10px] font-mono text-muted mb-1">{new Date(a.timestamp).toLocaleTimeString()}</div>
                                  <div className="flex items-center gap-1.5 text-emerald-500 text-[10px] font-black uppercase">
                                     <CheckCircle2 className="w-3 h-3" /> Transmitted
                                  </div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
           <Card className="w-full max-w-xl p-8 border-primary/20 bg-slate-900 shadow-3xl">
              <div className="flex justify-between items-center mb-8">
                 <h2 className="text-2xl font-black text-default uppercase tracking-tight">Transmit Situational Log</h2>
                 <button onClick={() => setShowIncidentModal(false)} className="p-2 text-muted hover:text-white transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handlePostIncident} className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Operating Sector</label>
                    <select 
                        required
                        value={incidentForm.region_id}
                        onChange={e => setIncidentForm({...incidentForm, region_id: e.target.value})}
                        className="w-full p-4 bg-black/40 border border-edge rounded-2xl text-xs text-default focus:border-primary/50 outline-none"
                    >
                       <option value="">Select Region...</option>
                       {rooms.map(r => <option key={r.id} value={r.id}>{r.name.replace(' Coordination Hub', '')}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Incident Title</label>
                        <input 
                            required
                            type="text" 
                            value={incidentForm.title}
                            onChange={e => setIncidentForm({...incidentForm, title: e.target.value})}
                            className="w-full p-4 bg-black/40 border border-edge rounded-2xl text-xs text-default focus:border-primary/50 outline-none" 
                            placeholder="Brief subject..."
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Observation Details</label>
                        <textarea 
                            required
                            value={incidentForm.content}
                            onChange={e => setIncidentForm({...incidentForm, content: e.target.value})}
                            className="w-full p-4 bg-black/40 border border-edge rounded-2xl text-xs text-default h-32 resize-none focus:border-primary/50 outline-none" 
                            placeholder="Detailed tactical observation..."
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Media Telemetry (Images/Video)</label>
                        <div className="flex items-center gap-4">
                            <label className="flex-1 border-2 border-dashed border-edge rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all text-muted hover:text-primary">
                                <ImageIcon className="w-6 h-6 mb-2" />
                                <span className="text-[9px] font-black uppercase">Upload Observations</span>
                                <input type="file" className="hidden" multiple accept="image/*,video/*" />
                            </label>
                            <div className="w-16 h-16 rounded-2xl border border-edge bg-slate-800 flex items-center justify-center text-[10px] font-mono opacity-30 select-none">
                               EMPTY
                            </div>
                        </div>
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Severity Protocol</label>
                        <div className="flex gap-2">
                            {['INFO', 'URGENT', 'CRITICAL'].map(s => (
                                <button 
                                    type="button"
                                    key={s}
                                    onClick={() => setIncidentForm({...incidentForm, severity: s})}
                                    className={`flex-1 py-3 text-[10px] font-black border rounded-xl transition-all ${
                                        incidentForm.severity === s ? 'bg-primary text-black border-primary' : 'border-edge text-muted hover:text-default'
                                    }`}
                                >{s}</button>
                            ))}
                        </div>
                    </div>
                 </div>
                 <button className="w-full py-5 bg-primary text-black font-black uppercase text-sm tracking-widest rounded-[2rem] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                    Finalize & Transmit SITREP
                 </button>
              </form>
           </Card>
        </div>
      )}

    </div>
  );
}
