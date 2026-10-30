#!/usr/bin/env bash
# Script universel de déclenchement et d'attente du Quality Gate ODACE TestOps
# Usage: ./trigger_and_wait.sh <PROJECT_ID> <WEBHOOK_SECRET> [API_URL]

set -euo pipefail

PROJECT_ID="${1:-}"
WEBHOOK_SECRET="${2:-}"
API_URL="${3:-http://localhost:8000/api/v1}"

if [ -z "$PROJECT_ID" ] || [ -z "$WEBHOOK_SECRET" ]; then
  echo "Usage: $0 <PROJECT_ID> <WEBHOOK_SECRET> [API_URL]"
  exit 1
fi

TIMESTAMP=$(date +%s)
IDEMPOTENCY_KEY="cli-trigger-$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid 2>/dev/null || date +%s%N)"
PAYLOAD='{"threads": 50, "duration_sec": 30}'

# Signature HMAC-SHA256
SIGNATURE=$(printf "%s.%s" "$TIMESTAMP" "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | sed 's/^.* //')

echo "🚀 Déclenchement du tir via Webhook entrant HMAC..."
RESPONSE=$(curl -sS -X POST "$API_URL/webhooks/incoming/$PROJECT_ID" \
  -H "Content-Type: application/json" \
  -H "X-Odace-Timestamp: $TIMESTAMP" \
  -H "X-Odace-Signature: $SIGNATURE" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "$PAYLOAD")

echo "Réponse API: $RESPONSE"
RUN_ID=$(echo "$RESPONSE" | grep -o '"run_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$RUN_ID" ]; then
  echo "❌ Erreur: Impossible d'extraire le run_id."
  exit 1
fi

echo "⏳ Attente du verdict Quality Gate (Long Polling 900s) pour $RUN_ID..."
GATE_RESP=$(curl -sS "$API_URL/runs/$RUN_ID/gate?wait=900")

echo "$GATE_RESP"
VERDICT=$(echo "$GATE_RESP" | grep -o '"verdict":"[^"]*' | cut -d'"' -f4)

if [ "$VERDICT" == "CONFORME" ]; then
  echo "✅ Verdict CONFORME : Feu vert pour la mise en production !"
  exit 0
else
  echo "❌ Verdict $VERDICT : Non-conformité détectée par les seuils bloquants."
  exit 1
fi
