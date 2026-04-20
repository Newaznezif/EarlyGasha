import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RiskChart = ({ region }) => {
  // Generate synthetic trailing 30-day index trend based on current empirical score
  const data = useMemo(() => {
    const arr = [];
    const baseScore = region.score || 50;
    
    for(let i=30; i>=0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      arr.push({
        name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: Math.min(100, Math.max(0, baseScore + (Math.random() * 10 - 5) + (i * 1.5)))
      });
    }
    return arr;
  }, [region.score]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
        <XAxis 
          dataKey="name" 
          stroke="#8b949e" 
          tick={{fontSize: 10}} 
          tickLine={false} 
          axisLine={false}
        />
        <YAxis 
          stroke="#8b949e" 
          tick={{fontSize: 10}} 
          tickLine={false} 
          axisLine={false}
          domain={[0, 100]}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px' }}
          itemStyle={{ color: '#3b82f6' }}
        />
        <Area 
          type="monotone" 
          dataKey="score" 
          stroke="#3b82f6" 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorScore)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default RiskChart;
