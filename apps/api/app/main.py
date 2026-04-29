from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import execute, health

app = FastAPI(title="CodeVision AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(execute.router)

@app.get("/")
def read_root():
    return {"message": "CodeVision AI API is running"}
