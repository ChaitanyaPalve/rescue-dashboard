import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase, ref, onValue, set } from "firebase/database"

// PhoenixNet Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7Z4Y0F_ycBs5tPDYgjFik7y4fUWOWFk8",
  authDomain: "pheonixnet.firebaseapp.com",
  databaseURL: "https://pheonixnet-default-rtdb.firebaseio.com",
  projectId: "pheonixnet",
  storageBucket: "pheonixnet.firebasestorage.app",
  messagingSenderId: "899855227001",
  appId: "1:899855227001:web:fe80c643d06a86f477dca8",
  measurementId: "G-YHB8P2YQXK",
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
export const db = getDatabase(app)

/**
 * 1. Subscribe to live Bluetooth / sensor node readings (Temperature, Gas, Motion, People Count)
 */
export function subscribeToNodes(callback) {
  const nodesRef = ref(db, "nodes")
  return onValue(nodesRef, (snapshot) => {
    const data = snapshot.val()
    if (data) callback(data)
  })
}

/**
 * 2. Subscribe to live SOS alerts from Android App or hardware nodes
 */
export function subscribeToEmergency(callback) {
  const emergencyRef = ref(db, "emergency")
  return onValue(emergencyRef, (snapshot) => {
    const data = snapshot.val()
    if (data) callback(data)
  })
}

/**
 * 3. Trigger emergency alert from web dashboard
 */
export function triggerWebEmergency(
  sourceNode = "RESCUE_DASHBOARD",
  emergencyType = "SOS",
) {
  const emergencyRef = ref(db, "emergency")
  return set(emergencyRef, {
    active: true,
    node: sourceNode,
    type: emergencyType,
    timestamp: Date.now(),
  })
}

/**
 * 4. Clear emergency status from web dashboard
 */
export function clearWebEmergency() {
  const emergencyRef = ref(db, "emergency")
  return set(emergencyRef, {
    active: false,
    node: "RESCUE_DASHBOARD",
    type: "CLEAR",
    timestamp: Date.now(),
  })
}
