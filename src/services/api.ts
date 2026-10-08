const DEFAULT_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "https://resq-mesh-backend.onrender.com"

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  DEFAULT_URL

export async function fetchBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`)
    return await res.json()
  } catch (err) {
    console.warn("Backend health check:", err)
    return null
  }
}

export async function fetchSystemState() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/state`)
    return await res.json()
  } catch (err) {
    console.warn("Backend state fetch:", err)
    return null
  }
}

export async function requestAIAnalysis(sosData?: any[], hazardZone?: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sos: sosData || [], hazard_zone: hazardZone }),
    })
    return await res.json()
  } catch (err) {
    console.warn("AI analysis request:", err)
    return null
  }
}

export async function sendBackendEmergency(payload: {
  active?: boolean
  node?: string
  type?: string
  event_category?: string
  sender_name?: string
  lat?: number
  lon?: number
  message?: string
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/emergency`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        active: payload.active ?? true,
        node: payload.node || "WEB_DASHBOARD",
        type: payload.type || "sos",
        event_category: payload.event_category || "smoke",
        timestamp: Date.now() / 1000,
        sender_name: payload.sender_name || "ResQMesh Web Command Center",
        lat: payload.lat ?? 18.5204,
        lon: payload.lon ?? 73.8567,
        message: payload.message || undefined,
      }),
    })
    return await res.json()
  } catch (err) {
    console.warn("Backend emergency dispatch:", err)
    return null
  }
}

export async function sendBackendDemoStep(
  step: number,
  action: string = "TRIGGER_CLASS_A",
  active: boolean = true,
) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        active,
        step,
        action,
      }),
    })
    return await res.json()
  } catch (err) {
    console.warn("Backend demo step dispatch:", err)
    return null
  }
}

export async function resetBackendSystem() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    return await res.json()
  } catch (err) {
    console.warn("Backend reset system:", err)
    return null
  }
}

export async function updateBackendTelemetry(payload: {
  node_id: string
  temp?: number
  gas?: number
  accelX?: number
  motion?: boolean
  peopleInside?: number
  battery?: number
  lat?: number
  lon?: number
}) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/telemetry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    return await res.json()
  } catch (err) {
    console.warn("Backend telemetry update:", err)
    return null
  }
}

export async function blockBackendExit(
  exit: string,
  blocked: boolean,
  hazard_type?: string | null,
) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/block-exit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exit, blocked, hazard_type }),
    })
    return await res.json()
  } catch (err) {
    console.warn("Backend block exit:", err)
    return null
  }
}

/**
 * Real-Time 0ms Server-Sent Events (SSE) Stream Subscriber
 * Automatically handles reconnection and JSON payload parsing.
 */
export function subscribeToBackendStream(
  onState: (state: any) => void,
  onError?: (err: any) => void,
): () => void {
  let eventSource: EventSource | null = null
  let isClosed = false

  const connect = () => {
    if (isClosed) return
    try {
      eventSource = new EventSource(`${BACKEND_URL}/api/stream`)

      eventSource.addEventListener("state", (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data)
          onState(parsed)
        } catch (e) {
          console.warn("SSE parse error:", e)
        }
      })

      eventSource.onerror = (e) => {
        if (onError) onError(e)
        if (eventSource) {
          eventSource.close()
          eventSource = null
        }
        if (!isClosed) {
          setTimeout(connect, 3000)
        }
      }
    } catch (err) {
      if (onError) onError(err)
      if (!isClosed) {
        setTimeout(connect, 3000)
      }
    }
  }

  connect()

  return () => {
    isClosed = true
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
  }
}
