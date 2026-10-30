'use client'

import React from 'react'
import { FileCode2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { runsSeed } from '@/components/shared/types'
import { TestAssetApiItem } from '@/lib/api-client'

export function ScriptsPage({
  runs,
  dbAssets,
  onImport,
  onNotify,
}: {
  runs: typeof runsSeed
  dbAssets?: TestAssetApiItem[]
  onImport: () => void
  onNotify: (msg: string) => void
}) {
  const displayScripts = (dbAssets && dbAssets.length > 0)
    ? dbAssets.map((a) => ({
        id: a.id,
        name: a.name,
        tool: a.tool.toUpperCase(),
        version: a.version,
        sha: `${a.sha256_hash.substring(0, 16)}...`,
        author: a.project_name || 'Projet',
        path: a.object_path,
      }))
    : [
        { id: '1', name: 'Charge consultation factures', tool: 'JMETER', version: 'v2.4', sha: 'e3b0c442...89a1', author: 'Gestion des factures', path: 'assets/jmeter/charge.jmx' },
        { id: '2', name: 'Parcours utilisateur Panier B2B', tool: 'SELENIUM', version: 'v2.0.1', sha: 'a591a6d4...146e', author: 'Portail clients B2B', path: 'assets/selenium/b2b.side' },
      ]

  return (
    <div className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Catalogue des Scripts Versionnés ({displayScripts.length})</h2>
          <p>Chaque scénario est stocké dans la table <code>test_asset</code> avec son empreinte cryptographique SHA-256 pour garantir l'intégrité de l'exécution.</p>
        </div>
        <Button onClick={onImport}><Upload data-icon="inline-start" /> Importer un script</Button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nom du scénario</th>
              <th>Moteur</th>
              <th>Version</th>
              <th>Empreinte SHA-256</th>
              <th>Projet associé</th>
              <th>Chemin objet (MinIO)</th>
            </tr>
          </thead>
          <tbody>
            {displayScripts.map((s) => (
              <tr key={s.id}>
                <td><strong>{s.name}</strong></td>
                <td><span className="tool-tag"><FileCode2 />{s.tool}</span></td>
                <td><span className="env-chip">{s.version}</span></td>
                <td><code>{s.sha}</code></td>
                <td>{s.author}</td>
                <td><code style={{ fontSize: '11px', color: '#64748b' }}>{s.path}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
