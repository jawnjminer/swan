import { useEffect } from 'react'
import { useUIStore } from './stores/uiStore'
import MonitorScreen from './components/MonitorScreen'
import ControlPanel from './components/ControlPanel'
import AlarmMonitor from './components/AlarmMonitor'
import { resumeAudioContext } from './utils/alarmTones'

export default function App() {
  const screen = useUIStore(s => s.screen)

  useEffect(() => {
    const handler = () => {
      resumeAudioContext()
      document.removeEventListener('click', handler)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  // Monitor screen also hosts the wedge/edit-wedge modal overlays
  const showMonitor = screen === 'monitor' || screen === 'wedge' || screen === 'edit-wedge'

  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      <AlarmMonitor />
      {showMonitor && <MonitorScreen />}
      {screen === 'control' && <ControlPanel />}
    </div>
  )
}
