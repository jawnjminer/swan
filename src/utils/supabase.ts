import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Vitals, DisconnectState, AlarmLimits } from '../types/vitals'

export interface SimulationState {
  vitals: Vitals
  disconnect: DisconnectState
  alarmLimits: AlarmLimits
}

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Sync is optional. When env vars are absent the whole layer no-ops and the
 * app runs as a single-device simulator exactly as before. When configured,
 * the instructor console broadcasts state and the bedside monitor subscribes.
 */
export const syncEnabled = Boolean(URL && KEY)

const supabase: SupabaseClient | null = syncEnabled
  ? createClient(URL as string, KEY as string)
  : null

const CHANNEL_NAME = 'simulation'
const BROADCAST_EVENT = 'state-update'
const SNAPSHOT_ID = 'singleton'
const BROADCAST_THROTTLE_MS = 100  // ~10 Hz during tweens
const SNAPSHOT_DEBOUNCE_MS = 500

let _channel: ReturnType<SupabaseClient['channel']> | null = null
let _channelSubscribed = false
let _lastBroadcast = 0
let _snapshotTimer: ReturnType<typeof setTimeout> | null = null

function getChannel() {
  if (!supabase) return null
  if (!_channel) {
    _channel = supabase.channel(CHANNEL_NAME)
    _channel.subscribe((status) => {
      _channelSubscribed = status === 'SUBSCRIBED'
    })
  }
  return _channel
}

/** Instructor side: broadcast current state (throttled to ~10 Hz). */
export function broadcastState(state: SimulationState): void {
  if (!syncEnabled) return
  const now = Date.now()
  if (now - _lastBroadcast < BROADCAST_THROTTLE_MS) return
  _lastBroadcast = now
  const ch = getChannel()
  if (ch && _channelSubscribed) {
    ch.send({ type: 'broadcast', event: BROADCAST_EVENT, payload: state })
  }
  scheduleSnapshotWrite(state)
}

/** Bedside side: subscribe to live broadcasts. Returns an unsubscribe fn. */
export function subscribeToState(onState: (s: SimulationState) => void): () => void {
  if (!supabase) return () => {}
  const ch = supabase.channel(CHANNEL_NAME)
  ch.on('broadcast', { event: BROADCAST_EVENT }, ({ payload }) => {
    onState(payload as SimulationState)
  }).subscribe()
  return () => { supabase.removeChannel(ch) }
}

/** Bedside side: read the last snapshot for instant hydration on load. */
export async function fetchSnapshot(): Promise<SimulationState | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('session_state')
    .select('vitals, disconnect, alarm_limits')
    .eq('id', SNAPSHOT_ID)
    .maybeSingle()
  if (error || !data) return null
  return {
    vitals: data.vitals as Vitals,
    disconnect: data.disconnect as DisconnectState,
    alarmLimits: data.alarm_limits as AlarmLimits,
  }
}

// ─── internals ─────────────────────────────────────────────────────────────

function scheduleSnapshotWrite(state: SimulationState): void {
  if (_snapshotTimer) clearTimeout(_snapshotTimer)
  _snapshotTimer = setTimeout(() => { void writeSnapshot(state) }, SNAPSHOT_DEBOUNCE_MS)
}

async function writeSnapshot(state: SimulationState): Promise<void> {
  if (!supabase) return
  await supabase.from('session_state').upsert({
    id: SNAPSHOT_ID,
    vitals: state.vitals,
    disconnect: state.disconnect,
    alarm_limits: state.alarmLimits,
    updated_at: new Date().toISOString(),
  })
}
