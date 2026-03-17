
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from models import Transaction, UserProfile, SimulateAttack, RiskScore
from transaction_simulator import generate_transaction
from fraud_engine import score_transaction

app = FastAPI(
    title="FraudShield AI API",
    description="A real-time fraud detection system for digital wallets.",
    version="1.0.0"
)

# --- CORS Configuration ---
# This allows the Angular frontend (running on a different port) to communicate with the backend.
origins = [
    "http://localhost:4200",  # Default Angular development server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WebSocket for Live Transaction Streaming ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/transactions/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Generate a new transaction every few seconds
            await asyncio.sleep(random.uniform(2, 5))
            transaction = generate_transaction()
            # Score the transaction
            risk_analysis = score_transaction(transaction)
            
            # Combine transaction and risk score into one payload
            payload = {
                "transaction": transaction.dict(),
                "risk_analysis": risk_analysis.dict()
            }
            
            await manager.broadcast(json.dumps(payload, default=str))
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Client disconnected")

# --- API Endpoints ---

@app.post("/risk-score", response_model=RiskScore)
async def get_risk_score(transaction: Transaction):
    """Receives a transaction and returns a fraud risk score."""
    return score_transaction(transaction)

@app.post("/simulate-attack")
async def simulate_attack(attack_params: SimulateAttack):
    """Injects a burst of fraudulent transactions into the live stream."""
    for _ in range(attack_params.num_transactions):
        fraud_transaction = generate_transaction(is_fraudulent=True)
        risk_analysis = score_transaction(fraud_transaction)
        payload = {
            "transaction": fraud_transaction.dict(),
            "risk_analysis": risk_analysis.dict()
        }
        await manager.broadcast(json.dumps(payload, default=str))
        await asyncio.sleep(random.uniform(0.5, 1.5)) # Space them out slightly
    return {"message": f"{attack_params.num_transactions} fraudulent transactions simulated."}


@app.get("/user-profile/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: str):
    """Returns a mock user profile with behavioral analytics."""
    # In a real system, this data would come from a database.
    # Here, we generate it on the fly for demonstration.
    return UserProfile(
        user_id=user_id,
        trust_score=round(random.uniform(75, 99), 1),
        spending_distribution={
            "Groceries": round(random.uniform(20, 40), 2),
            "Transport": round(random.uniform(10, 25), 2),
            "Entertainment": round(random.uniform(5, 20), 2),
            "Utilities": round(random.uniform(10, 15), 2),
            "Other": round(random.uniform(5, 10), 2),
        },
        active_hour_heatmap={f"{h:02d}:00": random.randint(0, 15) for h in range(24)},
        device_usage_breakdown={
            "mobile": random.randint(50, 80),
            "desktop": random.randint(10, 30),
            "tablet": random.randint(5, 15),
        },
        location_clusters=[
            {"lat": 1.3521, "lon": 103.8198, "transactions": random.randint(50, 100)},
            {"lat": 3.1390, "lon": 101.6869, "transactions": random.randint(10, 30)},
        ]
    )

# --- Health Check Endpoint ---
@app.get("/")
async def root():
    return {"status": "FraudShield AI Backend is running!"}

import random
