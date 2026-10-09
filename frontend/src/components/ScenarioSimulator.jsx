import React, { useState } from 'react';
import axios from 'axios';
import { Play, RotateCcw, SlidersHorizontal, Activity } from 'lucide-react';

const ScenarioSimulator = ({ regionName, apiBase }) => {
  const [modifiers, setModifiers] = useState({ rainfall_change: 0, inflation_change: 0, conflict_change: 0, health_outbreak: false });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${apiBase}/simulate/${regionName}`, {
        rainfall_change: modifiers.rainfall_change,
        inflation_change: modifiers.inflation_change,
        conflict_change: modifiers.conflict_change,
        health_outbreak: modifiers.health_outbreak
      });
      setResult(response.data);
    } catch {
      setError('Scenario could not be calculated. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setModifiers({ rainfall_change: 0, inflation_change: 0, conflict_change: 0, health_outbreak: false });
    setResult(null);
    setError(null);
  };

  return (
    <section className="mt-4 p-4 bg-element border border-edge rounded-md">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-primary" />
        <h5 className="text-sm font-semibold text-default">Scenario analysis</h5>
      </div>
      <p className="mt-1 text-xs text-muted">What-if estimate only. This does not change live readings or alerts.</p>
      
      <div className="mt-4 space-y-4">
        <Slider label="Rainfall change" unit="%" value={modifiers.rainfall_change} min={-100} max={100} step={5} onChange={(v) => setModifiers({...modifiers, rainfall_change: v})} />
        <Slider label="Food-price increase" unit="%" value={modifiers.inflation_change} min={0} max={50} step={1} onChange={(v) => setModifiers({...modifiers, inflation_change: v})} />
        <Slider label="Conflict incidents added" value={modifiers.conflict_change} min={0} max={100} step={5} onChange={(v) => setModifiers({...modifiers, conflict_change: v})} />
        
        <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-edge">
          <span className="text-sm text-default flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted" /> Model an outbreak signal
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
          className="flex-grow py-2.5 bg-primary hover:bg-primary-hover text-white disabled:opacity-50 font-medium rounded-md text-sm flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <RefreshCcw className="w-3 h-3 animate-spin" />
          ) : (
            <><Play className="w-4 h-4" /> Run scenario</>
          )}
        </button>
        <button onClick={reset} aria-label="Reset scenario" title="Reset scenario" className="p-2 bg-element border border-edge rounded-md hover:bg-element-hover transition-colors">
          <RotateCcw className="w-4 h-4 text-muted" />
        </button>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}

      {result && (
        <div className="mt-4 p-4 bg-element rounded-md border border-edge">
           <div className="flex justify-between items-end mb-3 pb-3 border-b border-edge">
              <div>
                <p className="text-xs text-muted">Scenario estimate</p>
                <p className={`mt-1 text-2xl font-semibold ${
                  result.risk_level === 'CRITICAL' ? 'text-red-700' :
                  result.risk_level === 'HIGH' ? 'text-orange-700' : 'text-emerald-700'
                }`}>
                  {(result.simulated_risk * 100).toFixed(0)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted">
                  Current: {(result.original_risk * 100).toFixed(0)}%
                </p>
                <p className="mt-1 text-xs text-default">{result.risk_level}</p>
              </div>
           </div>
           <div>
             <p className="text-xs text-muted mb-2">Scenario drivers</p>
             <ul className="text-xs text-default space-y-1 font-medium">
               {result.drivers.map((d, i) => <li key={i} className="flex gap-2 items-center"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> {d}</li>)}
             </ul>
           </div>
        </div>
      )}
    </section>
  );
};

const Slider = ({ label, value, unit = '', min, max, step, onChange }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs text-muted">
      <span>{label}</span>
      <span className="text-default">{value > 0 ? `+${value}` : value}{unit}</span>
    </div>
    <input 
      type="range" min={min} max={max} step={step} value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-element border border-edge rounded appearance-none cursor-pointer accent-primary"
    />
  </div>
);

const RefreshCcw = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
);

export default ScenarioSimulator;
