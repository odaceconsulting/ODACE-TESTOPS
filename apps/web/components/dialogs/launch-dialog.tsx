'use client'

import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Play,
  RefreshCw,
  Server,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { initialConnectors } from '@/components/shared/types'
import {
  ProjectApiItem,
  TestAssetApiItem,
  validatePreflightApi,
} from '@/lib/api-client'

export function LaunchDialog({
  step,
  setStep,
  connectors,
  dbProjects,
  dbAssets,
  onClose,
  onLaunch,
}: {
  step: number
  setStep: (v: number) => void
  connectors: typeof initialConnectors
  dbProjects?: ProjectApiItem[]
  dbAssets?: TestAssetApiItem[]
  onClose: () => void
  onLaunch: (payload: {
    projectId: string
    projectName: string
    targetId: string
    targetName: string
    targetUrl: string
    assetId: string
    assetName: string
    tool: string
    threads: number
    durationSec: number
  }) => void
}) {
  const [selectedTool, setSelectedTool] = useState(connectors[0].name)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(dbProjects?.[0]?.id || '')
  const currentProject = dbProjects?.find((p) => p.id === selectedProjectId) || dbProjects?.[0]
  const envs = currentProject?.environments || []
  const [selectedEnvId, setSelectedEnvId] = useState<string>(envs[0]?.id || '')
  const currentEnv = envs.find((e) => e.id === selectedEnvId) || envs[0]
  const targets = currentEnv?.targets || []
  const [selectedTargetId, setSelectedTargetId] = useState<string>(targets[0]?.id || '')
  const currentTarget = targets.find((t) => t.id === selectedTargetId) || targets[0]

  const [selectedAssetId, setSelectedAssetId] = useState<string>(dbAssets?.[0]?.id || '')
  const currentAsset = dbAssets?.find((a) => a.id === selectedAssetId) || dbAssets?.[0]

  const [threads, setThreads] = useState(50)
  const [durationSec, setDurationSec] = useState(60)

  // Contrôles pré-lancement (RG1, RG2, RG7)
  const [preflight, setPreflight] = useState<any>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (step === 4 && currentProject?.id && currentTarget?.id && currentAsset?.id) {
      setChecking(true)
      validatePreflightApi({
        project_id: currentProject.id,
        target_id: currentTarget.id,
        asset_id: currentAsset.id,
      })
        .then((res) => {
          setPreflight(res)
          setChecking(false)
        })
        .catch(() => setChecking(false))
    }
  }, [step, currentProject?.id, currentTarget?.id, currentAsset?.id])

  const handleConfirm = () => {
    if (!currentProject?.id || !currentTarget?.id || !currentAsset?.id) return
    onLaunch({
      projectId: currentProject.id,
      projectName: currentProject.name,
      targetId: currentTarget.id,
      targetName: currentTarget.name,
      targetUrl: currentTarget.url,
      assetId: currentAsset.id,
      assetName: currentAsset.name,
      tool: selectedTool,
      threads,
      durationSec,
    })
  }

  return (
    <div className="modal-backdrop">
      <div className="modal launch-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">NOUVELLE EXÉCUTION</p>
            <h2>Lancer un test</h2>
            <p>Demande d’exécution sécurisée avec clé d'idempotence et vérification de quotas (RG1 &amp; RG7).</p>
          </div>
          <button className="icon-button" onClick={onClose}><X /></button>
        </div>

        <div className="stepper">
          {['Contexte', 'Scénario & Outil', 'Paramètres', 'Vérification'].map((label, index) => (
            <div className={`step ${index + 1 <= step ? 'active' : ''}`} key={label}>
              <span>{index + 1 < step ? <Check /> : index + 1}</span>
              <small>{label}</small>
            </div>
          ))}
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div className="form-grid">
              <label>
                Projet (PostgreSQL)
                <select
                  value={selectedProjectId || currentProject?.id || ''}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value)
                    const proj = dbProjects?.find((p) => p.id === e.target.value)
                    if (proj?.environments?.[0]) {
                      setSelectedEnvId(proj.environments[0].id)
                      if (proj.environments[0].targets?.[0]) {
                        setSelectedTargetId(proj.environments[0].targets[0].id)
                      }
                    }
                  }}
                >
                  {dbProjects && dbProjects.length > 0 ? (
                    dbProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.team})
                      </option>
                    ))
                  ) : (
                    <>
                      <option>Gestion des factures</option>
                      <option>Portail clients B2B</option>
                    </>
                  )}
                </select>
              </label>

              <label>
                Environnement
                <select
                  value={selectedEnvId || currentEnv?.id || ''}
                  onChange={(e) => {
                    setSelectedEnvId(e.target.value)
                    const env = envs.find((envItem) => envItem.id === e.target.value)
                    if (env?.targets?.[0]) {
                      setSelectedTargetId(env.targets[0].id)
                    }
                  }}
                >
                  {envs && envs.length > 0 ? (
                    envs.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.allowed_hours})
                      </option>
                    ))
                  ) : (
                    <>
                      <option>Recette (08:00 - 22:00)</option>
                      <option>Pré-production (19:00 - 06:00)</option>
                    </>
                  )}
                </select>
              </label>

              <label className="full">
                Cible autorisée
                <select
                  value={selectedTargetId || currentTarget?.id || ''}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                >
                  {targets && targets.length > 0 ? (
                    targets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {t.allowed_tool.toUpperCase()} · Max {t.max_charge} VU
                      </option>
                    ))
                  ) : (
                    <option>Microservice Mock Test · JMeter · Max 1000 VU</option>
                  )}
                </select>
              </label>

              <div className="target-summary">
                <Server />
                <div>
                  <strong>{currentTarget?.name || 'Cible applicative'}</strong>
                  <span>{currentTarget?.url || 'http://localhost:8088/api/v1'} · Quota: {currentProject?.max_concurrent_runs || 5} tirs max (RG7)</span>
                </div>
                <StatusBadge tone="success">Disponible</StatusBadge>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="form-grid">
              <label className="full">
                Moteur / Connecteur de test
                <select value={selectedTool} onChange={(e) => setSelectedTool(e.target.value)}>
                  {connectors.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </label>

              <label className="full">
                Script de test (Table test_asset)
                <select
                  value={selectedAssetId || currentAsset?.id || ''}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                >
                  {dbAssets && dbAssets.length > 0 ? (
                    dbAssets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.tool.toUpperCase()} {a.version}) · SHA {a.sha256_hash.substring(0, 8)}...
                      </option>
                    ))
                  ) : (
                    <>
                      <option>Tir de charge Facturation API (v1.3)</option>
                      <option>Parcours utilisateur Panier B2B (v2.0)</option>
                    </>
                  )}
                </select>
              </label>

              <div className="compatibility full">
                <CheckCircle2 />
                <div>
                  <strong>Connecteur conteneurisé prêt (Étape 4 du Guide)</strong>
                  <span>Exécution isolée sans socket Docker hôte, limites CPU et mémoire bornées.</span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="form-grid">
              <label>
                Utilisateurs virtuels (VU)
                <input
                  type="number"
                  min={5}
                  max={currentTarget?.max_charge || 1000}
                  value={threads}
                  onChange={(e) => setThreads(Number(e.target.value))}
                />
              </label>
              <label>
                Durée du tir (sec)
                <input
                  type="number"
                  min={10}
                  max={3600}
                  value={durationSec}
                  onChange={(e) => setDurationSec(Number(e.target.value))}
                />
              </label>
              <label className="full">Seuil p95 bloquant<input defaultValue="800 ms" disabled /></label>
              <label className="full">Taux d'erreur toléré<input defaultValue="1.0 %" disabled /></label>
            </div>
          )}

          {step === 4 && (
            <div className="summary-step">
              {checking ? (
                <div style={{ padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw className="animate-spin" style={{ width: '15px', height: '15px', color: '#2563eb' }} />
                  <span>Vérification des contrôles d'orchestration (RG1, RG2, RG7)...</span>
                </div>
              ) : preflight && !preflight.allowed ? (
                <div style={{ padding: '14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#b91c1c' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, marginBottom: '6px' }}>
                    <AlertTriangle style={{ width: '16px', height: '16px' }} />
                    <span>Lancement refusé par les règles de gouvernance</span>
                  </div>
                  <div>{preflight.reasons?.join(' · ') || preflight.error || 'Contrôle non satisfait'}</div>
                </div>
              ) : (
                <div className="compatibility full">
                  <CheckCircle2 />
                  <div>
                    <strong>Tous les contrôles pré-lancement sont validés</strong>
                    <span>
                      RG1 Cible libre · RG2 Cible active · RG7 Quota ({preflight?.active_runs ?? 0}/{preflight?.max_concurrent_runs ?? currentProject?.max_concurrent_runs ?? 5}) respecté.
                    </span>
                  </div>
                </div>
              )}

              <div className="summary-box" style={{ marginTop: '12px' }}>
                <div><span>Projet :</span><strong>{currentProject?.name || 'Gestion des factures'}</strong></div>
                <div><span>Cible :</span><strong>{currentTarget?.name || 'Cible'} ({currentTarget?.url || ''})</strong></div>
                <div><span>Script :</span><strong>{currentAsset?.name || 'Script'} ({selectedTool})</strong></div>
                <div><span>Charge :</span><strong>{threads} VU pendant {durationSec}s</strong></div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>Précédent</Button>
          )}
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)}>Suivant</Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={Boolean(preflight && !preflight.allowed)}
            >
              <Play data-icon="inline-start" /> Confirmer le tir
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
