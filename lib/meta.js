// lib/meta.js - Meta Graph API data pull (Facebook + Instagram)
const fetch = require('node-fetch');
const BASE = 'https://graph.facebook.com/v21.0';

async function getAdInsights(accessToken, adAccountId, dateFrom, dateTo) {
  const fields = 'ad_name,adset_name,campaign_name,impressions,reach,frequency,spend,clicks,ctr,cpc,cpm,actions,cost_per_action_type,inline_link_clicks,inline_link_click_ctr';
  const url = `${BASE}/${adAccountId}/insights?fields=${fields}&time_range={"since":"${dateFrom}","until":"${dateTo}"}&level=ad&limit=500&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`Meta API: ${data.error.message}`);
  let all = data.data || [];
  let next = data.paging?.next;
  while (next) { const r = await fetch(next); const d = await r.json(); all = all.concat(d.data||[]); next = d.paging?.next; }
  return all;
}

async function getCampaignInsights(accessToken, adAccountId, dateFrom, dateTo) {
  const fields = 'campaign_name,impressions,reach,frequency,spend,clicks,ctr,cpc,cpm,actions,cost_per_action_type';
  const url = `${BASE}/${adAccountId}/insights?fields=${fields}&time_range={"since":"${dateFrom}","until":"${dateTo}"}&level=campaign&limit=500&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`Meta API: ${data.error.message}`);
  return data.data || [];
}

async function testConnection(accessToken, adAccountId) {
  const url = `${BASE}/${adAccountId}?fields=name,account_status,currency,timezone_name&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) return { success: false, error: data.error.message };
  return { success: true, account: { name: data.name, status: data.account_status === 1 ? 'ACTIVE' : 'INACTIVE', currency: data.currency, timezone: data.timezone_name } };
}

module.exports = { getAdInsights, getCampaignInsights, testConnection };
