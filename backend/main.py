import asyncio
import json
import random
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from models import Transaction, UserProfile, SimulateAttack, RiskScore
from transaction_simulator import generate_transaction
from fraud_engine import score_transaction

app = FastAPI(
    title="FraudShield AI API",
    description="A real-time fraud detection system for digital wallets.",
    version="1.0.0",
)

import os

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4200",
    "http://127.0.0.1:4200",
    os.getenv("FRONTEND_URL", "http://localhost:5173"),  # Environment variable
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WebSocket connection manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._producer_task: asyncio.Task | None = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

        # Start a single shared producer when the first client connects
        if self._producer_task is None or self._producer_task.done():
            self._producer_task = asyncio.create_task(self._producer_loop())

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

        # Stop producer if nobody is connected (optional, saves CPU)
        if not self.active_connections and self._producer_task:
            self._producer_task.cancel()
            self._producer_task = None

    async def broadcast(self, payload: dict[str, Any]):
        message = json.dumps(payload, default=str)
        dead: list[WebSocket] = []

        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead.append(connection)

        for ws in dead:
            self.disconnect(ws)

    async def _producer_loop(self):
        while True:
            await asyncio.sleep(random.uniform(2, 5))
            transaction = generate_transaction()
            risk_analysis = score_transaction(transaction)

            payload = {
                "transaction": to_payload(transaction),
                "risk_analysis": to_payload(risk_analysis),
            }

            await self.broadcast(payload)


manager = ConnectionManager()

@app.websocket("/transactions/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # keep the socket open; actual sending is done by the producer loop
            await asyncio.sleep(60)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# --- API Endpoints ---
@app.post("/risk-score", response_model=RiskScore)
async def get_risk_score(transaction: Transaction):
    """Receives a transaction and returns a fraud risk score."""
    return score_transaction(transaction)


def to_payload(obj):
    if hasattr(obj, "model_dump"):   # pydantic v2
        return obj.model_dump()
    if hasattr(obj, "dict"):         # pydantic v1
        return obj.dict()
    if hasattr(obj, "__dict__"):     # plain class
        return obj.__dict__
    return obj

@app.post("/simulate-attack")
async def simulate_attack(attack_params: SimulateAttack):
    """Injects a burst of fraudulent transactions into the live stream."""
    for _ in range(attack_params.num_transactions):
        fraud_transaction = generate_transaction(is_fraudulent=True)
        risk_analysis = score_transaction(fraud_transaction)

        payload = {
        "transaction": to_payload(fraud_transaction),
        "risk_analysis": to_payload(risk_analysis),
        }

        await manager.broadcast(payload)
        await asyncio.sleep(random.uniform(0.5, 1.5))

    return {"message": f"{attack_params.num_transactions} fraudulent transactions simulated."}


@app.get("/user-profile/{user_id}", response_model=UserProfile)
async def get_user_profile(user_id: str):
    """Returns a mock user profile with behavioral analytics."""
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
        ],
    )


@app.get("/")
async def root():
    return {"status": "FraudShield AI Backend is running!"}