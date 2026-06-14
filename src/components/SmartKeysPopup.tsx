import { useUIStore } from '../stores/uiStore'

interface SmartKey {
  label: string
  icon: string
  onClick?: () => void
}

export default function SmartKeysPopup({ onClose }: { onClose: () => void }) {
  const setScreen = useUIStore(s => s.setScreen)

  const openWedge = () => {
    setScreen('wedge')
    onClose()
  }

  const keys: SmartKey[] = [
    { label: 'Realtime Report', icon: '🖨' },
    { label: 'Veni Puncture', icon: '💉' },
    { label: 'Annotate Arrhy', icon: '〰' },
    { label: 'Relearn Arrhy', icon: '〰' },
    { label: 'Calculator', icon: '🧮' },
    { label: 'Unit Conversion', icon: '⇄' },
    { label: 'NBP STAT', icon: '🩺' },
    { label: 'Stop All NBP', icon: '⊘' },
    { label: 'Monitor Standby', icon: '⏻' },
    { label: 'Wedge', icon: '⊐', onClick: openWedge },
    { label: '', icon: '' },
    { label: 'Calcs', icon: '▦' },
    { label: 'Change Screen', icon: '◳' },
    { label: 'Alarm Limits', icon: '⚠' },
    { label: 'Alarm Volume', icon: '🔊' },
    { label: 'Vital Signs', icon: '📈' },
  ]

  return (
    <div className="absolute inset-0 z-40 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-neutral-800 border-t border-neutral-600 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 h-7 bg-neutral-700 border-b border-neutral-600">
          <span className="text-xs text-neutral-200 font-medium mx-auto">SmartKeys ● ●</span>
          <button onClick={onClose} className="text-neutral-300 hover:text-white text-sm">✕</button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-8">
          {keys.map((k, i) => (
            <button
              key={i}
              onClick={k.onClick}
              disabled={!k.label}
              className={`h-20 flex flex-col items-center justify-center gap-1 border-r border-b border-neutral-700 ${
                k.label ? 'hover:bg-neutral-700' : 'cursor-default'
              } ${k.label === 'Wedge' ? 'bg-neutral-700/60' : ''}`}
            >
              {k.label && (
                <>
                  <span className="text-lg text-neutral-300 leading-none">{k.icon}</span>
                  <span className="text-[10px] text-neutral-200 text-center leading-tight px-1">{k.label}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
