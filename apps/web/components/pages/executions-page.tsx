'use client'

import React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RunTable } from '@/components/shared/run-table'
import { runsSeed } from '@/components/shared/types'

export function ExecutionsPage({
  runs,
  onRun,
  onLaunch,
  canLaunch,
}: {
  runs: typeof runsSeed
  onRun: (run: any) => void
  onLaunch: () => void
  canLaunch: boolean
}) {
  return (
    <div className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Toutes les exécutions de test ({runs.length})</h2>
          <p>Historique complet des campagnes, verdicts et preuves associées.</p>
        </div>
        {canLaunch && (
          <Button onClick={onLaunch}>
            <Plus data-icon="inline-start" /> Nouvelle exécution
          </Button>
        )}
      </div>
      <RunTable runs={runs} onRun={onRun} />
    </div>
  )
}
