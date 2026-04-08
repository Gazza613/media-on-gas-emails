// lib/gmail.js
// Creates Gmail DRAFTS only (never sends directly)
// All drafts go to gary@gasmarketing.co.za for review before sending

const { google } = require('googleapis');

function createGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Create a Gmail draft (never sends directly)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} htmlBody - Full HTML email body
 * @returns {Object} { success, draftId, to, subject }
 */
async function createDraft(to, subject, htmlBody) {
  const gmail = createGmailClient();
  const from = 'SAMI <grow@gasmarketing.co.za>';

  const rawEmail = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlBody).toString('base64')
  ].join('\r\n');

  const encodedMessage = Buffer.from(rawEmail)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const result = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw: encodedMessage }
    }
  });

  return {
    success: true,
    draftId: result.data.id,
    to,
    subject
  };
}

module.exports = { createDraft };
