import { useVitalStore } from '../stores/vitalStore'
import { useUIStore } from '../stores/uiStore'

interface ToolbarBtn {
  label: string
  icon: string
  onClick?: () => void
  active?: boolean
  accent?: boolean
}

export default function BottomToolbar({ onMore }: { onMore: () => void }) {
  const startNBP = useVitalStore(s => s.startNBP)
  const silenceAlarms = useUIStore(s => s.silenceAlarms)
  const isSilenced = useUIStore(s => s.isSilenced)
  const setScreen = useUIStore(s => s.setScreen)

  const buttons: ToolbarBtn[] = [
    { label: 'Acknowl-\nedge', icon: '☑' },
    { label: 'Pause\nAlarms', icon: '⚠', onClick: silenceAlarms, active: isSilenced() },
    { label: 'Start/Stop\nNBP', icon: '🩺', onClick: startNBP },
    { label: 'Repeat\nTime', icon: '⟳' },
    { label: 'Find\nPatient', icon: '🔍' },
    { label: 'Profiles', icon: '▭' },
    { label: 'Zero', icon: '⊘' },
    { label: 'Vitals\nTrend', icon: '☰' },
    { label: 'End\nCase', icon: '✕' },
    { label: 'More', icon: '⋮⋮', onClick: onMore },
  ]

  return (
    <div className="flex items-stretch h-16 bg-neutral-900 border-t border-neutral-700 select-none">
      {buttons.map((b, i) => (
        <button
          key={i}
          onClick={b.onClick}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 border-r border-neutral-800 transition-colors ${
            b.active ? 'border-2 border-yellow-400' : 'hover:bg-neutral-800'
          }`}
        >
          <span className="text-base leading-none text-neutral-300">{b.icon}</span>
          <span className="text-[10px] text-neutral-200 whitespace-pre text-center leading-tight">{b.label}</span>
        </button>
      ))}
      {/* Screen button — cyan accent */}
      <button
        onClick={() => setScreen('control')}
        className="w-24 flex flex-col items-center justify-center gap-0.5 bg-cyan-600 hover:bg-cyan-500 transition-colors"
      >
        <span className="text-base leading-none">▭</span>
        <span className="text-[10px] text-white">Screen</span>
      </button>
    </div>
  )
}
