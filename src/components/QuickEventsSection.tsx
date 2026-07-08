import { useVitalStore } from '../stores/vitalStore'
import { useUIStore } from '../stores/uiStore'
import {
  EVENT_ORDER, EVENT_TABLE, ACTIVE_STATE_MAP,
  CATEGORY_ORDER, CATEGORY_LABEL,
} from '../utils/events'
import type { EventId } from '../types/vitals'

const DURATIONS = [
  { label: 'Instant', ms: 0 },
  { label: '10s', ms: 10_000 },
  { label: '30s', ms: 30_000 },
  { label: '60s', ms: 60_000 },
  { label: '2min', ms: 120_000 },
]

export default function QuickEventsSection() {
  const fireEvent = useVitalStore(s => s.fireEvent)
  const cancelTween = useVitalStore(s => s.cancelTween)
  const tween = useVitalStore(s => s.tween)
  const vitals = useVitalStore(s => s.vitals)
  const tweenDurationMs = useUIStore(s => s.tweenDurationMs)
  const setTweenDuration = useUIStore(s => s.setTweenDuration)

  function isActive(id: EventId): boolean {
    const fn = ACTIVE_STATE_MAP[id]
    return fn ? fn(vitals) : false
  }

  return (
    <div className="space-y-3">
      {/* Duration selector */}
      <div>
        <div className="text-[10px] font-mono text-mx-text-dim uppercase tracking-widest mb-1">
          Transition
        </div>
        <div className="flex gap-1">
          {DURATIONS.map(d => (
            <button
              key={d.ms}
              onClick={() => setTweenDuration(d.ms)}
              className={`flex-1 py-1.5 rounded text-xs font-mono font-bold border transition-colors ${
                tweenDurationMs === d.ms
                  ? 'bg-cyan-700 border-cyan-600 text-white'
                  : 'bg-mx-border border-mx-border text-mx-text-dim hover:bg-mx-border/70'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transition-in-progress banner */}
      {tween?.active && (
        <div className="flex items-center justify-between px-3 py-2 rounded bg-cyan-900/40 border border-cyan-700 text-xs font-mono">
          <span className="text-cyan-200">
            ⟳ Transitioning to <strong>{tween.eventLabel}</strong> — {Math.ceil(tween.remainingMs / 1000)}s remaining
          </span>
          <button
            onClick={cancelTween}
            className="text-cyan-300 hover:text-white ml-4 font-bold"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Category grids */}
      {CATEGORY_ORDER.map(cat => (
        <div key={cat}>
          <div className="text-[10px] font-mono font-bold text-mx-text-dim uppercase tracking-widest mb-1.5">
            {CATEGORY_LABEL[cat]}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {EVENT_ORDER[cat].map(id => {
              const def = EVENT_TABLE[id]
              const active = isActive(id)
              return (
                <button
                  key={id}
                  onClick={() => fireEvent(id, tweenDurationMs)}
                  className={`py-2 px-2 rounded text-xs font-medium text-left leading-tight border transition-colors ${
                    active
                      ? 'bg-orange-700/60 border-orange-500 text-orange-100'
                      : 'bg-mx-panel border-mx-border text-white hover:bg-cyan-700/30 hover:border-cyan-600'
                  }`}
                >
                  {def.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
