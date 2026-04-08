const tiktok = require('../lib/tiktok');
module.exports = async function handler(req, res) {
  try {
    const token = process.env.TIKTOK_ACCESS_TOKEN;
    const advId = process.env.TIKTOK_ADVERTISER_ID;
    if (!token || !advId) return res.status(400).json({ success: false, error: 'Missing TIKTOK_ACCESS_TOKEN or TIKTOK_ADVERTISER_ID' });
    const conn = await tiktok.testConnection(token, advId);
    if (!conn.success) return res.status(401).json({ success: false, error: conn.error, hint: 'Access token may have expired.' });
    const today = new Date(); const ago = new Date(today); ago.setDate(ago.getDate() - 3);
    const report = await tiktok.getAdReport(token, advId, ago.toISOString().split('T')[0], today.toISOString().split('T')[0]);
    return res.status(200).json({ success: true, account: conn.account, testPull: { adsReturned: report.length } });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
};
