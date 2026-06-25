from app.rag.chroma_client import collection
from app.rag.embedding import generate_embedding

def search_emails(query):

    query_embedding = generate_embedding(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=5
    )

    docs = results["documents"][0]

    print("SEARCH RETURN:")
    print(results["documents"][0])

    return docs