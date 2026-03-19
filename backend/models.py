
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Location(BaseModel):
    lat: float
    lon: float
    city: str
    country: str

class Transaction(BaseModel):
    transaction_id: str
    user_id: str
    amount: float
    location: Location
    device_type: str
    ip_address: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class RiskScore(BaseModel):
    risk_score: float
    decision: str
    explanation: List[str]

class UserProfile(BaseModel):
    user_id: str
    trust_score: float
    spending_distribution: dict
    active_hour_heatmap: dict
    device_usage_breakdown: dict
    location_clusters: list
    
class SimulateAttack(BaseModel):
    num_transactions: int
