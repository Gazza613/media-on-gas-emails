const fetch = require('node-fetch');

module.exports = async function handler(req, res) {
  try {
    const token = process.env.TIKTOK_ACCESS_TOKEN;
    const advertiserId = process.env.TIKTOK_ADVERTISER_ID;

    // Test 1: Connection
    const connRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=["' + advertiserId + '"]', {
      method: 'GET',
      headers: { 'Access-Token': token }
    });
    const connData = await connRes.json();

    // Test 2: Report - minimal request to debug
    const reportBody = {
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      dimensions: ['ad_id'],
      data_level: 'AUCTION_AD',
      start_date: '2026-03-01',
      end_date: '2026-03-29',
      metrics: ['spend', 'impressions', 'clicks'],
      page: 1,
      page_size: 10
    };

    const reportRes = await fetch('https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': token
      },
      body: JSON.stringify(reportBody)
    });

    const rawText = await reportRes.text();
    let reportData;
    try {
      reportData = JSON.parse(rawText);
    } catch (e) {
      reportData = { parseError: true, firstChars: rawText.substring(0, 500) };
    }

    return res.status(200).json({
      connection: connData.code === 0 ? 'OK' : connData.message,
      reportStatus: reportRes.status,
      reportData
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
