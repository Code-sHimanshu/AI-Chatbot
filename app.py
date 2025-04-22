from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
from pymongo import MongoClient
import datetime
from google.oauth2 import id_token
from google.auth.transport import requests

app = Flask(__name__)
load_dotenv()  # Load environment variables from .env

@app.route('/')
def index():
    return "✅ Insight Nova AI is live in your service!"

# --- MongoDB Configuration ---
MONGODB_URI = os.getenv('MONGODB_URI')
client = MongoClient(MONGODB_URI)
db = client.chatbot_db
chats_collection = db.chats
users_collection = db.users
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')  # Load from .env
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')  # Load from .env


# --- Helper Functions ---
def verify_google_token(token):
    """Verifies the Google ID token and returns the user's information."""
    try:
        idinfo = id_token.verify_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        return idinfo
    except ValueError:
        return None


# --- Routes ---
@app.route('/api/save-chat', methods=['POST'])
def save_chat():
    data = request.get_json()
    token = data.get('token')
    messages = data.get('messages')
    first_user_message = data.get('firstUserMessage')

    if not token or not messages:
        return jsonify({'success': False, 'error': 'Token and messages are required.'}), 400

    idinfo = verify_google_token(token)
    if not idinfo:
        return jsonify({'success': False, 'error': 'Invalid token.'}), 401

    user_id = idinfo.get('sub')

    chat_data = {
        'user_id': user_id,
        'messages': messages,
        'timestamp': datetime.datetime.now(),
        'title': first_user_message,
    }

    try:
        chats_collection.insert_one(chat_data)
        return jsonify({'success': True, 'message': 'Chat saved successfully.'}), 200
    except Exception as e:
        print(f"Error saving chat: {e}")
        return jsonify({'success': False, 'error': 'Failed to save chat.'}), 500


@app.route('/api/get-chat', methods=['GET'])
def get_chat():
    token = request.args.get('token')

    if not token:
        return jsonify({'success': False, 'error': 'Token is required.'}), 400

    idinfo = verify_google_token(token)
    if not idinfo:
        return jsonify({'success': False, 'error': 'Invalid token.'}), 401

    user_id = idinfo.get('sub')

    try:
        chat_history = list(
            chats_collection.find({'user_id': user_id}).sort('timestamp', -1)
        )  # Sort by timestamp in descending order (-1)

        # Convert ObjectId to string for JSON serialization and prepare for frontend
        summaries = []
        for chat in chat_history:
            chat['_id'] = str(chat['_id'])
            summaries.append({'_id': chat['_id'], 'title': chat['title']})
            for message in chat['messages']:
                if '_id' in message:
                    message['_id'] = str(message['_id'])

        return jsonify({'success': True, 'chat_history': summaries}), 200

    except Exception as e:
        print(f"Error getting chat history: {e}")
        return jsonify({'success': False, 'error': 'Failed to get chat history.'}), 500


@app.route('/api/get-api-response', methods=['POST'])
def get_api_response():
    data = request.get_json()
    query = data.get('query')

    if not query:
        return jsonify({'success': False, 'error': 'Query is required.'}), 400

    try:
        bot_response = get_ai_response(query)
        return jsonify({'success': True, 'response': bot_response}), 200
    except Exception as e:
        print(f"Error getting API response: {e}")
        return jsonify({'success': False, 'error': 'Failed to get API response.'}), 500


def get_ai_response(query):
    """
    Replace this with your actual AI model integration (e.g., calling an API).
    For this example, it returns a placeholder response.
    """
    import os
    import requests

    api_key = os.getenv('OPENROUTER_API_KEY')  # Load API key from .env
    api_url = 'https://openrouter.ai/api/v1/chat/completions'

    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}',
    }
    payload = {
        'model': 'deepseek-ai/deepseek-r1-instruct',  # Or your desired model
        'messages': [{'role': 'user', 'content': query}],
    }

    try:
        response = requests.post(api_url, headers=headers, json=payload)
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
        return response.json()['choices'][0]['message']['content']
    except requests.exceptions.RequestException as e:
        print(f"API request error: {e}")
        return "Sorry, I encountered an error communicating with the AI. Please try again."


if __name__ == '__main__':
    app.run(debug=True)