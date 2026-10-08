import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase, ref, onValue, set } from "firebase/database"

// Pre-configured for project: resq-hardware
const firebaseConfig = {
  apiKey: "AIzaSyCwU93VpmYydhM1zhrvCD7pFomkEFgeRVQ",
  authDomain: "resq-hardware.firebaseapp.com",
  databaseURL: "https://resq-hardware-default-rtdb.firebaseio.com",
  projectId: "resq-hardware",
  storageBucket: "resq-hardware.firebasestorage.app",
  messagingSenderId: "326136146045",
  appId: "1:326136146045:web:339c42bfcc9b90f3a8a914",
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

