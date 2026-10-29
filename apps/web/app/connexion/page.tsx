'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ShieldCheck, Zap, AlertCircle } from 'lucide-react'
import { loginApi, clearLoggedOut } from '@/lib/api-client'

export default function ConnexionPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const loginParam = params.get('login')
      if (loginParam) {
        setEmail(loginParam)
      }
    }
  }, [])

  async function handleLogin(e?: FormEvent) {
    if (e) e.preventDefault()
    setLoading(true)
    setError(null)
    clearLoggedOut()

    // Accepter directement soit l'adresse e-mail (ex: marie.laurent@odace.ci), soit le nom d'utilisateur (ex: marie.laurent)
    const identifier = email.trim()
    const pwd = password

    const res = await loginApi(identifier, pwd)
    setLoading(false)

    if (res.success) {
      router.push('/')
    } else {
      setError(res.error || 'Identifiants incorrects ou serveur indisponible.')
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <div style={{
            background: '#ffffff',
            borderRadius: '9px',
            padding: '6px 12px',
            display: 'inline-flex',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
          }}>
            <img
              src="/logo-testops.png"
              alt="ODACE TestOps"
              style={{ height: '28px', width: 'auto', display: 'block', objectFit: 'contain' }}
            />
          </div>
        </div>
        <div className="auth-pitch">
          <p className="eyebrow">PLATEFORME TESTOPS</p>
          <h1>Orchestrez la qualité avec confiance.</h1>
          <p>
            Centralisez vos campagnes, automatisez vos contrôles et gardez une vision claire de chaque exécution.
          </p>
          <div className="auth-trust">
            <ShieldCheck /> Environnement sécurisé et opérationnel
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <img
              src="/logo-testops.png"
              alt="ODACE TestOps"
              style={{ height: '32px', width: 'auto', display: 'block', objectFit: 'contain' }}
            />
          </div>
          <h2>Bon retour parmi nous</h2>
          <p className="auth-intro">Connectez-vous pour accéder à votre tableau de bord TestOps.</p>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="auth-form">
            <label htmlFor="email">
              Adresse e-mail ou nom d'utilisateur
              <input
                id="email"
                type="text"
                autoComplete="username"
                placeholder="ex. marie.laurent ou marie.laurent@entreprise.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label htmlFor="password">
              Mot de passe
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <div className="auth-options">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Se souvenir de moi
              </label>
              <button
                type="button"
                className="auth-link"
                onClick={() => setError("Pour réinitialiser votre mot de passe, veuillez contacter l'administrateur de la plateforme.")}
              >
                Mot de passe oublié ?
              </button>
            </div>

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Connexion en cours...' : <>Se connecter <ArrowRight /></>}
            </button>
          </form>
          <p className="auth-footer">Plateforme sécurisée d'orchestration et d'automatisation des tests.</p>
        </div>
      </section>
    </main>
  )
}
