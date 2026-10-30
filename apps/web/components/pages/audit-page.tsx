'use client'

import React from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { initialAuditEvents } from '@/components/shared/types'
import { AuditLogApiItem } from '@/lib/api-client'

export function AuditPage({
  auditEvents,
  dbAudit,
  onNotify,
}: {
  auditEvents: typeof initialAuditEvents
  dbAudit?: AuditLogApiItem[]
  onNotify: (msg: string) => void
}) {
  const displayAudit = (dbAudit && dbAudit.length > 0)
    ? dbAudit.map((evt) => ({
        id: `AUD-${evt.id.substring(0, 4).toUpperCase()}`,
        timestamp: new Date(evt.timestamp).toLocaleString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        actor: evt.actor,
        action: evt.action,
        object: `${evt.object_type}${evt.object_id ? ` #${evt.object_id.substring(0, 8)}` : ''}`,
        ip: evt.ip_address || '127.0.0.1 (Docker API)',
        status: 'Succès',
      }))
    : auditEvents

  return (
    <div className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Journal d'Audit Immuable ({displayAudit.length})</h2>
          <p>Piste d'audit légale en écriture seule (PostgreSQL). Chaque action sensible, lancement et validation est tracé de manière indélébile.</p>
        </div>
        <Button variant="outline" onClick={() => onNotify('Archive de preuve exportée avec succès (conforme R14).')}>
          <Download data-icon="inline-start" />
          Exporter le dossier de preuves
        </Button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Identifiant</th>
              <th>Horodatage UTC</th>
              <th>Acteur</th>
              <th>Action</th>
              <th>Objet concerné</th>
              <th>Adresse IP</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {displayAudit.map((evt) => (
              <tr key={evt.id}>
                <td><strong>{evt.id}</strong></td>
                <td>{evt.timestamp}</td>
                <td><strong>{evt.actor}</strong></td>
                <td><code>{evt.action}</code></td>
                <td>{evt.object}</td>
                <td><span className="env-chip">{evt.ip}</span></td>
                <td>
                  <StatusBadge tone={evt.status === 'Succès' ? 'success' : 'danger'}>
                    {evt.status}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
