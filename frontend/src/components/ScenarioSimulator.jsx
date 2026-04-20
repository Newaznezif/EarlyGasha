import React, { useState } from 'react';
import axios from 'axios';
import { Play, RotateCcw, Zap, Activity } from 'lucide-react';

const ScenarioSimulator = ({ regionName, apiBase, onSimulateResult, onReset }) => {
  const [modifiers, setModifiers] = useState({ rainfall_change: 0, inflation_change: 0, conflict_change: 0, health_outbreak: false });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${apiBase}/simulate/${regionName}`, {
        rainfall_change: modifiers.rainfall_change,
        inflation_change: modifiers.inflation_change,
        conflict_change: modifiers.conflict_change,
        health_outbreak: modifiers.health_outbreak
      });
      setResult(response.data);
      if (onSimulateResult) onSimulateResult(response.data);
    } catch (error) {
      console.error("Simulation failed", error);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setModifiers({ rainfall_change: 0, inflation_change: 0, conflict_change: 0, health_outbreak: false });
    setResult(null);
    if (onReset) onReset(regionName);
  };

  return (
    <div className="mt-8 p-4 bg-primary/10 border border-primary/20 rounded-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-50" />
      <h5 className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-4 flex items-center gap-2">
        <Zap className="w-3 h-3 text-secondary animate-pulse" />
        Decision Impact Simulator
      </h5>
      
      <div className="space-y-4 relative z-10 p-2">
        <Slider label="Rainfall Anomaly (%)" value={modifiers.rainfall_change} min={-100} max={100} step={5} onChange={(v) => setModifiers({...modifiers, rainfall_change: v})} />
        <Slider label="Inflation Spike (%)" value={modifiers.inflation_change} min={0} max={50} step={1} onChange={(v) => setModifiers({...modifiers, inflation_change: v})} />
        <Slider label="Conflict Incident Surge" value={modifiers.conflict_change} min={0} max={100} step={5} onChange={(v) => setModifiers({...modifiers, conflict_change: v})} />
        
        <label className="flex items-center justify-between cursor-pointer pt-3 mt-2 border-t border-edge">
          <span className="text-[10px] font-bold uppercase text-muted flex items-center gap-2">
            <Activity className="w-3 h-3" /> Disease Outbreak
          </span>
          <input 
            type="checkbox" 
            checked={modifiers.health_outbreak}
            onChange={(e) => setModifiers({...modifiers, health_outbreak: e.target.checked})}
            className="w-4 h-4 rounded bg-element border-edge accent-orange-500"
          />
        </label>
      </div>

      <div className="mt-6 flex gap-2 relative z-10">
        <button 
          onClick={runSimulation}
          disabled={loading}
          className="flex-grow py-2 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg disabled:opacity-50 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all"
        >
          {loading ? (
            <RefreshCcw className="w-3 h-3 animate-spin" />
          ) : (
            <><Play className="w-3 h-3" /> Run Impact Analysis</>
          )}
        </button>
        <button onClick={reset} className="p-2 bg-element border border-edge rounded-lg hover:bg-element-hover transition-all">
          <RotateCcw className="w-4 h-4 text-muted" />
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-element rounded-lg border border-orange-500/30 animate-in zoom-in duration-300 relative z-10 shadow-lg">
           <div className="flex justify-between items-end mb-3 pb-3 border-b border-edge">
              <div>
                <p className="text-[10px] text-muted font-bold uppercase">Simulated Risk</p>
                <p className={`text-3xl font-black ${
                  result.risk_level === 'CRITICAL' ? 'text-red-500' : 
                  result.risk_level === 'HIGH' ? 'text-orange-500' : 'text-emerald-500'
                }`}>
                  {(result.simulated_risk * 100).toFixed(0)}%
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xs font-bold ${result.simulated_risk > result.original_risk ? 'text-red-500' : 'text-emerald-500'}`}>
                  Orig: {(result.original_risk * 100).toFixed(0)}%
                </p>
                <p className="text-[10px] text-muted">{result.risk_level} CONCERN</p>
              </div>
           </div>
           <div>
             <p className="text-[9px] uppercase tracking-wider text-muted mb-2 font-bold">Simulated Drivers</p>
             <ul className="text-xs text-default space-y-1 font-medium">
               {result.drivers.map((d, i) => <li key={i} className="flex gap-2 items-center"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> {d}</li>)}
             </ul>
           </div>
        </div>
      )}
    </div>
  );
};

const Slider = ({ label, value, min, max, step, onChange }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[9px] font-bold uppercase text-muted">
      <span>{label}</span>
      <span className="text-default">{value > 0 ? `+${value}` : `${value}`}</span>
    </div>
    <input 
      type="range" min={min} max={max} step={step} value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-element border border-edge rounded-lg appearance-none cursor-pointer accent-orange-500"
    />
  </div>
);

const RefreshCcw = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
);

export default ScenarioSimulator;
