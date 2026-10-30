'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  checkBackendHealth,
  fetchRunsFromApi,
  validateRunApi,
  createRunApi,
  fetchProjectsFromApi,
  fetchAssetsFromApi,
  fetchAuditFromApi,
  fetchDirectoryApi,
  loginApi,
  logoutApi,
  getSessionToken,
  getSessionUser,
  isLoggedOut,
  ProjectApiItem,
  TestAssetApiItem,
  AuditLogApiItem,
  DirectoryUser,
} from '@/lib/api-client'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  LogOut,
  Menu,
  Rocket,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react'

// Types partagés & données de référence
import {
  UserProfile,
  PROFILES,
  navItems,
  runsSeed,
  initialConnectors,
  initialAgents,
  initialAuditEvents,
} from './shared/types'

// Pages découpées
import { DashboardPage } from './pages/dashboard-page'
import { ProjectsPage } from './pages/projects-page'
import { ScriptsPage } from './pages/scripts-page'
import { ExecutionsPage } from './pages/executions-page'
import { WorkflowsPage } from './pages/workflows-page'
import { SchedulePage, EvolutionPage } from './pages/schedule-page'
import { ValidationsPage } from './pages/validations-page'
import { AgentsPage } from './pages/agents-page'
import { ActorsPage } from './pages/actors-page'
import { AuditPage } from './pages/audit-page'
import { AdminPage, AddConnectorDialog } from './pages/admin-page'

// Modales & tiroirs
import { LaunchDialog } from './dialogs/launch-dialog'
import { ImportDialog } from './dialogs/import-dialog'
import { NewProjectDialog } from './dialogs/new-project-dialog'
import { RunDrawer } from './drawers/run-drawer'

export default function OdaceDemo() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(PROFILES[0]) // Par défaut Marie Laurent (Tech Lead)
  const [activeNav, setActiveNav] = useState('Tableau de bord')
  const [project, setProject] = useState('Gestion des factures')
  const [runs, setRuns] = useState(runsSeed)
  const [connectors, setConnectors] = useState(initialConnectors)
  const [agents] = useState(initialAgents)
  const [auditEvents] = useState(initialAuditEvents)
  const [dbProjects, setDbProjects] = useState<ProjectApiItem[]>([])
  const [dbAssets, setDbAssets] = useState<TestAssetApiItem[]>([])
  const [dbAudit, setDbAudit] = useState<AuditLogApiItem[]>([])
  const [dbDirectory, setDbDirectory] = useState<DirectoryUser[]>([])

  // Dialogs & drawers
  const [showLauncher, setShowLauncher] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showAddConnector, setShowAddConnector] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [selectedRun, setSelectedRun] = useState<typeof runsSeed[number] | null>(null)
  const [launchStep, setLaunchStep] = useState(1)
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [killSwitchActive, setKillSwitchActive] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [backendStatus, setBackendStatus] = useState<{ online: boolean; message: string }>({
    online: false,
    message: 'Recherche API...',
  })
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileMenuOpen])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3500)
  }

  const handleLogout = async () => {
    await logoutApi()
    notify('Déconnexion réussie. Clôture de la session en cours...')
    router.push('/connexion')
  }

  const handleSwitchProfile = async (target: UserProfile) => {
    if (target.username === currentUser.username) {
      setProfileMenuOpen(false)
      return
    }

    if (backendStatus.online) {
      const res = await loginApi(target.username, 'odace2026!')
      if (res.success && res.user) {
        const role = (res.user.roles && res.user.roles.length > 0 ? res.user.roles[0] : target.roleKey) as any
        const roleMap: Record<string, string> = {
          tech_lead: 'Tech lead',
          admin: 'Administrateur',
          responsable: 'Responsable',
          tester: 'Testeur / QA',
          developer: 'Développeur',
          exploitation: 'Exploitation',
          auditor: 'Auditeur',
        }
        setCurrentUser({
          id: res.user.id,
          username: res.user.username,
          name: res.user.full_name,
          roleTitle: roleMap[role] || target.roleTitle,
          roleKey: role,
          avatar: res.user.avatar || target.avatar,
          dept: res.user.department || target.dept,
        })
        notify(`Bascule sur ${res.user.full_name} (${roleMap[role] || role}) · Session JWT actualisée`)
      } else {
        setCurrentUser(target)
        notify(`Bascule sur le profil ${target.name} (${target.roleTitle})`)
      }
    } else {
      setCurrentUser(target)
      notify(`Bascule sur le profil ${target.name} (${target.roleTitle})`)
    }
    setProfileMenuOpen(false)
  }

  useEffect(() => {
    let mounted = true

    async function initAuthAndSync() {
      const token = getSessionToken()
      if (!token || isLoggedOut()) {
        router.push('/connexion')
        return
      }

      const health = await checkBackendHealth()
      if (!mounted) return
      setBackendStatus(health)

      const savedUser = getSessionUser()
      if (savedUser) {
        const role = (savedUser.roles && savedUser.roles.length > 0 ? savedUser.roles[0] : 'tech_lead') as any
        const roleMap: Record<string, string> = {
          tech_lead: 'Tech lead',
          admin: 'Administrateur',
          responsable: 'Responsable',
          tester: 'Testeur / QA',
          developer: 'Développeur',
          exploitation: 'Exploitation',
          auditor: 'Auditeur',
        }
        setCurrentUser({
          id: savedUser.id,
          username: savedUser.username,
          name: savedUser.full_name,
          roleTitle: roleMap[role] || role,
          roleKey: role,
          avatar: savedUser.avatar || savedUser.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase(),
          dept: savedUser.department,
        })
      }

      if (health.online && getSessionToken()) {
        const [remoteRuns, remoteProjects, remoteAssets, remoteAudit, remoteDirectory] = await Promise.all([
          fetchRunsFromApi(),
          fetchProjectsFromApi(),
          fetchAssetsFromApi(),
          fetchAuditFromApi(),
          fetchDirectoryApi(),
        ])
        if (!mounted) return
        if (remoteRuns && remoteRuns.length > 0) setRuns(remoteRuns)
        if (remoteProjects && remoteProjects.length > 0) setDbProjects(remoteProjects)
        if (remoteAssets && remoteAssets.length > 0) setDbAssets(remoteAssets)
        if (remoteAudit && remoteAudit.length > 0) setDbAudit(remoteAudit)
        if (remoteDirectory && remoteDirectory.length > 0) setDbDirectory(remoteDirectory)
      }
    }

    initAuthAndSync()
    const timer = setInterval(initAuthAndSync, 10000)
    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [router])

  // Permissions dynamiques selon le profil actif et la matrice RBAC officielle
  const canLaunchRun =
    (currentUser.roleKey === 'tech_lead' ||
      currentUser.roleKey === 'admin' ||
      currentUser.roleKey === 'tester' ||
      currentUser.roleKey === 'developer') &&
    !killSwitchActive
  const isReadOnly = currentUser.roleKey === 'auditor'

  const currentRuns = useMemo(
    () => runs.filter((run) => project === 'Tous les projets' || run.project === project),
    [runs, project]
  )

  const launch = async (launchPayload?: any) => {
    if (!canLaunchRun) {
      notify('Action interdite pour votre profil.')
      return
    }

    const projName = launchPayload?.projectName || project
    const scriptName = launchPayload?.assetName || 'Tir de charge Facturation API'
    const toolName = (launchPayload?.tool || 'JMETER').toUpperCase()

    const created: any = {
      id: `RUN-${Math.floor(1000 + Math.random() * 9000)}`,
      project: projName,
      script: scriptName,
      version: 'v1.3',
      tool: toolName,
      env: 'Recette',
      requester: currentUser.name,
      date: 'À l’instant',
      duration: '—',
      state: 'En attente',
      result: 'Non évalué',
      validation: 'En attente',
    }
    setRuns((items) => [created, ...items])
    setShowLauncher(false)
    setLaunchStep(1)
    setSelectedRun(created)

    if (backendStatus.online && launchPayload?.projectId && launchPayload?.assetId && launchPayload?.targetId) {
      notify(`Vérification des quotas et lancement du tir vers ${launchPayload.targetName}...`)
      const res = await createRunApi({
        project_id: launchPayload.projectId,
        asset_id: launchPayload.assetId,
        target_id: launchPayload.targetId,
        public_params: {
          threads: Number(launchPayload.threads || 50),
          duration_sec: Number(launchPayload.durationSec || 60),
        },
      })
      if (!res.success) {
        notify(`Refus de lancement : ${res.error || 'Règles de gestion non satisfaites'}`)
        setRuns((items) => items.filter((r) => r.id !== created.id))
        return
      }
      notify(`Tir enregistré (RUN-${res.id?.slice(0, 4).toUpperCase()}) ! Exécution en arrière-plan démarrée.`)
      setTimeout(async () => {
        const fresh = await fetchRunsFromApi()
        if (fresh && fresh.length > 0) setRuns(fresh)
      }, 1500)
      setTimeout(async () => {
        const fresh = await fetchRunsFromApi()
        if (fresh && fresh.length > 0) setRuns(fresh)
      }, 4500)
    } else {
      notify(`Exécution ${created.id} créée (Mode démo)`)
    }
  }

  const handleValidateRun = async (runId: string, decision: 'Validée' | 'Refusée', comment: string) => {
    if (backendStatus.online) {
      const targetId = (selectedRun as any)?.rawId || runId
      const res = await validateRunApi(targetId, decision, comment)
      if (!res.success) {
        notify(`Refus RBAC : ${res.error || 'Action réservée au Tech Lead (tracé dans audit_log)'}`)
        return
      }
      const fresh = await fetchRunsFromApi()
      if (fresh && fresh.length > 0) setRuns(fresh)
    }
    setRuns((items) =>
      items.map((r) => (r.id === runId ? { ...r, validation: decision } : r))
    )
    if (selectedRun && selectedRun.id === runId) {
      setSelectedRun({ ...selectedRun, validation: decision })
    }
    notify(`Exécution ${runId} : ${decision} enregistrée en base`)
  }

  return (
    <div className="odace-shell">
      {/* SIDEBAR */}
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="brand" style={{ padding: '0 8px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '9px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          }}>
            <img
              src="/logo-testops.png"
              alt="ODACE TestOps"
              style={{ height: '28px', width: 'auto', display: 'block', objectFit: 'contain' }}
            />
          </div>
          <button className="mobile-close" onClick={() => setMobileNav(false)}><X /></button>
        </div>

        {/* Navigation adaptée */}
        <nav className="main-nav">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={activeNav === label ? 'active' : ''}
              onClick={() => {
                setActiveNav(label)
                setMobileNav(false)
              }}
            >
              <Icon />
              {label}
              {label === 'Validations' && <span className="nav-count">2</span>}
              {label === 'Acteurs & Habilitations' && <span className="nav-count" style={{ background: '#7c3aed' }}>7</span>}
              {label === 'Administration' && currentUser.roleKey === 'admin' && (
                <span className="nav-count" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#d8e2f1' }}>Admin</span>
              )}
            </button>
          ))}
        </nav>

        <div className="nav-divider" />

        <button className="delivery-link" onClick={() => setActiveNav('Livraisons')}>
          <Rocket />
          <span>Livraisons CI/CD</span>
          <em>Évolution</em>
        </button>

        {/* État nominal / santé de la plateforme en bas de la sidebar */}
        <div className="sidebar-bottom">
          <div className="platform-health">
            <span className={`health-pulse ${killSwitchActive ? 'bg-red-500' : ''}`} style={killSwitchActive ? { background: '#ef4444' } : {}} />
            <div>
              <strong>{killSwitchActive ? 'ARRÊT D’URGENCE ACTIF' : 'Plateforme nominale'}</strong>
              <small>{agents.filter(a => a.status === 'Disponible').length}/{agents.length} agents disponibles</small>
            </div>
          </div>
        </div>
      </aside>

      {/* ZONE CENTRALE */}
      <main className="main-area">
        {/* TOPBAR */}
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu /></button>

          {/* Sélecteur de projet */}
          <div className="project-picker">
            <span>Projet actif</span>
            <button>
              <span className="project-dot" />
              {project}
              <ChevronDown />
            </button>
          </div>

          <div className="topbar-actions">
            {/* CONTRÔLE DE CONNECTIVITÉ API BACKEND */}
            <div
              className="top-health"
              title={backendStatus.message}
              style={{
                borderColor: backendStatus.online ? 'rgba(34, 197, 94, 0.4)' : 'rgba(59, 130, 246, 0.3)',
                background: backendStatus.online ? 'rgba(34, 197, 94, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                cursor: 'pointer',
              }}
              onClick={async () => {
                notify('Vérification de la connectivité API...')
                const health = await checkBackendHealth()
                setBackendStatus(health)
                notify(`API: ${health.message}`)
              }}
            >
              <span
                className="health-pulse"
                style={{
                  background: backendStatus.online ? '#22c55e' : '#3b82f6',
                  boxShadow: backendStatus.online ? '0 0 0 3px rgba(34, 197, 94, 0.2)' : '0 0 0 3px rgba(59, 130, 246, 0.2)',
                }}
              />
              <span>{backendStatus.online ? 'FastAPI Connecté' : 'Mode Démo'}</span>
            </div>

            <button
              className="icon-button"
              aria-label="Notifications"
              title="Centre de notifications opérationnelles"
              onClick={() => notify('Aucune alerte critique en cours. Système opérationnel.')}
            >
              <Bell />
              <span className="notification-dot" />
            </button>

            {/* ICÔNE PROFIL AVEC SÉLECTION DES 7 PROFILS OFFICIELS */}
            <div className="profile-menu-container" ref={profileMenuRef}>
              <button
                type="button"
                className="profile-menu-trigger"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={profileMenuOpen}
                title="Profil utilisateur · Cliquez pour basculer de profil TestOps"
              >
                <div className="profile-trigger-avatar">
                  {currentUser.avatar}
                </div>
                <div className="profile-trigger-info">
                  <span className="profile-trigger-name">{currentUser.name}</span>
                  <span className={`role-badge ${currentUser.roleKey}`}>{currentUser.roleTitle}</span>
                </div>
                <ChevronDown className={`profile-trigger-chevron ${profileMenuOpen ? 'open' : ''}`} />
              </button>

              {profileMenuOpen && (
                <div className="profile-dropdown-menu">
                  {/* Fiche de l'utilisateur actuellement connecté */}
                  <div className="profile-dropdown-header">
                    <div className="profile-header-avatar">
                      {currentUser.avatar}
                    </div>
                    <div className="profile-header-text">
                      <strong>{currentUser.name}</strong>
                      <small>{currentUser.username}@odace.ci</small>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span className={`role-badge ${currentUser.roleKey}`}>{currentUser.roleTitle}</span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>{currentUser.dept}</span>
                      </div>
                    </div>
                  </div>

                  <div className="profile-dropdown-divider" />

                  {/* Liste des 7 profils pour permutation instantanée */}
                  <div className="profile-dropdown-list">
                    <span className="profile-dropdown-section-title">
                      BASCULER D'HABILITATION (7 RÔLES MATRICE RBAC)
                    </span>
                    {PROFILES.map((p) => {
                      const isCurrent = p.username === currentUser.username
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`profile-switch-item ${isCurrent ? 'active' : ''}`}
                          onClick={() => handleSwitchProfile(p)}
                        >
                          <div className="profile-item-avatar">{p.avatar}</div>
                          <div className="profile-item-details">
                            <div className="profile-item-top">
                              <span className="profile-item-name">{p.name}</span>
                              <span className={`role-badge ${p.roleKey}`}>{p.roleTitle}</span>
                            </div>
                            <small className="profile-item-dept">{p.dept}</small>
                          </div>
                          {isCurrent && <CheckCircle2 className="profile-current-check" />}
                        </button>
                      )
                    })}
                  </div>

                  <div className="profile-dropdown-divider" />

                  {/* Actions profil & déconnexion */}
                  <div className="profile-dropdown-actions">
                    <button
                      type="button"
                      className="profile-action-btn"
                      onClick={() => {
                        setActiveNav('Acteurs & Habilitations')
                        setProfileMenuOpen(false)
                      }}
                    >
                      <Users style={{ width: '15px', height: '15px', color: '#64748b' }} />
                      <span>Matrice des droits &amp; habilitations</span>
                    </button>

                    <button
                      type="button"
                      className="profile-logout-btn"
                      onClick={() => {
                        setProfileMenuOpen(false)
                        handleLogout()
                      }}
                    >
                      <LogOut style={{ width: '15px', height: '15px' }} />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENU DE LA PAGE */}
        <div className="page-content">
          {/* Bandeau d'avertissement en mode Auditeur (lecture seule) */}
          {isReadOnly && (
            <div className="read-only-banner">
              <ShieldAlert style={{ width: '16px', color: '#475467' }} />
              <strong>Mode Auditeur actif :</strong> Vous disposez d’une habilitation en lecture seule stricte. Les actions d’exécution et de validation sont désactivées.
            </div>
          )}

          {/* Bandeau Kill Switch si actif */}
          {killSwitchActive && (
            <div className="danger-callout" style={{ marginBottom: '20px' }}>
              <AlertTriangle />
              <div>
                <strong>DISPOSITIF D'ARRÊT D'URGENCE GLOBAL ACTIF (RG5)</strong>
                <span>Tous les départs d'exécutions sont verrouillés. Les agents ont reçu l'ordre d'interrompre les travaux en cours.</span>
              </div>
            </div>
          )}

          <div className="page-heading">
            <div>
              <p className="breadcrumb">ODACE TestOps <span>/</span> {activeNav}</p>
              <h1>{activeNav}</h1>
              <p className="page-subtitle">
                Connecté en tant que <strong>{currentUser.name}</strong> · Habilitation : <span className={`role-badge ${currentUser.roleKey}`}>{currentUser.roleTitle}</span>
              </p>
            </div>

            <div className="heading-actions">
              <select value={project} onChange={(e) => setProject(e.target.value)}>
                {dbProjects && dbProjects.length > 0 ? (
                  <>
                    <option>Tous les projets</option>
                    {dbProjects.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </>
                ) : (
                  <>
                    <option>Gestion des factures</option>
                    <option>Portail clients</option>
                    <option>API encaissements</option>
                    <option>Tous les projets</option>
                  </>
                )}
              </select>
              <select defaultValue="30 derniers jours">
                <option>30 derniers jours</option>
                <option>7 derniers jours</option>
                <option>Ce trimestre</option>
              </select>
            </div>
          </div>

          {/* ROUTAGE INTERACTIF SELON L'ONGLET ACTIF */}
          {activeNav === 'Tableau de bord' && (
            <DashboardPage
              currentRuns={currentRuns}
              onRun={(run) => setSelectedRun(run)}
              onLaunch={() => setShowLauncher(true)}
              canLaunch={canLaunchRun}
            />
          )}

          {activeNav === 'Projets' && (
            <ProjectsPage
              dbProjects={dbProjects}
              currentUser={currentUser}
              onNotify={notify}
              onNewProject={() => setShowNewProject(true)}
              onSelectProject={(pName) => {
                setProject(pName)
                notify(`Projet actif : « ${pName} »`)
              }}
            />
          )}

          {activeNav === 'Catalogue de scripts' && (
            <ScriptsPage
              runs={currentRuns}
              dbAssets={dbAssets}
              onImport={() => setShowImport(true)}
              onNotify={notify}
            />
          )}

          {activeNav === 'Exécutions' && (
            <ExecutionsPage
              runs={currentRuns}
              onRun={(run) => setSelectedRun(run)}
              onLaunch={() => setShowLauncher(true)}
              canLaunch={canLaunchRun}
            />
          )}

          {activeNav === 'Workflows' && (
            <WorkflowsPage onNotify={notify} />
          )}

          {activeNav === 'Planification' && (
            <SchedulePage onNotify={notify} />
          )}

          {activeNav === 'Validations' && (
            <ValidationsPage
              runs={runs}
              currentUser={currentUser}
              onRun={(run) => setSelectedRun(run)}
              onValidate={handleValidateRun}
              onNotify={notify}
            />
          )}

          {activeNav === 'Agents' && (
            <AgentsPage
              agents={agents}
              currentUser={currentUser}
              onNotify={notify}
            />
          )}

          {activeNav === 'Acteurs & Habilitations' && (
            <ActorsPage
              currentUser={currentUser}
              dbDirectory={dbDirectory}
              onNotify={notify}
              onOpenAudit={() => setActiveNav('Journal d’audit')}
            />
          )}

          {activeNav === 'Journal d’audit' && (
            <AuditPage
              auditEvents={auditEvents}
              dbAudit={dbAudit}
              onNotify={notify}
            />
          )}

          {activeNav === 'Administration' && (
            <AdminPage
              currentUser={currentUser}
              connectors={connectors}
              onOpenAddConnector={() => setShowAddConnector(true)}
              killSwitchActive={killSwitchActive}
              onToggleKillSwitch={() => {
                setKillSwitchActive(!killSwitchActive)
                notify(!killSwitchActive ? 'Arrêt d’urgence ACTIVÉ !' : 'Arrêt d’urgence levé. Plateforme réactivée.')
              }}
              onNotify={notify}
            />
          )}

          {activeNav === 'Livraisons' && (
            <EvolutionPage />
          )}
        </div>
      </main>

      {/* MODALE D'ASSISTANT DE LANCEMENT */}
      {showLauncher && (
        <LaunchDialog
          step={launchStep}
          setStep={setLaunchStep}
          connectors={connectors}
          dbProjects={dbProjects}
          dbAssets={dbAssets}
          onClose={() => {
            setShowLauncher(false)
            setLaunchStep(1)
          }}
          onLaunch={launch}
        />
      )}

      {/* MODALE D'IMPORT DE SCRIPT */}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} onNotify={notify} />}

      {/* MODALE D'AJOUT D'UN NOUVEAU CONNECTEUR / OUTIL DE TEST */}
      {showAddConnector && (
        <AddConnectorDialog
          onClose={() => setShowAddConnector(false)}
          onAdd={(newConn) => {
            setConnectors((prev) => [...prev, newConn])
            notify(`Connecteur « ${newConn.name} » ajouté avec succès.`)
            setShowAddConnector(false)
          }}
        />
      )}

      {/* MODALE DE CRÉATION D'UN NOUVEAU PROJET */}
      {showNewProject && (
        <NewProjectDialog
          currentUser={currentUser}
          backendOnline={backendStatus.online}
          onClose={() => setShowNewProject(false)}
          onCreated={(createdProject) => {
            setDbProjects((prev) => [createdProject, ...prev])
            setProject(createdProject.name)
            notify(`Projet « ${createdProject.name} » créé avec succès et sélectionné !`)
            setShowNewProject(false)
          }}
          onNotify={notify}
        />
      )}

      {/* TIROIR DÉTAILLÉ DE L'EXÉCUTION */}
      {selectedRun && (
        <RunDrawer
          run={selectedRun}
          currentUser={currentUser}
          onClose={() => setSelectedRun(null)}
          onValidate={handleValidateRun}
          onNotify={notify}
        />
      )}

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="toast">
          <CheckCircle2 />
          {toast}
        </div>
      )}
    </div>
  )
}
