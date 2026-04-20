# EarlyGasha: Humanitarian Early Warning System

EarlyGasha is an AI-powered humanitarian intelligence platform focused on East Africa. It monitors climate, economic, security, and health indicators to provide early warning risk scores and forecasts.

## Features
- **Data Ingestion**: Mocks real-world data from CHIRPS, FAO, and ACLED.
- **ML Risk Engine**: Rule-based weighted scoring system (0-100).
- **FastAPI Backend**: Provides data to the frontend and processes risk calculations.
- **Streamlit Dashboard**: Interactive map with real-time risk summaries and forecasting.

## Architecture
- **Backend**: FastAPI, SQLAlchemy (SQLite), Scikit-learn.
- **Frontend**: Streamlit, Plotly Mapbox.

## Setup Instructions

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Seed Data**:
   ```bash
   python backend/ingest_data.py
   python backend/populate_initial_risks.py
   ```

3. **Start the Backend**:
   ```bash
   uvicorn backend.main:app --reload
   ```

4. **Run the Dashboard**:
   ```bash
   streamlit run frontend/app.py
   ```

## Scope
Focus Regions: Ethiopia, Kenya, Somalia, Uganda, Tanzania, South Sudan, Rwanda, Burundi.
Indicators: Rainfall anomalies, Food price changes, Conflict events, Disease outbreaks.
