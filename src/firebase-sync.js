import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase, ref, onValue, set as setRtdb } from "firebase/database"
import {
  getFirestore,
  doc,
  collection,
  onSnapshot,
  setDoc,
} from "firebase/firestore"

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
export const rtdb = getDatabase(app)
export const firestore = getFirestore(app)
export const db = rtdb // Alias for backwards-compatibility

/**
 * 1. Subscribe to live Bluetooth / sensor node readings (Temperature, Gas, Motion, People Count)
 * Listens to both Realtime Database and Cloud Firestore
 */
export function subscribeToNodes(callback) {
  let unsubRtdb = () => {}
  let unsubFirestoreDoc = () => {}
  let unsubFirestoreCol = () => {}

  // A. Realtime Database listener (/nodes)
  try {
    const nodesRef = ref(rtdb, "nodes")
    unsubRtdb = onValue(
      nodesRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) callback(data)
      },
      (error) => {
        console.warn("RTDB Nodes listener waiting:", error.message)
      },
    )
  } catch (err) {
    console.warn("RTDB Nodes init:", err)
  }

  // B. Cloud Firestore listeners (doc nodes/telemetry or collection nodes)
  try {
    unsubFirestoreDoc = onSnapshot(
      doc(firestore, "nodes", "telemetry"),
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data())
        }
      },
      (err) => {
        console.warn("Firestore nodes/telemetry:", err.message)
      },
    )

    unsubFirestoreCol = onSnapshot(
      collection(firestore, "nodes"),
      (snapshot) => {
        if (!snapshot.empty) {
          const nodesObj = {}
          snapshot.forEach((d) => {
            nodesObj[d.id] = d.data()
          })
          callback(nodesObj)
        }
      },
      (err) => {
        console.warn("Firestore collection nodes:", err.message)
      },
    )
  } catch (err) {
    console.warn("Firestore Nodes init:", err)
  }

  return () => {
    unsubRtdb()
    unsubFirestoreDoc()
    unsubFirestoreCol()
  }
}

/**
 * 2. Subscribe to live SOS alerts from Android App or hardware nodes
 * Listens to BOTH Realtime Database and Cloud Firestore
 */
export function subscribeToEmergency(callback) {
  let unsubRtdb = () => {}
  let unsubFirestoreDoc = () => {}
  let unsubFirestoreEmergencyCol = () => {}
  let unsubFirestoreSosCol = () => {}

  // A. Realtime Database listener (/emergency)
  try {
    const emergencyRef = ref(rtdb, "emergency")
    unsubRtdb = onValue(
      emergencyRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) callback(data)
      },
      (error) => {
        console.warn("RTDB Emergency listener waiting:", error.message)
      },
    )
  } catch (err) {
    console.warn("RTDB Emergency init:", err)
  }

  // B. Cloud Firestore listeners (emergency/current, collection emergency, collection sos)
  try {
    unsubFirestoreDoc = onSnapshot(
      doc(firestore, "emergency", "current"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data()
          if (data) callback(data)
        }
      },
      (err) => {
        console.warn("Firestore emergency/current:", err.message)
      },
    )

    unsubFirestoreEmergencyCol = onSnapshot(
      collection(firestore, "emergency"),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            const data = change.doc.data()
            if (data && (data.active === true || data.isSos === true || data.type === "SOS")) {
              callback({
                active: true,
                node: data.node || data.senderId || change.doc.id,
                type: data.type || "SOS",
                event_category: data.event_category || "smoke",
                sender_name: data.sender_name || data.senderId || "Mobile Client",
                lat: data.lat || 18.5204,
                lon: data.lon || 73.8567,
                message: data.message || "🚨 Emergency Alert Triggered",
                timestamp: data.timestamp || Date.now(),
              })
            } else if (data && data.active === false) {
              callback({
                active: false,
                node: data.node || "REMOTE",
                type: "CLEAR",
                timestamp: data.timestamp || Date.now(),
              })
            }
          }
        })
      },
      (err) => {
        console.warn("Firestore collection emergency:", err.message)
      },
    )

    unsubFirestoreSosCol = onSnapshot(
      collection(firestore, "sos"),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added" || change.type === "modified") {
            const data = change.doc.data()
            if (data && data.active !== false) {
              callback({
                active: true,
                node: data.node || data.senderId || "HARDWARE_SOS",
                type: data.type || "SOS",
                event_category: data.event_category || "sos",
                sender_name: data.sender_name || "Field Unit",
                lat: data.lat || 18.5204,
                lon: data.lon || 73.8567,
                message: data.message || "🆘 SOS Signal Received",
                timestamp: data.timestamp || Date.now(),
              })
            }
          }
        })
      },
      (err) => {
        console.warn("Firestore collection sos:", err.message)
      },
    )
  } catch (err) {
    console.warn("Firestore Emergency init:", err)
  }

  return () => {
    unsubRtdb()
    unsubFirestoreDoc()
    unsubFirestoreEmergencyCol()
    unsubFirestoreSosCol()
  }
}

/**
 * 3. Trigger emergency alert from web dashboard
 * Broadcasts to BOTH Realtime Database and Cloud Firestore
 */
export async function triggerWebEmergency(
  sourceNode = "RESCUE_DASHBOARD",
  emergencyType = "SOS",
  extra = {},
) {
  const payload = {
    active: true,
    node: sourceNode,
    type: emergencyType,
    event_category: extra.event_category || "smoke",
    sender_name: extra.sender_name || "ResQMesh Web Command Center",
    lat: extra.lat || 18.5204,
    lon: extra.lon || 73.8567,
    message: extra.message || `🚨 Emergency Alert: ${emergencyType}`,
    timestamp: Date.now(),
  }

  const tasks = []

  // Write to RTDB
  try {
    const emergencyRef = ref(rtdb, "emergency")
    tasks.push(setRtdb(emergencyRef, payload).catch((e) => console.warn("RTDB set:", e.message)))
  } catch (e) {
    console.warn("RTDB set ref:", e.message)
  }

  // Write to Firestore doc and collection
  try {
    tasks.push(
      setDoc(doc(firestore, "emergency", "current"), payload).catch((e) =>
        console.warn("Firestore current doc set:", e.message),
      ),
    )
    tasks.push(
      setDoc(doc(firestore, "emergency", String(Date.now())), payload).catch((e) =>
        console.warn("Firestore emergency collection set:", e.message),
      ),
    )
  } catch (e) {
    console.warn("Firestore set:", e.message)
  }

  await Promise.allSettled(tasks)
}

/**
 * 4. Clear emergency status from web dashboard
 * Clears on BOTH Realtime Database and Cloud Firestore
 */
export async function clearWebEmergency() {
  const payload = {
    active: false,
    node: "RESCUE_DASHBOARD",
    type: "CLEAR",
    event_category: null,
    message: "All sectors safe and nominal.",
    timestamp: Date.now(),
  }

  const tasks = []

  // Clear on RTDB
  try {
    const emergencyRef = ref(rtdb, "emergency")
    tasks.push(setRtdb(emergencyRef, payload).catch((e) => console.warn("RTDB clear:", e.message)))
  } catch (e) {
    console.warn("RTDB clear ref:", e.message)
  }

  // Clear on Firestore
  try {
    tasks.push(
      setDoc(doc(firestore, "emergency", "current"), payload).catch((e) =>
        console.warn("Firestore clear set:", e.message),
      ),
    )
  } catch (e) {
    console.warn("Firestore clear:", e.message)
  }

  await Promise.allSettled(tasks)
}

/**
 * 5. Sync Demo Mode Walkthrough state to Firebase RTDB & Firestore
 */
export async function syncDemoModeToFirebase(active, step, description = "") {
  const payload = {
    active,
    current_step: step,
    description: description || (active ? `Demo Step ${step}` : "Nominal Monitoring"),
    timestamp: Date.now(),
  }

  const tasks = []

  try {
    const demoRef = ref(rtdb, "demo_mode")
    tasks.push(setRtdb(demoRef, payload).catch((e) => console.warn("RTDB demo set:", e.message)))
  } catch (e) {
    console.warn("RTDB demo ref:", e.message)
  }

  try {
    tasks.push(
      setDoc(doc(firestore, "system", "demo_mode"), payload).catch((e) =>
        console.warn("Firestore demo set:", e.message),
      ),
    )
  } catch (e) {
    console.warn("Firestore demo set:", e.message)
  }

  await Promise.allSettled(tasks)
}

/**
 * 6. Listen for Demo Mode changes from Mobile or Remote
 */
export function subscribeToDemoMode(callback) {
  let unsubRtdb = () => {}
  try {
    const demoRef = ref(rtdb, "demo_mode")
    unsubRtdb = onValue(
      demoRef,
      (snapshot) => {
        const data = snapshot.val()
        if (data) callback(data)
      },
      (error) => {
        console.warn("RTDB Demo listener waiting:", error.message)
      },
    )
  } catch (err) {
    console.warn("RTDB Demo init:", err)
  }

  return () => {
    unsubRtdb()
  }
}
