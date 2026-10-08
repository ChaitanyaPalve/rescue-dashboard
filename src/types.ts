export type AreaId = "classA" | "classB" | "exitA" | "exitB"

export type NodeId = "node1" | "node2" | "node3"

export type TriggerType = "fire" | "sos" | "co2" | "motion" | "manual"

export interface AreaInfo {
  id: AreaId
  label: string
  subLabel: string
  nodeId: NodeId
  nodeLabel: string
  isTriggered: boolean
  triggerType?: TriggerType
  occupants: number
  temperature: number // in Celsius
  co2Level: number // in ppm
}

export interface NodeInfo {
  id: NodeId
  label: string
  role: string
  monitoredAreas: AreaId[]
  battery: number
  signalStrength: number // percentage
  status: "normal" | "alert" | "offline"
}

export interface LogEntry {
  id: string
  time: string
  areaId?: AreaId
  nodeId?: NodeId
  message: string
  kind: "info" | "warn" | "error" | "success"
}

export type ViewMode = "isometric" | "flow" | "split"
