from fastapi import FastAPI

from app.database.db import engine
from app.database.models import Base
from app.api.rag import router as rag_router
from app.api.emails import router as email_router
from app.api.gmail import router as gmail_router
from app.api.agents import router as agent_router
from app.api.router import router as router_api



Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Email Intelligence Assistant"
)

app.include_router(email_router)
app.include_router(gmail_router)
app.include_router(agent_router)
app.include_router(rag_router)
app.include_router(router_api)


@app.get("/")
def root():
    return {
        "message": "Email Intelligence Assistant Backend Running"
    }