'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, History, ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PROFILES, UserProfile } from '@/components/shared/types'
import { DirectoryUser, logoutApi } from '@/lib/api-client'

export function ActorsPage({
  currentUser,
  dbDirectory,
  onNotify,
  onOpenAudit,
}: {
  currentUser: UserProfile
  dbDirectory: DirectoryUser[]
  onNotify: (msg: string) => void
  onOpenAudit: () => void
}) {
  const router = useRouter()
  const [filterRole, setFilterRole] = useState<string>('all')

  const roleMap: Record<string, string> = {
    tech_lead: 'Tech lead',
    admin: 'Administrateur',
    responsable: 'Responsable',
    tester: 'Testeur / QA',
    developer: 'Développeur',
    exploitation: 'Exploitation',
    auditor: 'Auditeur',
  }

  const allProfiles: (UserProfile & { email?: string })[] =
    dbDirectory && dbDirectory.length > 0
      ? dbDirectory.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          name: u.full_name,
          roleTitle: roleMap[u.role] || u.role,
          roleKey: (u.role || 'tester') as any,
          avatar:
            u.avatar ||
            u.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase(),
          dept: u.department,
        }))
      : PROFILES

  const filteredProfiles =
    filterRole === 'all'
      ? allProfiles
      : allProfiles.filter((p) => p.roleKey === filterRole)

  const handleSelectActor = async (p: { username: string; name: string }) => {
    if (p.username === currentUser.username) {
      onNotify(`Vous êtes déjà connecté sous l'identité de ${p.name}.`)
      return
    }
    await logoutApi()
    onNotify(`Redirection pour connexion en tant que ${p.name}...`)
    router.push(`/connexion?login=${encodeURIComponent(p.username)}`)
  }

  const roleMeta: Record<
    string,
    {
      mission: string
      allowed: string[]
      denied: string[]
      bgAvatar: string
      colorAvatar: string
    }
  > = {
    tech_lead: {
      mission: 'Valider les résultats, définir les seuils des Quality Gates et superviser techniquement les campagnes.',
      allowed: [
        'Valider un résultat (Validation humaine exclusive)',
        'Définir et ajuster les seuils Quality Gate',
        'Lancement de tests sur cibles autorisées',
        'Arbitrage technique des non-conformités',
      ],
      denied: ['Modifier les rôles des utilisateurs (Réservé Admin)'],
      bgAvatar: '#f1ebff',
      colorAvatar: '#7c4dde',
    },
    admin: {
      mission: 'Peut tout sur la plateforme (infrastructure, arrêt d’urgence, connecteurs et gestion des rôles).',
      allowed: [
        'Gestion complète de l’infrastructure & runners',
        'Attribution et modification des rôles',
        'Arrêt d’urgence global (Kill-Switch)',
        'Déploiement connecteurs de test (Docker, locaux)',
        'Configuration globale des seuils de test',
      ],
      denied: ['Valider un résultat à la place d’un tech lead'],
      bgAvatar: '#e9f0ff',
      colorAvatar: '#2563eb',
    },
    responsable: {
      mission: 'Gérer équipes, projets, quotas et gouvernance globale.',
      allowed: [
        'Gérer les équipes et projets',
        'Affectation des quotas de test',
        'Tableaux de bord stratégiques & KPIs',
        'Export des bilans de campagne d’engagement',
      ],
      denied: [
        'Lancer des tests de charge sans autorisation',
        'Validation technique des runs applicatifs',
      ],
      bgAvatar: '#fff5dc',
      colorAvatar: '#c78300',
    },
    tester: {
      mission: 'Déposer des scripts de test, lancer des campagnes et annuler ses tests en cours.',
      allowed: [
        'Déposer et importer des scripts (.jmx, .side, .usr)',
        'Lancer des campagnes de test de charge et fonctionnels',
        'Annuler ses tests en cours d’exécution',
        'Consultation des rapports d’exécution et traces',
      ],
      denied: [
        'Administrer l’infrastructure ou les rôles',
        'Modifier les seuils ou valider des runs',
      ],
      bgAvatar: '#e5f8ee',
      colorAvatar: '#15925b',
    },
    developer: {
      mission: 'Consulter les résultats, lancer des tests sur cibles autorisées en amont.',
      allowed: [
        'Consulter les métriques et journaux d’exécution',
        'Lancer sur cibles autorisées (Dev / Recette)',
        'Rejeu rapide des campagnes unitaires',
      ],
      denied: [
        'Modifier les seuils Quality Gate',
        'Valider un résultat de test (Réservé Tech Lead)',
      ],
      bgAvatar: '#edf1f6',
      colorAvatar: '#526581',
    },
    exploitation: {
      mission: 'Arrêt d’urgence, supervision en direct et gestion du parc d’agents runners.',
      allowed: [
        'Déclencher l’arrêt d’urgence global (Kill-Switch)',
        'Supervision de l’état et saturation des agents',
        'Gestion et maintenance des nœuds runners (Docker)',
        'Surveillance des files d’attente Redis',
      ],
      denied: [
        'Modifier les scripts de test métier',
        'Valider des résultats d’exécutions',
      ],
      bgAvatar: '#ffebed',
      colorAvatar: '#d34152',
    },
    auditor: {
      mission: 'Lecture seule sur la traçabilité immuable, les bilans et les pistes d’audit.',
      allowed: [
        'Lecture seule sur le Journal d’Audit légal (audit_log)',
        'Consultation des bilans et métriques de conformité',
        'Contrôle de conformité réglementaire & non-répudiation',
      ],
      denied: ['Modifier ou lancer quoi que ce soit (Lecture seule stricte)'],
      bgAvatar: '#f0f3f8',
      colorAvatar: '#475467',
    },
  }

  const matrixRows = [
    { op: 'Lancement de tests (Dev & Local)', tech_lead: 'yes', admin: 'yes', responsable: 'no', tester: 'yes', developer: 'yes', exploitation: 'no', auditor: 'no' },
    { op: 'Lancement de tests (Recette & QA)', tech_lead: 'yes', admin: 'yes', responsable: 'no', tester: 'yes', developer: 'no', exploitation: 'no', auditor: 'no' },
    { op: 'Lancement sur Cible sensible / Prod', tech_lead: 'yes', admin: 'yes', responsable: 'no', tester: 'warn', developer: 'no', exploitation: 'no', auditor: 'no' },
    { op: 'Validation finale humaine des runs', tech_lead: 'exclusive', admin: 'no', responsable: 'no', tester: 'no', developer: 'no', exploitation: 'no', auditor: 'no' },
    { op: 'Import d’assets (.jmx, .side, .py)', tech_lead: 'yes', admin: 'yes', responsable: 'no', tester: 'yes', developer: 'warn', exploitation: 'no', auditor: 'no' },
    { op: 'Déploiement connecteurs Docker', tech_lead: 'warn', admin: 'yes', responsable: 'no', tester: 'no', developer: 'no', exploitation: 'warn', auditor: 'no' },
    { op: 'Arrêt d’urgence global (Kill-Switch)', tech_lead: 'yes', admin: 'yes', responsable: 'no', tester: 'no', developer: 'no', exploitation: 'yes', auditor: 'no' },
    { op: 'Consultation Journal d’Audit immuable', tech_lead: 'yes', admin: 'yes', responsable: 'yes', tester: 'yes', developer: 'yes', exploitation: 'yes', auditor: 'yes' },
    { op: 'Configuration des seuils Quality Gate', tech_lead: 'yes', admin: 'yes', responsable: 'warn', tester: 'no', developer: 'no', exploitation: 'no', auditor: 'no' },
  ]

  const renderBadge = (val: string) => {
    switch (val) {
      case 'yes':
        return <span className="matrix-badge-yes">✅ Autorisé</span>
      case 'exclusive':
        return <span className="matrix-badge-exclusive">🔒 Exclusif</span>
      case 'warn':
        return <span className="matrix-badge-warn">⚠️ Conditionnel</span>
      case 'no':
      default:
        return <span className="matrix-badge-no">❌ 403 Interdit</span>
    }
  }

  return (
    <div className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Annuaire des Acteurs &amp; Matrice d'Habilitations (RBAC)</h2>
          <p>
            Gestion des 7 profils habilités de la plateforme ODACE TestOps, conforme aux spécifications du Guide Développeur (Étape 8 &amp; Étape 2).
          </p>
        </div>
        <div className="panel-actions">
          <Button variant="outline" onClick={onOpenAudit}>
            <History data-icon="inline-start" /> Consulter le Journal d'Audit
          </Button>
        </div>
      </div>

      {/* Résumé des indicateurs RBAC */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Acteurs habilités</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>7 profils officiels</div>
          <div style={{ fontSize: '10px', color: '#16a34a', marginTop: '2px' }}>100 % conformité Guide</div>
        </div>
        <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Sécurité d'accès</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563eb' }}>Jetons Bearer JWT</div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Contrôle strict middleware FastAPI</div>
        </div>
        <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Session active</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentUser.name}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
            Rôle : <span className={`role-badge ${currentUser.roleKey}`}>{currentUser.roleTitle}</span>
          </div>
        </div>
        <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Traçabilité légale</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>Immuable (R14)</div>
          <div style={{ fontSize: '10px', color: '#16a34a', marginTop: '2px' }}>Enregistrement policy.denied</div>
        </div>
      </div>

      {/* Barre de filtrage */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#ffffff', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: '#475467' }}>
          <Users style={{ width: '15px', height: '15px', color: '#2563eb' }} />
          <span>Sélectionner ou basculer d'acteur :</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterRole('all')}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: filterRole === 'all' ? '#2563eb' : '#e2e8f0',
              background: filterRole === 'all' ? '#eff6ff' : '#fff',
              color: filterRole === 'all' ? '#1d4ed8' : '#64748b',
              fontWeight: filterRole === 'all' ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            Tous (7)
          </button>
          {PROFILES.map((p) => (
            <button
              key={p.roleKey}
              onClick={() => setFilterRole(p.roleKey)}
              style={{
                padding: '5px 10px',
                fontSize: '11px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filterRole === p.roleKey ? '#2563eb' : '#e2e8f0',
                background: filterRole === p.roleKey ? '#eff6ff' : '#fff',
                color: filterRole === p.roleKey ? '#1d4ed8' : '#64748b',
                fontWeight: filterRole === p.roleKey ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {p.roleTitle}
            </button>
          ))}
        </div>
      </div>

      {/* GRILLE DES 7 CARTES D'ACTEURS */}
      <div className="actors-grid">
        {filteredProfiles.map((p) => {
          const isActive = currentUser.username === p.username
          const meta = roleMeta[p.roleKey] || {
            mission: 'Profil habilité sur la plateforme ODACE.',
            allowed: [],
            denied: [],
            bgAvatar: '#e2e8f0',
            colorAvatar: '#1e293b',
          }

          return (
            <div key={p.id} className={`actor-card ${isActive ? 'active-session' : ''}`}>
              <div>
                <div className="actor-card-head">
                  <div className="actor-avatar" style={{ background: meta.bgAvatar, color: meta.colorAvatar }}>
                    {p.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{p.name}</strong>
                      {isActive && <span className="active-tag">Session active</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 4px' }}>
                      {p.dept} · <code>{p.username}</code>
                    </div>
                    <span className={`role-badge ${p.roleKey}`}>{p.roleTitle}</span>
                  </div>
                </div>

                <div className="actor-mission">
                  {meta.mission}
                </div>

                <div className="actor-permissions">
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#15803d', marginBottom: '4px' }}>
                    Actions autorisées :
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#475467', lineHeight: '1.4' }}>
                    {meta.allowed.map((a, idx) => (
                      <li key={idx}>{a}</li>
                    ))}
                  </ul>

                  {meta.denied && meta.denied.length > 0 && (
                    <>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#b91c1c', marginTop: '6px', marginBottom: '4px' }}>
                        Interdictions formelles (403) :
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                        {meta.denied.map((d, idx) => (
                          <li key={idx} style={{ color: '#991b1b' }}>{d}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                {isActive ? (
                  <Button variant="outline" size="sm" style={{ width: '100%' }} disabled>
                    Connecté sous ce profil
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    style={{ width: '100%' }}
                    onClick={() => handleSelectActor(p)}
                  >
                    Se connecter sous ce compte
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* MATRICE DÉTAILLÉE DES DROITS RBAC (PAGE 12 DU GUIDE DÉVELOPPEUR) */}
      <div style={{ padding: '0 20px 24px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#fafbfc' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#0f172a' }}>
              Matrice de Contrôle d'Accès basée sur les Rôles (RBAC) - Guide Développeurs
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
              Tableau exhaustif d'attribution des privilèges par type d'opération sensible. Les refus d'accès émettent une erreur 403 Forbidden et un audit log.
            </p>
          </div>

          <div className="matrix-wrap">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '220px' }}>Opération de la Plateforme</th>
                  <th>Tech Lead</th>
                  <th>Administrateur</th>
                  <th>Responsable</th>
                  <th>Testeur / QA</th>
                  <th>Développeur</th>
                  <th>Exploitation</th>
                  <th>Auditeur</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.op}</td>
                    <td>{renderBadge(row.tech_lead)}</td>
                    <td>{renderBadge(row.admin)}</td>
                    <td>{renderBadge(row.responsable)}</td>
                    <td>{renderBadge(row.tester)}</td>
                    <td>{renderBadge(row.developer)}</td>
                    <td>{renderBadge(row.exploitation)}</td>
                    <td>{renderBadge(row.auditor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#475467', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck style={{ width: '16px', height: '16px', color: '#16a34a', flexShrink: 0 }} />
            <span>
              <strong>Application stricte côté serveur :</strong> Chaque endpoint FastAPI vérifie les claims du jeton JWT. En cas d'appel non autorisé, la requête est rejetée avec un statut <code>HTTP 403 Forbidden</code> et l'événement <code>policy.denied</code> est immédiatement consigné dans la table <code>audit_log</code>.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
