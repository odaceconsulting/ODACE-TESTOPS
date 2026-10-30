'use client'

import React from 'react'
import { StatusBadge } from '../shared/status-badge'

export function SchedulePage({ onNotify }: { onNotify: (msg: string) => void }) {
  return (
    <div className="panel operations-panel" style={{ padding: '24px' }}>
      <h2>Campagnes Planifiées (Cron)</h2>
      <p style={{ color: '#64748b', fontSize: '13px' }}>Déclenchements automatiques nocturnes avec interdiction de chevauchement sur la même cible.</p>
      <table>
        <thead>
          <tr>
            <th>Projet</th>
            <th>Scénario</th>
            <th>Expression Cron</th>
            <th>Prochain tir</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gestion des factures</td>
            <td>Charge consultation factures (JMeter)</td>
            <td><code>0 22 * * 1-5</code> (Tous les soirs à 22h)</td>
            <td>Ce soir à 22:00</td>
            <td><StatusBadge tone="success">Actif</StatusBadge></td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export function EvolutionPage() {
  return (
    <div className="evolution-card">
      <div className="evolution-icon">🚀</div>
      <div>
        <StatusBadge tone="info">Module hors première version</StatusBadge>
        <h3>Pilotage des Déploiements CI/CD</h3>
        <p>
          Ce module optionnel gère la promotion des releases entre environnements, l'approbation humaine et le rollback applicatif.
          La première version d’ODACE TestOps reste focalisée sur l'orchestration et la fiabilité des tests logiciels.
        </p>
      </div>
    </div>
  )
}
