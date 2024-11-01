/**
 * Defines the schema for a chat conversation between a user and a partner.
 *
 * @property {boolean} fromUser - Indicates whether the message is from the user (true) or the AI (false).
 * @property {string} text - The text content of the message.
 * @property {Date} timestamp - The timestamp of when the message was sent.
 *
 * @property {mongoose.Schema.Types.ObjectId} userId - The ID of the user participating in the chat.
 * @property {string} partnerName - The name of the partner the user is chatting with.
 * @property {string} concern - The topic or concern being discussed in the chat.
 * @property {Object[]} messages - An array of message objects, each with a `fromUser`, `text`, and `timestamp` property.
 * @property {Date} createdAt - The timestamp of when the chat was created.
 * @property {Date} updatedAt - The timestamp of when the chat was last updated.
 */
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    fromUser: { type: Boolean, required: true },  // true if message is from user, false if from AI
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const chatSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String },  // Adding name field for user's name
    partnerName: { type: String, required: true },
    concern: { type: String, required: true },
    messages: [messageSchema]
}, { timestamps: true });

// Index to improve query performance
chatSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);