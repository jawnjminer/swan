import { useEffect, useState } from 'react'
import { useUIStore } from '../stores/uiStore'

export default function StatusBar() {
  const isSilenced = useUIStore(s => s.isSilenced)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })

  return (
    <div className="bg-black text-white select-none">
      {/* Bed tile strip */}
      <div className="flex items-stretch gap-[2px] px-1 pt-1 h-6 overflow-hidden">
        {BED_TILES.map((t, i) => (
          <div
            key={i}
            className={`text-[9px] font-mono px-2 flex items-center rounded-sm ${t.active ? 'bg-cyan-700 text-white' : 'bg-neutral-800 text-neutral-400'}`}
          >
            {t.label}
          </div>
        ))}
        <div className="ml-auto text-[9px] font-mono px-2 flex items-center rounded-sm bg-yellow-500 text-black">KD6130</div>
      </div>

      {/* Status row */}
      <div className="flex items-center h-7 px-1 gap-0 text-xs border-b border-neutral-800">
        <div className="bg-cyan-700 text-white px-3 h-full flex items-center font-medium text-[11px] rounded-sm">
          <span className="mr-1">✓</span> NBP Check Cuff
        </div>
        <div className="flex items-center gap-6 ml-auto mr-3 text-[11px] text-neutral-300">
          <span className="flex items-center gap-1"><Icon /> Adult ICU</span>
          <span className="flex items-center gap-1"><Icon /> 8 Waves</span>
          <span className="font-mono">{dateStr} {timeStr}</span>
          {isSilenced() && (
            <span className="text-yellow-400 font-mono alarm-flash">⏸ ALARMS PAUSED</span>
          )}
        </div>
      </div>
    </div>
  )
}

const BED_TILES = [
  { label: 'KD6102', active: false },
  { label: 'KD6104', active: true },
  { label: 'KD6106', active: true },
  { label: 'KD6108', active: false },
  { label: 'KD6110', active: false },
  { label: 'KD6112', active: false },
  { label: 'KD6114', active: true },
  { label: 'KD6116', active: true },
  { label: 'KD6118', active: true },
  { label: 'KD6120', active: true },
  { label: 'KD6122', active: false },
  { label: 'KD6124', active: false },
  { label: 'KD6126', active: true },
  { label: 'KD6128', active: true },
]

function Icon() {
  return <span className="inline-block w-3 h-3 rounded-sm bg-neutral-600" />
}
