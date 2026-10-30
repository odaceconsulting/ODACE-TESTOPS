'use client'

import React from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ImportDialog({
  onClose,
  onNotify,
}: {
  onClose: () => void
  onNotify: (msg: string) => void
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">CATALOGUE</p>
            <h2>Importer un scénario de test</h2>
            <p>Ajoutez un fichier .jmx, .side ou archive de test</p>
          </div>
          <button className="icon-button" onClick={onClose}><X /></button>
        </div>
        <div className="form-grid modal-body">
          <label className="full file-upload">
            <Upload />
            <strong>Sélectionnez un fichier de test</strong>
            <span>.jmx (JMeter), .side / .py (Selenium), .usr (LoadRunner)</span>
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
