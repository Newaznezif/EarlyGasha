import React from 'react';
import { Activity } from 'lucide-react';

const IntelligenceFeed = ({ data }) => {
  const readings = data
    .filter((region) => region.observed_at && region.observations)
    .map((region) => {
      const temperature = region.observations.temperature_c;
      const rainfall = region.observations.rainfall_7d_mm;
      const conditions = [
        temperature == null ? null : `${temperature.toFixed(1)} C`,
        rainfall == null ? null : `${rainfall.toFixed(1)} mm rain / 7 days`,
      ].filter(Boolean).join(' · ');

      return {
        region: region.region,
        level: region.risk_level,
        observedAt: new Date(region.observed_at).toLocaleTimeString(),
        message: `${region.risk_level} weather screening · ${conditions || 'weather values unavailable'} · observed ${new Date(region.observed_at).toLocaleString()}`,
      };
    });
  const feed = readings.length ? [...readings, ...readings] : [{
    region: 'Ethiopia',
    level: 'NO_DATA',
    observedAt: null,
    message: 'Waiting for the first Open-Meteo observation.',
  }];

  return (
    <div className="bg-element border-t border-edge p-2 overflow-hidden whitespace-nowrap relative select-none">
      <div className="absolute left-0 top-0 bottom-0 px-4 bg-element z-10 flex items-center gap-2 border-r border-edge shadow-md">
        <Activity className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-default">Ethiopia Weather</span>
      </div>
      
      <div className="flex animate-marquee gap-8 items-center py-1 pl-36">
        {feed.map((item, i) => (
          <div key={`${item.region}-${i}`} className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-wider">
            <div className={`w-1.5 h-1.5 rounded-full ${
              item.level === 'CRITICAL' ? 'bg-red-500 animate-pulse' : 
              item.level === 'HIGH' ? 'bg-orange-500' :
              item.level === 'NO_DATA' ? 'bg-slate-500' : 'bg-emerald-500'
            }`}></div>
            <span className="text-primary">{item.region}:</span>
            <span className="text-muted">{item.message}</span>
            <div className="w-[1px] h-3 bg-element border-l border-edge mx-4"></div>
          </div>
        ))}
      </div>
      
      {/* CSS for Scrolling Marquee */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 60s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default IntelligenceFeed;
