import os
from openai import OpenAI, Client, OpenAIError
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
import secrets
import logging

load_dotenv()
template_path = os.path.abspath('../frontend/templates')
print(f"Resolved template path: {template_path}")
app = Flask(__name__, template_folder='./frontend/templates', static_folder='./frontend/static')

app.secret_key = os.getenv("FLASK_SECRET_KEY", secrets.token_hex(16))

logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)


client = Client(
    api_key=os.getenv("LLM_API_KEY", ""),
    base_url=os.getenv("LLM_BASE_URL", "")
)
LLM_MODEL = os.getenv("LLM_MODEL", "google/gemma-3-1b-it")


@app.route("/")
def index():
    session.setdefault('chat_history', [])
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message")
    if not user_message:
        return jsonify({"error": "No message provided"}), 400
    
    chat_history = session.get('chat_history', [])
    chat_history.append({"role": "user", "content": user_message})

    try:
        messages_for_api = [
            {"role": "system", "content": "You are Immigration AI, a helpful assistant specializing in immigration-related questions. Provide accurate and concise information."},
            *chat_history
        ]

        completion = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages_for_api
        )

        ai_message = completion.choices[0].message.content.strip()
        chat_history.append({"role": "assistant", "content": ai_message})

        session['chat_history'] = chat_history[-20:]
        return jsonify({"response": ai_message})
    
    except OpenAIError as e:
        app.logger.error(f"OpenAI API Error: {e}")
        return jsonify({"error": f"Failed to get response from AI: {str(e)}"}), 500
    except Exception as e:
        app.logger.error(f"An unexpected error occured")

@app.route("/clear", methods=["POST"])
def clear_chat():
    """Clear the chat history for the current session."""
    session['chat_history'] = []
    return jsonify({"status": "Chat cleared"})

if __name__ == "__main__":
    # Use waitress or gunicorn for production deployment
    app.run(host='0.0.0.0', port=5000)