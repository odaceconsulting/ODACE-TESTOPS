import React from 'react'

export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
}) {
  return (
    <span className={`status-badge ${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  )
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = 'blue',
}: {
  icon: any
  label: string
  value: string
  detail: string
  tone?: string
}) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon /></div>
      <div>
        <p className="eyebrow">{label}</p>
        <p className="metric-value">{value}</p>
        <p className="metric-detail">{detail}</p>
      </div>
    </div>
  )
}
