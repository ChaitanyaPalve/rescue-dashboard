"""
ResQMesh Serial Bridge for Workstation USB Connected Nodes (COM12 / auto-detected)
Reads live sensor telemetry from ESP32 nodes plugged via USB and pushes to Firebase RTDB & Backend.
"""
import serial
import serial.tools.list_ports
import time
import json
import urllib.request
import re

RTDB_BASE = "https://resq-hardware-default-rtdb.asia-southeast1.firebasedatabase.app"
BACKEND_BASE = "https://resq-mesh-backend.onrender.com"

def find_esp32_ports():
    ports = []
    for p in serial.tools.list_ports.comports():
        if "CH9102" in p.description or "CP210" in p.description or "CH340" in p.description or "USB" in p.description:
            ports.append(p.device)
    return ports

def stream_port(port_name):
    print(f"Connecting to {port_name} at 115200 baud...")
    ser = serial.Serial()
    ser.port = port_name
    ser.baudrate = 115200
    ser.dtr = False
    ser.rts = False
    ser.timeout = 2
    ser.open()

    current_node = "node002"
    latest_mq2 = None
    latest_temp = None
    latest_accel_x = None

    last_upload_time = 0

    try:
        while True:
            raw_line = ser.readline().decode("utf-8", errors="ignore").strip()
            if not raw_line:
                continue

            if "NODE-001" in raw_line or "Node 1" in raw_line:
                current_node = "node001"
            elif "NODE-002" in raw_line or "Node 2" in raw_line:
                current_node = "node002"

            if "MQ-2 Value" in raw_line or "Gas" in raw_line:
                m = re.search(r"(\d+(\.\d+)?)", raw_line.split(":")[-1])
                if m:
                    latest_mq2 = float(m.group(1))

            if "MPU Temperature" in raw_line or "Temperature" in raw_line:
                m = re.search(r"(\d+(\.\d+)?)", raw_line.split(":")[-1])
                if m:
                    latest_temp = float(m.group(1))

            if "X:" in raw_line and ("m/s" in raw_line or "g" in raw_line):
                m = re.search(r"([-+]?\d+(\.\d+)?)", raw_line.split(":")[-1])
                if m:
                    latest_accel_x = float(m.group(1))

            now = time.time()
            # Push every 2 seconds if we have valid readings
            if (now - last_upload_time) >= 2.0 and (latest_mq2 is not None or latest_temp is not None):
                last_upload_time = now
                node_name = "Node 1 (Class A)" if current_node == "node001" else "Node 2 (Class B)"
                zone_name = "Class A" if current_node == "node001" else "Class B"

                payload = {
                    "id": current_node,
                    "name": node_name,
                    "zone": zone_name,
                    "status": "online",
                    "temp": round(latest_temp if latest_temp is not None else 23.0, 1),
                    "gas": round(latest_mq2 if latest_mq2 is not None else 350.0, 1),
                    "accelX": round(latest_accel_x if latest_accel_x is not None else 0.0, 2),
                    "motion": False,
                    "battery": 98,
                    "last_seen": int(now * 1000)
                }

                # Upload to Firebase RTDB
                try:
                    url = f"{RTDB_BASE}/nodes/{current_node}.json"
                    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"}, method="PUT")
                    with urllib.request.urlopen(req, timeout=3) as resp:
                        pass
                except Exception as e:
                    print(f"RTDB upload error: {e}")

                # Upload to Render Cloud Backend
                try:
                    b_url = f"{BACKEND_BASE}/api/telemetry"
                    b_payload = {
                        "node_id": current_node,
                        "temp": payload["temp"],
                        "gas": payload["gas"],
                        "accelX": payload["accelX"],
                        "battery": 98
                    }
                    req = urllib.request.Request(b_url, data=json.dumps(b_payload).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
                    with urllib.request.urlopen(req, timeout=3) as resp:
                        pass
                except Exception as e:
                    pass

                print(f"[{port_name} -> {current_node}] Live Push: Temp={payload['temp']}°C | Gas={payload['gas']} ppm | AccelX={payload['accelX']}")
    finally:
        ser.close()

if __name__ == "__main__":
    ports = find_esp32_ports()
    if not ports:
        print("No USB serial ports found.")
    else:
        print(f"Detected ports: {ports}")
        stream_port(ports[0])

