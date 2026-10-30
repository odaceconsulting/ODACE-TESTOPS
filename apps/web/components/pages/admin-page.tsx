'use client'

import React, { useState } from 'react'
import { Plus, FileCode2, ShieldAlert, X } from 'lucide-react'
import { Button } from '../ui/button'
import { StatusBadge } from '../shared/status-badge'
import { UserProfile, initialConnectors, PROFILES } from '../shared/types'

export function AdminPage({
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
          Connecteurs &amp; Moteurs ({connectors.length})
        </button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
          Habilitations &amp; Rôles (7)
        </button>
        <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}>
          Sécurité &amp; Arrêt d’urgence
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
                Dispositif d'Arrêt d'Urgence Global (Kill Switch - RG5)
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

export function AddConnectorDialog({
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
              URL de l'API Cloud &amp; Clé d'authentification
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
            Enregistrer &amp; Publier l’outil
          </Button>
        </div>
      </div>
    </div>
  )
}
