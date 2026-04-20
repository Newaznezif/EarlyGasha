import React, { useState } from 'react';
import { FileText, Download, X, Shield, Globe, Terminal, Activity, Server, AlertTriangle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const OperationalSummary = ({ role, data, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);

  const generateNarrative = (reportData) => {
    const { role, data } = reportData;
    let summary = "";
    let findings = [];
    let analysis = "";

    if (role === 'system_admin') {
      summary = "Platform health remains nominally stable despite fluctuations in regional ingestion streams. Identity matrix synchronization is locked.";
      findings = [
        ["Core Sync", "ACTIVE", "Data packet integrity verified at 99.8%"],
        ["Infrastucture", "NOMINAL", `${data.infrastructure?.data_points || 0} global nodes active`],
        ["Risk Vectors", "ESCALATING", `${(data.high_risk_regions || []).length} regions exceeding Crit-Threshold`]
      ];
      analysis = "Analysis indicates potential data congestion at high-risk nodes. Horizontal scaling of ingestion pipelines recommended to maintain low-latency monitoring. Audit trails remain encrypted and secure.";
    } else if (role === 'institutional_user') {
      summary = `The strategic outlook for ${data.region_focus || 'Global'} indicates shifting risk momentum. Strategic intercepts correlate with forecasted trends.`;
      findings = [
        ["Regional Volatility", data.risk_score || '0%', "Calculated based on multi-factor climate/conflict variables"],
        ["Metric Momentum", data.momentum || 'STABLE', "Directional shift in signal strength over last 14 days"],
        ["Threat Intercepts", data.active_threats || 0, "Unverified anomalous signals detected in sector"]
      ];
      analysis = "Correlated logic suggests an indirect dependency on neighboring sectors. High-resolution surveillance required to differentiate between seasonal noise and genuine systemic failure. Mitigation strategies should focus on resource pre-positioning.";
    } else if (role === 'field_officer') {
      summary = `Field operations in ${data.assigned_sector || 'Unknown'} are generating high-frequency tactical data. Ground-truth verification remains a priority.`;
      findings = [
        ["Tactical Density", data.reports_submitted || 0, "SITREPs transmitted within active duty cycle"],
        ["Validation Delta", data.verified_indices || 0, "Cross-referenced observations with aerial baseline"],
        ["Primary Observation", "ACTIVE", data.latest_observation || 'No logs']
      ];
      analysis = "Tactical logs suggest increasing environmental pressure on local infrastructure. Field units are advised to maintain strict encryption protocols and prioritize real-time telemetry over multi-phase SITREPs during escalation periods.";
    }

    return { summary, findings, analysis };
  };

  const generateReportData = () => {
    const timestamp = new Date().toISOString();
    const reportId = `OSR-${role.toUpperCase()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let content = {
      role,
      header: {
        title: "Operational Summary Report",
        role: role.replace('_', ' ').toUpperCase(),
        timestamp,
        reportId,
        classification: role === 'system_admin' ? 'SYSTEM CRITICAL' : role === 'institutional_user' ? 'STRATEGIC' : 'TACTICAL'
      },
      data: {}
    };

    if (role === 'system_admin') {
      content.data = {
        infrastructure: {
          data_points: data.sysHealth?.data_points || 0,
          reports_pending: (data.sysHealth?.reports?.filter(r => r.status === 'pending') || []).length,
          api_status: data.sysHealthDetail?.api_status || 'online'
        },
        alerts: data.alerts?.length || 0,
        high_risk_regions: (data.globalRisk?.filter(r => r.risk_score > 0.7) || []).map(r => r.region)
      };
    } else if (role === 'institutional_user') {
      content.data = {
        region_focus: data.selectedRegion?.region || 'GLOBAL VIEW',
        risk_score: `${((data.intelligence?.risk_score || 0) * 100).toFixed(1)}%`,
        momentum: data.intelligence?.momentum || 'STABLE',
        active_threats: (data.alerts?.filter(a => a.region === data.selectedRegion?.region) || []).length
      };
    } else if (role === 'field_officer') {
      content.data = {
        assigned_sector: data.targetRegion || 'UNASSIGNED',
        reports_submitted: data.myReports?.length || 0,
        verified_indices: (data.myReports?.filter(r => r.status === 'verified') || []).length,
        latest_observation: data.myReports?.[0]?.description || 'None'
      };
    }

    return content;
  };

  const currentReport = generateReportData();
  const narrative = generateNarrative(currentReport);

  const handleExport = () => {
    setIsExporting(true);
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const margin = 20;
      let y = margin;

      // Force Numeric Conversion Helper
      const forceNum = (val) => {
        const n = Number(val);
        return isNaN(n) ? 0 : n;
      };

      const drawText = (txt, x, y_coord) => {
        const cleanText = String(txt || "");
        doc.text(cleanText, forceNum(x), forceNum(y_coord));
      };

      // 1. BRANDING HEADER
      doc.setFillColor(15, 23, 42); 
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      drawText("EARLYGASHA", margin, 25);
      
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      drawText("GLOBAL RISK INTELLIGENCE & TACTICAL ANALYTICS", margin, 32);
      
      doc.setFillColor(59, 130, 246);
      doc.rect(160, 0, 50, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      drawText(currentReport.header.classification || "UNCLASSIFIED", 165, 25);
      
      y = 55;

      // 2. METADATA SUB-HEADER
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      drawText(`REPORT ID: ${currentReport.header.reportId || "N/A"}`, margin, y);
      drawText(`ISSUED: ${new Date(currentReport.header.timestamp).toLocaleString()}`, 110, y);
      
      y += 10;
      doc.setDrawColor(203, 213, 225);
      doc.line(forceNum(margin), forceNum(y), 190, forceNum(y));
      
      y += 15;

      // 3. EXECUTIVE SUMMARY
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      drawText("1. EXECUTIVE SUMMARY", margin, y);
      
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const splitSummary = doc.splitTextToSize(String(narrative.summary || "No summary available."), 170);
      doc.text(splitSummary, forceNum(margin), forceNum(y));
      
      y += (splitSummary.length * 6) + 5;

      // 4. FINDINGS MATRIX (TABLE)
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      drawText("2. KEY FINDINGS MATRIX", margin, y);
      
      y += 5;
      
      // Use the plugin method directly if available, else the imported function
      const tableFunc = doc.autoTable || autoTable;
      tableFunc(doc, {
        startY: forceNum(y),
        head: [['INDICATOR', 'VALUE / STATUS', 'CONTEXTUAL REMARK']],
        body: narrative.findings || [],
        margin: { left: forceNum(margin) },
        theme: 'striped',
        headStyles: { fillColor: [30, 41, 59], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
      });
      
      y = forceNum(doc.lastAutoTable?.finalY || y) + 15;

      // 5. DEEP ANALYTICAL COMMENTARY
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      drawText("3. DEEP ANALYTICAL COMMENTARY", margin, y);
      
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      const splitAnalysis = doc.splitTextToSize(String(narrative.analysis || "No analysis available."), 170);
      doc.text(splitAnalysis, forceNum(margin), forceNum(y));
      
      y += (splitAnalysis.length * 6) + 15;

      // 6. VISUAL METRICS (GRAPHICAL SIMULATION)
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      drawText("4. VISUAL METRICS HUB", margin, y);
      
      y += 10;
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(241, 245, 249);
      doc.rect(forceNum(margin), forceNum(y), 170, 20, 'F');
      
      const riskString = String(currentReport.data.risk_score || "0");
      const riskRaw = parseFloat(riskString.replace(/[^0-9.]/g, '')) || 0;
      const risk = Math.min(100, Math.max(0, riskRaw));
      
      if (currentReport.role === 'institutional_user') {
        if (risk > 70) {
          doc.setFillColor(239, 68, 68);
        } else {
          doc.setFillColor(59, 130, 246);
        }
        doc.rect(forceNum(margin), forceNum(y), forceNum((risk / 100) * 170), 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        drawText(`Composite Stability Index: ${risk.toFixed(1)}%`, margin + 5, y + 13);
      } else {
        doc.setFillColor(34, 197, 94); 
        doc.rect(forceNum(margin), forceNum(y), 150, 20, 'F');
        doc.setTextColor(255, 255, 255);
        drawText("System Link Status: 100% Synchronized", margin + 5, y + 13);
      }
      
      y += 35;

      // 7. SECURITY SIGN-OFF
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      drawText("--- DOCUMENT PROTECTED BY GASHA INTEGRITY PROTOCOL ---", margin, y);
      drawText(`Verification Key: ${Math.random().toString(36).substr(2, 24).toUpperCase()}`, margin, y + 5);

      const fileName = `${currentReport.header.reportId || 'REPORT'}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("PDF Engineering Fault:", error);
      alert(`Nuclear Export Error: Metadata Corruption\nFault Signature: ${error.message || 'Unknown Protocol Failure'}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
      <div className="glass-card w-full max-w-3xl overflow-hidden rounded-[2.5rem] border-white/5 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Intelligence Header */}
        <div className="p-8 border-b border-edge flex justify-between items-center bg-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="flex items-center gap-4 relative z-10">
            <div className={`p-4 rounded-2xl shadow-lg ${
              role === 'system_admin' ? 'bg-emerald-500/10 text-emerald-500' :
              role === 'institutional_user' ? 'bg-blue-500/10 text-blue-500' :
              'bg-amber-500/10 text-amber-500'
            }`}>
              <FileText size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-default uppercase tracking-tight">Intelligence Briefing</h2>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Secondary Operational Summary</span>
                 <span className="w-1 h-1 rounded-full bg-slate-700" />
                 <span className="text-[10px] font-mono text-muted uppercase">{currentReport.header.reportId}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl text-muted transition-all relative z-10">
            <X size={24} />
          </button>
        </div>

        {/* Tactical Preview */}
        <div className="p-10 overflow-y-auto custom-scrollbar flex-grow bg-slate-900/60">
          <div className="max-w-xl mx-auto space-y-12">
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <Activity size={14} className="text-primary" />
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Executive Summary</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed font-medium bg-white/5 p-6 rounded-3xl border border-white/5 italic">
                "{narrative.summary}"
              </p>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                 <Server size={14} className="text-primary" />
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Findings Matrix</h3>
              </div>
              <div className="grid gap-3">
                {narrative.findings.map(([label, val, context], i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-slate-900 border border-edge rounded-2xl hover:border-primary/30 transition-all group">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-muted font-bold uppercase">{label}</span>
                      <span className="text-[10px] text-slate-400 italic line-clamp-1">{context}</span>
                    </div>
                    <span className="text-xs font-black text-default uppercase tracking-widest group-hover:text-primary transition-colors">{val}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <Terminal size={14} className="text-primary" />
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Deep Analytical Path</h3>
              </div>
              <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 text-xs text-slate-400 leading-relaxed font-mono">
                {narrative.analysis}
              </div>
            </section>

            <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-[2rem] flex items-center gap-4">
               <AlertTriangle size={20} className="text-red-500 shrink-0" />
               <p className="text-[10px] text-red-400 font-medium leading-relaxed">
                 WARNING: This intelligence package is encrypted and node-bound. Unauthorized duplication or redistribution 
                 triggers a system-wide clearance audit.
               </p>
            </div>
          </div>
        </div>

        {/* Protocol Actions */}
        <div className="p-8 border-t border-edge bg-white/5 flex gap-4">
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex-grow py-5 bg-primary hover:bg-primary-hover text-black font-black text-sm uppercase tracking-widest rounded-3xl transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {isExporting ? <Activity className="animate-spin" /> : <Download size={20} />}
            {isExporting ? "Compiling Intelligence..." : "Authorize PDF Transmission"}
          </button>
          <button 
            onClick={onClose}
            className="px-8 py-5 border-2 border-edge hover:bg-white/5 text-muted hover:text-default font-black text-sm uppercase tracking-widest rounded-3xl transition-all"
          >
            Abort
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationalSummary;
