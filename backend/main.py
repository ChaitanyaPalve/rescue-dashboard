from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import asyncio
import json
import time

app = FastAPI(
    title="ResQMesh Command Center API",
    description="Backend telemetry, AI hazard assessment, and real-time emergency dispatch engine for ResQMesh & PhoenixNet.",
    version="2.1.0"
)

# Enable CORS for Vercel, localhost, and mobile clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Connected Real-Time Clients ────────────────────────────────────────────────
sse_clients: List[asyncio.Queue] = []
ws_clients: List[WebSocket] = []


# ── Global System State (Unified Schema) ──────────────────────────────────────
# ── Global System State (Unified Schema) ──────────────────────────────────────
system_state: Dict[str, Any] = {
    "system_status": "NOMINAL",  # "NOMINAL" or "EMERGENCY_ACTIVE"
    "demo_mode": {
        "active": False,
        "current_step": 0,
        "step": 0,
        "description": "Nominal Monitoring"
    },
    "nodes": {
        "node001": {
            "id": "node001",
            "name": "Node 1 (Class A)",
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
            "name": "Node 2 (Class B)",
            "zone": "Class B",
            "status": "online",
            "temp": 21.8,
            "gas": 395,
            "accelX": 0.02,
            "motion": False,
            "battery": 95,
            "last_seen": time.time()
        },
        "node003": {
            "id": "node003",
            "name": "Node 3 (Dual Exit Hub)",
            "zone": "Exits A & B",
            "status": "online",
            "peopleInside": 42,
            "battery": 99,
            "last_seen": time.time()
        }
    },
    "exits": {
        "EXIT_A": {
            "name": "Exit A (South)",
            "blocked": False,
            "hazard_type": None
        },
        "EXIT_B": {
            "name": "Exit B (North)",
            "blocked": False,
            "hazard_type": None
        }
    },
    "emergency": {
        "active": False,
        "node": None,
        "type": None,
        "event_category": None,  # "smoke", "sos", "co2", "intrusion", "drill"
        "event_type": None,
        "timestamp": None,
        "sender_name": None,
        "lat": 18.5204,
        "lon": 73.8567,
        "message": "All sectors safe and nominal."
    },
    "sos": [],
    "campus": {
        "exits": {
            "EXIT_A": {
                "name": "Exit A (South)",
                "blocked": False,
                "hazard_type": None
            },
            "EXIT_B": {
                "name": "Exit B (North)",
                "blocked": False,
                "hazard_type": None
            }
        }
    },
    "last_ai_result": {
        "has_active_emergency": False,
        "primary_hazard_zone": None,
        "recommended_safe_exit": "BOTH EXITS OPEN",
        "risk_assessment": {
            "Class A": "SAFE",
            "Class B": "SAFE",
            "Exit A": "OPEN",
            "Exit B": "OPEN"
        },
        "evacuation_recommendation": {
            "primary_exit": "EXIT_A (South) & EXIT_B (North) are both safe",
            "status": "NOMINAL"
        },
        "zero_signal_search": {
            "estimated_unaccounted": 0,
            "priority_zones": []
        }
    }
}


# ── Dynamic Node Connectivity Refresh ──────────────────────────────────────────
def refresh_node_connectivity():
    now = time.time()
    for nid, node in system_state["nodes"].items():
        last_seen = node.get("last_seen")
        # Mark as disconnected if no packet received in last 90 seconds
        if not last_seen or (now - float(last_seen)) > 90:
            node["status"] = "disconnected"
        else:
            node["status"] = "online"


# ── Broadcast State Update to SSE and WebSocket Clients ────────────────────────
async def broadcast_state_change():
    refresh_node_connectivity()
    # Keep campus and demo_mode properties synchronized for all mobile & web clients
    system_state["campus"] = {"exits": system_state["exits"]}
    system_state["demo_mode"]["step"] = system_state["demo_mode"]["current_step"]

    payload = json.dumps(system_state)
    
    # 1. SSE Queues
    for queue in list(sse_clients):
        try:
            await queue.put(payload)
        except Exception:
            sse_clients.remove(queue)

    # 2. WebSockets
    for ws in list(ws_clients):
        try:
            await ws.send_text(payload)
        except Exception:
            if ws in ws_clients:
                ws_clients.remove(ws)


# ── Request / Response Models ──────────────────────────────────────────────────
class TelemetryUpdate(BaseModel):
    node_id: str
    temp: Optional[float] = None
    gas: Optional[float] = None
    accelX: Optional[float] = None
    motion: Optional[bool] = None
    peopleInside: Optional[int] = None
    battery: Optional[int] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class EmergencyEvent(BaseModel):
    active: bool = True
    node: str = "WEB_DASHBOARD"
    type: str = "sos"  # "class_a", "class_b", "exit_a", "exit_b", "both_exits", "sos"
    event_category: Optional[str] = "smoke"  # "smoke", "sos", "co2", "intrusion", "drill"
    event_type: Optional[str] = None
    timestamp: Optional[float] = None
    sender_name: Optional[str] = "Web Command Center"
    lat: Optional[float] = 18.5204
    lon: Optional[float] = 73.8567
    message: Optional[str] = None


class DemoStepRequest(BaseModel):
    active: bool = True
    step: int = 1
    action: Optional[str] = "TRIGGER_CLASS_A"


class BlockExitRequest(BaseModel):
    exit: str
    blocked: bool
    hazard_type: Optional[str] = None


class AnalyzeRequest(BaseModel):
    sos: Optional[List[Any]] = []
    hazard_zone: Optional[str] = None


# ── Core AI Risk Assessment Helper ─────────────────────────────────────────────
def recalculate_ai_risk():
    has_sos = system_state["emergency"]["active"]
    node_str = str(system_state["emergency"]["node"] or "").lower()
    type_str = str(system_state["emergency"]["type"] or "").lower()
    category = system_state["emergency"]["event_category"] or "smoke"

    hazard_zone = None
    if "node001" in node_str or "1" in node_str or "class_a" in type_str:
        hazard_zone = "Class A"
    elif "node002" in node_str or "2" in node_str or "class_b" in type_str:
        hazard_zone = "Class B"
    elif "exit" in node_str or "exit" in type_str:
        hazard_zone = "Exit Portals"
    elif has_sos:
        hazard_zone = "Class A"

    exit_a_blocked = system_state["exits"]["EXIT_A"]["blocked"]
    exit_b_blocked = system_state["exits"]["EXIT_B"]["blocked"]

    # Recommended evacuation route
    if exit_a_blocked and exit_b_blocked:
        recommended = "CRITICAL: ALL EXITS COMPROMISED — SEEK SHELTER IN PLACE"
        rec_exit = "NONE"
    elif exit_a_blocked:
        recommended = "EVACUATE VIA EXIT_B (North Emergency Portal)"
        rec_exit = "EXIT_B"
    elif exit_b_blocked:
        recommended = "EVACUATE VIA EXIT_A (South Emergency Portal)"
        rec_exit = "EXIT_A"
    elif hazard_zone == "Class A":
        recommended = "EVACUATE EAST WING VIA EXIT_B (Avoid West Corridor)"
        rec_exit = "EXIT_B"
    elif hazard_zone == "Class B":
        recommended = "EVACUATE WEST WING VIA EXIT_A (Avoid East Corridor)"
        rec_exit = "EXIT_A"
    else:
        recommended = "ALL EXITS OPERATIONAL"
        rec_exit = "EXIT_A & EXIT_B"

    ai_result = {
        "has_active_emergency": has_sos,
        "primary_hazard_zone": hazard_zone,
        "recommended_safe_exit": rec_exit,
        "risk_assessment": {
            "Class A": "HAZARD" if hazard_zone == "Class A" else "SAFE",
            "Class B": "HAZARD" if hazard_zone == "Class B" else "SAFE",
            "Exit A": "BLOCKED" if exit_a_blocked else "OPEN",
            "Exit B": "BLOCKED" if exit_b_blocked else "OPEN"
        },
        "evacuation_recommendation": {
            "primary_exit": recommended,
            "status": "CRITICAL" if (exit_a_blocked and exit_b_blocked) else ("WARNING" if has_sos else "NOMINAL")
        },
        "zero_signal_search": {
            "estimated_unaccounted": 14 if has_sos else 0,
            "priority_zones": [hazard_zone] if hazard_zone else []
        }
    }

    system_state["last_ai_result"] = ai_result
    return ai_result


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "ResQMesh AI Command Center & PhoenixNet Mobile Sync API",
        "status": "online",
        "system_status": system_state["system_status"],
        "endpoints": {
            "state": "/api/state",
            "stream_sse": "/api/stream",
            "websocket": "/ws",
            "telemetry": "POST /api/telemetry",
            "emergency": "POST /api/emergency",
            "demo": "POST /api/demo",
            "reset": "POST /api/reset",
            "docs": "/docs"
        }
    }


@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "timestamp": time.time(),
        "service": "resq-mesh-backend",
        "system_status": system_state["system_status"],
        "nodes_online": len(system_state["nodes"]),
        "sse_subscribers": len(sse_clients),
        "ws_subscribers": len(ws_clients)
    }


@app.get("/api/state")
def get_state():
    refresh_node_connectivity()
    return system_state


# ── Real-Time Server-Sent Events (SSE) Push Stream ────────────────────────────
@app.get("/api/stream")
async def event_stream(request: Request):
    """
    Server-Sent Events endpoint providing 0ms push updates to Web & Mobile clients.
    """
    queue: asyncio.Queue = asyncio.Queue()
    sse_clients.append(queue)

    async def event_generator():
        # Send initial full state immediately
        initial = json.dumps(system_state)
        yield f"event: state\ndata: {initial}\n\n"

        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    # Wait for state change or send heartbeat every 15 seconds
                    data = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: state\ndata: {data}\n\n"
                except asyncio.TimeoutError:
                    yield f": heartbeat {time.time()}\n\n"
        finally:
            if queue in sse_clients:
                sse_clients.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


# ── WebSocket Real-Time Stream ─────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    ws_clients.append(websocket)
    try:
        # Send initial state
        await websocket.send_text(json.dumps(system_state))
        while True:
            # Keep connection open and accept any incoming client messages
            msg = await websocket.receive_text()
            try:
                parsed = json.loads(msg)
                if parsed.get("action") == "PING":
                    await websocket.send_text(json.dumps({"action": "PONG", "time": time.time()}))
            except Exception:
                pass
    except WebSocketDisconnect:
        if websocket in ws_clients:
            ws_clients.remove(websocket)


# ── 1. Telemetry Ingestion ────────────────────────────────────────────────────
@app.post("/api/telemetry")
async def update_telemetry(payload: TelemetryUpdate):
    raw_nid = payload.node_id.lower().replace("-", "").replace(" ", "").replace("_", "")
    # Normalize ID to node001, node002, node003
    if raw_nid in ["node1", "1", "node01", "classa"]:
        nid = "node001"
    elif raw_nid in ["node2", "2", "node02", "classb"]:
        nid = "node002"
    elif raw_nid in ["node3", "3", "node03", "exits", "exita", "exitb", "hub"]:
        nid = "node003"
    else:
        nid = raw_nid

    if nid not in system_state["nodes"]:
        system_state["nodes"][nid] = {
            "id": nid,
            "name": f"Node {payload.node_id}",
            "zone": "Dynamic Sensor",
            "status": "online",
            "temp": 22.0,
            "gas": 400,
            "motion": False,
            "battery": 90,
            "last_seen": time.time()
        }

    node = system_state["nodes"][nid]
    if payload.temp is not None:
        node["temp"] = round(payload.temp, 1)
    if payload.gas is not None:
        node["gas"] = round(payload.gas, 1)
    if payload.accelX is not None:
        node["accelX"] = round(payload.accelX, 3)
    if payload.motion is not None:
        node["motion"] = payload.motion
    if payload.peopleInside is not None:
        node["peopleInside"] = payload.peopleInside
    if payload.battery is not None:
        node["battery"] = payload.battery
    node["last_seen"] = time.time()

    # Intelligent sensor threshold hazard detection
    if (payload.temp is not None and payload.temp >= 45.0) or (payload.gas is not None and payload.gas >= 800):
        system_state["system_status"] = "EMERGENCY_ACTIVE"
        hazard_cat = "smoke" if (payload.temp is not None and payload.temp >= 45.0) else "co2"
        if nid == "node001":
            system_state["exits"]["EXIT_A"]["blocked"] = True
            system_state["exits"]["EXIT_A"]["hazard_type"] = hazard_cat
            system_state["emergency"] = {
                "active": True,
                "node": "node001",
                "type": "class_a",
                "event_category": hazard_cat,
                "event_type": hazard_cat,
                "timestamp": time.time(),
                "sender_name": "Class A Sentinel (Node 1)",
                "lat": 18.5204,
                "lon": 73.8567,
                "message": f"🔥 Telemetry Threshold Exceeded in Class A (Temp: {node.get('temp')}°C, Gas: {node.get('gas')} ppm)"
            }
            system_state["sos"] = [system_state["emergency"]]
        elif nid == "node002":
            system_state["exits"]["EXIT_B"]["blocked"] = True
            system_state["exits"]["EXIT_B"]["hazard_type"] = hazard_cat
            system_state["emergency"] = {
                "active": True,
                "node": "node002",
                "type": "class_b",
                "event_category": hazard_cat,
                "event_type": hazard_cat,
                "timestamp": time.time(),
                "sender_name": "Class B Sentinel (Node 2)",
                "lat": 18.5208,
                "lon": 73.8572,
                "message": f"☣️ Telemetry Threshold Exceeded in Class B (Gas: {node.get('gas')} ppm)"
            }
            system_state["sos"] = [system_state["emergency"]]
        recalculate_ai_risk()

    await broadcast_state_change()
    return {"ok": True, "node": node, "system_status": system_state["system_status"]}


# ── 2. Emergency Trigger / SOS Dispatch ───────────────────────────────────────
@app.post("/api/emergency")
async def set_emergency(event: EmergencyEvent):
    category = event.event_category or event.event_type or "smoke"
    node_id = event.node or "node001"
    evt_type = (event.type or "sos").lower()

    system_state["system_status"] = "EMERGENCY_ACTIVE" if event.active else "NOMINAL"
    system_state["emergency"] = {
        "active": event.active,
        "node": node_id,
        "type": evt_type,
        "event_category": category,
        "event_type": category,
        "timestamp": event.timestamp or time.time(),
        "sender_name": event.sender_name or "Web Command Center",
        "lat": event.lat or 18.5204,
        "lon": event.lon or 73.8567,
        "message": event.message or f"🚨 {category.upper()} alert triggered by {node_id}"
    }

    # Apply Mandatory Exit Blockage Rules based on trigger origin
    if event.active:
        system_state["sos"] = [{
            "node": node_id,
            "type": evt_type,
            "event_category": category,
            "event_type": category,
            "timestamp": system_state["emergency"]["timestamp"],
            "sender_name": system_state["emergency"]["sender_name"],
            "message": system_state["emergency"]["message"]
        }]

        if "class_a" in evt_type or "node001" in node_id.lower() or "1" in node_id or "exit_a" in evt_type:
            system_state["exits"]["EXIT_A"]["blocked"] = True
            system_state["exits"]["EXIT_A"]["hazard_type"] = category
            # Elevate Class A sensors
            system_state["nodes"]["node001"]["temp"] = max(system_state["nodes"]["node001"].get("temp", 22), 48.5)
            system_state["nodes"]["node001"]["gas"] = max(system_state["nodes"]["node001"].get("gas", 400), 920)

        elif "class_b" in evt_type or "node002" in node_id.lower() or "2" in node_id or "exit_b" in evt_type:
            system_state["exits"]["EXIT_B"]["blocked"] = True
            system_state["exits"]["EXIT_B"]["hazard_type"] = category
            # Elevate Class B sensors
            system_state["nodes"]["node002"]["temp"] = max(system_state["nodes"]["node002"].get("temp", 22), 45.0)
            system_state["nodes"]["node002"]["gas"] = max(system_state["nodes"]["node002"].get("gas", 400), 880)

        elif "both" in evt_type or "both_exits" in evt_type:
            system_state["exits"]["EXIT_A"]["blocked"] = True
            system_state["exits"]["EXIT_A"]["hazard_type"] = category
            system_state["exits"]["EXIT_B"]["blocked"] = True
            system_state["exits"]["EXIT_B"]["hazard_type"] = category

        elif "sos" in evt_type:
            # Web SOS / Emergency SOS: Sets Class A hazard and compromises Exit A
            system_state["exits"]["EXIT_A"]["blocked"] = True
            system_state["exits"]["EXIT_A"]["hazard_type"] = "sos"
            system_state["nodes"]["node001"]["temp"] = max(system_state["nodes"]["node001"].get("temp", 22), 48.2)
            system_state["nodes"]["node001"]["gas"] = max(system_state["nodes"]["node001"].get("gas", 400), 910)
    else:
        # If cleared
        system_state["sos"] = []
        system_state["exits"]["EXIT_A"]["blocked"] = False
        system_state["exits"]["EXIT_A"]["hazard_type"] = None
        system_state["exits"]["EXIT_B"]["blocked"] = False
        system_state["exits"]["EXIT_B"]["hazard_type"] = None

    recalculate_ai_risk()
    await broadcast_state_change()

    return {
        "ok": True,
        "system_status": system_state["system_status"],
        "emergency": system_state["emergency"],
        "exits": system_state["exits"],
        "last_ai_result": system_state["last_ai_result"],
        "sos": system_state["sos"]
    }


# ── 3. Automated Demo Progression ─────────────────────────────────────────────
@app.post("/api/demo")
async def handle_demo_progression(req: DemoStepRequest):
    step = req.step
    is_active = req.active

    step_descriptions = {
        0: "Nominal Baseline Monitoring",
        1: "Step 1: Smoke Hazard Detected in Class A (Node 1) — Exit A Blocked",
        2: "Step 2: Air Quality Spike in Class B Lab (Node 2) — Exit B Blocked",
        3: "Step 3: South Exit A Compromised — Rerouting to Exit B",
        4: "Step 4: North Exit B Portal Obstruction Alert — Both Exits Blocked",
        5: "Step 5: Evacuation Clear & All Systems Normalized"
    }

    system_state["demo_mode"] = {
        "active": is_active,
        "current_step": step,
        "step": step,
        "description": step_descriptions.get(step, f"Demo Step {step}")
    }

    if not is_active or step == 0 or step == 5:
        # Reset to safe nominal
        system_state["system_status"] = "NOMINAL"
        system_state["emergency"] = {
            "active": False,
            "node": None,
            "type": None,
            "event_category": None,
            "event_type": None,
            "timestamp": None,
            "sender_name": None,
            "lat": 18.5204,
            "lon": 73.8567,
            "message": "All sectors safe and nominal."
        }
        system_state["sos"] = []
        system_state["exits"]["EXIT_A"]["blocked"] = False
        system_state["exits"]["EXIT_A"]["hazard_type"] = None
        system_state["exits"]["EXIT_B"]["blocked"] = False
        system_state["exits"]["EXIT_B"]["hazard_type"] = None
        system_state["nodes"]["node001"]["temp"] = 22.4
        system_state["nodes"]["node001"]["gas"] = 410
        system_state["nodes"]["node002"]["temp"] = 21.8
        system_state["nodes"]["node002"]["gas"] = 395
        system_state["nodes"]["node003"]["peopleInside"] = 42

    elif step == 1:
        # Step 1: Trigger Class A (Smoke) -> Exit A blocked, Exit B open
        system_state["system_status"] = "EMERGENCY_ACTIVE"
        system_state["emergency"] = {
            "active": True,
            "node": "node001",
            "type": "class_a",
            "event_category": "smoke",
            "event_type": "smoke",
            "timestamp": time.time(),
            "sender_name": "Class A Sentinel (Node 1)",
            "lat": 18.5204,
            "lon": 73.8567,
            "message": "🔥 Smoke Alarm Triggered in West Wing Class A"
        }
        system_state["sos"] = [system_state["emergency"]]
        system_state["exits"]["EXIT_A"]["blocked"] = True
        system_state["exits"]["EXIT_A"]["hazard_type"] = "smoke"
        system_state["exits"]["EXIT_B"]["blocked"] = False
        system_state["exits"]["EXIT_B"]["hazard_type"] = None
        system_state["nodes"]["node001"]["temp"] = 48.2
        system_state["nodes"]["node001"]["gas"] = 890

    elif step == 2:
        # Step 2: Trigger Class B (CO2) -> Exit B blocked, Exit A open
        system_state["system_status"] = "EMERGENCY_ACTIVE"
        system_state["emergency"] = {
            "active": True,
            "node": "node002",
            "type": "class_b",
            "event_category": "co2",
            "event_type": "co2",
            "timestamp": time.time(),
            "sender_name": "Class B Sentinel (Node 2)",
            "lat": 18.5208,
            "lon": 73.8572,
            "message": "☣️ CO2 Air Hazard Spike in East Wing Lab"
        }
        system_state["sos"] = [system_state["emergency"]]
        system_state["exits"]["EXIT_A"]["blocked"] = False
        system_state["exits"]["EXIT_A"]["hazard_type"] = None
        system_state["exits"]["EXIT_B"]["blocked"] = True
        system_state["exits"]["EXIT_B"]["hazard_type"] = "co2"
        system_state["nodes"]["node002"]["temp"] = 44.5
        system_state["nodes"]["node002"]["gas"] = 1150

    elif step == 3:
        # Step 3: Exit A Hazard -> Exit A blocked, Exit B open
        system_state["system_status"] = "EMERGENCY_ACTIVE"
        system_state["emergency"] = {
            "active": True,
            "node": "node003",
            "type": "exit_a",
            "event_category": "sos",
            "event_type": "sos",
            "timestamp": time.time(),
            "sender_name": "Dual Exit Controller (Node 3)",
            "lat": 18.5201,
            "lon": 73.8562,
            "message": "⚠️ South Emergency Portal (Exit A) Blocked"
        }
        system_state["sos"] = [system_state["emergency"]]
        system_state["exits"]["EXIT_A"]["blocked"] = True
        system_state["exits"]["EXIT_A"]["hazard_type"] = "sos"
        system_state["exits"]["EXIT_B"]["blocked"] = False
        system_state["exits"]["EXIT_B"]["hazard_type"] = None

    elif step == 4:
        # Step 4: Both Exits Blocked -> Dual Corridor Congestion
        system_state["system_status"] = "EMERGENCY_ACTIVE"
        system_state["emergency"] = {
            "active": True,
            "node": "node003",
            "type": "both_exits",
            "event_category": "drill",
            "event_type": "drill",
            "timestamp": time.time(),
            "sender_name": "Dual Exit Controller (Node 3)",
            "lat": 18.5209,
            "lon": 73.8565,
            "message": "🚨 Dual Exit Alert — Evacuation Corridors Congested"
        }
        system_state["sos"] = [system_state["emergency"]]
        system_state["exits"]["EXIT_A"]["blocked"] = True
        system_state["exits"]["EXIT_A"]["hazard_type"] = "drill"
        system_state["exits"]["EXIT_B"]["blocked"] = True
        system_state["exits"]["EXIT_B"]["hazard_type"] = "drill"

    recalculate_ai_risk()
    await broadcast_state_change()

    return {
        "ok": True,
        "demo_mode": system_state["demo_mode"],
        "system_status": system_state["system_status"],
        "emergency": system_state["emergency"],
        "exits": system_state["exits"],
        "last_ai_result": system_state["last_ai_result"],
        "sos": system_state["sos"]
    }


# ── 4. Clear Emergency / Reset System ─────────────────────────────────────────
@app.post("/api/emergency/clear")
@app.post("/api/reset")
async def reset_system():
    system_state["system_status"] = "NOMINAL"
    system_state["demo_mode"] = {
        "active": False,
        "current_step": 0,
        "step": 0,
        "description": "Nominal Baseline Monitoring"
    }
    system_state["emergency"] = {
        "active": False,
        "node": None,
        "type": None,
        "event_category": None,
        "event_type": None,
        "timestamp": None,
        "sender_name": None,
        "lat": 18.5204,
        "lon": 73.8567,
        "message": "All sectors safe and nominal."
    }
    system_state["sos"] = []
    system_state["exits"]["EXIT_A"]["blocked"] = False
    system_state["exits"]["EXIT_A"]["hazard_type"] = None
    system_state["exits"]["EXIT_B"]["blocked"] = False
    system_state["exits"]["EXIT_B"]["hazard_type"] = None

    # Reset sensor telemetry to clean baseline
    system_state["nodes"]["node001"]["temp"] = 22.4
    system_state["nodes"]["node001"]["gas"] = 410
    system_state["nodes"]["node001"]["motion"] = False
    system_state["nodes"]["node002"]["temp"] = 21.8
    system_state["nodes"]["node002"]["gas"] = 395
    system_state["nodes"]["node002"]["accelX"] = 0.02
    system_state["nodes"]["node002"]["motion"] = False
    system_state["nodes"]["node003"]["peopleInside"] = 42

    recalculate_ai_risk()
    await broadcast_state_change()

    return {
        "ok": True,
        "message": "System normalized. All exits open and safe.",
        "system_status": "NOMINAL",
        "state": system_state
    }


# ── 5. Manual Exit Blockage Toggle ────────────────────────────────────────────
@app.post("/api/block-exit")
async def block_exit(req: BlockExitRequest):
    key = req.exit.upper()
    if key in system_state["exits"]:
        system_state["exits"][key]["blocked"] = req.blocked
        system_state["exits"][key]["hazard_type"] = req.hazard_type if req.blocked else None

        # If any exit is blocked, activate emergency status if not already
        any_blocked = system_state["exits"]["EXIT_A"]["blocked"] or system_state["exits"]["EXIT_B"]["blocked"]
        if any_blocked:
            system_state["system_status"] = "EMERGENCY_ACTIVE"
            system_state["emergency"]["active"] = True
            system_state["emergency"]["type"] = key.lower()
            system_state["emergency"]["event_category"] = req.hazard_type or "smoke"
            system_state["emergency"]["event_type"] = req.hazard_type or "smoke"
            system_state["emergency"]["node"] = "node003"
            system_state["emergency"]["message"] = f"⚠️ {system_state['exits'][key]['name']} is BLOCKED"
            system_state["sos"] = [system_state["emergency"]]
        else:
            if not system_state["demo_mode"]["active"]:
                system_state["system_status"] = "NOMINAL"
                system_state["emergency"]["active"] = False
                system_state["sos"] = []

        recalculate_ai_risk()
        await broadcast_state_change()
        return {"ok": True, "exit": system_state["exits"][key], "last_ai_result": system_state["last_ai_result"]}
    raise HTTPException(status_code=404, detail=f"Exit {req.exit} not found.")


# ── 6. AI Evacuation Route Calculation ─────────────────────────────────────────
@app.post("/api/analyze")
def run_ai_analysis(req: AnalyzeRequest):
    result = recalculate_ai_risk()
    return {"ok": True, "timestamp": time.time(), **result}
