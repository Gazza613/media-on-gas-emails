// lib/tiktok.js - TikTok Business API data pull
const fetch = require('node-fetch');
const BASE = 'https://business-api.tiktok.com/open_api/v1.3';

async function getAdReport(accessToken, advertiserId, dateFrom, dateTo) {
  const body = { advertiser_id: advertiserId, report_type: 'BASIC', dimensions: ['ad_id'], data_level: 'AUCTION_AD',
    start_date: dateFrom, end_date: dateTo, page: 1, page_size: 200, lifetime: false,
    metrics: ['ad_name','campaign_name','spend','impressions','clicks','ctr','cpc','cpm','reach','frequency',
      'video_watched_2s','follows','likes','comments','shares','conversion','cost_per_conversion'] };
  const res = await fetch(`${BASE}/report/integrated/get/`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Access-Token': accessToken }, body: JSON.stringify(body) });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`TikTok API: ${data.message}`);
  return data.data?.list || [];
}

async function testConnection(accessToken, advertiserId) {
  const res = await fetch(`${BASE}/advertiser/info/?advertiser_ids=["${advertiserId}"]`, {
    method: 'GET', headers: { 'Access-Token': accessToken } });
  const data = await res.json();
  if (data.code !== 0) return { success: false, error: data.message };
  const info = data.data?.list?.[0];
  return { success: true, account: { name: info?.name||'Unknown', status: info?.status||'Unknown', currency: info?.currency||'ZAR' } };
}

module.exports = { getAdReport, testConnection };
