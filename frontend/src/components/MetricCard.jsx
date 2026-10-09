import React from 'react';

const MetricCard = ({ title, value, icon, color, trend, unit = "" }) => {
  return (
    <div className={`glass-card min-h-28 p-4 border-l-4 ${color}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-muted text-xs md:text-sm font-medium">{title}</span>
        <div className="p-1.5 bg-element rounded border border-edge">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-default">{value}{unit}</span>
        {trend && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
