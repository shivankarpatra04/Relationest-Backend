/**
 * Defines the User model schema and provides methods for hashing and comparing passwords.
 * 
 * The User model has the following fields:
 * - `username`: A required and unique string representing the user's username.
 * - `email`: A required and unique string representing the user's email address.
 * - `password`: A required string representing the user's password.
 * 
 * The `pre('save')` middleware is used to hash the user's password before saving it to the database.
 * 
 * The `comparePassword` method is used to compare a candidate password with the stored hashed password.
 */
// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
