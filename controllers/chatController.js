const axios = require('axios');
const Chat = require('../models/Chat');
const generatePrompt = require('../utils/generatePrompt');

const chatController = {};

// Helper function to determine which AI service to use
const determineAIService = (apiKey = {}) => {
    if (apiKey.openai) return 'openai';
    if (apiKey.anthropic) return 'anthropic';
    if (apiKey.gemini) return 'gemini';
    return 'defaultGemini'; // Use environment variable Gemini key
};

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

// Updated submitChat function with enhanced API key handling
chatController.submitChat = async (req, res) => {
    try {
        console.log('submitChat function called');
        const { partnerName, concern, message, apiKey, name, age } = req.body;
        const userId = req.user.id;

        const prompt = generatePrompt(name, partnerName, age, concern);

        // Get AI response using provided API keys or default to Gemini
        const aiResponse = await chatController.getAIResponse(prompt, apiKey);

        const chat = new Chat({
            userId,
            partnerName,
            concern,
            messages: [
                { fromUser: true, text: message },
                { fromUser: false, text: aiResponse }
            ]
        });

        await chat.save();
        res.status(201).json(chat);
    } catch (error) {
        console.error('Submit chat error:', error);
        res.status(500).json({
            message: 'Error submitting chat',
            error: error.message
        });
    }
};

// Updated continueChat function with enhanced API key handling
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

        // Use the provided API keys or default to Gemini
        const aiResponse = await chatController.getAIResponse(fullConversation, apiKey);

        chat.messages.push({ fromUser: false, text: aiResponse });
        await chat.save();

        res.json({ aiResponse });
    } catch (error) {
        console.error('Continue chat error:', error);
        res.status(500).json({
            message: 'Error continuing chat',
            error: error.message
        });
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

// Updated getAIResponse function with better error handling and service determination
chatController.getAIResponse = async (prompt, apiKey = {}) => {
    try {
        const service = determineAIService(apiKey);

        switch (service) {
            case 'openai':
                return await callOpenAIAPI(prompt, apiKey.openai);
            case 'anthropic':
                return await callAnthropicAPI(prompt, apiKey.anthropic);
            case 'gemini':
                return await callGeminiAPI(prompt, apiKey.gemini);
            case 'defaultGemini':
                if (!process.env.GEMINI_API_KEY) {
                    throw new Error('No Gemini API key found in environment variables');
                }
                return await callGeminiAPI(prompt, process.env.GEMINI_API_KEY);
            default:
                throw new Error('No valid AI service configuration found');
        }
    } catch (error) {
        console.error('Error in getAIResponse:', error);
        throw new Error(`Failed to get AI response: ${error.message}`);
    }
};

// Updated API calling functions with better error handling
async function callGeminiAPI(prompt, apiKey) {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
            {
                contents: [{ parts: [{ text: prompt }] }]
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('Invalid response format from Gemini API');
        }

        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw new Error(`Gemini API error: ${error.message}`);
    }
}

async function callOpenAIAPI(prompt, apiKey) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/completions',
            {
                model: 'text-davinci-003',
                prompt,
                max_tokens: 150
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            }
        );

        if (!response.data?.choices?.[0]?.text) {
            throw new Error('Invalid response format from OpenAI API');
        }

        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw new Error(`OpenAI API error: ${error.message}`);
    }
}

async function callAnthropicAPI(userMessage, apiKey) {
    try {
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: "claude-3-sonnet-20240229",
                messages: [{
                    role: "user",
                    content: userMessage
                }],
                max_tokens: 1024
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01',
                    'x-api-key': apiKey
                }
            }
        );

        if (!response.data?.content?.[0]?.text) {
            throw new Error('Invalid response format from Anthropic API');
        }

        return response.data.content[0].text;
    } catch (error) {
        console.error('Error calling Anthropic API:', error);
        throw new Error(`Anthropic API error: ${error.message}`);
    }
}

module.exports = chatController;