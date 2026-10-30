import React from 'react'
import {
  Activity,
  Box,
  ClipboardCheck,
  Clock3,
  FileCode2,
  GitBranch,
  History,
  LayoutDashboard,
  Server,
  Settings2,
  Users,
} from 'lucide-react'

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

export const navItems = [
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

export const runsSeed = [
  { id: 'RUN-2841', project: 'Gestion des factures', script: 'Charge consultation factures', version: 'v2.4', tool: 'JMeter', env: 'Recette', requester: 'M. Dupont', date: 'Aujourd’hui, 09:42', duration: '18 min', state: 'Terminée', result: 'Conforme', validation: 'En attente' },
  { id: 'RUN-2840', project: 'Portail clients', script: 'Connexion et création facture', version: 'v1.8', tool: 'Selenium', env: 'Préproduction', requester: 'A. Martin', date: 'Aujourd’hui, 08:17', duration: '06 min', state: 'Terminée', result: 'Non conforme', validation: 'Refusée' },
  { id: 'RUN-2839', project: 'API encaissements', script: 'Charge création facture', version: 'v3.1', tool: 'JMeter', env: 'Développement', requester: 'L. Bernard', date: 'Hier, 16:31', duration: '—', state: 'Indéterminée', result: 'Non fiable', validation: 'En attente' },
  { id: 'RUN-2838', project: 'Gestion des factures', script: 'Consultation espace client', version: 'v4.0', tool: 'Selenium', env: 'Recette', requester: 'S. Petit', date: 'Hier, 14:05', duration: '11 min', state: 'Terminée', result: 'Conforme', validation: 'Validée' },
]

export const campaignData = [
  { name: 'S-1', conformes: 28, nonConformes: 4 },
  { name: 'S-2', conformes: 34, nonConformes: 6 },
  { name: 'S-3', conformes: 31, nonConformes: 3 },
  { name: 'S-4', conformes: 42, nonConformes: 5 },
  { name: 'S-5', conformes: 38, nonConformes: 8 },
  { name: 'S-6', conformes: 47, nonConformes: 4 },
]

export const responseData = [
  { name: 'Factures · 50 VU', p95: 420, p99: 680 },
  { name: 'Factures · 100 VU', p95: 610, p99: 940 },
  { name: 'Factures · 150 VU', p95: 890, p99: 1320 },
]

export const initialConnectors = [
  { id: 'jmeter', name: 'Apache JMeter', type: 'Charge / Performance', version: '5.6.3', dockerImage: 'odace/jmeter-runner:5.6.3', extensions: '.jmx', status: 'Actif', runsCount: 142 },
  { id: 'selenium', name: 'Selenium WebDriver', type: 'Parcours fonctionnels', version: '4.24', dockerImage: 'odace/selenium-runner:4.24', extensions: '.side, .py', status: 'Actif', runsCount: 89 },
  { id: 'echo', name: 'Connecteur Echo (Validation)', type: 'Validation interne', version: '1.0', dockerImage: 'odace/echo-runner:1.0', extensions: '.txt, .py', status: 'Actif', runsCount: 31 },
]

export const initialAgents = [
  { id: 'agent-charge-01', host: 'vm-runner-01.odace.ci', type: 'JMeter / Charge', cpu: '24%', mem: '42%', status: 'Disponible', runs: 0, version: 'Docker 26.1' },
  { id: 'agent-charge-02', host: 'vm-runner-02.odace.ci', type: 'JMeter / Charge', cpu: '78%', mem: '68%', status: 'Occupé', runs: 1, version: 'Docker 26.1' },
  { id: 'agent-nav-01', host: 'vm-selenium-01.odace.ci', type: 'Selenium / Browsers', cpu: '12%', mem: '35%', status: 'Disponible', runs: 0, version: 'Docker 26.1' },
  { id: 'agent-nav-02', host: 'vm-selenium-02.odace.ci', type: 'Selenium / Browsers', cpu: '0%', mem: '15%', status: 'Disponible', runs: 0, version: 'Docker 26.1' },
]

export const initialAuditEvents = [
  { id: 'AUD-9024', timestamp: '2026-10-28 15:42:06', actor: 'Marie Laurent (Tech lead)', action: 'run.create', object: 'RUN-2841', ip: '192.168.10.45', status: 'Succès' },
  { id: 'AUD-9023', timestamp: '2026-10-28 14:12:19', actor: 'Alexandre Dupont (Testeur)', action: 'asset.upload', object: 'plan-charge-factures-v2.5', ip: '192.168.10.62', status: 'Succès' },
  { id: 'AUD-9022', timestamp: '2026-10-28 11:05:40', actor: 'Lucas Bernard (Développeur)', action: 'policy.denied', object: 'Cible Prod refusée', ip: '192.168.12.18', status: 'Refusé' },
  { id: 'AUD-9021', timestamp: '2026-10-28 09:30:11', actor: 'Marc Vasseur (Admin)', action: 'connector.deploy', object: 'jmeter-runner:5.6.3', ip: '10.0.1.5', status: 'Succès' },
  { id: 'AUD-9020', timestamp: '2026-10-28 08:22:15', actor: 'Marie Laurent (Tech lead)', action: 'run.validate', object: 'RUN-2838 · Validée', ip: '192.168.10.45', status: 'Succès' },
]
