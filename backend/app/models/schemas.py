from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime

class RiskForecast(BaseModel):
    seven_days: float
    fourteen_days: float
    thirty_days: float

class IntelligenceFeatures(BaseModel):
    climate: Dict[str, float]
    food: Dict[str, float]
    health: Dict[str, float]
    conflict: Dict[str, float]

class RiskIntelligenceResponse(BaseModel):
    region: str
    risk_level: str
    risk_score: float
    forecast: Dict[str, float]
    forecast_risk_levels: Dict[str, str]
    trend: str
    explanation: str
    timestamp: str
    features: Optional[IntelligenceFeatures] = None

class RegionOverview(BaseModel):
    region: str
    country: str
    lat: float
    lon: float
    risk_score: float
    risk_level: str
    trend: str

class OverviewResponse(BaseModel):
    count: int
    ranked_list: List[RegionOverview]
    timestamp: str

from typing import Dict, List, Optional, Union

class FieldReportCreate(BaseModel):
    region_id: Union[int, str]
    report_type: str  # drought, flood, disease, conflict
    severity: str = "medium"
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class FieldReportResponse(BaseModel):
    id: int
    user_id: int
    region_id: int
    report_type: str
    severity: str
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: datetime
    status: str

    class Config:
        from_attributes = True
