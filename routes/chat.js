const express = require('express');
const chatController = require('../controllers/chatController');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Log the entire chatController object to check its contents
console.log('chatController:', chatController);

router.post('/chats', authMiddleware, chatController.saveChat);
router.get('/chats', authMiddleware, chatController.getChat);
router.delete('/chats', authMiddleware, chatController.deleteChat);
router.post('/submit-form', authMiddleware, chatController.submitChat);
router.post('/continue', authMiddleware, chatController.continueChat);
router.get('/chats/:chatId', authMiddleware, chatController.findChatById);
router.delete('/chats/:chatId', authMiddleware, chatController.deleteChatById);

module.exports = router;