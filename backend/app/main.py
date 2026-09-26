from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import create_tables
from app.routers import users_router, meetings_router, ws_router
from app.config import settings

app = FastAPI(
    title="Zoom Clone API",
    description="Backend API for Zoom Clone video conferencing web application",
    version="1.0.0",
)

# CORS configuration
origins = [
    settings.FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open CORS for easy local dev & deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users_router)
app.include_router(meetings_router, prefix="/api/meetings")
app.include_router(meetings_router, prefix="/meetings")
app.include_router(ws_router)




@app.on_event("startup")
def on_startup():
    create_tables()


@app.get("/")
def read_root():
    return {"message": "Zoom Clone API Server is running", "docs": "/docs"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
