'use client'

import React from 'react'
import { StatusBadge } from '@/components/shared/status-badge'
import { runsSeed } from '@/components/shared/types'

export function RunTable({
  runs,
  onRun,
}: {
  runs: typeof runsSeed
  onRun: (run: typeof runsSeed[number]) => void
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Exécution</th>
            <th>Projet / Scénario</th>
            <th>Environnement</th>
            <th>1. État technique</th>
            <th>2. Résultat calculé</th>
            <th>3. Décision Tech lead</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} onClick={() => onRun(run)}>
              <td>
                <strong>{run.id}</strong>
                <span>{run.date}</span>
              </td>
              <td>
                <strong>{run.script}</strong>
                <span>{run.project} · {run.tool} {run.version}</span>
              </td>
              <td><span className="env-chip">{run.env}</span></td>
              <td>
                <StatusBadge tone={run.state === 'Terminée' ? 'success' : run.state === 'Indéterminée' ? 'warning' : 'info'}>
                  {run.state}
                </StatusBadge>
              </td>
              <td>
                <StatusBadge tone={run.result === 'Conforme' ? 'success' : run.result === 'Non conforme' ? 'danger' : run.result === 'Non fiable' ? 'warning' : 'neutral'}>
                  {run.result}
                </StatusBadge>
              </td>
              <td>
                <StatusBadge tone={run.validation === 'Validée' ? 'success' : run.validation === 'Refusée' ? 'danger' : 'neutral'}>
                  {run.validation}
                </StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
