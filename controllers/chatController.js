const axios = require('axios');
const Chat = require('../models/Chat');
const generatePrompt = require('../utils/generatePrompt');

const chatController = {};

// Save chat to database
chatController.saveChat = async (req, res) => {
    try {
        console.log('saveChat function called');
        const { partnerName, concern, message } = req.body;
        const userId = req.user.id;

        const chat = new Chat({
            userId,
            partnerName,
            concern,
            messages: [{ fromUser: true, text: message }]
        });
        await chat.save();

        res.status(201).json(chat);
    } catch (error) {
        console.error('Save chat error:', error);
        res.status(500).json({ message: 'Error saving chat' });
    }
};

// Retrieve chats from the database
chatController.getChat = async (req, res) => {
    try {
        console.log('getChat function called');
        const userId = req.user.id;
        const { chatId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: 'User ID not found in request' });
        }

        console.log('User ID:', userId);

        let chat;
        if (chatId) {
            chat = await Chat.findOne({ _id: chatId, userId });
            if (!chat) {
                return res.status(404).json({ message: 'Chat not found' });
            }
            console.log('Chat retrieved:', chat);
            return res.json(chat);
        } else {
            const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });

            if (chats.length === 0) {
                return res.status(404).json({ message: 'No chats found for this user' });
            }

            console.log('Chats retrieved for user:', chats);
            return res.json(chats);
        }
    } catch (error) {
        console.error('Get chat error:', error);
        res.status(500).json({ message: 'Error retrieving chats', error: error.message });
    }
};

// Delete all chats for a user
chatController.deleteChat = async (req, res) => {
    try {
        console.log('deleteChat function called');
        const userId = req.user.id;

        await Chat.deleteMany({ userId });

        res.json({ message: 'All chats deleted successfully' });
    } catch (error) {
        console.error('Delete chat error:', error);
        res.status(500).json({ message: 'Error deleting chats' });
    }
};

// Submit initial chat message to AI
chatController.submitChat = async (req, res) => {
    try {
        console.log('submitChat function called');
        const { partnerName, concern, message, apiKey, name, age } = req.body;
        const userId = req.user.id;

        // Generate prompt using the imported function
        const prompt = generatePrompt(name, partnerName, age, concern);

        // Get AI response using provided API key or default to Gemini
        const aiResponse = await chatController.getAIResponse(prompt, apiKey || { gemini: process.env.GEMINI_API_KEY });

        // Create a new chat entry and add user message and AI response to the messages array
        const chat = new Chat({
            userId,
            partnerName,
            concern,
            messages: [
                { fromUser: true, text: message },
                { fromUser: false, text: aiResponse }
            ]
        });

        // Save the chat document
        await chat.save();

        // Return the stored chat with both messages
        res.status(201).json(chat);
    } catch (error) {
        console.error('Submit chat error:', error);
        res.status(500).json({ message: 'Error submitting chat' });
    }
};

// Handle follow-up messages from the user
chatController.continueChat = async (req, res) => {
    try {
        console.log('continueChat function called');

        const { chatId, followUpMessage, apiKey } = req.body;
        const userId = req.user.id;

        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        if (chat.userId.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized access to this chat' });
        }

        chat.messages.push({ fromUser: true, text: followUpMessage });

        const fullConversation = chat.messages.map((msg) => msg.text).join('\n');

        const aiResponse = await chatController.getAIResponse(fullConversation, apiKey || { gemini: process.env.GEMINI_API_KEY });

        chat.messages.push({ fromUser: false, text: aiResponse });

        await chat.save();

        res.json({ aiResponse });
    } catch (error) {
        console.error('Continue chat error:', error);
        res.status(500).json({ message: 'Error continuing chat' });
    }
};

// Find chat by chatId
chatController.findChatById = async (req, res) => {
    try {
        console.log('findChatById function called');
        const userId = req.user.id;
        const { chatId } = req.params;

        if (!chatId) {
            return res.status(400).json({ message: 'Chat ID is required' });
        }

        const chat = await Chat.findOne({ _id: chatId, userId });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Ensure all messages have the fromUser field set
        if (chat.messages && Array.isArray(chat.messages)) {
            const updatedMessages = chat.messages.map((message, index) => {
                if (typeof message.fromUser !== 'boolean') {
                    // First message is typically from user, then alternating
                    const fromUser = index % 2 === 0;
                    return { ...message.toObject(), fromUser };
                }
                return message;
            });

            // Update the chat if any messages were changed
            const hasChanges = updatedMessages.some((msg, idx) =>
                typeof chat.messages[idx].fromUser !== 'boolean' ||
                chat.messages[idx].fromUser !== msg.fromUser
            );

            if (hasChanges) {
                chat.messages = updatedMessages;
                await chat.save();
                console.log('Updated chat with fromUser fields:', chat);
            }
        }

        console.log('Chat found:', chat);
        res.json(chat);
    } catch (error) {
        console.error('Find chat by ID error:', error);
        res.status(500).json({ message: 'Error finding chat', error: error.message });
    }
};
// Delete a specific chat by ID
chatController.deleteChatById = async (req, res) => {
    try {
        console.log('deleteChatById function called');
        const userId = req.user.id;
        const { chatId } = req.params;

        if (!chatId) {
            return res.status(400).json({ message: 'Chat ID is required' });
        }

        // Find the chat and verify ownership
        const chat = await Chat.findOne({ _id: chatId, userId });

        if (!chat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        // Delete the specific chat
        await Chat.findByIdAndDelete(chatId);

        console.log('Chat deleted successfully:', chatId);
        res.json({ message: 'Chat deleted successfully' });
    } catch (error) {
        console.error('Delete specific chat error:', error);
        res.status(500).json({ message: 'Error deleting chat', error: error.message });
    }
};

chatController.getAIResponse = async (prompt, apiKey = {}) => {
    try {
        // Try OpenAI if provided
        if (apiKey.openai) {
            return await callOpenAIAPI(prompt, apiKey.openai);
        }
        // Try Anthropic if provided
        if (apiKey.anthropic) {
            return await callAnthropicAPI(prompt, apiKey.anthropic);
        }
        // Default to Gemini - use provided key or fallback to environment variable
        return await callGeminiAPI(prompt, apiKey.gemini || process.env.GEMINI_API_KEY);
    } catch (error) {
        console.error('Error in getAIResponse:', error);
        throw new Error('Failed to get AI response');
    }
};

// Function to call Gemini API
async function callGeminiAPI(prompt, apiKey) {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateText?key=${apiKey}`, // Corrected endpoint
            {
                prompt: {
                    text: prompt,  // Corrected structure of the prompt
                },
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`  // Optional if API requires it
                }
            }
        );

        // Adjusted data path based on the API response structure
        return response.data.candidates[0].output;
    } catch (error) {
        console.error('Error calling Gemini API:', error.response ? error.response.data : error.message);
        throw new Error('Failed to get response from Gemini API');
    }
}

// Function to call OpenAI API
async function callOpenAIAPI(prompt, apiKey) {
    try {
        const response = await axios.post('https://api.openai.com/v1/completions', {
            model: 'text-davinci-003',
            prompt,
            max_tokens: 150
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });
        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw new Error('Failed to get response from OpenAI API');
    }
}

// Function to call Anthropic API
async function callAnthropicAPI(prompt, apiKey) {
    try {
        const response = await axios.post('https://api.anthropic.com/v1/complete', {
            prompt,
            model: "claude-2",
            max_tokens_to_sample: 150
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey
            }
        });
        return response.data.completion;
    } catch (error) {
        console.error('Error calling Anthropic API:', error);
        throw new Error('Failed to get response from Anthropic API');
    }
}

module.exports = chatController;