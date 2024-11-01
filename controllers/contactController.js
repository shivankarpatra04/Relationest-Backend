const Contact = require('../models/Contact');
const nodemailer = require('nodemailer');
require('dotenv').config();

const submitContact = async (req, res) => {
    const { name, email, message } = req.body;

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS  // Your App Password from Gmail
            }
        });

        // Save contact
        await Contact.create({ name, email, message });

        // Send email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Thank you for contacting us',
            html: `
                <h2>Thank you ${name}!</h2>
                <p>We received your message and will respond soon.</p>
            `
        });

        res.status(200).json({
            success: true,
            message: 'Message sent successfully'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
};

module.exports = { submitContact };