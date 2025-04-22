const chatLog = document.getElementById('chat-log');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const micButton = document.getElementById('mic-button');
const interruptButton = document.getElementById('interrupt-button');
const chatHistorySidebar = document.querySelector('.chat-history');
const userProfile = document.getElementById('user-profile');
const loginModal = document.getElementById('loginModal');
const googleLoginBtn = document.getElementById('google-button');
const closeBtn = document.querySelector('.close');
const newChatBtn = document.querySelector('.new-chat-btn');

let recognition;
let isListening = false;
const speechSynthesizer = window.speechSynthesis;
let currentUtterance = null;

const CHAT_HISTORY_KEY = 'chatHistory';
const CHAT_SUMMARIES_KEY = 'chatSummaries';
const CHAT_SESSIONS_KEY = 'chatSessions';

let chatSummaries = JSON.parse(localStorage.getItem(CHAT_SUMMARIES_KEY)) || [];
let chatSessions = JSON.parse(localStorage.getItem(CHAT_SESSIONS_KEY)) || {};

let currentChatSessionId = generateUUID();

// Function to generate a unique ID (UUID) for chat sessions
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function showLoginModal() {
    loginModal.style.display = "block";
}

function hideLoginModal() {
    loginModal.style.display = "none";
}

userProfile.addEventListener('click', showLoginModal);

closeBtn.addEventListener('click', hideLoginModal);

window.addEventListener('click', (event) => {
    if (event.target === loginModal) {
        hideLoginModal();
    }
});

// Google Sign-In Initialization
function initializeGoogleSignIn() {
    google.accounts.id.initialize({
        client_id:
            '67454999512-m4l5no9sv5lbqh7s06p8ta72hs53qjbo.apps.googleusercontent.com', // Replace with your actual Google Client ID
        callback: handleCredentialResponse,
    });
    google.accounts.id.renderButton(document.getElementById('google-button'), {
        theme: 'outline',
        size: 'large',
    });
    //google.accounts.id.prompt(); // Optional: Automatically prompt the user to sign in
}

// Handle the credential response from Google
function handleCredentialResponse(response) {
    console.log('Encoded JWT ID token: ' + response.credential);
    // ---  Send this ID token to your backend for verification  ---
    //  ---  and user authentication/creation  ---
    //  ---  (Backend implementation is crucial for security)  ---

    // For now, let's just log the token and close the modal
    alert('Google sign-in successful! (Token logged to console)');
    hideLoginModal();
}

// Call initializeGoogleSignIn when the page loads
window.onload = initializeGoogleSignIn;

function displayChatSummaries() {
    chatHistorySidebar.innerHTML = '';
    chatSummaries.forEach((summary, index) => {
        const summaryElement = document.createElement('div');
        summaryElement.classList.add('chat-summary');
        summaryElement.textContent = summary;
        summaryElement.dataset.index = index;

        chatHistorySidebar.appendChild(summaryElement);
    });
}

function saveChatSummaries() {
    localStorage.setItem(CHAT_SUMMARIES_KEY, JSON.stringify(chatSummaries));
}

function addChatSummary(summary) {
    chatSummaries.unshift(summary);
    if (chatSummaries.length > 20) {
        chatSummaries.pop();
    }
    saveChatSummaries();
    displayChatSummaries();
}

function saveChatSession(title) {
    const messages = [];
    for (const child of chatLog.children) {
        messages.push({
            sender: child.classList.contains('user-message') ? 'user' : 'bot',
            text: child.querySelector('.message-text').textContent,
        });
    }
    chatSessions[currentChatSessionId] = { title: title, messages: messages };
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(chatSessions));
}

function clearChat() {
    chatLog.innerHTML = '';
    userInput.value = '';
    adjustTextareaHeight();
}

function startNewChat() {
    if (chatLog.children.length > 1) {
        const title = chatLog.children[1].querySelector('.message-text').textContent;
        saveChatSession(title);
        addChatSummary(title);
    }
    clearChat();
    currentChatSessionId = generateUUID();
    appendMessage('bot', 'Hello! I am Insight Nova. How can I assist you today?', false);
}

newChatBtn.addEventListener('click', startNewChat);

displayChatSummaries();
appendMessage('bot', 'Hello! I am Insight Nova. How can I assist you today?', false);

if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        isListening = true;
        micButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        micButton.style.color = 'var(--interrupt-color)';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        sendMessage();
    };

    recognition.onend = () => {
        isListening = false;
        micButton.innerHTML = '<i class="fas fa-microphone"></i>';
        micButton.style.color = '';
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        micButton.innerHTML = '<i class="fas fa-microphone"></i>';
        micButton.style.color = '';
        if (event.error !== 'no-speech') {
            appendMessage('bot', 'Sorry, there was an error with speech recognition. Please try again.');
        }
    };

    micButton.addEventListener('click', toggleSpeechRecognition);
} else {
    micButton.style.display = 'none';
}

function toggleSpeechRecognition() {
    if (!isListening) {
        recognition.start();
    } else {
        recognition.stop();
    }
}

function appendMessage(sender, message, shouldSpeak = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = sender === 'user' ? 'U' : 'AI';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = message;

    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);

    chatLog.appendChild(messageDiv);
    chatLog.scrollTop = chatLog.scrollHeight;

    if (sender === 'bot' && shouldSpeak) {
        speak(message);
    }
}

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    appendMessage('user', message);
    userInput.value = '';
    adjustTextareaHeight();

    try {
        const botResponse = await getApiResponse(message);
        appendMessage('bot', botResponse);

        // Add the first user message as the chat summary
        if (chatLog.children.length === 2) {
            addChatSummary(message);
        }
    } catch (error) {
        console.error('Error:', error);
        appendMessage('bot', 'Sorry, there was an error processing your request.');
    }
}

async function getApiResponse(query) {
    const apiKey = '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';
    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'deepseek/deepseek-r1-distill-llama-8b',
            messages: [{ role: 'user', content: query }],
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

function speak(text) {
    if (speechSynthesizer.speaking) {
        speechSynthesizer.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    utterance.onstart = () => {
        interruptButton.style.display = 'flex';
    };

    utterance.onend = () => {
        interruptButton.style.display = 'none';
        currentUtterance = null;
    };

    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        interruptButton.style.display = 'none';
        currentUtterance = null;
    };

    speechSynthesis.speak(utterance);
}

// Event listeners
interruptButton.addEventListener('click', () => {
    if (speechSynthesizer.speaking) {
        speechSynthesizer.cancel();
        interruptButton.style.display = 'none';
    }
});

sendButton.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

// Auto-resize textarea
userInput.addEventListener('input', adjustTextareaHeight);

function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = `${Math.min(userInput.scrollHeight, 200)}px`;
}