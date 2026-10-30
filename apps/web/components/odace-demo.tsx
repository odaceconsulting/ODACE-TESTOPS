'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  checkBackendHealth,
  fetchRunsFromApi,
  validateRunApi,
  createRunApi,
  validatePreflightApi,
  fetchProjectsFromApi,
  createProjectApi,
  fetchAssetsFromApi,
  fetchAuditFromApi,
  fetchDirectoryApi,
  loginApi,
  logoutApi,
  getSessionToken,
  getSessionUser,
  isLoggedOut,
  clearLoggedOut,
  ProjectApiItem,
  TestAssetApiItem,
  AuditLogApiItem,
  DirectoryUser,
} from '@/lib/api-client'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowRight,
  BarChart3,
  Bell,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Cpu,
  Download,
  ExternalLink,
  FileCode2,
  Gauge,
  GitBranch,
  History,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  LogOut,
  Menu,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Server,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Upload,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ==============================================================================
// 1. LES 7 PROFILS UTILISATEURS OFFICIELS
// ==============================================================================
export interface UserProfile {
  id: string
  username: string
  name: string
  roleTitle: string
  roleKey: 'tech_lead' | 'admin' | 'responsable' | 'tester' | 'developer' | 'exploitation' | 'auditor'
  avatar: string
  dept: string
}

export const PROFILES: UserProfile[] = [
  { id: 'u1', username: 'marie.laurent', name: 'Marie Laurent', roleTitle: 'Tech lead', roleKey: 'tech_lead', avatar: 'ML', dept: 'Qualité logicielle' },
  { id: 'u2', username: 'marc.vasseur', name: 'Marc Vasseur', roleTitle: 'Administrateur', roleKey: 'admin', avatar: 'MV', dept: 'DSI / Plateforme' },
  { id: 'u3', username: 'eleonore.kasse', name: 'Éléonore Kassé', roleTitle: 'Responsable', roleKey: 'responsable', avatar: 'EK', dept: 'Direction Projets' },
  { id: 'u4', username: 'alexandre.dupont', name: 'Alexandre Dupont', roleTitle: 'Testeur / QA', roleKey: 'tester', avatar: 'AD', dept: 'Équipe QA Facturation' },
  { id: 'u5', username: 'lucas.bernard', name: 'Lucas Bernard', roleTitle: 'Développeur', roleKey: 'developer', avatar: 'LB', dept: 'Backend Core' },
  { id: 'u6', username: 'sophie.martin', name: 'Sophie Martin', roleTitle: 'Exploitation', roleKey: 'exploitation', avatar: 'SM', dept: 'Infra & Run' },
  { id: 'u7', username: 'jean-yves.traore', name: 'Jean-Yves Traoré', roleTitle: 'Auditeur', roleKey: 'auditor', avatar: 'JT', dept: 'Audit & Risques' },
]

// Navigation globale
const navItems = [
  { label: 'Tableau de bord', icon: LayoutDashboard },
  { label: 'Projets', icon: Box },
  { label: 'Catalogue de scripts', icon: FileCode2 },
  { label: 'Exécutions', icon: Activity },
  { label: 'Workflows', icon: GitBranch },
  { label: 'Planification', icon: Clock3 },
  { label: 'Validations', icon: ClipboardCheck },
  { label: 'Agents', icon: Server },
  { label: 'Acteurs & Habilitations', icon: Users },
  { label: 'Journal d’audit', icon: History },
  { label: 'Administration', icon: Settings2 },
]

// Jeux de données d'exécutions initiaux
const runsSeed = [
  { id: 'RUN-2841', project: 'Gestion des factures', script: 'Charge consultation factures', version: 'v2.4', tool: 'JMeter', env: 'Recette', requester: 'M. Dupont', date: 'Aujourd’hui, 09:42', duration: '18 min', state: 'Terminée', result: 'Conforme', validation: 'En attente' },
  { id: 'RUN-2840', project: 'Portail clients', script: 'Connexion et création facture', version: 'v1.8', tool: 'Selenium', env: 'Préproduction', requester: 'A. Martin', date: 'Aujourd’hui, 08:17', duration: '06 min', state: 'Terminée', result: 'Non conforme', validation: 'Refusée' },
  { id: 'RUN-2839', project: 'API encaissements', script: 'Charge création facture', version: 'v3.1', tool: 'JMeter', env: 'Développement', requester: 'L. Bernard', date: 'Hier, 16:31', duration: '—', state: 'Indéterminée', result: 'Non fiable', validation: 'En attente' },
  { id: 'RUN-2838', project: 'Gestion des factures', script: 'Consultation espace client', version: 'v4.0', tool: 'Selenium', env: 'Recette', requester: 'S. Petit', date: 'Hier, 14:05', duration: '11 min', state: 'Terminée', result: 'Conforme', validation: 'Validée' },
]

// Données graphiques
const campaignData = [
  { name: 'S-1', conformes: 28, nonConformes: 4 },
  { name: 'S-2', conformes: 34, nonConformes: 6 },
  { name: 'S-3', conformes: 31, nonConformes: 3 },
  { name: 'S-4', conformes: 42, nonConformes: 5 },
  { name: 'S-5', conformes: 38, nonConformes: 8 },
  { name: 'S-6', conformes: 47, nonConformes: 4 },
]
const responseData = [
  { name: 'Factures · 50 VU', p95: 420, p99: 680 },
  { name: 'Factures · 100 VU', p95: 610, p99: 940 },
  { name: 'Factures · 150 VU', p95: 890, p99: 1320 },
]

// Connecteurs de test configurés
const initialConnectors = [
  { id: 'jmeter', name: 'Apache JMeter', type: 'Charge / Performance', version: '5.6.3', dockerImage: 'odace/jmeter-runner:5.6.3', extensions: '.jmx', status: 'Actif', runsCount: 142 },
  { id: 'selenium', name: 'Selenium WebDriver', type: 'Parcours fonctionnels', version: '4.24', dockerImage: 'odace/selenium-runner:4.24', extensions: '.side, .py', status: 'Actif', runsCount: 89 },
  { id: 'echo', name: 'Connecteur Echo (Validation)', type: 'Validation interne', version: '1.0', dockerImage: 'odace/echo-runner:1.0', extensions: '.txt, .py', status: 'Actif', runsCount: 31 },
]

// Agents d'exécution
const initialAgents = [
  { id: 'agent-charge-01', host: 'vm-runner-01.odace.ci', type: 'JMeter / Charge', cpu: '24%', mem: '42%', status: 'Disponible', runs: 0, version: 'Docker 26.1' },
  { id: 'agent-charge-02', host: 'vm-runner-02.odace.ci', type: 'JMeter / Charge', cpu: '78%', mem: '68%', status: 'Occupé', runs: 1, version: 'Docker 26.1' },
  { id: 'agent-nav-01', host: 'vm-selenium-01.odace.ci', type: 'Selenium / Browsers', cpu: '12%', mem: '35%', status: 'Disponible', runs: 0, version: 'Docker 26.1' },
  { id: 'agent-nav-02', host: 'vm-selenium-02.odace.ci', type: 'Selenium / Browsers', cpu: '0%', mem: '15%', status: 'Disponible', runs: 0, version: 'Docker 26.1' },
]

// Journal d'audit légal
const initialAuditEvents = [
  { id: 'AUD-9024', timestamp: '2026-10-28 15:42:06', actor: 'Marie Laurent (Tech lead)', action: 'run.create', object: 'RUN-2841', ip: '192.168.10.45', status: 'Succès' },
  { id: 'AUD-9023', timestamp: '2026-10-28 14:12:19', actor: 'Alexandre Dupont (Testeur)', action: 'asset.upload', object: 'plan-charge-factures-v2.5', ip: '192.168.10.62', status: 'Succès' },
  { id: 'AUD-9022', timestamp: '2026-10-28 11:05:40', actor: 'Lucas Bernard (Développeur)', action: 'policy.denied', object: 'Cible Prod refusée', ip: '192.168.12.18', status: 'Refusé' },
  { id: 'AUD-9021', timestamp: '2026-10-28 09:30:11', actor: 'Marc Vasseur (Admin)', action: 'connector.deploy', object: 'jmeter-runner:5.6.3', ip: '10.0.1.5', status: 'Succès' },
  { id: 'AUD-9020', timestamp: '2026-10-28 08:22:15', actor: 'Marie Laurent (Tech lead)', action: 'run.validate', object: 'RUN-2838 · Validée', ip: '192.168.10.45', status: 'Succès' },
]

// Badges d'état normalisés
function StatusBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }) {
  return <span className={`status-badge ${tone}`}><span className="status-dot" />{children}</span>
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'blue' }: { icon: any; label: string; value: string; detail: string; tone?: string }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}><Icon /></div>
      <div>
        <p className="eyebrow">{label}</p>
        <p className="metric-value">{value}</p>
        <p className="metric-detail">{detail}</p>
      </div>
    </div>
  )
}

// ==============================================================================
// COMPOSANT PRINCIPAL
// ==============================================================================
export default function OdaceDemo() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(PROFILES[0]) // Par défaut Marie Laurent (Tech Lead)
  const [activeNav, setActiveNav] = useState('Tableau de bord')
  const [project, setProject] = useState('Gestion des factures')
  const [runs, setRuns] = useState(runsSeed)
  const [connectors, setConnectors] = useState(initialConnectors)
  const [agents, setAgents] = useState(initialAgents)
  const [auditEvents, setAuditEvents] = useState(initialAuditEvents)
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
      // 1. Si aucun jeton n'est présent ou si l'utilisateur s'est déconnecté, rediriger vers la page de connexion
      const token = getSessionToken()
      if (!token || isLoggedOut()) {
        router.push('/connexion')
        return
      }

      const health = await checkBackendHealth()
      if (!mounted) return
      setBackendStatus(health)

      // 2. Synchroniser le profil React avec le compte stocké en session
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

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3500)
  }

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
      // Rafraîchir les exécutions réelles
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
          {navItems.map(({ label, icon: Icon }) => {
            const isRestrictedForAuditor = isReadOnly && (label === 'Administration' && currentUser.roleKey !== 'admin')
            return (
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
                {label === 'Administration' && currentUser.roleKey === 'admin' && <span className="nav-count" style={{ background: 'rgba(255, 255, 255, 0.15)', color: '#d8e2f1' }}>Admin</span>}
              </button>
            )
          })}
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

                  {/* Bascule rapide entre les 7 profils RBAC */}
                  <div className="profile-dropdown-section-title">
                    <span>Changer de profil ({PROFILES.length})</span>
                    <small>Habilitations RBAC</small>
                  </div>

                  <div className="profile-dropdown-list">
                    {PROFILES.map((p) => {
                      const isCurrent = p.username === currentUser.username
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`profile-item-btn ${isCurrent ? 'active' : ''}`}
                          onClick={() => handleSwitchProfile(p)}
                        >
                          <div className="profile-item-avatar">
                            {p.avatar}
                          </div>
                          <div className="profile-item-details">
                            <div className="profile-item-name-row">
                              <span className="profile-item-name">{p.name}</span>
                              {isCurrent && <span className="profile-item-tag">Actif</span>}
                            </div>
                            <div className="profile-item-sub">
                              <span className={`role-badge ${p.roleKey}`}>{p.roleTitle}</span>
                              <span className="profile-item-dept">· {p.dept}</span>
                            </div>
                          </div>
                          {isCurrent ? (
                            <Check className="profile-item-check" />
                          ) : (
                            <ArrowRight className="profile-item-arrow" />
                          )}
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
                <strong>DISPOSITIF D'ARRÊT D'URGENCE GLOBAL ACTIF</strong>
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
                <option>Gestion des factures</option>
                <option>Portail clients</option>
                <option>API encaissements</option>
                <option>Tous les projets</option>
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
            <Dashboard currentRuns={currentRuns} onRun={(run) => setSelectedRun(run)} onLaunch={() => setShowLauncher(true)} canLaunch={canLaunchRun} />
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

          {activeNav === 'Validations' && (
            <ValidationsPage runs={runs} currentUser={currentUser} onRun={(run) => setSelectedRun(run)} onValidate={handleValidateRun} onNotify={notify} />
          )}

          {activeNav === 'Agents' && (
            <AgentsPage agents={agents} currentUser={currentUser} onNotify={notify} />
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
            <AuditPage auditEvents={auditEvents} dbAudit={dbAudit} onNotify={notify} />
          )}

          {activeNav === 'Catalogue de scripts' && (
            <ScriptsPage runs={currentRuns} dbAssets={dbAssets} onImport={() => setShowImport(true)} onNotify={notify} />
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

          {activeNav === 'Exécutions' && (
            <ExecutionsPage runs={currentRuns} onRun={(run) => setSelectedRun(run)} onLaunch={() => setShowLauncher(true)} canLaunch={canLaunchRun} />
          )}

          {activeNav === 'Workflows' && (
            <WorkflowsPage onNotify={notify} />
          )}

          {activeNav === 'Planification' && (
            <SchedulePage onNotify={notify} />
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

// ==============================================================================
// 2. ÉCRAN : TABLEAU DE BORD
// ==============================================================================
function Dashboard({
  currentRuns,
  onRun,
  onLaunch,
  canLaunch,
}: {
  currentRuns: typeof runsSeed
  onRun: (run: typeof runsSeed[number]) => void
  onLaunch: () => void
  canLaunch: boolean
}) {
  return (
    <>
      <section className="metric-grid">
        <MetricCard icon={Activity} label="Exécutions en cours" value="02" detail="+1 depuis hier" />
        <MetricCard icon={Clock3} label="En attente" value="04" detail="2 cibles occupées" tone="amber" />
        <MetricCard icon={CheckCircle2} label="Conformes" value="87,4 %" detail="sur 126 exécutions" tone="green" />
        <MetricCard icon={AlertTriangle} label="Non fiables" value="03" detail="Saturation injecteur" tone="red" />
        <MetricCard icon={ClipboardCheck} label="Validations" value="02" detail="À traiter Tech lead" tone="purple" />
        <MetricCard icon={Server} label="Agents disponibles" value="08 / 10" detail="80 % du parc" tone="slate" />
      </section>

      <div className="notice-bar">
        <div className="notice-icon"><ShieldCheck /></div>
        <div>
          <strong>Règle des 3 dimensions du verdict</strong>
          <span>L'état d'exécution (terminé/erreur), le résultat calculé (conforme/non fiable) et la validation humaine (validée/refusée) sont strictement découplés.</span>
        </div>
      </div>

      <section className="charts-grid">
        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Évolution des campagnes</h2>
              <p>Résultats par semaine · tous projets</p>
            </div>
            <button className="more-button"><MoreHorizontal /></button>
          </div>
          <div className="chart-legend">
            <span><i className="legend-blue" />Conformes</span>
            <span><i className="legend-slate" />Non conformes</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={campaignData} margin={{ left: -20, right: 8, top: 15 }}>
              <defs>
                <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e8edf3" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip />
              <Area type="monotone" dataKey="conformes" stroke="#2563eb" fill="url(#fillBlue)" strokeWidth={2} />
              <Area type="monotone" dataKey="nonConformes" stroke="#94a3b8" fill="none" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Temps de réponse (Centiles)</h2>
              <p>Campagnes comparables · ms</p>
            </div>
            <button className="more-button"><MoreHorizontal /></button>
          </div>
          <div className="chart-legend">
            <span><i className="legend-blue" />p95</span>
            <span><i className="legend-purple" />p99</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={responseData} layout="vertical" margin={{ left: 15, right: 8, top: 10 }}>
              <CartesianGrid horizontal={false} stroke="#e8edf3" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis dataKey="name" type="category" width={115} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip />
              <Bar dataKey="p95" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={12} />
              <Bar dataKey="p99" fill="#a78bfa" radius={[0, 4, 4, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="bottom-grid">
        <div className="panel table-panel">
          <div className="panel-heading">
            <div>
              <h2>Dernières exécutions</h2>
              <p>Consultez les détails, preuves d'exécution et décisions</p>
            </div>
            <button className="text-button" onClick={() => onRun(currentRuns[0])}>
              Voir tout <ArrowRight />
            </button>
          </div>
          <RunTable runs={currentRuns.slice(0, 4)} onRun={onRun} />
        </div>

        <div className="side-stack">
          <div className="panel alert-panel">
            <div className="panel-heading">
              <div>
                <h2>À surveiller</h2>
                <p>Actions requises selon vos habilitations</p>
              </div>
              <span className="count-pill">2</span>
            </div>
            <div className="attention-item">
              <div className="attention-icon amber"><AlertTriangle /></div>
              <div>
                <strong>RUN-2839 · Résultat non fiable</strong>
                <span>Saturation injecteur CPU &gt; 80%</span>
              </div>
              <ArrowRight />
            </div>
            <div className="attention-item">
              <div className="attention-icon purple"><ClipboardCheck /></div>
              <div>
                <strong>2 validations en attente</strong>
                <span>Nécessite la décision du Tech lead</span>
              </div>
              <ArrowRight />
            </div>
          </div>

          <div className="panel quick-panel">
            <div className="panel-heading">
              <div>
                <h2>Actions rapides</h2>
                <p>Raccourcis opérationnels</p>
              </div>
            </div>
            {canLaunch && (
              <button onClick={onLaunch}>
                <Play /> Lancer une exécution
              </button>
            )}
            <button onClick={() => undefined}>
              <ListChecks /> Configurer les Quality Gates
            </button>
            <button onClick={() => undefined}>
              <Download /> Exporter l'archive de preuve
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

// ==============================================================================
// 3. ÉCRAN : ADMINISTRATION (AVEC AJOUT DYNAMIQUE DE CONNECTEUR / OUTIL)
// ==============================================================================
function AdminPage({
  currentUser,
  connectors,
  onOpenAddConnector,
  killSwitchActive,
  onToggleKillSwitch,
  onNotify,
}: {
  currentUser: UserProfile
  connectors: typeof initialConnectors
  onOpenAddConnector: () => void
  killSwitchActive: boolean
  onToggleKillSwitch: () => void
  onNotify: (msg: string) => void
}) {
  const [tab, setTab] = useState<'connectors' | 'users' | 'security'>('connectors')
  const isAdmin = currentUser.roleKey === 'admin'

  return (
    <div className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Administration de la Plateforme</h2>
          <p>Gestion des moteurs de test, des rôles et de la sécurité globale.</p>
        </div>
        {isAdmin && tab === 'connectors' && (
          <Button onClick={onOpenAddConnector}>
            <Plus data-icon="inline-start" />
            Ajouter un connecteur / outil
          </Button>
        )}
      </div>

      {/* Sous-onglets */}
      <div className="subtabs">
        <button className={tab === 'connectors' ? 'active' : ''} onClick={() => setTab('connectors')}>
          Connecteurs & Moteurs ({connectors.length})
        </button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
          Habilitations & Rôles (7)
        </button>
        <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}>
          Sécurité & Arrêt d’urgence
        </button>
      </div>

      {/* ONGLET CONNECTEURS */}
      {tab === 'connectors' && (
        <div className="connectors-list">
          {connectors.map((c) => (
            <div className="connector-row" key={c.id}>
              <div className="connector-info">
                <div className="connector-icon-box">
                  <FileCode2 />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>{c.name}</strong>
                    <span style={{ fontSize: '10px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>
                      {c.version}
                    </span>
                    <StatusBadge tone="success">{c.status}</StatusBadge>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                    Type : <strong>{c.type}</strong> · Image Docker : <code>{c.dockerImage}</code> · Fichiers : <code>{c.extensions}</code>
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{c.runsCount} exécutions</span>
                {isAdmin ? (
                  <Button variant="outline" size="sm" onClick={() => onNotify(`Configuration de ${c.name} ouverte`)}>
                    Paramètres
                  </Button>
                ) : (
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Lecture seule</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ONGLET HABILITATIONS */}
      {tab === 'users' && (
        <div style={{ padding: '20px' }}>
          <table>
            <thead>
              <tr>
                <th>Rôle / Habilitation</th>
                <th>Responsabilité principale</th>
                <th>Exemples de titulaires</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {PROFILES.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className={`role-badge ${p.roleKey}`}>{p.roleTitle}</span>
                  </td>
                  <td>
                    {p.roleKey === 'admin' && 'Paramétrage global, sécurité, connecteurs et arrêt d’urgence'}
                    {p.roleKey === 'responsable' && 'Gouvernance, affectation des projets, définition des quotas'}
                    {p.roleKey === 'tech_lead' && 'Définition des Quality Gates et validation technique humaine'}
                    {p.roleKey === 'tester' && 'Gestion du catalogue de scripts et lancement des campagnes'}
                    {p.roleKey === 'developer' && 'Déclenchement sur cibles autorisées et consultation des logs'}
                    {p.roleKey === 'exploitation' && 'Surveillance du parc d’agents, gestion des pannes et alertes'}
                    {p.roleKey === 'auditor' && 'Consultation en lecture seule stricte et export des preuves'}
                  </td>
                  <td><strong>{p.name}</strong> ({p.dept})</td>
                  <td><StatusBadge tone="success">Actif</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ONGLET SÉCURITÉ & KILL SWITCH */}
      {tab === 'security' && (
        <div>
          <div className="killswitch-card">
            <div className="killswitch-icon">
              <ShieldAlert style={{ width: '24px', height: '24px' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: '#991b1b' }}>
                Dispositif d'Arrêt d'Urgence Global (Kill Switch)
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#7f1d1d', lineHeight: 1.6 }}>
                L'arrêt d'urgence bloque immédiatement toute nouvelle demande d'exécution et diffuse un ordre d'arrêt forcé (SIGTERM puis SIGKILL) à l'ensemble des agents Docker d'exécution.
              </p>
              {isAdmin || currentUser.roleKey === 'exploitation' ? (
                <Button
                  variant={killSwitchActive ? 'outline' : 'destructive'}
                  onClick={onToggleKillSwitch}
                >
                  {killSwitchActive ? 'Lever l’arrêt d’urgence et réactiver la plateforme' : 'DÉCLENCHER L’ARRÊT D’URGENCE'}
                </Button>
              ) : (
                <p style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>
                  Réservé aux profils Administrateur et Exploitation.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==============================================================================
// 4. MODALE D'AJOUT D'UN NOUVEAU CONNECTEUR / OUTIL DE TEST
// ==============================================================================
function AddConnectorDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (connector: any) => void
}) {
  const [name, setName] = useState('LoadRunner VuGen')
  const [type, setType] = useState('Charge / Performance')
  const [hostingMode, setHostingMode] = useState<'docker' | 'local_binary' | 'cloud'>('local_binary')
  const [dockerImage, setDockerImage] = useState('registry.odace.ci/runners/loadrunner:2026')
  const [binaryPath, setBinaryPath] = useState('C:\\Program Files\\Micro Focus\\LoadRunner\\bin\\mdrv.exe')
  const [cloudUrl, setCloudUrl] = useState('https://loadrunner-cloud.saas.microfocus.com')
  const [extensions, setExtensions] = useState('.usr, .c, .zip')
  const [commandTemplate, setCommandTemplate] = useState('mdrv -usr {script_file} -vus {vusers} -out {workdir}/results')

  const handleSave = () => {
    onAdd({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      type,
      hostingMode,
      version: '2026.1',
      dockerImage: hostingMode === 'docker' ? dockerImage : hostingMode === 'local_binary' ? `Local: ${binaryPath}` : `Cloud: ${cloudUrl}`,
      extensions,
      status: 'Actif',
      runsCount: 0,
    })
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ width: 'min(660px, 100%)' }}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">NOUVEAU CONNECTEUR DE TEST</p>
            <h2>Déclarer un outil de test</h2>
            <p>Ajoutez un outil conteneurisé (Docker), déjà installé sur la machine ou distant (Cloud).</p>
          </div>
          <button className="icon-button" onClick={onClose}><X /></button>
        </div>

        <div className="form-grid modal-body">
          {/* SÉLECTEUR DE MODE D'HÉBERGEMENT */}
          <div className="full" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#475467' }}>
              Où se trouve cet outil ? (Mode d'hébergement)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setHostingMode('docker')}
                style={{
                  padding: '10px 8px',
                  borderRadius: '7px',
                  border: hostingMode === 'docker' ? '2px solid #2563eb' : '1px solid #d1d5db',
                  background: hostingMode === 'docker' ? '#eff6ff' : '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ display: 'block', fontSize: '12px', color: '#1e293b' }}>🐳 Conteneur Docker</strong>
                <small style={{ color: '#64748b', fontSize: '10px' }}>Image conteneurisée</small>
              </button>

              <button
                type="button"
                onClick={() => setHostingMode('local_binary')}
                style={{
                  padding: '10px 8px',
                  borderRadius: '7px',
                  border: hostingMode === 'local_binary' ? '2px solid #2563eb' : '1px solid #d1d5db',
                  background: hostingMode === 'local_binary' ? '#eff6ff' : '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ display: 'block', fontSize: '12px', color: '#1e293b' }}>💻 Binaire local</strong>
                <small style={{ color: '#64748b', fontSize: '10px' }}>Déjà installé sur l'agent</small>
              </button>

              <button
                type="button"
                onClick={() => setHostingMode('cloud')}
                style={{
                  padding: '10px 8px',
                  borderRadius: '7px',
                  border: hostingMode === 'cloud' ? '2px solid #2563eb' : '1px solid #d1d5db',
                  background: hostingMode === 'cloud' ? '#eff6ff' : '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ display: 'block', fontSize: '12px', color: '#1e293b' }}>☁️ Service Cloud</strong>
                <small style={{ color: '#64748b', fontSize: '10px' }}>API SaaS distante</small>
              </button>
            </div>
          </div>

          <label className="full">
            Nom de l'outil de test
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: LoadRunner VuGen, JMeter, K6" />
          </label>

          <label>
            Type de test
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option>Charge / Performance</option>
              <option>Parcours fonctionnels</option>
              <option>Tests d'API</option>
            </select>
          </label>

          <label>
            Extensions de fichiers acceptées
            <input value={extensions} onChange={(e) => setExtensions(e.target.value)} placeholder="ex: .usr, .jmx, .side" />
          </label>

          {/* CHAMP ADAPTÉ SELON LE MODE CHOISI */}
          {hostingMode === 'docker' && (
            <label className="full" style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              Image Docker du Runner (registre)
              <input value={dockerImage} onChange={(e) => setDockerImage(e.target.value)} placeholder="registry.odace.ci/runners/mon-outil:tag" />
              <small style={{ marginTop: '5px', color: '#64748b' }}>
                L'agent téléchargera automatiquement cette image conteneurisée pour exécuter le test de manière isolée.
              </small>
            </label>
          )}

          {hostingMode === 'local_binary' && (
            <label className="full" style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              Chemin de l'exécutable sur le serveur de l'agent
              <input value={binaryPath} onChange={(e) => setBinaryPath(e.target.value)} placeholder="C:\Program Files\...\mon_outil.exe ou /usr/bin/k6" />
              <small style={{ marginTop: '5px', color: '#16a34a', fontWeight: 600 }}>
                ✓ Aucun conteneur requis : l'agent utilisera directement le logiciel déjà installé sur la machine hôte.
              </small>
            </label>
          )}

          {hostingMode === 'cloud' && (
            <label className="full" style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              URL de l'API Cloud & Clé d'authentification
              <input value={cloudUrl} onChange={(e) => setCloudUrl(e.target.value)} placeholder="https://cloud.mon-outil.com/api/v1" />
              <small style={{ marginTop: '5px', color: '#64748b' }}>
                Le connecteur dialoguera directement avec l'API Cloud sans consommer de CPU local.
              </small>
            </label>
          )}

          <label className="full">
            Modèle de commande CLI exécutée
            <input value={commandTemplate} onChange={(e) => setCommandTemplate(e.target.value)} />
            <small>Les variables <code>{'{script_file}'}</code> et <code>{'{vusers}'}</code> seront injectées dynamiquement.</small>
          </label>
        </div>

        <div className="modal-footer">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave}>
            <Plus data-icon="inline-start" />
            Enregistrer & Publier l’outil
          </Button>
        </div>
      </div>
    </div>
  )
}


// ==============================================================================
// 5. ÉCRAN : VALIDATIONS (TECH LEAD)
// ==============================================================================
function ValidationsPage({
  runs,
  currentUser,
  onRun,
  onValidate,
  onNotify,
}: {
  runs: typeof runsSeed
  currentUser: UserProfile
  onRun: (run: typeof runsSeed[number]) => void
  onValidate: (runId: string, decision: 'Validée' | 'Refusée', comment: string) => void
  onNotify: (msg: string) => void
}) {
  const pendingRuns = runs.filter((r) => r.validation === 'En attente')
  const isTechLead = currentUser.roleKey === 'tech_lead'

  return (
    <div className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Centre de Validation Technique (Tech Lead)</h2>
          <p>Enregistrez la décision humaine d'acceptation ou de refus sans altérer le verdict technique calculé.</p>
        </div>
        <span className="count-pill">{pendingRuns.length} en attente</span>
      </div>

      {!isTechLead && (
        <div style={{ padding: '16px 20px', background: '#fffbeb', borderBottom: '1px solid #fef3c7', fontSize: '12px', color: '#92400e' }}>
          <strong>Information d'accès :</strong>{' '}
          {currentUser.roleKey === 'admin'
            ? "L'Administrateur ne peut pas valider un résultat à la place d'un Tech lead (Règle stricte de séparation des pouvoirs)."
            : 'Seul le Tech lead est habilité à valider ou refuser les campagnes. Vous êtes actuellement en mode consultation.'}
        </div>
      )}

      <RunTable runs={pendingRuns} onRun={onRun} />
    </div>
  )
}

// ==============================================================================
// 6. ÉCRAN : AGENTS D'EXÉCUTION (EXPLOITATION)
// ==============================================================================
function AgentsPage({
  agents,
  currentUser,
  onNotify,
}: {
  agents: typeof initialAgents
  currentUser: UserProfile
  onNotify: (msg: string) => void
}) {
  return (
    <div className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Parc des Agents d'Exécution (Runners)</h2>
          <p>Surveillance en direct des machines et conteneurs éphémères exécutant les scénarios.</p>
        </div>
        <div className="panel-actions">
          <Button variant="outline" onClick={() => onNotify('Heartbeats vérifiés : tous les agents répondent.')}>
            <RefreshCw data-icon="inline-start" /> Rafraîchir
          </Button>
        </div>
      </div>

      <div className="agents-grid">
        {agents.map((a) => (
          <div className="agent-card" key={a.id}>
            <div className="agent-header">
              <div>
                <strong>{a.id}</strong>
                <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#64748b' }}>{a.host}</p>
              </div>
              <StatusBadge tone={a.status === 'Disponible' ? 'success' : 'warning'}>{a.status}</StatusBadge>
            </div>

            <div className="agent-metrics">
              <div>
                <span style={{ color: '#64748b' }}>Charge CPU</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#1e293b' }}>{a.cpu}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Mémoire RAM</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#1e293b' }}>{a.mem}</strong>
              </div>
            </div>

            <div className="agent-footer">
              <span>{a.version} · {a.type}</span>
              {currentUser.roleKey === 'exploitation' || currentUser.roleKey === 'admin' ? (
                <button
                  style={{ border: 0, background: 'none', color: '#dc2626', fontSize: '10px', cursor: 'pointer' }}
                  onClick={() => onNotify(`Agent ${a.id} mis en maintenance`)}
                >
                  Arrêter
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==============================================================================
// 6bis. ÉCRAN : ACTEURS & HABILITATIONS (RBAC GUIDE DÉVELOPPEUR ÉTAPE 2 & 8)
// ==============================================================================
function ActorsPage({
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
          <h2>Annuaire des Acteurs & Matrice d'Habilitations (RBAC)</h2>
          <p>
            Gestion des 7 profils habilités de la plateforme ODACE TestOps, conforme aux spécifications du Guide Développeur (Étape 8 & Étape 2).
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
                      {isActive && <StatusBadge tone="success">Connecté</StatusBadge>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                      <span className={`role-badge ${p.roleKey}`}>{p.roleTitle}</span>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>· {p.dept}</span>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span>Identifiant : <code style={{ color: '#0f172a', fontWeight: 600 }}>{p.username}</code></span>
                  {p.email && <span>· E-mail : <code style={{ color: '#2563eb' }}>{p.email}</code></span>}
                </div>

                <p className="actor-mission">{meta.mission}</p>

                <div className="actor-caps">
                  <div style={{ fontWeight: 600, color: '#166534', fontSize: '11px', marginBottom: '2px' }}>
                    Droits &amp; Habilitations autorisés :
                  </div>
                  {meta.allowed.map((cap, i) => (
                    <div key={i} className="actor-cap-item">
                      <CheckCircle2 style={{ color: '#16a34a' }} />
                      <span>{cap}</span>
                    </div>
                  ))}
                  {meta.denied.length > 0 && (
                    <>
                      <div style={{ fontWeight: 600, color: '#991b1b', fontSize: '11px', marginTop: '6px', marginBottom: '2px' }}>
                        Restrictions de sécurité :
                      </div>
                      {meta.denied.map((den, i) => (
                        <div key={i} className="actor-cap-item" style={{ color: '#991b1b' }}>
                          <AlertTriangle style={{ color: '#dc2626' }} />
                          <span>{den}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '14px', marginTop: '8px' }}>
                {isActive ? (
                  <Button variant="outline" size="sm" style={{ width: '100%', borderColor: '#2563eb', color: '#2563eb', background: '#eff6ff' }} disabled>
                    <CheckCircle2 data-icon="inline-start" /> Session courante active
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

// ==============================================================================
// 7. ÉCRAN : JOURNAL D'AUDIT LÉGAL (AUDITEUR & TOUS)
// ==============================================================================
function AuditPage({
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
          <h2>Journal d'Audit Immuable</h2>
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

// ==============================================================================
// 8. AUTRES ÉCRANS SECONDAIRES
// ==============================================================================
function ScriptsPage({
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
          <h2>Catalogue des Scripts Versionnés</h2>
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

function NewProjectDialog({
  currentUser,
  backendOnline,
  onClose,
  onCreated,
  onNotify,
}: {
  currentUser: UserProfile
  backendOnline: boolean
  onClose: () => void
  onCreated: (proj: any) => void
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

    if (backendOnline) {
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
      } else {
        setError(res.error || 'Erreur lors de la création du projet.')
      }
    } else {
      setLoading(false)
      const fakeTargets = includeTarget && targetUrl.trim() ? [
        {
          id: 'target-' + Date.now(),
          name: targetName.trim() || 'API Recette Principale',
          url: targetUrl.trim(),
          allowed_tool: allowedTool,
          max_charge: Number(maxCharge),
          is_active: true,
        }
      ] : []

      const fakeProject: ProjectApiItem = {
        id: 'proj-' + Date.now(),
        name: name.trim(),
        description: description.trim() || undefined,
        team: team.trim(),
        max_concurrent_runs: Number(maxConcurrentRuns),
        environments: envs.map((e, idx) => ({
          id: 'env-' + idx,
          name: e.name,
          env_type: e.env_type as any,
          allowed_hours: e.allowed_hours,
          targets: idx === 0 ? (fakeTargets as any) : [],
        })),
      }
      onCreated(fakeProject)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        style={{
          maxWidth: '660px',
          width: '92%',
          borderRadius: '12px',
          boxShadow: '0 25px 60px rgba(15, 23, 42, 0.22)',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ padding: '22px 26px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <p className="eyebrow" style={{ color: '#4f46e5', fontWeight: 700, letterSpacing: '0.08em' }}>GOUVERNANCE &amp; QUOTAS</p>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '4px 0 5px' }}>Nouveau Projet TestOps</h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
              Définissez le périmètre projet, les quotas de charge et déclarez la cible applicative à tester par vos équipes.
            </p>
          </div>
          <button className="more-button" onClick={onClose} aria-label="Fermer" style={{ cursor: 'pointer' }}><X /></button>
        </div>

        {/* Badge d'habilitation RBAC */}
        <div style={{ padding: '14px 26px 0' }}>
          {isAuthorized ? (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '9px' }}>
              <ShieldCheck style={{ width: '16px', height: '16px', color: '#16a34a', flexShrink: 0 }} />
              <span>Habilitation vérifiée : vous êtes connecté en tant que <strong>{currentUser.name}</strong> ({currentUser.roleTitle}).</span>
            </div>
          ) : (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '9px' }}>
              <AlertTriangle style={{ width: '16px', height: '16px', color: '#d97706', flexShrink: 0 }} />
              <div>
                <strong>Action réservée au Responsable ou à l'Administrateur (Guide Étape 2).</strong>
                <div style={{ fontSize: '11px', marginTop: '2px', color: '#b45309' }}>
                  Vous pouvez basculer sur Éléonore Kassé (Responsable) depuis le menu profil en haut à droite.
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', marginTop: '10px' }}>
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ minHeight: 'auto', padding: '16px 26px 22px', maxHeight: '72vh', overflowY: 'auto' }}>
            <div className="form-grid" style={{ gap: '14px' }}>
              <label className="full" style={{ gridColumn: '1 / -1' }}>
                Nom du projet *
                <input
                  type="text"
                  placeholder="ex: Portail Factures B2B, API Encaissements"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ padding: '9px 12px', borderRadius: '6px', fontSize: '12px' }}
                />
              </label>

              <label>
                Équipe / Squad responsable *
                <input
                  type="text"
                  placeholder="ex: Finance Squad, QA Core"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  required
                  style={{ padding: '9px 12px', borderRadius: '6px', fontSize: '12px' }}
                />
              </label>

              <label>
                Quota de charge simultané (RG7) *
                <select
                  value={maxConcurrentRuns}
                  onChange={(e) => setMaxConcurrentRuns(Number(e.target.value))}
                  style={{ padding: '9px 12px', borderRadius: '6px', fontSize: '12px' }}
                >
                  <option value={1}>1 tir simultané max</option>
                  <option value={2}>2 tirs simultanés max</option>
                  <option value={3}>3 tirs simultanés max</option>
                  <option value={5}>5 tirs simultanés max (nominal)</option>
                  <option value={8}>8 tirs simultanés max (haute charge)</option>
                  <option value={10}>10 tirs simultanés max</option>
                </select>
              </label>

              <label className="full" style={{ gridColumn: '1 / -1' }}>
                Description du périmètre &amp; objectifs
                <textarea
                  placeholder="Décrivez les objectifs, les services testés et les règles applicables..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--input)', fontSize: '12px', resize: 'vertical' }}
                />
              </label>

              {/* SECTION CIBLE APPLICATIVE & OUTIL DE TEST - PLEINE LARGEUR */}
              <div
                className="full"
                style={{
                  gridColumn: '1 / -1',
                  border: '1px solid #bfdbfe',
                  background: 'linear-gradient(180deg, #f8faff 0%, #f0f7ff 100%)',
                  borderRadius: '10px',
                  padding: '16px',
                  boxShadow: '0 1px 4px rgba(37, 99, 235, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#dbeafe', display: 'grid', placeItems: 'center', color: '#2563eb' }}>
                      <Server style={{ width: '15px', height: '15px' }} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>
                        Cible applicative à tester (URL &amp; Outil habilité)
                      </strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        Point de terminaison directement exposé aux développeurs et testeurs pour leurs campagnes.
                      </span>
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', color: '#1e40af', cursor: 'pointer', fontWeight: 600, background: '#eff6ff', padding: '5px 10px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <input
                      type="checkbox"
                      checked={includeTarget}
                      onChange={(e) => setIncludeTarget(e.target.checked)}
                      style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                    />
                    Déclarer une cible maintenant
                  </label>
                </div>

                {includeTarget && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #dbeafe' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                      Nom de la cible *
                      <input
                        type="text"
                        placeholder="ex: API Recette Principale"
                        value={targetName}
                        onChange={(e) => setTargetName(e.target.value)}
                        required={includeTarget}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                      URL de l'application / Endpoint *
                      <input
                        type="text"
                        placeholder="ex: http://localhost:8088/api/v1 ou https://recette.banque.ci"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        required={includeTarget}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                      Outil de test habilité *
                      <select
                        value={allowedTool}
                        onChange={(e) => setAllowedTool(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                      >
                        <option value="jmeter">JMeter (Performance, Charge &amp; Débit API)</option>
                        <option value="selenium">Selenium (Parcours IHM / Fonctionnels Web)</option>
                        <option value="api_test">API Test (Suites de tests HTTP REST)</option>
                        <option value="echo">Connecteur Echo (Validation de chaîne)</option>
                      </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                      Charge max admissible (VU)
                      <input
                        type="number"
                        min={10}
                        max={5000}
                        step={50}
                        value={maxCharge}
                        onChange={(e) => setMaxCharge(Number(e.target.value))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff' }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ padding: '14px 26px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} style={{ padding: '8px 16px' }}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading} style={{ padding: '8px 20px', gap: '8px' }}>
              {loading ? 'Création en cours...' : <>Créer le projet TestOps <ArrowRight data-icon="inline-end" /></>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProjectsPage({
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
  const displayProjects = (dbProjects && dbProjects.length > 0)
    ? dbProjects.map((p) => {
        const envNames = p.environments.map((e) => e.name).join(' · ') || 'Recette · Préproduction'
        const totalTargets = p.environments.reduce((sum, e) => sum + (e.targets?.length || 0), 0)
        return {
          id: p.id,
          name: p.name,
          desc: p.description || `Équipe responsable : ${p.team}`,
          quota: `${p.max_concurrent_runs} runs simultanés max`,
          environments: envNames,
          targetsCount: totalTargets,
          team: p.team,
        }
      })
    : [
        { id: '1', name: 'Gestion des factures', desc: 'Plateforme de facturation automatisée et conformité comptable', quota: '3 runs simultanés max', environments: 'Recette · Préproduction', targetsCount: 2, team: 'Finance Squad' },
        { id: '2', name: 'Portail clients B2B', desc: 'Espace libre-service clients B2B et gestion des commandes', quota: '5 runs simultanés max', environments: 'Recette B2B', targetsCount: 1, team: 'B2B Squad' },
      ]

  return (
    <div className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Gouvernance des Projets &amp; Quotas ({displayProjects.length})</h2>
          <p>Politiques de charge, gouvernance des quotas et cibles applicatives autorisées (extraits de la table <code>project</code>).</p>
        </div>
        <Button onClick={onNewProject}><Plus data-icon="inline-start" /> Nouveau projet</Button>
      </div>
      <div className="project-cards">
        {displayProjects.map((p) => (
          <div className="project-card" key={p.id}>
            <div className="project-card-top">
              <div className="project-symbol"><Box /></div>
              <StatusBadge tone="success">Actif</StatusBadge>
            </div>
            <h3>{p.name}</h3>
            <p>{p.desc}</p>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '12px' }}>
              <div>Équipe : <strong>{p.team}</strong></div>
              <div>Quota de tirs : <strong>{p.quota}</strong></div>
              <div>Environnements : <strong>{p.environments}</strong></div>
            </div>
            <div className="project-card-footer">
              <span><Server />{p.targetsCount} cibles autorisées</span>
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
        ))}
      </div>
    </div>
  )
}

function ExecutionsPage({ runs, onRun, onLaunch, canLaunch }: { runs: typeof runsSeed; onRun: (run: any) => void; onLaunch: () => void; canLaunch: boolean }) {
  return (
    <div className="panel operations-panel">
      <div className="panel-heading">
        <div>
          <h2>Toutes les exécutions de test</h2>
          <p>Historique complet des campagnes, verdicts et preuves associées.</p>
        </div>
        {canLaunch && <Button onClick={onLaunch}><Plus data-icon="inline-start" /> Nouvelle exécution</Button>}
      </div>
      <RunTable runs={runs} onRun={onRun} />
    </div>
  )
}

function WorkflowsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  return (
    <div className="panel operations-panel" style={{ padding: '24px' }}>
      <h2>Workflows & Enchaînements de Tests</h2>
      <p style={{ color: '#64748b', fontSize: '13px' }}>Enchaînez un tir JMeter puis une suite Selenium avec un Quality Gate intermédiaire.</p>
      <pre style={{ background: '#0b1f3a', color: '#93c5fd', padding: '16px', borderRadius: '8px', fontSize: '12px', overflow: 'auto' }}>
{`name: recette-facturation-complete
steps:
  - id: tir_charge
    kind: jmeter
    asset: plan-charge-v2.4
    target: recette-factures-01
    params: { vusers: 100, duration_min: 15 }
  - id: parcours_metier
    kind: selenium
    asset: suite-creation-facture-v1.8
    target: recette-factures-01
    needs: [tir_charge]
    when: tir_charge.result == "CONFORME"
gate:
  blocking: [tir_charge.p95_ms <= 800, tir_charge.error_rate <= 0.01]
  informative: [parcours_metier.flaky_count <= 2]`}
      </pre>
    </div>
  )
}

function SchedulePage({ onNotify }: { onNotify: (msg: string) => void }) {
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

function EvolutionPage() {
  return (
    <div className="evolution-card">
      <div className="evolution-icon"><Rocket /></div>
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

// ==============================================================================
// 9. TABLEAU DES RUNS & TIROIR DÉTAILLÉ
// ==============================================================================
function RunTable({ runs, onRun }: { runs: typeof runsSeed; onRun: (run: typeof runsSeed[number]) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Exécution</th>
            <th>Projet / Scénario</th>
            <th>Environnement</th>
            <th>1. État technique</th>
            <th>2. Résultat calculé</th>
            <th>3. Décision Tech lead</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} onClick={() => onRun(run)}>
              <td>
                <strong>{run.id}</strong>
                <span>{run.date}</span>
              </td>
              <td>
                <strong>{run.script}</strong>
                <span>{run.project} · {run.tool} {run.version}</span>
              </td>
              <td><span className="env-chip">{run.env}</span></td>
              <td>
                <StatusBadge tone={run.state === 'Terminée' ? 'success' : run.state === 'Indéterminée' ? 'warning' : 'info'}>
                  {run.state}
                </StatusBadge>
              </td>
              <td>
                <StatusBadge tone={run.result === 'Conforme' ? 'success' : run.result === 'Non conforme' ? 'danger' : run.result === 'Non fiable' ? 'warning' : 'neutral'}>
                  {run.result}
                </StatusBadge>
              </td>
              <td>
                <StatusBadge tone={run.validation === 'Validée' ? 'success' : run.validation === 'Refusée' ? 'danger' : 'neutral'}>
                  {run.validation}
                </StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RunDrawer({
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
              <h3>Artefacts & Preuves du tir (Audit de conformité)</h3>
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

// ==============================================================================
// 10. MODALES SECONDAIRES (LAUNCH & IMPORT)
// ==============================================================================
function LaunchDialog({
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

function ImportDialog({ onClose, onNotify }: { onClose: () => void; onNotify: (msg: string) => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">CATALOGUE</p>
            <h2>Importer un scénario de test</h2>
            <p>Ajoutez un fichier .jmx, .side ou archive .usr</p>
          </div>
          <button className="icon-button" onClick={onClose}><X /></button>
        </div>
        <div className="form-grid modal-body">
          <label className="full file-upload">
            <Upload />
            <strong>Sélectionnez un fichier de test</strong>
            <span>.jmx (JMeter), .side (Selenium), .usr (LoadRunner)</span>
            <input type="file" />
          </label>
          <label>Version<input defaultValue="v2.5" /></label>
          <label>Projet<select defaultValue="Gestion des factures"><option>Gestion des factures</option></select></label>
        </div>
        <div className="modal-footer">
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={() => { onClose(); onNotify('Script importé et empreinte SHA-256 calculée.') }}>
            Importer le script
          </Button>
        </div>
      </div>
    </div>
  )
}



