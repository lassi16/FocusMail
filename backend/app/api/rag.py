from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.models import Email

from app.rag.chroma_client import collection
from app.rag.embedding import generate_embedding

from app.agents.search_agent import search_emails
from app.agents.query_agent import answer_query

router = APIRouter()


@router.get("/index-emails")
def index_emails(
    db: Session = Depends(get_db)
):

    emails = db.query(Email).all()

    count = 0

    for email in emails:

        text = f"""
        Subject: {email.subject}

        Body:
        {email.body}

        Category:
        {email.category}
        """

        embedding = generate_embedding(text)

        collection.upsert(
            ids=[str(email.id)],
            embeddings=[embedding],
            documents=[text]
        )

        count += 1

    return {
        "indexed": count
    }

@router.get("/search")
def search_endpoint(query: str):
    return {
        "documents": search_emails(query)
    }

@router.get("/chat")
def chat(query: str):

    docs = search_emails(query)

    print(type(docs))
    print(docs)

    answer = answer_query(
        query,
        docs
    )

    return {
        "answer": answer
    }