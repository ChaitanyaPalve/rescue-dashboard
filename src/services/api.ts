const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000"

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
