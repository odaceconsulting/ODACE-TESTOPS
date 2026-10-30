'use client'

import React from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  ListChecks,
  MoreHorizontal,
  Play,
  Server,
  ShieldCheck,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MetricCard } from '@/components/shared/status-badge'
import { RunTable } from '@/components/shared/run-table'
import {
  campaignData,
  responseData,
  runsSeed,
} from '@/components/shared/types'

export function DashboardPage({
  currentRuns,
  onRun,
  onLaunch,
  canLaunch,
}: {
  currentRuns: typeof runsSeed
  onRun: (run: typeof runsSeed[number]) => void
  onLaunch: () => void
  canLaunch: boolean
}) {
  return (
    <>
      <section className="metric-grid">
        <MetricCard icon={Activity} label="Exécutions en cours" value="02" detail="+1 depuis hier" />
        <MetricCard icon={Clock3} label="En attente" value="04" detail="2 cibles occupées" tone="amber" />
        <MetricCard icon={CheckCircle2} label="Conformes" value="87,4 %" detail="sur 126 exécutions" tone="green" />
        <MetricCard icon={AlertTriangle} label="Non fiables" value="03" detail="Saturation injecteur" tone="red" />
        <MetricCard icon={ClipboardCheck} label="Validations" value="02" detail="À traiter Tech lead" tone="purple" />
        <MetricCard icon={Server} label="Agents disponibles" value="08 / 10" detail="80 % du parc" tone="slate" />
      </section>

      <div className="notice-bar">
        <div className="notice-icon"><ShieldCheck /></div>
        <div>
          <strong>Règle des 3 dimensions du verdict</strong>
          <span>L'état d'exécution (terminé/erreur), le résultat calculé (conforme/non fiable) et la validation humaine (validée/refusée) sont strictement découplés.</span>
        </div>
      </div>

      <section className="charts-grid">
        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Évolution des campagnes</h2>
              <p>Résultats par semaine · tous projets</p>
            </div>
            <button className="more-button"><MoreHorizontal /></button>
          </div>
          <div className="chart-legend">
            <span><i className="legend-blue" />Conformes</span>
            <span><i className="legend-slate" />Non conformes</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={campaignData} margin={{ left: -20, right: 8, top: 15 }}>
              <defs>
                <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e8edf3" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Area type="monotone" dataKey="conformes" stroke="#2563eb" fill="url(#fillBlue)" strokeWidth={2} />
              <Area type="monotone" dataKey="nonConformes" stroke="#94a3b8" fill="none" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Temps de réponse (Centiles)</h2>
              <p>Campagnes comparables · ms</p>
            </div>
            <button className="more-button"><MoreHorizontal /></button>
          </div>
          <div className="chart-legend">
            <span><i className="legend-blue" />p95</span>
            <span><i className="legend-purple" />p99</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={responseData} layout="vertical" margin={{ left: 15, right: 8, top: 10 }}>
              <CartesianGrid horizontal={false} stroke="#e8edf3" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis dataKey="name" type="category" width={115} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="p95" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="p99" fill="#a78bfa" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bottom-grid">
        <div className="panel table-panel">
          <div className="panel-heading">
            <div>
              <h2>Dernières exécutions</h2>
              <p>Consultez les détails, preuves d'exécution et décisions</p>
            </div>
            <button className="text-button" onClick={() => onRun(currentRuns[0])}>
              Voir tout <ArrowRight />
            </button>
          </div>
          <RunTable runs={currentRuns.slice(0, 4)} onRun={onRun} />
        </div>

        <div className="side-stack">
          <div className="panel alert-panel">
            <div className="panel-heading">
              <div>
                <h2>À surveiller</h2>
                <p>Actions requises selon vos habilitations</p>
              </div>
              <span className="count-pill">2</span>
            </div>
            <div className="attention-item">
              <div className="attention-icon amber"><AlertTriangle /></div>
              <div>
                <strong>RUN-2839 · Résultat non fiable</strong>
                <span>Saturation injecteur CPU &gt; 80%</span>
              </div>
              <ArrowRight />
            </div>
            <div className="attention-item">
              <div className="attention-icon purple"><ClipboardCheck /></div>
              <div>
                <strong>2 validations en attente</strong>
                <span>Nécessite la décision du Tech lead</span>
              </div>
              <ArrowRight />
            </div>
          </div>

          <div className="panel quick-panel">
            <div className="panel-heading">
              <div>
                <h2>Actions rapides</h2>
                <p>Raccourcis opérationnels</p>
              </div>
            </div>
            {canLaunch && (
              <button onClick={onLaunch}>
                <Play /> Lancer une exécution
              </button>
            )}
            <button onClick={() => undefined}>
              <ListChecks /> Configurer les Quality Gates
            </button>
            <button onClick={() => undefined}>
              <Download /> Exporter l'archive de preuve
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
