const meta = require('../lib/meta');
module.exports = async function handler(req, res) {
  try {
    const token = process.env.META_ACCESS_TOKEN;
    const accountId = process.env.META_AD_ACCOUNT_ID;
    if (!token || !accountId) return res.status(400).json({ success: false, error: 'Missing META_ACCESS_TOKEN or META_AD_ACCOUNT_ID' });
    const conn = await meta.testConnection(token, accountId);
    if (!conn.success) return res.status(401).json({ success: false, error: conn.error, hint: 'Token may have expired. Regenerate from Graph API Explorer.' });
    const today = new Date(); const ago = new Date(today); ago.setDate(ago.getDate() - 3);
    const insights = await meta.getAdInsights(token, accountId, ago.toISOString().split('T')[0], today.toISOString().split('T')[0]);
    return res.status(200).json({ success: true, account: conn.account, testPull: { adsReturned: insights.length, sampleNames: insights.slice(0,3).map(a => a.ad_name||'N/A') } });
  } catch (e) { return res.status(500).json({ success: false, error: e.message }); }
};
