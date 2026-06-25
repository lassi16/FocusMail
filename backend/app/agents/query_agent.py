from app.services.llm.groq_client import client

def answer_query(query, docs):

    print("\n========== DOCS ==========")
    print(docs)
    print("==========================")

    context = "\n\n".join(docs)

    prompt = f"""
You are an AI email assistant.

User Question:
{query}

Relevant Emails:
{context}

Answer the question using only these emails.
If internship opportunities exist, mention them.
Give a concise summary.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    print(type(docs))
    
    return response.choices[0].message.content