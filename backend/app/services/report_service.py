from fpdf import FPDF
from datetime import datetime
import os
import matplotlib
matplotlib.use('Agg') # Headless mode to prevent server hangs
import matplotlib.pyplot as plt
import io

class ReportService:
    def __init__(self, output_dir="reports"):
        self.output_dir = output_dir
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

    def _generate_risk_chart(self, data):
        """Generates a risk distribution chart using matplotlib."""
        regions = [r['region'][:10] for r in data[:8]]
        scores = [r['risk_score'] * 100 for r in data[:8]]
        
        plt.figure(figsize=(10, 5))
        colors = ['#c0392b' if s > 75 else '#d35400' if s > 50 else '#2c3e50' for s in scores]
        plt.bar(regions, scores, color=colors)
        plt.title('Tactical Risk Distribution by Region', fontsize=14, fontweight='bold')
        plt.ylabel('Risk Index (%)')
        plt.ylim(0, 100)
        plt.grid(axis='y', linestyle='--', alpha=0.7)
        
        img_buf = io.BytesIO()
        plt.savefig(img_buf, format='png', bbox_inches='tight', transparent=True)
        img_buf.seek(0)
        plt.close()
        return img_buf

    def generate_interactive_report(self, intelligence_data: list, title: str = "Regional Situation Report", min_score: float = 0.0):
        """Generates a high-fidelity PDF intelligence brief with charts and digital authorization."""
        pdf = FPDF()
        pdf.add_page()
        
        # Style Definitions
        pdf.set_font("Helvetica", "B", 26)
        pdf.set_text_color(22, 160, 133) 
        pdf.cell(0, 25, "EARLYGASHA INTEL", ln=True, align="L")
        
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(51, 51, 51)
        pdf.cell(0, 10, title, ln=True, align="L")
        
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(150, 150, 150)
        pdf.cell(0, 5, f"Satellite Hash: {os.urandom(8).hex().upper()} | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True)
        pdf.ln(15)
        
        data = [r for r in intelligence_data if r['risk_score'] >= min_score]
        
        # 1. Executive Summary
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 10, "1. SITUATION SUMMARY", ln=True)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 6, f"This strategic report covers {len(data)} priority risk vectors. The AI processing engine has identified these regions as tactical monitoring zones based on integrated socio-economic and climate telemetry.")
        pdf.ln(10)
        
        # 2. Tactical Visualizations
        chart_buf = self._generate_risk_chart(intelligence_data)
        chart_path = os.path.join(self.output_dir, f"temp_chart_{datetime.now().timestamp()}.png")
        with open(chart_path, "wb") as f:
            f.write(chart_buf.getbuffer())
        
        pdf.image(chart_path, x=15, w=180)
        pdf.ln(5)
        os.remove(chart_path)
        
        # 3. Data Matrix
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_fill_color(245, 245, 245)
        pdf.cell(45, 10, "REGION", border=1, fill=True)
        pdf.cell(30, 10, "SCORE", border=1, fill=True)
        pdf.cell(45, 10, "RISK LEVEL", border=1, fill=True)
        pdf.cell(70, 10, "STRATEGIC TREND", border=1, fill=True)
        pdf.ln()
        
        pdf.set_font("Helvetica", "", 9)
        for region in data:
            level = region['risk_level']
            if level == "CRITICAL": pdf.set_text_color(192, 57, 43)
            elif level == "HIGH": pdf.set_text_color(211, 84, 0)
            else: pdf.set_text_color(44, 62, 80)
            
            pdf.cell(45, 8, region['region'], border=1)
            pdf.cell(30, 8, f"{region['risk_score']:.2%}", border=1)
            pdf.cell(45, 8, region['risk_level'], border=1)
            pdf.cell(70, 8, region['trend'], border=1)
            pdf.ln()

        # 4. Command Authorization (Signature)
        pdf.ln(20)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 5, "Tactical Certification:", ln=True)
        
        # Stylized Digital Signature
        pdf.ln(2)
        pdf.set_font("Courier", "BI", 16)
        pdf.set_text_color(41, 128, 185)
        pdf.cell(0, 10, "      Newaz Nezif", ln=True)
        
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 5, "      _______________________________________", ln=True)
        pdf.cell(0, 5, "      Systems Operations Manager | Global Security Authority", ln=True)
        
        # Tech Footer
        pdf.set_y(-20)
        pdf.set_font("Helvetica", "I", 7)
        pdf.set_text_color(180, 180, 180)
        pdf.cell(0, 10, "EARLYGASHA V3.0 // TACTICAL INTELLIGENCE PROTOCOL // PROPRIETARY AND SENSITIVE", align="C")
        
        stamp = datetime.now().strftime('%Y%j%H%M')
        filename = f"Gasha_Intel_{stamp}.pdf"
        filepath = os.path.join(self.output_dir, filename)
        pdf.output(filepath)
        return filepath, filename
