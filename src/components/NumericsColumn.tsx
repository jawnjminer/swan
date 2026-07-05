import { useVitalStore } from '../stores/vitalStore'
import { calculateMAP, calculatePAMean } from '../utils/waveformGenerator'

const C = {
  ecg: '#22ff44',
  pulse: '#33ccff',
  abp: '#ff4444',
  pap: '#ffdd33',
  cvp: '#33ccff',
  spo2: '#33ccff',
  resp: '#ffffff',
  green: '#22ff44',
  nbp: '#ff44cc',
}

export default function NumericsColumn() {
  const vitals = useVitalStore(s => s.vitals)
  const disconnect = useVitalStore(s => s.disconnect)
  const limits = useVitalStore(s => s.alarmLimits)
  const savedPawp = useVitalStore(s => s.vitals.savedPawp)

  const map = calculateMAP(vitals.abpSys, vitals.abpDia)
  const paMean = calculatePAMean(vitals.papSys, vitals.papDia)

  const hrAlarm = vitals.heartRate > limits.hrHigh || vitals.heartRate < limits.hrLow
  const abpAlarm = disconnect.art || vitals.abpSys > limits.abpSysHigh || vitals.abpSys < limits.abpSysLow
  const papAlarm = disconnect.pa || vitals.papDia > limits.papDiaHigh
  const spo2Alarm = vitals.spo2 < limits.spo2Low
  const rrAlarm = vitals.respRate > limits.respRateHigh || vitals.respRate < limits.respRateLow

  return (
    <div className="w-[320px] flex-shrink-0 border-l border-neutral-800 bg-black flex flex-col text-white overflow-hidden">
      {/* HR + Pulse row */}
      <div className="grid grid-cols-2 border-b border-neutral-900">
        <Block label="HR" sub={`${limits.hrHigh}\n${limits.hrLow}`} color={C.ecg} alarm={hrAlarm} icon="♥">
          <Big color={C.ecg} alarm={hrAlarm}>{vitals.heartRate}</Big>
        </Block>
        <Block label="Pulse" color={C.pulse}>
          <Big color={C.pulse}>{vitals.heartRate}</Big>
        </Block>
      </div>

      {/* QTc row */}
      <div className="grid grid-cols-2 border-b border-neutral-900">
        <Block label="QTc" color={C.green}>
          <Mid color={C.green}>496</Mid>
        </Block>
        <Block label="ΔQTc" color={C.green}>
          <div className="flex items-baseline gap-2">
            <Mid color={C.green}>79</Mid>
            <span className="text-[10px] text-neutral-500 font-mono">QT 368</span>
          </div>
        </Block>
      </div>

      {/* ABP */}
      <Block label="ABP" labelSub="Sys." sub={`${limits.abpSysHigh}\n${limits.abpSysLow}`} color={C.abp} alarm={abpAlarm} full>
        <div className="flex items-baseline gap-2">
          <Big color={C.abp} alarm={abpAlarm}>{disconnect.art ? '--/--' : `${vitals.abpSys}/${vitals.abpDia}`}</Big>
          <span className="text-3xl font-mono font-bold" style={{ color: C.abp }}>({disconnect.art ? '--' : map})</span>
        </div>
      </Block>

      {/* PAP */}
      <Block label="PAP" labelSub="Dia." sub={`46\n10`} color={C.pap} alarm={papAlarm} full>
        <div className="flex items-baseline gap-2">
          <Big color={C.pap} alarm={papAlarm}>{disconnect.pa ? '--/--' : `${vitals.papSys}/${vitals.papDia}`}</Big>
          <span className="text-3xl font-mono font-bold" style={{ color: C.pap }}>({disconnect.pa ? '--' : paMean})</span>
        </div>
      </Block>

      {/* CVP */}
      <Block label="CVP" labelSub="Mean" sub={`30\n0`} color={C.cvp} alarm={disconnect.cvp} full>
        <Big color={C.cvp} alarm={disconnect.cvp}>({disconnect.cvp ? '--' : vitals.cvpMean})</Big>
      </Block>

      {/* PAWP (saved) */}
      {savedPawp !== null && (
        <Block label="PAWP" color={C.pap} full>
          <Big color={C.pap}>{savedPawp}</Big>
        </Block>
      )}

      {/* SpO2 + SVV */}
      <div className="grid grid-cols-2 border-b border-neutral-900">
        <Block label="SpO₂" sub={`100\n${limits.spo2Low}`} color={C.spo2} alarm={spo2Alarm}>
          <Big color={C.spo2} alarm={spo2Alarm}>{vitals.spo2}</Big>
        </Block>
        <Block label="SVV" color={C.green}>
          <Mid color={C.green}>{vitals.svv}</Mid>
        </Block>
      </div>

      {/* RR + Tblood */}
      <div className="grid grid-cols-2 border-b border-neutral-900">
        <Block label="RR" sub={`${limits.respRateHigh}\n${limits.respRateLow}`} color={C.resp} alarm={rrAlarm}>
          <Big color={C.resp} alarm={rrAlarm}>{vitals.respRate}</Big>
        </Block>
        <Block label="Tblood" color={C.green}>
          <Mid color={C.green}>{vitals.tblood.toFixed(1)}</Mid>
        </Block>
      </div>

      {/* CCI + CCO */}
      <div className="grid grid-cols-2">
        <Block label="CCI" color={C.green}>
          <Big color={C.green}>{vitals.cci.toFixed(1)}</Big>
        </Block>
        <Block label="CCO" color={C.green}>
          <Big color={C.green}>{vitals.cco.toFixed(1)}</Big>
        </Block>
      </div>
    </div>
  )
}

function Block({ label, labelSub, sub, color, alarm, icon, full, children }: {
  label: string; labelSub?: string; sub?: string; color: string; alarm?: boolean; icon?: string; full?: boolean; children: React.ReactNode
}) {
  return (
    <div className={`px-2 py-1 ${full ? 'border-b border-neutral-900' : ''} ${alarm ? 'alarm-flash' : ''} relative`}>
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold" style={{ color }}>
            {icon && <span className="mr-1">{icon}</span>}{label}
          </span>
          {labelSub && <span className="text-[9px] text-neutral-500">{labelSub}</span>}
        </div>
        {sub && (
          <span className="text-[9px] text-neutral-500 font-mono whitespace-pre text-right leading-tight">{sub}</span>
        )}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}

function Big({ color, alarm, children }: { color: string; alarm?: boolean; children: React.ReactNode }) {
  return (
    <span className="text-4xl font-mono font-bold leading-none" style={{ color: alarm ? '#ffaa00' : color }}>
      {children}
    </span>
  )
}

function Mid({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="text-2xl font-mono font-bold leading-none" style={{ color }}>
      {children}
    </span>
  )
}
