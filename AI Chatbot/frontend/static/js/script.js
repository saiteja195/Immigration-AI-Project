document.addEventListener('DOMContentLoaded',() => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const clearChatButton = document.getElementById('clear-chat-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessageDiv = document.getElementById('error-message');

    function addMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(sender === 'user' ? 'user-message' : 'bot-message');

        const paragraph = document.createElement('p');

        if (sender === 'bot') {
            let htmlMessage = message
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
            .replace(/^\* (.*$)/gm, '<li>$1</li>') // List items
            .replace(/\n/g, '<br>'); // Newlines

            if (htmlMessage.includes('<li>')) {
                // Find blocks of <li> and wrap them
                htmlMessage = htmlMessage.replace(/(<li>.*?<\/li>)(?:\s*<br>\s*|\s*)*?(<li>)/g, '$1</li><li>'); // Join adjacent li from different lines
                htmlMessage = htmlMessage.replace(/(?:<br>\s*)*?(<li>.*?<\/li>)(?:\s*<br>\s*)*(?!<li>)/gs, '<ul>$1</ul>'); // Wrap single or last block
                htmlMessage = htmlMessage.replace(/(<li>.*?<\/li>)(\s*<br>\s*)+(<li>.*?<\/li>)/gs, '$1</ul><br><ul>$3'); // Wrap blocks separated by <br>
                htmlMessage = htmlMessage.replace(/^(<li>.*?<\/li>)/s, '<ul>$1</ul>'); // Wrap if list starts the message
           }

           paragraph.innerHTML = htmlMessage;
        } else {
            paragraph.textContent = message;
        }

        messageElement.appendChild(paragraph);

        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;

    }

    function displayError(message) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.style.display = 'block';
        setTimeout(() => {
            errorMessageDiv.style.display = 'none';
        }, 5000)

    }


    async function sendMessage() {
        const messageText = userInput.value.trim();
        if (!messageText) return;

        addMessage('user', messageText);
        userInput.value = '';
        userInput.disabled = true;
        sendButton.disabled = true;
        loadingIndicator.style.display = 'block';
        errorMessageDiv.style.display = 'none';

        try{
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({message : messageText}),
            });

            if (!response.ok){
                let errorMsg = `Error: ${response.status} ${response.statusText}`;
                try{
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) { /* Ignore if response is not JSON */ }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            addMessage('bot', data.response)

            }
            catch (error) {
                console.error('Chat request failed:', error);
                displayError(`Failed to get response from AI. ${error.message}`);
                // Optionally add an error message to the chat box itself
                // addMessage('bot', "Sorry, I encountered an error. Please try again.");
            } finally {
                loadingIndicator.style.display = 'none';
                userInput.disabled = false;
                sendButton.disabled = false;
                userInput.focus();
            }

        }
    

    async function clearChat() {
        try {
            const response = await fetch('/clear', {
                method: 'POST',
            });

            if (!response.ok) {
                 throw new Error(`Error: ${response.status} ${response.statusText}`);
            }

            // Clear the chat box UI
            chatBox.innerHTML = '';
            // Add the initial welcome message back (optional)
            addMessage('bot', "Chat cleared. How can I help you?");
            displayError('Chat history cleared.'); // Use displayError for temporary messages

        } catch (error) {
            console.error('Failed to clear chat:', error);
            displayError('Could not clear chat history.');
        }
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    clearChatButton.addEventListener('click', clearChat);

    userInput.addEventListener('keypress', (event) => {
        // Send message on Enter key press (Shift+Enter for newline)
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent default newline behavior
            sendMessage();
        }
    });

    // Initial focus on the input field
    userInput.focus();

});