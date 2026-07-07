import { useEffect, useState } from 'react'
import { useVitalStore, isBroadcaster } from '../stores/vitalStore'
import { useUIStore } from '../stores/uiStore'
import { fetchSnapshot, subscribeToState } from '../utils/supabase'
import WaveformCanvas from './WaveformCanvas'
import StatusBar from './StatusBar'
import NumericsColumn from './NumericsColumn'
import BottomToolbar from './BottomToolbar'
import SmartKeysPopup from './SmartKeysPopup'
import WedgeWindow from './WedgeWindow'

const COLORS = {
  ecg: '#22ff44',
  abp: '#ff4444',
  pap: '#ffdd33',
  cvp: '#33ccff',
  pleth: '#33ccff',
  resp: '#ffffff',
}

export default function MonitorScreen() {
  const screen = useUIStore(s => s.screen)
  const setVitalsFromRemote = useVitalStore(s => s.setVitalsFromRemote)
  const [showSmartKeys, setShowSmartKeys] = useState(false)

  const showWedge = screen === 'wedge' || screen === 'edit-wedge'

  // Bedside sync: hydrate from the last snapshot, then track live instructor
  // broadcasts. Skip entirely if this client is the instructor console (it
  // owns the authoritative state and must not overwrite it with echoes).
  useEffect(() => {
    if (isBroadcaster()) return
    let cancelled = false
    fetchSnapshot().then(state => {
      if (state && !cancelled && !isBroadcaster()) setVitalsFromRemote(state)
    })
    const unsubscribe = subscribeToState(state => {
      if (!isBroadcaster()) setVitalsFromRemote(state)
    })
    return () => { cancelled = true; unsubscribe() }
  }, [setVitalsFromRemote])

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-black overflow-hidden">
      {/* Patient display: width is locked to 2× the height (matches the real
          Philips landscape screen). Scales to fit whichever dimension is the
          binding constraint of the viewport. */}
      <div
        className="flex flex-col bg-black text-white overflow-hidden relative"
        style={{ aspectRatio: '2 / 1', width: 'min(100vw, 200vh)', height: 'min(50vw, 100vh)' }}
      >
        <StatusBar />

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Waveform area */}
          <div className="flex-1 flex flex-col min-w-0">
          <WaveRow label="II" sublabel="M" color={COLORS.ecg} cal="1mV" rightLabel="Sinus Tach">
            <WaveformCanvas type="ecg" color={COLORS.ecg} height={68} yMin={-5} yMax={30} />
          </WaveRow>
          <WaveRow label="V" sublabel="M" color={COLORS.ecg} cal="1mV">
            <WaveformCanvas type="ecg" color={COLORS.ecg} height={58} yMin={-5} yMax={30} />
          </WaveRow>
          <WaveRow label="ABP" color={COLORS.abp} scale="150\n75\n0">
            <WaveformCanvas type="abp" color={COLORS.abp} height={64} yMin={0} yMax={160} />
          </WaveRow>
          <WaveRow label="PAP" color={COLORS.pap} scale="40\n20\n0">
            <WaveformCanvas type="pap" color={COLORS.pap} height={64} yMin={0} yMax={50} />
          </WaveRow>
          <WaveRow label="CVP" color={COLORS.cvp} scale="30\n15\n0">
            <WaveformCanvas type="cvp" color={COLORS.cvp} height={58} yMin={0} yMax={30} />
          </WaveRow>
          <WaveRow label="Pleth" color={COLORS.pleth}>
            <WaveformCanvas type="pleth" color={COLORS.pleth} height={56} yMin={0} yMax={100} />
          </WaveRow>
          <WaveRow label="Resp" color={COLORS.resp} cal="10hm">
            <WaveformCanvas type="resp" color={COLORS.resp} height={52} yMin={0} yMax={100} />
          </WaveRow>

          {/* NBP row */}
          <div className="px-2 py-1 flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold" style={{ color: '#ff44cc' }}>NBP</span>
              <span className="text-[9px] text-neutral-500">Sys.</span>
              <span className="text-[9px] text-neutral-500 font-mono">160 / 90</span>
            </div>
            <NBPReadout />
          </div>

          {/* PAWP (saved) — yellow strip below waveforms per Q14 */}
          <SavedPawpStrip />
          </div>

          <NumericsColumn />
        </div>

        <BottomToolbar onMore={() => setShowSmartKeys(true)} />

        {showSmartKeys && <SmartKeysPopup onClose={() => setShowSmartKeys(false)} />}
        {showWedge && <WedgeWindow />}
      </div>
    </div>
  )
}

function NBPReadout() {
  const vitals = useVitalStore(s => s.vitals)
  if (vitals.nbpStatus === 'measuring') {
    return <span className="text-4xl font-mono font-bold text-pink-400 animate-pulse">measuring…</span>
  }
  if (vitals.nbpStatus === 'done') {
    return (
      <span className="text-4xl font-mono font-bold text-pink-400">
        {vitals.nbpSys}/{vitals.nbpDia} <span className="text-3xl">({vitals.nbpMap})</span>
      </span>
    )
  }
  return <span className="text-4xl font-mono font-bold text-pink-400">-?-/-?- (-?-)</span>
}

function WaveRow({ label, sublabel, color, cal, scale, rightLabel, children }: {
  label: string; sublabel?: string; color: string; cal?: string; scale?: string; rightLabel?: string; children: React.ReactNode
}) {
  return (
    <div className="relative border-b border-neutral-900/60 flex">
      {/* Left label gutter */}
      <div className="w-12 flex-shrink-0 relative">
        <div className="absolute left-1 top-1 flex flex-col">
          <span className="text-[12px] font-semibold leading-tight" style={{ color }}>{label}</span>
          {sublabel && <span className="text-[9px] text-neutral-500">{sublabel}</span>}
          {cal && <span className="text-[8px] text-neutral-500">{cal}</span>}
        </div>
        {scale && (
          <div className="absolute right-0 top-0 h-full flex flex-col justify-between py-1 text-[8px] text-neutral-500 font-mono whitespace-pre items-end pr-0.5">
            {scale.split('\\n').map((s, i) => <span key={i}>{s}</span>)}
          </div>
        )}
      </div>
      {/* Waveform */}
      <div className="flex-1 min-w-0 relative">
        {rightLabel && (
          <span className="absolute right-2 top-1 text-[10px] z-10" style={{ color }}>{rightLabel}</span>
        )}
        {children}
      </div>
    </div>
  )
}

function SavedPawpStrip() {
  const savedPawp = useVitalStore(s => s.vitals.savedPawp)
  if (savedPawp === null) return null
  return (
    <div className="px-2 py-1 flex items-center gap-3 border-t border-neutral-900">
      <div className="flex flex-col">
        <span className="text-[11px] font-semibold" style={{ color: '#ffdd33' }}>PAWP</span>
        <span className="text-[9px] text-neutral-500">saved</span>
      </div>
      <span className="text-4xl font-mono font-bold" style={{ color: '#ffdd33' }}>{savedPawp}</span>
      <span className="text-sm font-mono text-neutral-500 mt-3">mmHg</span>
    </div>
  )
}
