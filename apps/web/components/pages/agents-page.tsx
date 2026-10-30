'use client'

import React from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { UserProfile, initialAgents } from '@/components/shared/types'

export function AgentsPage({
  agents,
  currentUser,
  onNotify,
}: {
  agents: typeof initialAgents
  currentUser: UserProfile
  onNotify: (msg: string) => void
}) {
  return (
    <div className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Parc des Agents d'Exécution (Runners)</h2>
          <p>Surveillance en direct des machines et conteneurs éphémères exécutant les scénarios.</p>
        </div>
        <div className="panel-actions">
          <Button variant="outline" onClick={() => onNotify('Heartbeats vérifiés : tous les agents répondent.')}>
            <RefreshCw data-icon="inline-start" /> Rafraîchir
          </Button>
        </div>
      </div>

      <div className="agents-grid">
        {agents.map((a) => (
          <div className="agent-card" key={a.id}>
            <div className="agent-header">
              <div>
                <strong>{a.id}</strong>
                <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#64748b' }}>{a.host}</p>
              </div>
              <StatusBadge tone={a.status === 'Disponible' ? 'success' : 'warning'}>{a.status}</StatusBadge>
            </div>

            <div className="agent-metrics">
              <div>
                <span style={{ color: '#64748b' }}>Charge CPU</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#1e293b' }}>{a.cpu}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Mémoire RAM</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#1e293b' }}>{a.mem}</strong>
              </div>
            </div>

            <div className="agent-footer">
              <span>{a.version} · {a.type}</span>
              {currentUser.roleKey === 'exploitation' || currentUser.roleKey === 'admin' ? (
                <button
                  style={{ border: 0, background: 'none', color: '#dc2626', fontSize: '10px', cursor: 'pointer' }}
                  onClick={() => onNotify(`Agent ${a.id} mis en maintenance`)}
                >
                  Arrêter
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
