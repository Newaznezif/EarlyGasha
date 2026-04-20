import React, { useState } from 'react';
import { AlertTriangle, Bell, Info, ChevronDown, ChevronUp } from 'lucide-react';

const AlertCard = ({ alert }) => {
  const [expanded, setExpanded] = useState(alert.alert_level === 'CRITICAL');

  const isCritical = alert.alert_level === 'CRITICAL';
  const isHigh = alert.alert_level === 'HIGH';

  return (
    <div 
      className={`relative overflow-hidden p-3 md:p-4 rounded-xl border flex flex-col gap-2 transition-all ${
        isCritical ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 
        isHigh ? 'bg-orange-500/5 border-orange-500/30' : 
        'bg-yellow-500/5 border-yellow-500/30 opacity-80'
      }`}
    >
      {isCritical && (
         <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
      )}
      
      {/* Simplified Header */}
      <div 
        className="flex justify-between items-start cursor-pointer select-none" 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex flex-col gap-1">
          <span className={`font-black text-sm flex items-center gap-2 ${
            isCritical ? 'text-red-500' : isHigh ? 'text-orange-500' : 'text-yellow-500'
          }`}>
            {isCritical ? <AlertTriangle className="w-4 h-4 animate-bounce" /> : <Bell className="w-4 h-4" />}
            {alert.region.toUpperCase()} • {alert.alert_level}
          </span>
          <span className="text-xs text-default font-medium">
            {alert.primary_driver ? alert.primary_driver.toUpperCase() : "Risk threshold breached"}
          </span>
        </div>
        
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-black text-default">{(alert.current_risk * 100).toFixed(0)}%</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
        </div>
      </div>
      
      {/* Expandable Details */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-edge flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-4 text-xs font-bold text-muted">
             <span>NOW: {(alert.current_risk * 100).toFixed(1)}%</span>
             <span className="text-default">14-DAY: {(alert.forecast_14_day * 100).toFixed(1)}%</span>
          </div>
          
          <div className="text-xs text-muted leading-relaxed">
             {alert.drivers && alert.drivers.map((d, k) => (
                 <span key={k} className="bg-element px-2 py-0.5 rounded-md mr-1 border border-edge mb-1 inline-block text-[10px]">
                     {d}
                 </span>
             ))}
          </div>

          {alert.interactions && alert.interactions.length > 0 && (
             <div className="mt-1 flex items-center gap-1 text-[10px] text-orange-400 font-bold bg-orange-500/10 px-2 py-1 rounded w-max">
                 <Info className="w-3 h-3" />
                 {alert.interactions.join(", ").toUpperCase()}
             </div>
          )}
          
          {/* Static Recommended Action */}
          <div className="mt-2 text-[10px] bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-blue-400 font-bold flex gap-2 items-start">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            <span>
                {(() => {
                    const d = (alert.primary_driver || "").toLowerCase();
                    if (d.includes('drought') || d.includes('rainfall') || d.includes('climate')) return "Pre-position food and water supplies; activate drought response plans.";
                    if (d.includes('flood') || d.includes('hydro')) return "Prepare evacuation zones and secure vital infrastructure.";
                    if (d.includes('disease') || d.includes('health') || d.includes('outbreak')) return "Deploy mobile health units and stockpile medical supplies.";
                    if (d.includes('conflict') || d.includes('security')) return "Enhance perimeter security and establish safe corridors.";
                    if (d.includes('food') || d.includes('price') || d.includes('inflation')) return "Initiate emergency food subsidies or distribution.";
                    if (alert.alert_level === 'CRITICAL') return "Immediately mobilize crisis response units to affected areas.";
                    return "Deploy rapid assessment teams to verify operational status.";
                })()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const AlertPanel = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {alerts.map((alert, i) => (
        <AlertCard key={i} alert={alert} />
      ))}
    </div>
  );
};

export default AlertPanel;
