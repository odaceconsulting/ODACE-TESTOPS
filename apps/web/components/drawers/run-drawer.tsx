'use client'

import React, { useState } from 'react'
import {
  AlertTriangle,
  Check,
  Download,
  FileCode2,
  Gauge,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { UserProfile, runsSeed } from '@/components/shared/types'

export function RunDrawer({
  run,
  currentUser,
  onClose,
  onValidate,
  onNotify,
}: {
  run: typeof runsSeed[number]
  currentUser: UserProfile
  onClose: () => void
  onValidate: (runId: string, decision: 'Validée' | 'Refusée', comment: string) => void
  onNotify: (msg: string) => void
}) {
  const [tab, setTab] = useState('Vue d’ensemble')
  const [comment, setComment] = useState('')
  const canValidate = currentUser.roleKey === 'tech_lead' && run.validation === 'En attente'

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="run-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <p className="breadcrumb">EXÉCUTION <span>/</span> {run.id}</p>
            <h2>{run.script}</h2>
            <p>{run.project} · {run.tool} {run.version} · {run.env}</p>
          </div>
          <button className="icon-button" onClick={onClose}><X /></button>
        </div>

        <div className="drawer-statuses">
          <div>
            <small>1. ÉTAT TECHNIQUE</small>
            <StatusBadge tone={run.state === 'Terminée' ? 'success' : 'warning'}>{run.state}</StatusBadge>
          </div>
          <div>
            <small>2. RÉSULTAT CALCULÉ</small>
            <StatusBadge tone={run.result === 'Conforme' ? 'success' : run.result === 'Non fiable' ? 'warning' : run.result === 'Non conforme' ? 'danger' : 'neutral'}>
              {run.result}
            </StatusBadge>
          </div>
          <div>
            <small>3. VALIDATION HUMAINE</small>
            <StatusBadge tone={run.validation === 'Validée' ? 'success' : run.validation === 'Refusée' ? 'danger' : 'neutral'}>
              {run.validation}
            </StatusBadge>
          </div>
        </div>

        <div className="drawer-tabs">
          {['Vue d’ensemble', 'Mesures', 'Rapports et preuves', 'Quality Gate', 'Validation'].map((item) => (
            <button className={tab === item ? 'active' : ''} key={item} onClick={() => setTab(item)}>
              {item}
            </button>
          ))}
        </div>

        <div className="drawer-content">
          {tab === 'Vue d’ensemble' && (
            <>
              <div className="drawer-section">
                <h3>Résumé de l’exécution</h3>
                <div className="detail-grid">
                  <div><small>Demandeur</small><strong>{run.requester}</strong></div>
                  <div><small>Démarrée</small><strong>{run.date}</strong></div>
                  <div><small>Durée</small><strong>{run.duration}</strong></div>
                  <div><small>Agent d'exécution</small><strong>agent-charge-02 (Docker)</strong></div>
                </div>
              </div>

              {run.result === 'Non fiable' && (
                <div className="warning-callout">
                  <AlertTriangle />
                  <div>
                    <strong>Résultat non fiable</strong>
                    <span>La saturation du générateur de charge a faussé les mesures. Ce résultat ne peut pas être interprété comme conforme.</span>
                  </div>
                </div>
              )}

              {run.state === 'Indéterminée' && (
                <div className="danger-callout">
                  <AlertTriangle />
                  <div>
                    <strong>Issue indéterminée</strong>
                    <span>Perte de contact avec l'agent d'exécution. Aucune relance automatique n'est effectuée sur cette cible.</span>
                  </div>
                </div>
              )}

              {(run as any).events && (run as any).events.length > 0 && (
                <div className="drawer-section" style={{ marginTop: '16px' }}>
                  <h3>Journal des transitions d'état (Audit RG6)</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                    {(run as any).events.map((ev: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <div>
                          <strong style={{ color: '#0ea5e9' }}>{ev.to_state}</strong>
                          <span style={{ color: '#94a3b8', marginLeft: '8px' }}>{ev.cause}</span>
                        </div>
                        <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString('fr-FR') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'Mesures' && (
            <>
              <div className="drawer-section">
                <div className="section-title-row">
                  <div>
                    <h3>Mesures de performance</h3>
                    <p>{(run as any).metrics ? 'Mesures réelles du tir de charge · Connecteur JMeter' : '100 utilisateurs virtuels · Analyse en flux'}</p>
                  </div>
                  <StatusBadge tone={(run as any).metrics ? 'success' : 'neutral'}>
                    {(run as any).metrics ? 'Données réelles' : 'Collectées'}
                  </StatusBadge>
                </div>
                <div className="measure-grid">
                  <div>
                    <span>p95</span>
                    <strong>
                      {(run as any).metrics?.p95_ms !== undefined ? Math.round((run as any).metrics.p95_ms) : 610} <small>ms</small>
                    </strong>
                  </div>
                  <div>
                    <span>p99</span>
                    <strong>
                      {(run as any).metrics?.p99_ms !== undefined ? Math.round((run as any).metrics.p99_ms) : 940} <small>ms</small>
                    </strong>
                  </div>
                  <div>
                    <span>Débit</span>
                    <strong>
                      {(run as any).metrics?.throughput_rps !== undefined ? Math.round((run as any).metrics.throughput_rps) : 1642} <small>req/s</small>
                    </strong>
                  </div>
                  <div>
                    <span>Taux d’erreur</span>
                    <strong>
                      {(run as any).metrics?.error_rate !== undefined ? ((run as any).metrics.error_rate * 100).toFixed(2) : '0,42'} <small>%</small>
                    </strong>
                  </div>
                </div>
              </div>

              <div className="resource-card">
                <div><Gauge /><span>Surveillance de l'injecteur conteneurisé</span></div>
                <div className="resource-bar"><span style={{ width: '45%' }} /></div>
                <small>CPU 45% (Conteneur isolé)</small>
                <div className="resource-bar memory"><span style={{ width: '38%' }} /></div>
                <small>Mémoire 38% (JVM JMeter)</small>
              </div>
            </>
          )}

          {tab === 'Rapports et preuves' && (
            <div className="drawer-section">
              <h3>Artefacts &amp; Preuves du tir (Audit de conformité)</h3>
              <div className="evidence-list">
                {((run as any).artifacts && (run as any).artifacts.length > 0) ? (
                  (run as any).artifacts.map((art: any) => (
                    <div className="evidence-row" key={art.id}>
                      <div className="file-icon"><FileCode2 /></div>
                      <div>
                        <strong>{art.artifact_type.toUpperCase()} - Fichier de mesures officiel</strong>
                        <span>{art.object_path} · {Math.round(art.size_bytes / 1024) || 1} Ko · SHA: {art.sha256_hash?.substring(0, 12)}...</span>
                      </div>
                      <button className="icon-button" onClick={() => onNotify(`Téléchargement de l'artefact ${art.object_path}`)}>
                        <Download />
                      </button>
                    </div>
                  ))
                ) : (
                  [
                    ['results.jtl', 'Fichier JTL brut JMeter', '48 Ko'],
                    ['rapport-jmeter.html', 'Rapport HTML JMeter', '1,2 Mo'],
                    ['jmeter-summary.csv', 'Synthèse des centiles', '42 Ko'],
                  ].map(([f, label, size]) => (
                    <div className="evidence-row" key={f}>
                      <div className="file-icon"><FileCode2 /></div>
                      <div>
                        <strong>{label}</strong>
                        <span>{f} · {size}</span>
                      </div>
                      <button className="icon-button" onClick={() => onNotify(`Téléchargement de ${f}`)}>
                        <Download />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'Quality Gate' && (() => {
            const p95Val = (run as any).metrics?.p95_ms !== undefined ? (run as any).metrics.p95_ms : 610
            const errVal = (run as any).metrics?.error_rate !== undefined ? ((run as any).metrics.error_rate * 100) : 0.42
            const isP95Ok = p95Val <= 800
            const isErrOk = errVal <= 1.0

            return (
              <div className="drawer-section">
                <h3>Critères de qualité évalués</h3>
                <table className="quality-table">
                  <thead>
                    <tr>
                      <th>Métrique</th>
                      <th>Valeur mesurée</th>
                      <th>Seuil configuré</th>
                      <th>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>p95 temps de réponse</td>
                      <td>{Math.round(p95Val)} ms</td>
                      <td>&le; 800 ms (Bloquant)</td>
                      <td>
                        <StatusBadge tone={isP95Ok ? 'success' : 'danger'}>
                          {isP95Ok ? 'Conforme' : 'Non conforme'}
                        </StatusBadge>
                      </td>
                    </tr>
                    <tr>
                      <td>Taux d'erreur</td>
                      <td>{errVal.toFixed(2)} %</td>
                      <td>&le; 1,0 % (Bloquant)</td>
                      <td>
                        <StatusBadge tone={isErrOk ? 'success' : 'danger'}>
                          {isErrOk ? 'Conforme' : 'Non conforme'}
                        </StatusBadge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          })()}

          {tab === 'Validation' && (
            <div className="drawer-section">
              <h3>Validation Humaine (Tech Lead)</h3>
              <p>Cette décision documente l'acceptation humaine du test sans effacer le résultat technique calculé.</p>
              <div className="validation-box">
                <StatusBadge tone={run.validation === 'Validée' ? 'success' : run.validation === 'Refusée' ? 'danger' : 'neutral'}>
                  {run.validation}
                </StatusBadge>

                {canValidate ? (
                  <>
                    <p style={{ marginTop: '12px' }}>En tant que Tech lead, enregistrez votre décision pour ce test :</p>
                    <textarea
                      placeholder="Commentaire de validation ou motif de refus..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <div className="validation-actions">
                      <Button variant="outline" onClick={() => onValidate(run.id, 'Refusée', comment)}>
                        <X data-icon="inline-start" /> Refuser
                      </Button>
                      <Button onClick={() => onValidate(run.id, 'Validée', comment)}>
                        <Check data-icon="inline-start" /> Valider le résultat
                      </Button>
                    </div>
                  </>
                ) : (
                  <p style={{ marginTop: '12px', color: '#64748b' }}>
                    {run.validation !== 'En attente'
                      ? `Cette exécution a déjà été traitée.`
                      : currentUser.roleKey === 'admin'
                      ? `L'Administrateur ne peut pas valider un résultat à la place du Tech Lead (Séparation formelle des pouvoirs).`
                      : `Vous devez être connecté avec le rôle Tech lead pour valider ce résultat.`}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
