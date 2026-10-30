'use client'

import React, { useState } from 'react'
import { Box, Server, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createProjectApi, ProjectApiItem } from '@/lib/api-client'
import { UserProfile } from '@/components/shared/types'

export function NewProjectDialog({
  currentUser,
  backendOnline,
  onClose,
  onCreated,
  onNotify,
}: {
  currentUser: UserProfile
  backendOnline: boolean
  onClose: () => void
  onCreated: (proj: ProjectApiItem) => void
  onNotify: (msg: string) => void
}) {
  const [name, setName] = useState('')
  const [team, setTeam] = useState('Équipe QA / Facturation')
  const [description, setDescription] = useState('')
  const [maxConcurrentRuns, setMaxConcurrentRuns] = useState(5)

  // Champs de la cible applicative à tester
  const [includeTarget, setIncludeTarget] = useState(true)
  const [targetName, setTargetName] = useState('API Recette Principale')
  const [targetUrl, setTargetUrl] = useState('http://localhost:8088/api/v1')
  const [allowedTool, setAllowedTool] = useState('jmeter')
  const [maxCharge, setMaxCharge] = useState(500)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAuthorized = currentUser.roleKey === 'admin' || currentUser.roleKey === 'responsable'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Veuillez spécifier un nom de projet valide.')
      return
    }

    if (includeTarget && !targetUrl.trim()) {
      setError('Veuillez spécifier l’URL de l’application cible à tester.')
      return
    }

    // Environnements standards initialisés pour le projet
    const envs = [
      { name: 'Recette', env_type: 'RECETTE', allowed_hours: '08:00-22:00' },
      { name: 'Préproduction', env_type: 'PREPROD', allowed_hours: '19:00-06:00' },
    ]

    setLoading(true)
    setError(null)

    // Envoi réel vers l'API backend PostgreSQL
    const res = await createProjectApi({
      name: name.trim(),
      description: description.trim() || undefined,
      team: team.trim(),
      max_concurrent_runs: Number(maxConcurrentRuns),
      environments: envs,
      target_name: includeTarget && targetName.trim() ? targetName.trim() : undefined,
      target_url: includeTarget && targetUrl.trim() ? targetUrl.trim() : undefined,
      allowed_tool: includeTarget ? allowedTool : undefined,
      max_charge: includeTarget ? Number(maxCharge) : undefined,
    })
    setLoading(false)

    if (res.success && res.project) {
      onCreated(res.project)
      onNotify(`Projet « ${res.project.name} » enregistré avec succès en base PostgreSQL !`)
    } else {
      setError(res.error || 'Erreur lors de l’enregistrement du projet en base.')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">GOUVERNANCE &amp; SÉCURITÉ</p>
            <h2>Déclarer un nouveau projet applicatif</h2>
            <p>Enregistrement en base PostgreSQL avec quotas de charge (RG7) et cibles homologuées (RG2).</p>
          </div>
          <button className="icon-button" onClick={onClose}><X /></button>
        </div>

        {!isAuthorized ? (
          <div className="modal-body" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ color: '#b91c1c', fontWeight: 600, marginBottom: '8px' }}>
              Action restreinte par la matrice RBAC (Étape 2 du Guide)
            </div>
            <p style={{ color: '#64748b', fontSize: '13px' }}>
              Seuls les utilisateurs disposant du rôle <strong>Responsable</strong> (Direction Projets) ou <strong>Administrateur</strong> sont habilités à déclarer des projets et à fixer les quotas de charge.
            </p>
            <div style={{ marginTop: '16px' }}>
              <Button variant="outline" onClick={onClose}>Fermer</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body form-grid" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {error && (
                <div className="danger-callout full" style={{ marginTop: 0 }}>
                  <span>{error}</span>
                </div>
              )}

              <label className="full">
                Nom officiel du projet ou application *
                <input
                  type="text"
                  placeholder="ex: Portail Vente & Souscription"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>

              <label>
                Équipe / Squad responsable *
                <input
                  type="text"
                  placeholder="ex: Squad Core Banking"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  required
                />
              </label>

              <label>
                Quota de tirs simultanés (RG7) *
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxConcurrentRuns}
                  onChange={(e) => setMaxConcurrentRuns(Number(e.target.value))}
                  required
                />
                <small style={{ color: '#64748b', fontSize: '10px' }}>Nombre max de tests de charge en parallèle sur ce projet</small>
              </label>

              <label className="full">
                Description métier
                <textarea
                  placeholder="Périmètre de l'application, enjeux de performance et criticité bancaire..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </label>

              <div className="full" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Server style={{ width: '18px', height: '18px', color: '#0ea5e9' }} />
                    <strong style={{ fontSize: '14px' }}>Cible applicative initiale (Liste blanche RG2)</strong>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={includeTarget}
                      onChange={(e) => setIncludeTarget(e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    Déclarer une cible maintenant
                  </label>
                </div>

                {includeTarget && (
                  <div className="form-grid" style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                    <label>
                      Nom de la cible
                      <input
                        type="text"
                        value={targetName}
                        onChange={(e) => setTargetName(e.target.value)}
                      />
                    </label>

                    <label>
                      URL de base (HTTP / HTTPS) *
                      <input
                        type="text"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        placeholder="http://recette-factures.odace-test.internal"
                      />
                    </label>

                    <label>
                      Outil homologué
                      <select value={allowedTool} onChange={(e) => setAllowedTool(e.target.value)}>
                        <option value="jmeter">Apache JMeter (Performance &amp; Charge)</option>
                        <option value="selenium">Selenium WebDriver (Parcours fonctionnels)</option>
                        <option value="echo">Connecteur Écho (Validation technique)</option>
                      </select>
                    </label>

                    <label>
                      Plafond de charge (VU max)
                      <input
                        type="number"
                        min={1}
                        max={5000}
                        value={maxCharge}
                        onChange={(e) => setMaxCharge(Number(e.target.value))}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="compatibility full" style={{ margin: '8px 0 0 0' }}>
                <ShieldCheck />
                <div>
                  <strong>Environnements créés automatiquement</strong>
                  <span>« Recette » (fenêtre 08h-22h) et « Préproduction » (fenêtre 19h-06h) selon les règles ODACE.</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enregistrement PostgreSQL...' : 'Créer et persister le projet'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
