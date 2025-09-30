from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.api import router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Terraform Log Viewer API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(router, prefix="/api", tags=["logs"])


@app.get("/")
def read_root():
    return {"message": "Terraform Log Viewer API", "status": "running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
