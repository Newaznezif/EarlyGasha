import React from 'react';
import { Newspaper, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const IntelligenceFeed = ({ data }) => {
  // Generate mock-breaking news based on real data
  const generateFeed = () => {
    return data.map(r => {
      const newsItems = [];
      if (r.score > 80) newsItems.push({ region: r.region, level: 'CRITICAL', msg: `Severe instability escalation detected. Integrated risk score breached 80% threshold.` });
      if (r.risk_level === 'HIGH') newsItems.push({ region: r.region, level: 'HIGH', msg: `Monitoring cross-border dynamics. Semantic signals indicate mounting pressure.` });
      if (r.score < 30) newsItems.push({ region: r.region, level: 'LOW', msg: `Stabilization signals identified. Early warning threshold remains at baseline.` });
      return newsItems;
    }).flat().slice(0, 10);
  };

  const feed = generateFeed();

  return (
    <div className="bg-element border-t border-edge p-2 overflow-hidden whitespace-nowrap relative select-none">
      <div className="absolute left-0 top-0 bottom-0 px-4 bg-element z-10 flex items-center gap-2 border-r border-edge shadow-md">
        <Newspaper className="w-4 h-4 text-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-default">Global Feed</span>
      </div>
      
      <div className="flex animate-marquee gap-8 items-center py-1 pl-36">
        {feed.map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-[10px] uppercase font-bold tracking-wider">
            <div className={`w-1.5 h-1.5 rounded-full ${
              item.level === 'CRITICAL' ? 'bg-red-500 animate-pulse' : 
              item.level === 'HIGH' ? 'bg-orange-500' : 'bg-emerald-500'
            }`}></div>
            <span className="text-primary">{item.region}:</span>
            <span className="text-muted">{item.msg}</span>
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
