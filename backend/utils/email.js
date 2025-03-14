const nodemailer = require('nodemailer');
const { createTransport } = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');
const redis = require('../config/redis');
const { RateLimiterRedis } = require('rate-limiter-flexible');

// Configure rate limiter (5 emails per minute per user)
const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'emailRateLimit',
  points: 5,
  duration: 60,
  blockDuration: 300
});

// Email template cache
const templateCache = new Map();

async function loadTemplate(templateName) {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName);
  }

  const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
  const content = await fs.readFile(templatePath, 'utf-8');
  const template = handlebars.compile(content);
  
  templateCache.set(templateName, template);
  return template;
}

// Create reusable transporter with environment-based configuration
const transporter = createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.EMAIL_CLIENT_ID,
    clientSecret: process.env.EMAIL_CLIENT_SECRET,
    refreshToken: process.env.EMAIL_REFRESH_TOKEN,
    accessToken: process.env.EMAIL_ACCESS_TOKEN
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100
});

// Verify connection on startup
transporter.verify()
  .then(() => logger.info('Email server connection verified'))
  .catch(error => logger.error('Email server connection failed', error));

async function sendEmail(options) {
  try {
    // Validate required options
    if (!options.to || !options.subject || !options.template) {
      throw new Error('Missing required email options');
    }

    // Apply rate limiting
    await rateLimiter.consume(options.to, 1);

    // Load and compile template
    const template = await loadTemplate(options.template);
    const html = template(options.context || {});

    // Create email message
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME,
        address: process.env.EMAIL_FROM_ADDRESS
      },
      to: options.to,
      subject: options.subject,
      html,
      text: options.text || htmlToText(html),
      attachments: options.attachments,
      headers: {
        'X-Mailer': 'MyApp Mail Service',
        'X-Priority': '1',
        ...options.headers
      }
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // Log success
    logger.info(`Email sent to ${options.to}`, {
      messageId: info.messageId,
      subject: options.subject,
      template: options.template
    });

    return info;
  } catch (error) {
    // Handle rate limiting errors
    if (error instanceof Error && error.message === 'Rate limit exceeded') {
      logger.warn(`Email rate limit exceeded for ${options.to}`);
      throw new Error('Too many email requests');
    }

    // Log detailed error information
    logger.error('Email send failed', {
      error: error.message,
      stack: error.stack,
      recipient: options.to,
      template: options.template
    });

    // Retry logic for transient errors
    if (error.code && ['ECONNECTION', 'ETIMEDOUT'].includes(error.code)) {
      logger.warn('Retrying email send due to connection error');
      return sendEmail(options);
    }

    throw error;
  }
}

// HTML to text fallback
function htmlToText(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  sendEmail,
  transporter
};