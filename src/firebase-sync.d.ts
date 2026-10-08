import { Database } from "firebase/database"
import { Firestore } from "firebase/firestore"

export const rtdb: Database
export const firestore: Firestore
export const db: Database

export function subscribeToNodes(callback: (data: any) => void): () => void

export function subscribeToEmergency(
  callback: (data: {
    active?: boolean
    node?: string
    type?: string
    timestamp?: number
  }) => void,
): () => void

export function triggerWebEmergency(
  sourceNode?: string,
  emergencyType?: string,
): Promise<void>

export function clearWebEmergency(): Promise<void>
