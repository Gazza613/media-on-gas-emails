// lib/pull-data.js
// Shared module: pulls Meta + TikTok data, groups by campaign, returns per-campaign reports
// Auto-detects campaigns from API data

const metaApi = require('./meta');
const tiktokApi = require('./tiktok');
const dataProcessor = require('./process');

/**
 * Known campaign patterns - maps ad account campaigns to client campaign groups
 * The system auto-detects these from campaign names in the API data
 */
const CAMPAIGN_PATTERNS = [
  {
    id: 'mtn-momo',
    name: 'MTN MoMo',
    metaMatch: /momo|mtn.*momo/i,
    tiktokMatch: /momo|mtn|fintech/i,
    excludeMatch: /pos|leads/i,  // POS exclusion rule
    budget: { meta: 100000, tiktok: 65000, combined: 165000 }
  },
  {
    id: 'willowbrook',
    name: 'Willowbrook Village',
    metaMatch: /willowbrook/i,
    tiktokMatch: null, // No TikTok for Willowbrook
    excludeMatch: null,
    budget: { meta: 20000, tiktok: 0, combined: 20000 }
  },
  {
    id: 'nedbank',
    name: 'Nedbank',
    metaMatch: /nedbank/i,
    tiktokMatch: /nedbank/i,
    excludeMatch: null,
    budget: { meta: 0, tiktok: 0, combined: 0 } // Will be set from env vars
  }
  // Add more campaigns here as they come on
];

/**
 * Pull all data and return per-campaign processed reports
 * @param {Array} log - Log array for status messages
 * @returns {Array} Array of { campaign, reportData } objects
 */
async function pullAndProcessAll(log) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateFrom = formatDateISO(monthStart);
  const dateTo = formatDateISO(yesterday);
  log.push(`Date range: ${dateFrom} to ${dateTo}`);

  // Pull ALL Meta ads
  log.push('Pulling Meta data...');
  let metaRaw = [];
  try {
    metaRaw = await metaApi.getAdInsights(
      process.env.META_ACCESS_TOKEN,
      process.env.META_AD_ACCOUNT_ID,
      dateFrom,
      dateTo
    );
    log.push(`Meta: ${metaRaw.length} ad rows returned`);
  } catch (err) {
    log.push(`Meta pull failed: ${err.message}`);
  }

  // Pull ALL TikTok ads
  log.push('Pulling TikTok data...');
  let tiktokRaw = [];
  try {
    tiktokRaw = await tiktokApi.getAdReport(
      process.env.TIKTOK_ACCESS_TOKEN,
      process.env.TIKTOK_ADVERTISER_ID,
      dateFrom,
      dateTo
    );
    log.push(`TikTok: ${tiktokRaw.length} ad rows returned`);
  } catch (err) {
    log.push(`TikTok pull failed: ${err.message}`);
  }

  // Group ads by campaign
  const campaignReports = [];

  for (const pattern of CAMPAIGN_PATTERNS) {
    // Filter Meta ads for this campaign
    const campaignMetaAds = metaRaw.filter(ad => {
      const name = ad.campaign_name || ad.ad_name || '';
      if (pattern.excludeMatch && pattern.excludeMatch.test(name)) return false;
      return pattern.metaMatch && pattern.metaMatch.test(name);
    });

    // Filter TikTok ads for this campaign
    const campaignTiktokAds = pattern.tiktokMatch
      ? tiktokRaw.filter(ad => {
          const name = ad.metrics?.campaign_name || ad.metrics?.ad_name || ad.ad_name || '';
          return pattern.tiktokMatch.test(name);
        })
      : [];

    // Skip if no data for this campaign
    if (campaignMetaAds.length === 0 && campaignTiktokAds.length === 0) continue;

    log.push(`${pattern.name}: ${campaignMetaAds.length} Meta ads, ${campaignTiktokAds.length} TikTok ads`);

    // Process this campaign's data
    const metaProcessed = dataProcessor.processMetaData(campaignMetaAds);
    const tiktokProcessed = dataProcessor.processTikTokData(campaignTiktokAds);

    // Get budget from env vars or pattern defaults
    const budgetKey = pattern.id.toUpperCase().replace(/-/g, '_');
    const combinedBudget = parseInt(process.env[`${budgetKey}_COMBINED_BUDGET`] || pattern.budget.combined || 0);

    const reportData = dataProcessor.buildCombinedReport(metaProcessed, tiktokProcessed, {
      combinedBudget
    });

    campaignReports.push({
      campaign: pattern,
      reportData,
      metaCount: campaignMetaAds.length,
      tiktokCount: campaignTiktokAds.length,
      hasTikTok: campaignTiktokAds.length > 0
    });
  }

  // Also detect any unmatched campaigns (new clients)
  const matchedMetaAds = new Set();
  for (const pattern of CAMPAIGN_PATTERNS) {
    metaRaw.forEach((ad, i) => {
      const name = ad.campaign_name || '';
      if (pattern.metaMatch && pattern.metaMatch.test(name)) matchedMetaAds.add(i);
    });
  }
  const unmatchedCount = metaRaw.length - matchedMetaAds.size;
  if (unmatchedCount > 0) {
    log.push(`WARNING: ${unmatchedCount} Meta ads did not match any known campaign pattern`);
  }

  return campaignReports;
}

function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

module.exports = { pullAndProcessAll, CAMPAIGN_PATTERNS };
