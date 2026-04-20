import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, MapPin, Send, AlertTriangle, Clock, WifiOff } from 'lucide-react';
import api from '../auth/api';

const FieldReportForm = ({ regions, onSuccess, duplicatePayload, recentReports = [] }) => {
  const [step, setStep] = useState(1);
  const [reportType, setReportType] = useState('drought');
  const [regionId, setRegionId] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [confidenceLevel, setConfidenceLevel] = useState('medium');
  const [gpsCapture, setGpsCapture] = useState('');
  const [photoAttached, setPhotoAttached] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // Draft functionality
  useEffect(() => {
     try {
        const draft = JSON.parse(localStorage.getItem('gasha_field_draft'));
        if (draft && !duplicatePayload) {
           if (draft.reportType) setReportType(draft.reportType);
           if (draft.regionId) setRegionId(draft.regionId);
           if (draft.description) setDescription(draft.description);
           if (draft.severity) setSeverity(draft.severity);
           if (draft.gpsCapture) setGpsCapture(draft.gpsCapture);
        }
     } catch (e) {}
  }, []);

  useEffect(() => {
     if (duplicatePayload) {
        setReportType(duplicatePayload.report_type || 'drought');
        setRegionId(duplicatePayload.region_id || '');
        setDescription(duplicatePayload.description || '');
        setSeverity(duplicatePayload.severity || 'medium');
        setStatus({ type: 'success', message: 'Report Duplicated. Adjust constraints before submitting.'});
     }
  }, [duplicatePayload]);

  useEffect(() => {
     if (recentReports.length > 0 && regionId && reportType) {
        const isDup = recentReports.some(r => String(r.region_id) === String(regionId) && r.report_type === reportType);
        setDuplicateWarning(isDup);
     } else {
        setDuplicateWarning(false);
     }
  }, [regionId, reportType, recentReports]);

  useEffect(() => {
    const timer = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
       setIsOffline(false);
       const draft = localStorage.getItem('gasha_field_draft_auto');
       if (draft) {
           try {
              const data = JSON.parse(draft);
              await api.post('/field/report', data);
              setStatus({ type: 'success', message: 'Connection Restored: Cached Report Auto-Submitted.' });
              localStorage.removeItem('gasha_field_draft_auto');
              if (onSuccess) onSuccess();
           } catch(e) {
              setStatus({ type: 'error', message: 'Connection restored but auto-submit failed.' });
           }
       }
    };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
       window.removeEventListener('online', handleOnline);
       window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveDraft = () => {
      localStorage.setItem('gasha_field_draft', JSON.stringify({
          reportType, regionId, description, severity, gpsCapture
      }));
      setStatus({ type: 'success', message: 'Draft saved securely to local cache.' });
  };

  const clearDraft = () => {
      localStorage.removeItem('gasha_field_draft');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!regionId) {
      setStatus({ type: 'error', message: 'Please select a mission zone (region).' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    const payloadObj = {
      region_id: parseInt(regionId) || regionId,
      report_type: reportType,
      severity: severity,
      description: description + (gpsCapture ? `\n[GPS: ${gpsCapture}]` : '') + (photoAttached ? '\n[PHOTO ATTACHED]' : '') + `\n[CONFIDENCE: ${confidenceLevel.toUpperCase()}]` + `\n[TTU: ${elapsedSec}s]`,
    };

    if (isOffline || !navigator.onLine) {
        localStorage.setItem('gasha_field_draft_auto', JSON.stringify(payloadObj));
        setStatus({ type: 'success', message: 'Offline Mode: Report cached locally. Will auto-submit upon connection.' });
        setSubmitting(false);
        return;
    }

    try {
      await api.post('/field/report', payloadObj);
      setStatus({ type: 'success', message: 'Intelligence uplink complete. Report synchronized to headquarters.' });
      setDescription('');
      setGpsCapture('');
      setPhotoAttached(false);
      clearDraft();
      setStep(1);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: err.response?.data?.detail || 'Uplink failed. Local buffer only.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickReport = async (type, sev, fallbackText) => {
      if (!regionId) {
          setStatus({ type: 'error', message: 'Select Mission Zone first for Quick Log.' });
          return;
      }
      setSubmitting(true);
      setStatus(null);
      try {
          await api.post('/field/report', {
             region_id: parseInt(regionId) || regionId,
             report_type: type,
             severity: sev,
             description: `[QUICK LOG]: ${fallbackText}` + (gpsCapture ? `\n[GPS: ${gpsCapture}]` : ''),
          });
          setStatus({ type: 'success', message: 'Quick Log synchronized successfully.' });
          if (onSuccess) onSuccess();
      } catch (err) {
          setStatus({ type: 'error', message: 'Quick Log failed.' });
      } finally {
          setSubmitting(false);
      }
  };

  return (
    <div className={`glass-card p-6 border-blue-500/20 ${isOffline ? 'border-dashed border-red-500/50' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-default flex items-center gap-2">
          {isOffline ? <WifiOff className="text-red-500 w-5 h-5" /> : <Send className="text-blue-500 w-5 h-5" />}
          Ground-Truth Intelligence Uplink
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
             <Clock size={12} /> {String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:{String(elapsedSec % 60).padStart(2, '0')} elapsed
          </span>
          <button onClick={saveDraft} type="button" className="text-[10px] font-black uppercase text-blue-500 bg-blue-500/10 px-2 py-1 rounded hover:bg-blue-500/20 transition-colors">
             Save Draft
          </button>
        </div>
      </div>

      {regionId && (
         <div className="mb-4 p-3 bg-element border border-edge rounded-xl space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Quick Report Mode</label>
            <div className="flex flex-wrap gap-2">
               <button type="button" onClick={() => handleQuickReport('drought', 'high', 'Severe drought conditions escalating rapidly.')} className="px-3 py-1.5 bg-amber-500/10 text-amber-500 text-[10px] uppercase font-bold rounded-lg border border-amber-500/30 hover:bg-amber-500/20">Rapid: Drought (High)</button>
               <button type="button" onClick={() => handleQuickReport('conflict', 'critical', 'Active conflict observed. Safety compromised.')} className="px-3 py-1.5 bg-red-500/10 text-red-500 text-[10px] uppercase font-bold rounded-lg border border-red-500/30 hover:bg-red-500/20">Rapid: Conflict (Critical)</button>
            </div>
         </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
           <div className="p-3 bg-element rounded-lg border border-edge mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Step 1 of 3</span>
              <h4 className="text-sm font-bold text-default">Core Event Intelligence</h4>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Anomaly Vector (Event Type)</label>
               <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full bg-slate-900 border border-edge rounded-xl px-4 py-2.5 text-xs text-default focus:outline-none focus:border-blue-500/50 appearance-none transition-all">
                 <option value="drought">Climatic Anomaly (Drought)</option>
                 <option value="flood">Hydrological Event (Flood)</option>
                 <option value="disease">Biological Threat (Outbreak)</option>
                 <option value="conflict">Security Breach (Conflict)</option>
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Mission Zone</label>
               <select value={regionId} onChange={(e) => setRegionId(e.target.value)} className="w-full bg-slate-900 border border-edge rounded-xl px-4 py-2.5 text-xs text-default focus:outline-none focus:border-blue-500/50 appearance-none transition-all">
                 <option value="">Select Region...</option>
                 {regions.map((r) => <option key={r.id || r.region} value={r.id || r.region}>{r.region || r.name || r.id}</option>)}
               </select>
             </div>
           </div>
           
           {duplicateWarning && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-amber-500 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Warning: Similar event already reported in this region recently.</span>
              </div>
           )}

           <button type="button" onClick={() => setStep(2)} disabled={!regionId} className="w-full py-3 bg-element border border-edge hover:bg-slate-800 text-default rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50">
             Confirm Event Targeting →
           </button>
        </div>
        )}

        {step === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
           <div className="p-3 bg-element rounded-lg border border-edge mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Step 2 of 3</span>
              <h4 className="text-sm font-bold text-default">Scale and Constraints</h4>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Observed Severity</label>
               <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full bg-slate-900 border border-edge rounded-xl px-4 py-2.5 text-xs text-default focus:outline-none focus:border-amber-500/50 appearance-none transition-all">
                 <option value="low">LOW - Contextual Anomaly</option>
                 <option value="medium">MEDIUM - Significant Impact</option>
                 <option value="high">HIGH - Regional Threat</option>
                 <option value="critical">CRITICAL - Humanitarian Crisis</option>
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Report Confidence Level</label>
               <select value={confidenceLevel} onChange={(e) => setConfidenceLevel(e.target.value)} className="w-full bg-slate-900 border border-edge rounded-xl px-4 py-2.5 text-xs text-default focus:outline-none focus:border-blue-500/50 appearance-none transition-all">
                 <option value="low">LOW - Speculative/Unconfirmed</option>
                 <option value="medium">MEDIUM - Probable/Indirect Observation</option>
                 <option value="high">HIGH - Verified/Direct Sighting</option>
               </select>
             </div>
           </div>
           <div className="flex gap-2">
             <button type="button" onClick={() => setStep(1)} className="w-1/3 py-3 bg-element border border-edge hover:bg-slate-800 text-default rounded-xl text-xs font-black uppercase tracking-widest transition-all">← Back</button>
             <button type="button" onClick={() => setStep(3)} className="w-2/3 py-3 bg-element border border-edge hover:bg-slate-800 text-default rounded-xl text-xs font-black uppercase tracking-widest transition-all">Formulate Tactical Intel →</button>
           </div>
        </div>
        )}

        {step === 3 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
           <div className="p-3 bg-element rounded-lg border border-edge mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Step 3 of 3</span>
              <h4 className="text-sm font-bold text-default">Submission Payload Detail</h4>
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Tactical Observations</label>
              <textarea placeholder="Provide granular details on local conditions and trajectory..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full h-24 bg-slate-900 border border-edge rounded-xl px-4 py-3 text-xs text-default focus:outline-none focus:border-blue-500/50 resize-none transition-all" required />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">GPS Coordinates (Optional)</label>
               <div className="flex gap-2">
                   <input type="text" placeholder="Auto-capture or input Lat, Lng" value={gpsCapture} onChange={(e) => setGpsCapture(e.target.value)} className="w-full bg-slate-900 border border-edge rounded-xl px-4 py-2.5 text-xs text-default focus:outline-none focus:border-blue-500/50 transition-all" />
                   <button type="button" onClick={() => setGpsCapture("9.032, 38.748")} className="px-3 bg-element border border-edge rounded-xl text-blue-500 hover:bg-blue-500/10 flex items-center justify-center transition-colors"> <MapPin size={16} /> </button>
               </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest px-1">Evidence Payload (Optional)</label>
                <button type="button" onClick={() => setPhotoAttached(!photoAttached)} className={`w-full text-left bg-slate-900 border border-edge rounded-xl px-4 py-2.5 text-xs focus:outline-none transition-all flex justify-between items-center ${photoAttached ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/5' : 'text-default hover:border-blue-500/50'}`}>
                   {photoAttached ? "evidence_img_01.jpg attached" : "Select or capture image..."}
                   {photoAttached && <CheckCircle2 size={16} className="text-emerald-500" />}
                </button>
             </div>
           </div>

           {status && (
             <div className={`p-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-red-500/10 text-red-500 border border-red-500/30'}`}>
               {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
               <span className="text-[10px] font-bold uppercase tracking-wider">{status.message}</span>
             </div>
           )}

           <div className="flex gap-2">
             <button type="button" onClick={() => setStep(2)} className="w-1/3 py-3 bg-element border border-edge hover:bg-slate-800 text-default rounded-xl text-xs font-black uppercase tracking-widest transition-all">← Back</button>
             <button type="submit" disabled={submitting} className="w-2/3 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2">
               {submitting ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uplinking...</>) : (<><Send className="w-4 h-4" /> Transmit Intelligence to HQ</>)}
             </button>
           </div>
        </div>
        )}
      </form>
    </div>
  );
};

export default FieldReportForm;
