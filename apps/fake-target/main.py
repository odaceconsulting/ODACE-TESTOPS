"""
Application cible factice (Fake Target) pour tester les campagnes de charge et de parcours.
Permet d'évaluer les temps de réponse p95/p99 et les taux d'erreur.
"""

import asyncio
import random
from fastapi import FastAPI, Response, status

app = FastAPI(title="ODACE Fake Target", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/fast")
async def fast_endpoint():
    """Réponse quasi-instantanée (5 à 15 ms)."""
    await asyncio.sleep(random.uniform(0.005, 0.015))
    return {"data": "fast"}


@app.get("/api/variable")
async def variable_endpoint():
    """Temps de réponse variable (50 à 400 ms) avec pic à 900 ms dans 5% des cas."""
    if random.random() < 0.05:
        await asyncio.sleep(0.9)  # Déclenche un p99 élevé
    else:
        await asyncio.sleep(random.uniform(0.05, 0.20))
    return {"data": "variable"}


@app.get("/api/flaky")
async def flaky_endpoint(response: Response):
    """Génère aléatoirement des erreurs HTTP 500 (10% d'erreurs)."""
    if random.random() < 0.10:
        response.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        return {"error": "Simulated flaky server error"}
    return {"data": "flaky_success"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8088)

