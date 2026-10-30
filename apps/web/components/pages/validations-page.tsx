'use client'

import React from 'react'
import { RunTable } from '@/components/shared/run-table'
import { UserProfile, runsSeed } from '@/components/shared/types'

export function ValidationsPage({
  runs,
  currentUser,
  onRun,
  onValidate,
  onNotify,
}: {
  runs: typeof runsSeed
  currentUser: UserProfile
  onRun: (run: typeof runsSeed[number]) => void
  onValidate: (runId: string, decision: 'Validée' | 'Refusée', comment: string) => void
  onNotify: (msg: string) => void
}) {
  const pendingRuns = runs.filter((r) => r.validation === 'En attente')
  const isTechLead = currentUser.roleKey === 'tech_lead'

  return (
    <div className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Centre de Validation Technique (Tech Lead)</h2>
          <p>Enregistrez la décision humaine d'acceptation ou de refus sans altérer le verdict technique calculé.</p>
        </div>
        <span className="count-pill">{pendingRuns.length} en attente</span>
      </div>

      {!isTechLead && (
        <div style={{ padding: '16px 20px', background: '#fffbeb', borderBottom: '1px solid #fef3c7', fontSize: '12px', color: '#92400e' }}>
          <strong>Information d'accès :</strong>{' '}
          {currentUser.roleKey === 'admin'
            ? "L'Administrateur ne peut pas valider un résultat à la place d'un Tech lead (Règle stricte de séparation des pouvoirs)."
            : 'Seul le Tech lead est habilité à valider ou refuser les campagnes. Vous êtes actuellement en mode consultation.'}
        </div>
      )}

      <RunTable runs={pendingRuns} onRun={onRun} />
    </div>
  )
}
