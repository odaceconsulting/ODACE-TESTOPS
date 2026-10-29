/**
 * Client HTTP pour communiquer avec l'API FastAPI ODACE TestOps.
 * Gère les sessions OIDC / JWT en mémoire conformément aux exigences de l'Étape 8 du Guide.
 */

const API_BASE = '/api/v1'

export interface AuthenticatedUser {
  id: string
  username: string
  full_name: string
  email: string
  roles: string[]
  department: string
  avatar: string
  allowed_projects?: string[]
}

// Jeton d'accès en mémoire et persistance en sessionStorage
const TOKEN_KEY = 'odace_access_token'
const USER_KEY = 'odace_user'
const LOGGED_OUT_KEY = 'odace_logged_out'

let inMemoryToken: string | null = null
let inMemoryUser: AuthenticatedUser | null = null

export function setSessionToken(token: string | null, user?: AuthenticatedUser | null) {
  inMemoryToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token)
      sessionStorage.removeItem(LOGGED_OUT_KEY)
    } else {
      sessionStorage.removeItem(TOKEN_KEY)
    }
  }
  if (user !== undefined) {
    inMemoryUser = user || null
    if (typeof window !== 'undefined') {
      if (user) {
        sessionStorage.setItem(USER_KEY, JSON.stringify(user))
      } else {
        sessionStorage.removeItem(USER_KEY)
      }
    }
  }
}

export function getSessionToken(): string | null {
  if (inMemoryToken) return inMemoryToken
  if (typeof window !== 'undefined') {
    const saved = sessionStorage.getItem(TOKEN_KEY)
    if (saved) {
      inMemoryToken = saved
      return saved
    }
  }
  return null
}

export function getSessionUser(): AuthenticatedUser | null {
  if (inMemoryUser) return inMemoryUser
  if (typeof window !== 'undefined') {
    const saved = sessionStorage.getItem(USER_KEY)
    if (saved) {
      try {
        inMemoryUser = JSON.parse(saved)
        return inMemoryUser
      } catch {
        // ignore
      }
    }
  }
  return null
}

export function isLoggedOut(): boolean {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(LOGGED_OUT_KEY) === 'true'
  }
  return false
}

export function clearLoggedOut(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(LOGGED_OUT_KEY)
  }
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...extraHeaders,
  }
  const token = getSessionToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

/**
 * Contrôle de connectivité de l'API.
 */
export async function checkBackendHealth(): Promise<{ online: boolean; message: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    const res = await fetch(`/health`, {
      method: 'GET',
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      return { online: true, message: 'Connecté au serveur FastAPI' }
    }
    return { online: false, message: `Réponse HTTP ${res.status}` }
  } catch {
    return { online: false, message: 'Serveur API déconnecté' }
  }
}

/**
 * Authentification réelle par émission de jeton JWT signé.
 */
export async function loginApi(
  username: string,
  password: string
): Promise<{ success: boolean; token?: string; user?: AuthenticatedUser; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return {
        success: false,
        error: err.error?.message || err.detail || 'Identifiants invalides.',
      }
    }

    const data = await res.json()
    setSessionToken(data.access_token, data.user)
    return { success: true, token: data.access_token, user: data.user }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur réseau lors de la connexion' }
  }
}

/**
 * Récupère le profil de l'utilisateur connecté via son jeton Bearer JWT.
 */
export async function fetchMeApi(): Promise<AuthenticatedUser | null> {
  if (!inMemoryToken) return null
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Déconnexion de la session et purge du jeton en mémoire.
 */
export async function logoutApi(): Promise<void> {
  const token = getSessionToken()
  if (token) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
    } catch {
      // Ignorer l'erreur réseau lors de la déconnexion
    }
  }
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(LOGGED_OUT_KEY, 'true')
  }
  setSessionToken(null, null)
}

export interface DirectoryUser {
  id: string
  username: string
  email: string
  full_name: string
  roles: string[]
  role: string
  department: string
  avatar: string
}

/**
 * Récupère la liste des acteurs et profils officiels stockés en base de données PostgreSQL.
 */
export async function fetchDirectoryApi(): Promise<DirectoryUser[] | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/directory`, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}


export interface RunApiItem {
  id: string
  rawId?: string
  project: string
  script: string
  version: string
  tool: string
  env: string
  requester: string
  date: string
  duration: string
  state: 'En attente' | 'En cours' | 'Terminée' | 'Échec' | 'Indéterminée'
  result: 'Conforme' | 'Non conforme' | 'Non fiable' | 'Non évalué'
  validation: 'En attente' | 'Validée' | 'Refusée' | 'Sans objet'
}

export async function fetchRunsFromApi(): Promise<RunApiItem[] | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${API_BASE}/runs`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) return null

    const data = await res.json()
    if (!Array.isArray(data)) return null

    return data.map((item: any) => {
      const stateMap: Record<string, RunApiItem['state']> = {
        QUEUED: 'En attente',
        DISPATCHED: 'En cours',
        PREPARING: 'En attente',
        RUNNING: 'En cours',
        COLLECTING: 'En cours',
        EVALUATING: 'En cours',
        FINISHED: 'Terminée',
        FAILED: 'Échec',
        TIMEOUT: 'Échec',
        CANCELLED: 'Indéterminée',
        INDETERMINATE: 'Indéterminée',
      }
      const resultMap: Record<string, RunApiItem['result']> = {
        CONFORME: 'Conforme',
        NON_CONFORME: 'Non conforme',
        INFORMATIF: 'Non conforme',
        NON_FIABLE: 'Non fiable',
        SUCCESS: 'Conforme',
        FAILED_GATES: 'Non conforme',
        FAILED_EXEC: 'Non conforme',
        SATURATED: 'Non fiable',
      }
      const valMap: Record<string, RunApiItem['validation']> = {
        EN_ATTENTE: 'En attente',
        VALIDE: 'Validée',
        REFUSE: 'Refusée',
        APPROUVE: 'Validée',
        REJETE: 'Refusée',
        SANS_OBJET: 'Sans objet',
      }

      return {
        id: `RUN-${item.id.substring(0, 4).toUpperCase()}`,
        rawId: item.id,
        project: item.project_name || 'Gestion des factures',
        script: item.asset_name || 'Tir de charge Facturation API',
        version: item.asset_version || 'v1.3',
        tool: item.tool ? item.tool.toUpperCase() : 'JMETER',
        env: item.environment_name || 'Recette',
        requester: item.requested_by || 'Lucas Bernard',
        date: item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Récent',
        duration: item.duration || '12 min',
        state: stateMap[item.state] || 'Terminée',
        result: (item.result ? resultMap[item.result] : 'Non évalué') || 'Non évalué',
        validation: valMap[item.validation] || 'En attente',
      }
    })
  } catch {
    return null
  }
}

export async function createRunApi(payload: {
  project_id: string
  asset_id: string
  target_id: string
  public_params?: Record<string, any>
  secret_vault_refs?: Record<string, string>
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const idempotencyKey = `web-run-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const res = await fetch(`${API_BASE}/runs`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      }),
      body: JSON.stringify({
        project_id: payload.project_id,
        asset_id: payload.asset_id,
        target_id: payload.target_id,
        public_params: payload.public_params || {},
        secret_vault_refs: payload.secret_vault_refs || {},
      }),
    })

    if (res.ok || res.status === 202) {
      const data = await res.json()
      return { success: true, id: data.id }
    }
    const err = await res.json().catch(() => ({}))
    return { success: false, error: err.error?.message || err.detail || `Erreur HTTP ${res.status}` }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function validatePreflightApi(payload: {
  project_id: string
  asset_id: string
  target_id: string
}): Promise<{
  allowed: boolean
  project_name?: string
  target_name?: string
  target_url?: string
  asset_name?: string
  active_runs?: number
  max_concurrent_runs?: number
  checks?: {
    target_active: boolean
    target_free: boolean
    quota_ok: boolean
    tool_compatible: boolean
  }
  reasons?: string[]
  error?: string
}> {
  try {
    const res = await fetch(`${API_BASE}/runs/validate-preflight`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        project_id: payload.project_id,
        asset_id: payload.asset_id,
        target_id: payload.target_id,
        public_params: {},
        secret_vault_refs: {},
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { allowed: false, error: err.error?.message || err.detail || `Erreur HTTP ${res.status}` }
    }
    return await res.json()
  } catch (e: any) {
    return { allowed: false, error: e.message }
  }
}

export async function validateRunApi(
  runId: string,
  decision: 'Validée' | 'Refusée' | 'VALIDE' | 'REFUSE',
  comment: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const backendDecision = decision === 'Validée' || decision === 'VALIDE' ? 'VALIDE' : 'REFUSE'
    const res = await fetch(`${API_BASE}/runs/${runId}/validate`, {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({
        decision: backendDecision,
        comment: comment || 'Validation effectuée via la console Tech Lead ODACE',
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { success: false, error: err.error?.message || `Refus d'autorisation HTTP ${res.status}` }
    }

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export interface TargetApiItem {
  id: string
  name: string
  url: string
  allowed_tool: string
  max_charge: number
  is_active: boolean
}

export interface EnvironmentApiItem {
  id: string
  name: string
  env_type: string
  allowed_hours: string
  targets: TargetApiItem[]
}

export interface ProjectApiItem {
  id: string
  name: string
  description?: string
  team: string
  max_concurrent_runs: number
  environments: EnvironmentApiItem[]
}

export async function fetchProjectsFromApi(): Promise<ProjectApiItem[] | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function createProjectApi(data: {
  name: string
  description?: string
  team: string
  max_concurrent_runs: number
  environments?: {
    name: string
    env_type: string
    allowed_hours: string
    targets?: { name: string; url: string; allowed_tool: string; max_charge: number; is_active: boolean }[]
  }[]
  target_name?: string
  target_url?: string
  allowed_tool?: string
  max_charge?: number
}): Promise<{ success: boolean; project?: ProjectApiItem; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return {
        success: false,
        error: err.error?.message || err.detail || 'Erreur lors de la création du projet.',
      }
    }
    const created = await res.json()
    return { success: true, project: created }
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur réseau lors de la création du projet.' }
  }
}

export interface TestAssetApiItem {
  id: string
  project_id: string
  project_name?: string
  name: string
  tool: string
  version: string
  sha256_hash: string
  object_path: string
  created_at: string
}

export async function fetchAssetsFromApi(): Promise<TestAssetApiItem[] | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${API_BASE}/assets`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export interface AuditLogApiItem {
  id: string
  timestamp: string
  actor: string
  action: string
  object_type: string
  object_id?: string
  ip_address?: string
  details?: Record<string, any>
}

export async function fetchAuditFromApi(): Promise<AuditLogApiItem[] | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${API_BASE}/audit`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
