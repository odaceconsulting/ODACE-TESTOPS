"""
Point d'entrée principal de l'API FastAPI ODACE TestOps.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apps.api.core.config import settings
from apps.api.core.errors import APIError, api_error_handler
from apps.api.modules.runs.router import router as runs_router
from apps.api.modules.projects.router import router as projects_router
from apps.api.modules.assets.router import router as assets_router
from apps.api.modules.audit.router import router as audit_router
from apps.api.modules.auth.router import router as auth_router
from apps.api.modules.webhooks.router import router as webhooks_router



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise automatiquement le schéma et les utilisateurs de démonstration au démarrage."""
    try:
        from libs.persistence.database import engine, Base
        import libs.persistence.models  # noqa: F401
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        from libs.persistence.seed_users import seed_users
        await seed_users()
        print("INFO: Base de donnees initialisee et utilisateurs amorces avec succes.")
    except Exception as e:
        print(f"WARNING: Initialisation automatique base de donnees ignoree: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API d'orchestration de tests logiciels et de campagnes de charge pour JS2E.",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# Exception handlers
app.add_exception_handler(APIError, api_error_handler)  # type: ignore

# CORS (autoriser le frontend apps/web)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enregistrement des routes
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(runs_router, prefix=settings.API_V1_PREFIX)
app.include_router(projects_router, prefix=settings.API_V1_PREFIX)
app.include_router(assets_router, prefix=settings.API_V1_PREFIX)
app.include_router(audit_router, prefix=settings.API_V1_PREFIX)
app.include_router(webhooks_router, prefix=settings.API_V1_PREFIX)



@app.get("/health", tags=["Health"])
async def health_check():
    """Contrôle de santé du service API."""
    return {
        "status": "healthy",
        "service": "odace-testops-api",
        "version": settings.VERSION,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("apps.api.main:app", host="0.0.0.0", port=8000, reload=True)
