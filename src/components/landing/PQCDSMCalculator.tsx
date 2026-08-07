'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Hexagon, AlertTriangle, ArrowRight, Activity } from 'lucide-react'
import {
  calculatePQCDSM,
  formatRupiah,
  type PQCDSMCurrentInput,
  type PQCDSMTargetInput,
  type PQCDSMOutput,
} from '@/lib/pqcdsmFormulas'

// ──────────────────────────────────────────────────────────
// Default values
// ──────────────────────────────────────────────────────────
const DEFAULT_CURRENT: PQCDSMCurrentInput = {
  productivity: { oeePct: 55, totalProductionLines: 5 },
  quality: { defectRatePct: 5.0 },
  cost: { monthlyOperationalCostRp: 500_000_000 },
  delivery: { onTimeRatePct: 70 },
  safety: { incidentsPerMonth: 2 },
  morale: { turnoverRatePct: 8.0 },
}

const DEFAULT_TARGET: PQCDSMTargetInput = {
  monitoredLines: 5,
  maturityLevel: 5,
  durationMonths: 6,
}

const MATURITY_LABELS: Record<number, string> = {
  1: 'Basic', 2: 'Basic', 3: 'Developing', 4: 'Developing',
  5: 'Established', 6: 'Established', 7: 'Advanced', 8: 'Advanced',
  9: 'Best-in-class', 10: 'Best-in-class',
}

const PILLAR_COLORS: Record<string, string> = {
  P: '#3b82f6', Q: '#10b981', C: '#f59e0b', D: '#6366f1', S: '#f43f5e', M: '#a855f7',
}

interface SliderInputProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (v: number) => void
  pillarColor?: string
}

function SliderInput({ id, label, value, min, max, step, unit = '', onChange, pillarColor }: SliderInputProps) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1.5">
        <label htmlFor={id} className="text-xs font-semibold text-slate-300">{label}</label>
        <span className="text-sm font-bold bg-[#050810]/50 px-2.5 py-0.5 rounded-lg" style={{ color: pillarColor ?? '#3dd9b0' }}>
          {value.toLocaleString('id-ID')}{unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[#1e3055]"
        style={{ accentColor: pillarColor ?? '#3dd9b0' }}
      />
      <div className="flex justify-between text-[10px] text-slate-600 mt-1.5 font-medium">
        <span>{min.toLocaleString('id-ID')}{unit}</span>
        <span>{max.toLocaleString('id-ID')}{unit}</span>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Output mini-card
// ──────────────────────────────────────────────────────────
interface PillarCardProps {
  pillarKey: string
  pillarName: string
  changePct: number
  currentLabel: string
  projectedLabel: string
  changeDirection: 'up' | 'down'
  color: string
}

function PillarCard({ pillarKey, pillarName, changePct, currentLabel, projectedLabel, changeDirection, color }: PillarCardProps) {
  const barWidth = Math.min(Math.abs(changePct), 100)
  return (
    <div className="bg-[#0d1728] border border-[#1e3055] rounded-2xl p-5 hover:border-slate-500 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-sm"
            style={{ backgroundColor: color }}>
            {pillarKey}
          </span>
          <span className="text-xs font-bold text-slate-300">{pillarName}</span>
        </div>
        <span className="text-sm font-black px-2 py-0.5 rounded-lg bg-black/20" style={{ color }}>
          {changeDirection === 'up' ? '+' : '-'}{Math.abs(changePct).toFixed(1)}%
        </span>
      </div>
      {/* Mini bar */}
      <div className="h-2 bg-[#1a2942] rounded-full mb-3 overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${barWidth}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between items-center text-[11px] text-slate-500">
        <span className="text-slate-400 font-medium">{currentLabel}</span>
        <ArrowRight className="w-3 h-3 text-slate-600" />
        <span className="font-bold text-[12px]" style={{ color }}>{projectedLabel}</span>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────
interface PQCDSMCalculatorProps {
  initialLines?: number
  onScrollToContact: () => void
}

export default function PQCDSMCalculator({ initialLines, onScrollToContact }: PQCDSMCalculatorProps) {
  const [current, setCurrent] = useState<PQCDSMCurrentInput>(() => ({
    ...DEFAULT_CURRENT,
    productivity: {
      ...DEFAULT_CURRENT.productivity,
      totalProductionLines: initialLines ?? DEFAULT_CURRENT.productivity.totalProductionLines,
    },
  }))
  const [target, setTarget] = useState<PQCDSMTargetInput>(DEFAULT_TARGET)
  const [costRawStr, setCostRawStr] = useState('500000000')
  const [costError, setCostError] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [hasInteracted, setHasInteracted] = useState(false)

  // Sinkronkan monitoredLines agar tidak melebihi totalProductionLines
  useEffect(() => {
    if (target.monitoredLines > current.productivity.totalProductionLines) {
      setTarget(prev => ({ ...prev, monitoredLines: current.productivity.totalProductionLines }))
    }
  }, [current.productivity.totalProductionLines, target.monitoredLines])

  const updateCurrent = useCallback((key: keyof PQCDSMCurrentInput, value: object) => {
    setHasInteracted(true)
    setCurrent(prev => ({ ...prev, [key]: { ...prev[key], ...value } }))
  }, [])

  const updateTarget = useCallback(<K extends keyof PQCDSMTargetInput>(key: K, value: PQCDSMTargetInput[K]) => {
    setHasInteracted(true)
    setTarget(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleCostInput = (rawStr: string) => {
    setCostRawStr(rawStr)
    const num = Number(rawStr.replace(/\D/g, ''))
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (num <= 0 || isNaN(num)) {
        setCostError('Biaya operasional minimal Rp 1 (harus lebih dari 0)')
      } else {
        setCostError('')
        setCurrent(prev => ({ ...prev, cost: { monthlyOperationalCostRp: num } }))
        setHasInteracted(true)
      }
    }, 250)
  }

  // Validasi
  const linesError = current.productivity.totalProductionLines < 1
    ? 'Jumlah lini produksi minimal 1'
    : ''
  const isValid = !linesError && !costError && current.cost.monthlyOperationalCostRp > 0

  const output = useMemo<PQCDSMOutput | null>(() => {
    if (!isValid) return null
    return calculatePQCDSM(current, target)
  }, [current, target, isValid])

  const score = output?.combinedEfficiencyScore ?? 0
  const circumference = 2 * Math.PI * 60

  return (
    <section id="kalkulator" className="py-24 bg-[#050810] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-[0.2em] text-teal-400 uppercase">
            Kalkulator PQCDSM
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-3 mb-4">
            Kalkulator Peningkatan Produktivitas PQCDSM
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed text-lg">
            Masukkan kondisi operasional Anda saat ini di keenam pilar — lihat estimasi peningkatan
            dan potensi penghematan secara real-time, sebelum Anda berdiskusi dengan tim kami.
          </p>
        </div>

        <div className="grid xl:grid-cols-3 gap-6 lg:gap-8 mb-10">
          {/* ── Panel Kiri: Kondisi Saat Ini ── */}
          <div className="bg-[#0d1728] border border-[#1e3055] rounded-3xl p-6 lg:p-8 shadow-xl">
            <h3 className="text-sm font-bold text-teal-400 tracking-widest uppercase mb-8 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" /> Kondisi Operasional Saat Ini
            </h3>

            {/* P */}
            <div className="mb-6 pb-6 border-b border-[#1e3055]">
              <p className="text-xs font-bold mb-4 flex items-center gap-1.5 uppercase tracking-wide" style={{ color: PILLAR_COLORS.P }}>
                <Hexagon className="w-4 h-4" /> P — Productivity
              </p>
              <SliderInput id="oee" label="OEE saat ini (%)" value={current.productivity.oeePct} min={0} max={100} step={1} unit="%" onChange={v => updateCurrent('productivity', { ...current.productivity, oeePct: v })} pillarColor={PILLAR_COLORS.P} />
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="total-lines" className="text-xs font-semibold text-slate-300">Jumlah lini produksi</label>
                  <span className="text-sm font-bold bg-[#050810]/50 px-2.5 py-0.5 rounded-lg" style={{ color: PILLAR_COLORS.P }}>{current.productivity.totalProductionLines} lini</span>
                </div>
                <input
                  id="total-lines"
                  type="number"
                  min={1} max={200}
                  value={current.productivity.totalProductionLines}
                  onChange={e => {
                    const v = Math.max(1, Math.min(200, parseInt(e.target.value) || 1))
                    updateCurrent('productivity', { ...current.productivity, totalProductionLines: v })
                  }}
                  className="w-full bg-[#050810] border border-[#2a3f63] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-400 transition-colors shadow-inner"
                />
                {linesError && <p className="text-rose-400 text-xs mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {linesError}</p>}
              </div>
            </div>

            {/* Q */}
            <div className="mb-6 pb-6 border-b border-[#1e3055]">
              <p className="text-xs font-bold mb-4 flex items-center gap-1.5 uppercase tracking-wide" style={{ color: PILLAR_COLORS.Q }}>
                <Hexagon className="w-4 h-4" /> Q — Quality
              </p>
              <SliderInput id="defect" label="Tingkat defect/reject (%)" value={current.quality.defectRatePct} min={0} max={50} step={0.1} unit="%" onChange={v => updateCurrent('quality', { defectRatePct: v })} pillarColor={PILLAR_COLORS.Q} />
            </div>

            {/* C */}
            <div className="mb-6 pb-6 border-b border-[#1e3055]">
              <p className="text-xs font-bold mb-4 flex items-center gap-1.5 uppercase tracking-wide" style={{ color: PILLAR_COLORS.C }}>
                <Hexagon className="w-4 h-4" /> C — Cost
              </p>
              <div>
                <label htmlFor="cost-input" className="text-xs font-semibold text-slate-300 block mb-2">Biaya operasional bulanan (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">Rp</span>
                  <input
                    id="cost-input"
                    type="text"
                    inputMode="numeric"
                    value={Number(costRawStr.replace(/\D/g, '')).toLocaleString('id-ID')}
                    onChange={e => handleCostInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#050810] border border-[#2a3f63] rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
                  />
                </div>
                {costError && <p className="text-rose-400 text-xs mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {costError}</p>}
              </div>
            </div>

            {/* D */}
            <div className="mb-6 pb-6 border-b border-[#1e3055]">
              <p className="text-xs font-bold mb-4 flex items-center gap-1.5 uppercase tracking-wide" style={{ color: PILLAR_COLORS.D }}>
                <Hexagon className="w-4 h-4" /> D — Delivery
              </p>
              <SliderInput id="ontime" label="On-time delivery rate (%)" value={current.delivery.onTimeRatePct} min={0} max={100} step={1} unit="%" onChange={v => updateCurrent('delivery', { onTimeRatePct: v })} pillarColor={PILLAR_COLORS.D} />
            </div>

            {/* S */}
            <div className="mb-6 pb-6 border-b border-[#1e3055]">
              <p className="text-xs font-bold mb-4 flex items-center gap-1.5 uppercase tracking-wide" style={{ color: PILLAR_COLORS.S }}>
                <Hexagon className="w-4 h-4" /> S — Safety
              </p>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="incidents" className="text-xs font-semibold text-slate-300">Insiden kerja per bulan</label>
                  <span className="text-sm font-bold bg-[#050810]/50 px-2.5 py-0.5 rounded-lg" style={{ color: PILLAR_COLORS.S }}>{current.safety.incidentsPerMonth}</span>
                </div>
                <input id="incidents" type="number" min={0} max={100} value={current.safety.incidentsPerMonth}
                  onChange={e => updateCurrent('safety', { incidentsPerMonth: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full bg-[#050810] border border-[#2a3f63] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-rose-400 transition-colors shadow-inner" />
              </div>
            </div>

            {/* M */}
            <div>
              <p className="text-xs font-bold mb-4 flex items-center gap-1.5 uppercase tracking-wide" style={{ color: PILLAR_COLORS.M }}>
                <Hexagon className="w-4 h-4" /> M — Morale
              </p>
              <SliderInput id="turnover" label="Turnover karyawan (%)" value={current.morale.turnoverRatePct} min={0} max={100} step={0.5} unit="%" onChange={v => updateCurrent('morale', { turnoverRatePct: v })} pillarColor={PILLAR_COLORS.M} />
            </div>
          </div>

          {/* ── Panel Kanan: Target Implementasi ── */}
          <div className="bg-[#0d1728] border border-[#1e3055] rounded-3xl p-6 lg:p-8 shadow-xl">
            <h3 className="text-sm font-bold text-amber-400 tracking-widest uppercase mb-8 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" /> Target Implementasi
            </h3>

            {/* Monitored lines */}
            <div className="mb-10">
              <p className="text-sm text-slate-400 mb-5 leading-relaxed">
                Tentukan seberapa luas dan dalam implementasi yang ingin Anda jalankan.
              </p>
              <SliderInput
                id="monitored-lines"
                label="Lini yang akan dipantau"
                value={Math.min(target.monitoredLines, current.productivity.totalProductionLines)}
                min={1}
                max={Math.max(1, current.productivity.totalProductionLines)}
                step={1}
                unit=" lini"
                onChange={v => updateTarget('monitoredLines', v)}
                pillarColor="#f59e0b"
              />
              {target.monitoredLines > current.productivity.totalProductionLines && (
                <p className="text-amber-400 text-xs mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Disesuaikan dengan jumlah lini Anda ({current.productivity.totalProductionLines} lini)</p>
              )}
            </div>

            {/* Maturity level */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-3">
                <label htmlFor="maturity" className="text-xs font-semibold text-slate-300">Level Maturitas Target</label>
                <div className="text-right">
                  <span className="text-base font-black text-amber-400">Level {target.maturityLevel}</span>
                  <span className="text-xs text-slate-500 block font-medium">{MATURITY_LABELS[target.maturityLevel]}</span>
                </div>
              </div>
              <input
                id="maturity"
                type="range" min={1} max={10} step={1}
                value={target.maturityLevel}
                onChange={e => updateTarget('maturityLevel', Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[#1e3055]"
                style={{ accentColor: '#f59e0b' }}
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-2 font-medium">
                <span>1 Basic</span><span>5 Established</span><span>10 Best-in-class</span>
              </div>
            </div>

            {/* Duration */}
            <div className="mb-10">
              <p className="text-xs font-semibold text-slate-300 mb-4">Durasi Implementasi</p>
              <div className="grid grid-cols-4 gap-3">
                {([1, 3, 6, 12] as const).map(d => (
                  <button
                    key={d}
                    id={`duration-${d}`}
                    onClick={() => updateTarget('durationMonths', d)}
                    className={`py-4 rounded-xl border transition-all ${
                      target.durationMonths === d
                        ? 'bg-amber-400 text-slate-900 border-amber-400 shadow-[0_4px_20px_rgba(251,191,36,0.3)]'
                        : 'bg-[#050810] border-[#2a3f63] text-slate-400 hover:border-amber-400/50 hover:bg-[#0f172a]'
                    }`}
                  >
                    <span className="font-black text-lg leading-none">{d}</span>
                    <br /><span className="text-[10px] font-semibold tracking-wider opacity-90 uppercase">bln</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary box */}
            <div className="bg-[#050810] border border-[#1e3055] rounded-2xl p-5 shadow-inner">
              <p className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider">Ringkasan Target</p>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Coverage</span><span className="text-amber-400 font-bold">{Math.min(target.monitoredLines, current.productivity.totalProductionLines)}/{current.productivity.totalProductionLines} lini</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Maturitas</span><span className="text-amber-400 font-bold">Level {target.maturityLevel} ({MATURITY_LABELS[target.maturityLevel]})</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Durasi</span><span className="text-amber-400 font-bold">{target.durationMonths} bulan</span></div>
                <div className="flex justify-between border-t border-[#1e3055] pt-3 mt-3"><span className="text-slate-400">Realization Factor</span><span className="text-amber-400 font-black">{output ? (output.realizationFactor * 100).toFixed(1) : '—'}%</span></div>
              </div>
            </div>
          </div>

          {/* ── Panel Output: Skor & Penghematan ── */}
          <div className="bg-gradient-to-br from-[#0d1728] to-[#0a101d] border border-[#1e3055] rounded-3xl p-6 lg:p-8 flex flex-col shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            
            <h3 className="text-sm font-bold text-teal-400 tracking-widest uppercase mb-8 flex items-center gap-2 relative z-10">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.6)]" /> Estimasi Hasil
            </h3>

            {/* Combined Score ring */}
            <div className="flex flex-col items-center mb-8 relative z-10">
              <div className="relative">
                <svg width="150" height="150" viewBox="0 0 150 150" className="drop-shadow-xl">
                  <circle cx={75} cy={75} r={60} fill="none" stroke="#1a2942" strokeWidth={12} />
                  <circle
                    cx={75} cy={75} r={60} fill="none"
                    stroke={score >= 70 ? '#10b981' : score >= 40 ? '#3b82f6' : '#2dd4bf'}
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - (circumference * score) / 100}
                    transform="rotate(-90 75 75)"
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                  <text x={75} y={68} textAnchor="middle" fill="white" fontSize={38} fontWeight="900">{score}</text>
                  <text x={75} y={88} textAnchor="middle" fill="#2dd4bf" fontSize={10} fontWeight="800" letterSpacing="1.5">DARI 90</text>
                </svg>
              </div>
              <p className="text-center text-base font-bold text-white mt-4">Potensi Efisiensi Bisnis Anda</p>
              <p className="text-center text-xs text-slate-500 mt-2 max-w-[220px] leading-relaxed">
                *90 adalah batas atas dari skenario klien terbaik (maturitas max, cakupan penuh, 12 bln)
              </p>
            </div>

            {/* Cost savings highlight */}
            {output && (
              <div className="bg-gradient-to-br from-teal-500/10 to-emerald-500/5 border border-teal-500/30 rounded-2xl p-5 mb-8 text-center relative z-10 shadow-lg">
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Estimasi Penghematan Kumulatif</p>
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-300">
                  {formatRupiah(output.cost.cumulativeSavingsRp)}
                </p>
                <p className="text-xs text-slate-400 mt-2 font-medium">dalam {target.durationMonths} bulan ({formatRupiah(output.cost.monthlySavingsRp)}/bln)</p>
              </div>
            )}

            {/* Validation message */}
            {!isValid && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 mb-6 text-sm text-rose-300 text-center font-medium flex items-center justify-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {linesError || costError || 'Lengkapi semua input untuk melihat hasil kalkulasi.'}
              </div>
            )}

            {/* CTA */}
            <button
              id="cta-discuss-calculator"
              onClick={onScrollToContact}
              className="mt-auto w-full bg-teal-400 text-slate-900 py-4 rounded-xl font-bold text-sm hover:bg-teal-300 transition-all shadow-[0_4px_20px_rgba(45,212,191,0.2)] hover:-translate-y-0.5 flex items-center justify-center gap-2 relative z-10"
            >
              Diskusikan Hasil Ini dengan Tim Kami <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Output: 6 Pilar mini-cards ── */}
        {output && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6 mt-8">
            <PillarCard
              pillarKey="P" pillarName="Productivity"
              changePct={output.productivity.gainPercentagePoints}
              currentLabel={`OEE ${current.productivity.oeePct}%`}
              projectedLabel={`OEE ${output.productivity.projectedOEE}%`}
              changeDirection="up"
              color={PILLAR_COLORS.P}
            />
            <PillarCard
              pillarKey="Q" pillarName="Quality"
              changePct={output.quality.reductionPct}
              currentLabel={`${current.quality.defectRatePct}% defect`}
              projectedLabel={`${output.quality.projectedDefectRatePct.toFixed(1)}%`}
              changeDirection="down"
              color={PILLAR_COLORS.Q}
            />
            <PillarCard
              pillarKey="C" pillarName="Cost"
              changePct={output.cost.reductionPct}
              currentLabel={formatRupiah(current.cost.monthlyOperationalCostRp)}
              projectedLabel={formatRupiah(current.cost.monthlyOperationalCostRp - output.cost.monthlySavingsRp)}
              changeDirection="down"
              color={PILLAR_COLORS.C}
            />
            <PillarCard
              pillarKey="D" pillarName="Delivery"
              changePct={output.delivery.gainPercentagePoints}
              currentLabel={`${current.delivery.onTimeRatePct}% OTD`}
              projectedLabel={`${output.delivery.projectedOnTimeRatePct}%`}
              changeDirection="up"
              color={PILLAR_COLORS.D}
            />
            <PillarCard
              pillarKey="S" pillarName="Safety"
              changePct={output.safety.reductionPct}
              currentLabel={`${current.safety.incidentsPerMonth} insiden`}
              projectedLabel={`${output.safety.projectedIncidentsPerMonth.toFixed(1)} insiden`}
              changeDirection="down"
              color={PILLAR_COLORS.S}
            />
            <PillarCard
              pillarKey="M" pillarName="Morale"
              changePct={output.morale.reductionPct}
              currentLabel={`${current.morale.turnoverRatePct}% turnover`}
              projectedLabel={`${output.morale.projectedTurnoverRatePct.toFixed(1)}%`}
              changeDirection="down"
              color={PILLAR_COLORS.M}
            />
          </div>
        )}
      </div>
    </section>
  )
}
