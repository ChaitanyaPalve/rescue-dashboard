from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import time

app = FastAPI(
    title="ResQMesh Command Center API",
    description="Backend telemetry, AI hazard assessment, and emergency dispatch engine for ResQMesh.",
    version="2.0.0"
)

# Enable CORS for Vercel, localhost, and custom frontend domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global System State ────────────────────────────────────────────────────────
system_state: Dict[str, Any] = {
    "nodes": {
        "node001": {
            "id": "node001",
            "name": "Node 1",
            "zone": "Class A",
            "status": "online",
            "temp": 22.4,
            "gas": 410,
            "motion": False,
            "battery": 98,
            "last_seen": time.time()
        },
        "node002": {
            "id": "node002",
            "name": "Node 2",
            "zone": "Class B",
            "status": "online",
            "temp": 21.8,
            "gas": 395,
            "accelX": 0.02,
            "battery": 95,
            "last_seen": time.time()
        },
        "node003": {
            "id": "node003",
            "name": "Node 3",
            "zone": "Exits A & B",
            "status": "online",
            "peopleInside": 42,
            "battery": 99,
            "last_seen": time.time()
        }
    },
    "exits": {
        "EXIT_A": {"name": "Exit A (South)", "blocked": False},
        "EXIT_B": {"name": "Exit B (North)", "blocked": False}
    },
    "emergency": {
        "active": False,
        "node": None,
        "type": None,
        "timestamp": None
    },
    "last_ai_result": None
}


# ── Request / Response Models ──────────────────────────────────────────────────
class TelemetryUpdate(BaseModel):
    node_id: str
    temp: Optional[float] = None
    gas: Optional[float] = None
    accelX: Optional[float] = None
    peopleInside: Optional[int] = None
    battery: Optional[int] = None


class EmergencyEvent(BaseModel):
    active: bool = True
    node: str = "EXTERNAL"
    type: str = "SOS"
    timestamp: Optional[float] = None


class BlockExitRequest(BaseModel):
    exit: str
    blocked: bool


class AnalyzeRequest(BaseModel):
    sos: Optional[List[Any]] = []
    hazard_zone: Optional[str] = None


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "ResQMesh AI Command Center Backend",
        "status": "online",
        "documentation": "/docs",
        "health": "/health"
    }


@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "timestamp": time.time(),
        "service": "resq-backend",
        "nodes_online": len(system_state["nodes"])
    }


@app.get("/api/state")
def get_state():
    return system_state


@app.post("/api/telemetry")
def update_telemetry(payload: TelemetryUpdate):
    nid = payload.node_id.lower()
    if nid not in system_state["nodes"]:
        system_state["nodes"][nid] = {
            "id": payload.node_id,
            "name": f"Node {payload.node_id}",
            "zone": "Dynamic",
            "status": "online",
            "last_seen": time.time()
        }
    
    node = system_state["nodes"][nid]
    if payload.temp is not None:
        node["temp"] = payload.temp
    if payload.gas is not None:
        node["gas"] = payload.gas
    if payload.accelX is not None:
        node["accelX"] = payload.accelX
    if payload.peopleInside is not None:
        node["peopleInside"] = payload.peopleInside
    if payload.battery is not None:
        node["battery"] = payload.battery
    node["last_seen"] = time.time()

    return {"ok": True, "node": node}


@app.post("/api/emergency")
def set_emergency(event: EmergencyEvent):
    system_state["emergency"] = {
        "active": event.active,
        "node": event.node,
        "type": event.type,
        "timestamp": event.timestamp or time.time()
    }
    return {"ok": True, "emergency": system_state["emergency"]}


@app.post("/api/emergency/clear")
def clear_emergency():
    system_state["emergency"] = {
        "active": False,
        "node": "DASHBOARD",
        "type": "CLEAR",
        "timestamp": time.time()
    }
    return {"ok": True, "emergency": system_state["emergency"]}


@app.post("/api/block-exit")
def block_exit(req: BlockExitRequest):
    key = req.exit.upper()
    if key in system_state["exits"]:
        system_state["exits"][key]["blocked"] = req.blocked
        return {"ok": True, "exit": system_state["exits"][key]}
    raise HTTPException(status_code=404, detail=f"Exit {req.exit} not found.")


@app.post("/api/analyze")
def run_ai_analysis(req: AnalyzeRequest):
    has_sos = len(req.sos or []) > 0 or system_state["emergency"]["active"]
    hazard_zone = req.hazard_zone or (
        "A" if "1" in str(system_state["emergency"]["node"]) else
        "B" if "2" in str(system_state["emergency"]["node"]) else
        "A" if has_sos else None
    )

    exit_a_blocked = system_state["exits"]["EXIT_A"]["blocked"]
    exit_b_blocked = system_state["exits"]["EXIT_B"]["blocked"]

    # Recommended evacuation portal
    if not exit_b_blocked and (hazard_zone == "A" or exit_a_blocked):
        recommended_exit = "EXIT_B (North Portal)"
    elif not exit_a_blocked:
        recommended_exit = "EXIT_A (South Portal)"
    else:
        recommended_exit = "WARNING: ALL EXITS COMPROMISED - SEEK REFUGE"

    ai_result = {
        "ok": True,
        "timestamp": time.time(),
        "has_active_emergency": has_sos,
        "primary_hazard_zone": hazard_zone,
        "risk_assessment": {
            "Class A": "HIGH" if hazard_zone == "A" else "SAFE",
            "Class B": "HIGH" if hazard_zone == "B" else "SAFE",
            "Exit A": "BLOCKED" if exit_a_blocked else "OPEN",
            "Exit B": "BLOCKED" if exit_b_blocked else "OPEN"
        },
        "evacuation_recommendation": {
            "primary_exit": recommended_exit,
            "status": "CRITICAL" if has_sos else "NOMINAL"
        },
        "zero_signal_search": {
            "estimated_unaccounted": 18 if has_sos else 0,
            "priority_zones": [hazard_zone] if hazard_zone else []
        }
    }

    system_state["last_ai_result"] = ai_result
    return ai_result


@app.post("/api/reset")
def reset_system():
    system_state["emergency"] = {
        "active": False,
        "node": None,
        "type": None,
        "timestamp": None
    }
    system_state["exits"]["EXIT_A"]["blocked"] = False
    system_state["exits"]["EXIT_B"]["blocked"] = False
    system_state["last_ai_result"] = None
    return {"ok": True, "message": "System restored to safe nominal state"}
