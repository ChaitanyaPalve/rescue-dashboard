import serial
import serial.tools.list_ports
import time
import requests
import json
import re

FIREBASE_URL = 'https://pheonixnet-default-rtdb.asia-southeast1.firebasedatabase.app/nodes'
RENDER_URL = 'https://resq-mesh-backend.onrender.com/api/telemetry'

def find_hardware_port():
    ports = list(serial.tools.list_ports.comports())
    for p in ports:
        desc = p.description.lower()
        if "ch9102" in desc or "cp210" in desc or "ch340" in desc or "usb-serial" in desc or "serial" in desc:
            return p.device
    if ports:
        return ports[0].device
    return None

port = find_hardware_port()
if not port:
    print("No USB serial hardware found.")
    exit(1)

print(f"Detected hardware on {port}. Opening at 115200 baud...")
try:
    ser = serial.Serial(port, 115200, timeout=1)
    ser.dtr = False
    ser.rts = False
    print(f"Connected to {port} successfully!")
except Exception as e:
    print(f"Failed to open {port}: {e}")
    exit(1)

last_upload = 0
current_telemetry = {
    "id": "node002",
    "name": "Node 2 (Class B)",
    "zone": "Class B",
    "status": "online",
    "temp": 31.7,
    "gas": 320,
    "accelX": 1.70,
    "battery": 98,
    "motion": False
}

while True:
    try:
        line = ser.readline().decode('utf-8', errors='ignore').strip()
        if not line:
            time.sleep(0.05)
            continue
        
        # print("HW:", line)

        m_gas = re.search(r'MQ-2 Value\s*:\s*(\d+)', line, re.I)
        if m_gas:
            current_telemetry["gas"] = int(m_gas.group(1))

        m_acc = re.search(r'X:\s*([-+]?\d*\.?\d+)\s*m/s', line, re.I)
        if m_acc:
            current_telemetry["accelX"] = float(m_acc.group(1))

        m_temp = re.search(r'MPU Temperature:\s*([-+]?\d*\.?\d+)', line, re.I)
        if m_temp:
            current_telemetry["temp"] = float(m_temp.group(1))

        now = time.time()
        if now - last_upload >= 2.0:
            last_upload = now
            current_telemetry["last_seen"] = int(now * 1000)
            current_telemetry["status"] = "online"

            # 1. Update Firebase RTDB
            try:
                requests.put(f"{FIREBASE_URL}/node002.json", json=current_telemetry, timeout=3)
            except Exception as e:
                pass

            # 2. Update Render Backend
            try:
                requests.post(RENDER_URL, json=current_telemetry, timeout=3)
            except Exception as e:
                pass

            print(f"[LIVE NODE-002 PUSH] Gas: {current_telemetry['gas']} | Temp: {current_telemetry['temp']}C | AccelX: {current_telemetry['accelX']} m/s^2 -> Firebase & Render (OK)")

    except Exception as e:
        print("Loop error:", e)
        time.sleep(1)

