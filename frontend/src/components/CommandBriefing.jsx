import React, { useState, useEffect } from 'react';
import { Activity, CloudSun, Loader2 } from 'lucide-react';
import api from '../auth/api';

export default function CommandBriefing() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBriefing = async () => {
        try {
            const res = await api.get('/intel/command-briefing');
            setBriefing(res.data);
        } catch (err) {
            console.error("Briefing transmission error:", err);
        } finally {
            setLoading(false);
        }
    };
    fetchBriefing();
  }, []);

  if (loading) return (
    <div className="flex items-center gap-3 bg-element border border-edge rounded-md p-5 text-sm text-muted">
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
        <span>Loading Ethiopia monitoring summary...</span>
    </div>
  );

  return (
    <section className="glass-card p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex gap-3">
                <div className="h-9 w-9 shrink-0 flex items-center justify-center rounded bg-primary/10 text-primary">
                    <CloudSun className="w-5 h-5" />
                </div>
                <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="text-sm font-semibold text-default">Ethiopia monitoring summary</h2>
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                            <Activity className="w-3.5 h-3.5 text-primary" />
                            {briefing?.observed_at ? `Observed ${new Date(briefing.observed_at).toLocaleTimeString()}` : 'No recent observation'}
                        </span>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{briefing?.briefing_narrative}</p>
                </div>
            </div>
            <div className="md:min-w-52 md:border-l md:border-edge md:pl-4">
                <p className="text-xs text-muted">Highest screening score</p>
                <p className="mt-1 text-sm font-medium text-default">{briefing?.priority_vulnerability}</p>
            </div>
        </div>
    </section>
  );
}
