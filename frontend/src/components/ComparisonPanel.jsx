import React from 'react';
import { Columns, X } from 'lucide-react';
import RiskChart from './RiskChart';

const ComparisonPanel = ({ main, compare, onClose }) => {
  if (!main || !compare) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-dark-950/95 backdrop-blur-xl p-8 overflow-y-auto animate-in fade-in zoom-in duration-300">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600/20 rounded-2xl">
                <Columns className="text-blue-400 w-8 h-8" />
            </div>
            <div>
                <h2 className="text-3xl font-black text-white">Comparative Analytics</h2>
                <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">Benchmarking Region Intelligence v2.0</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-4 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all group"
          >
            <X className="w-6 h-6 text-slate-400 group-hover:text-white group-hover:rotate-90 transition-all" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 flex-grow">
          <BenchMarkProfile intel={main} color="blue" />
          <BenchMarkProfile intel={compare} color="emerald" />
        </div>
      </div>
    </div>
  );
};

const BenchMarkProfile = ({ intel, color }) => (
  <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
    <div className={`p-6 bg-white/5 border border-${color}-500/20 rounded-3xl relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-all duration-1000`}></div>
      <p className={`text-xs font-black uppercase text-${color}-400 tracking-[0.3em] mb-2`}>{intel.region}</p>
      <h3 className="text-4xl font-black text-white mb-4 italic">{intel.risk_level}</h3>
      <div className="text-5xl font-black tracking-tighter text-white mb-6">
        {(intel.risk_score * 100).toFixed(0)}<span className="text-xl opacity-30 ml-1">% RISK</span>
      </div>
      <p className="text-slate-400 leading-relaxed text-sm h-20 overflow-y-auto pr-2 custom-scrollbar">
        {intel.explanation}
      </p>
    </div>

    <div className="space-y-4">
      <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Signal Benchmarks</h4>
      <CompareBar label="Climate" value={Object.values(intel.features.climate).reduce((a,b)=>a+b,0)/3} color={color} />
      <CompareBar label="Food Price" value={Object.values(intel.features.food).reduce((a,b)=>a+b,0)/3} color={color} />
      <CompareBar label="Conflict Intensity" value={Object.values(intel.features.conflict).reduce((a,b)=>a+b,0)/3} color={color} />
    </div>

    <div className="h-64 glass-card p-6">
       <div className="mb-4 flex justify-between items-center">
         <h4 className="text-xs font-black uppercase text-slate-400">Forecast Horizon</h4>
         <div className="flex gap-2 text-[8px] font-bold">
            <span className="bg-white/5 px-2 py-1 rounded">7D: {(intel.forecast['7_days']*100).toFixed(0)}%</span>
            <span className="bg-white/5 px-2 py-1 rounded">30D: {(intel.forecast['30_days']*100).toFixed(0)}%</span>
         </div>
       </div>
       <RiskChart region={{...intel, score: intel.risk_score * 100}} />
    </div>
  </div>
);

const CompareBar = ({ label, value, color }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[9px] font-bold uppercase">
      <span className="text-slate-500">{label}</span>
      <span className="text-white">{(value * 100).toFixed(0)}%</span>
    </div>
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <div 
        className={`h-full bg-${color}-500 transition-all duration-1000`}
        style={{ width: `${value * 100}%` }}
      ></div>
    </div>
  </div>
);

export default ComparisonPanel;
