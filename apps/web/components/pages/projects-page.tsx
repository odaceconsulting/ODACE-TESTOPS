'use client'

import React from 'react'
import { ArrowRight, Box, Plus, Server, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { ProjectApiItem } from '@/lib/api-client'
import { UserProfile } from '@/components/shared/types'

export function ProjectsPage({
  dbProjects,
  currentUser,
  onNotify,
  onNewProject,
  onSelectProject,
}: {
  dbProjects?: ProjectApiItem[]
  currentUser: UserProfile
  onNotify: (msg: string) => void
  onNewProject: () => void
  onSelectProject?: (pName: string) => void
}) {
  const canManage = currentUser.roleKey === 'admin' || currentUser.roleKey === 'responsable'
  const projectsList = dbProjects || []

  return (
    <div className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Gouvernance des Projets, Environnements &amp; Cibles ({projectsList.length})</h2>
          <p>
            Gestion des politiques de charge, quotas de concurrence (RG7) et cibles applicatives autorisées (persistance PostgreSQL).
          </p>
        </div>
        <Button onClick={onNewProject}>
          <Plus data-icon="inline-start" /> Nouveau projet
        </Button>
      </div>

      {projectsList.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed #334155' }}>
          <Box style={{ width: '48px', height: '48px', color: '#64748b', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Aucun projet configuré en base de données</h3>
          <p style={{ color: '#94a3b8', maxWidth: '480px', margin: '0 auto 20px', fontSize: '14px' }}>
            Pour démarrer un tir de test, un projet doit être préalablement déclaré avec son quota de charge (RG7) et ses cibles applicatives homologuées (RG2).
          </p>
          <Button onClick={onNewProject}>
            <Plus data-icon="inline-start" /> Déclarer le premier projet
          </Button>
        </div>
      ) : (
        <div className="project-cards">
          {projectsList.map((p) => {
            const totalTargets = (p.environments || []).reduce((sum, e) => sum + (e.targets?.length || 0), 0)
            const allTargets = (p.environments || []).flatMap((e) => (e.targets || []).map((t) => ({ ...t, envName: e.name, allowedHours: e.allowed_hours })))

            return (
              <div className="project-card" key={p.id}>
                <div className="project-card-top">
                  <div className="project-symbol"><Box /></div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <StatusBadge tone="success">Actif</StatusBadge>
                    <StatusBadge tone="info">Quota: {p.max_concurrent_runs} max</StatusBadge>
                  </div>
                </div>

                <h3>{p.name}</h3>
                <p>{p.description || `Application sous la gouvernance de l’équipe ${p.team}`}</p>

                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Équipe : <strong style={{ color: '#f8fafc' }}>{p.team}</strong></div>
                  <div>
                    Environnements :{' '}
                    <span style={{ color: '#0ea5e9' }}>
                      {(p.environments || []).map((e) => `${e.name} (${e.allowed_hours})`).join(' · ') || 'Recette'}
                    </span>
                  </div>
                </div>

                {/* Liste des cibles déclarées */}
                <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                    <span><Server style={{ width: '12px', height: '12px', display: 'inline', marginRight: '4px' }} /> Cibles autorisées ({totalTargets})</span>
                  </div>

                  {allTargets.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {allTargets.slice(0, 3).map((t, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }} title={t.url}>
                            {t.name}
                          </span>
                          <span style={{ color: '#0ea5e9', fontSize: '10px', textTransform: 'uppercase', background: 'rgba(14,165,233,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                            {t.allowed_tool} · {t.max_charge} VU
                          </span>
                        </div>
                      ))}
                      {allTargets.length > 3 && (
                        <div style={{ fontSize: '10px', color: '#64748b' }}>+{allTargets.length - 3} autre(s) cible(s)</div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>Aucune cible configurée</div>
                  )}
                </div>

                <div className="project-card-footer">
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    ID: {p.id.substring(0, 8)}...
                  </span>
                  <button
                    onClick={() => {
                      if (onSelectProject) onSelectProject(p.name)
                      onNotify(`Projet actif basculé sur « ${p.name} »`)
                    }}
                  >
                    Activer ce projet <ArrowRight />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
