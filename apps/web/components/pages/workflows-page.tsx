'use client'

import React from 'react'

export function WorkflowsPage({ onNotify }: { onNotify: (msg: string) => void }) {
  return (
    <div className="panel operations-panel" style={{ padding: '24px' }}>
      <h2>Workflows &amp; Enchaînements de Tests</h2>
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
