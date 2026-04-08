// lib/process.js
// Processes raw Meta + TikTok API data into report-ready structures
// Applies ALL locked MTN MoMo reporting rules
// Handles Meta-only campaigns (e.g. Willowbrook) and Meta+TikTok (e.g. MTN MoMo)

// ---- CLASSIFICATION ----

function getMetaPlatform(name) {
  const n = String(name);
  if (n.includes('| IG |') || n.includes('IG |') || n.includes('| IG') || n.toLowerCase().includes('instagram')) {
    return 'Instagram';
  }
  return 'Facebook';
}

function getMetaObjective(name) {
  const n = String(name).toLowerCase();
  if (n.includes('pos') || (n.includes('lead') && !n.includes('homeloan'))) return 'POS';
  if (n.includes('page like')) return 'Page Likes';
  if (n.includes('follow')) return 'IG Followers';
  if (n.includes('app install') || n.includes('appinstall')) return 'App Install Clicks';
  if (n.includes('homeloan')) return 'Homeloans Traffic';
  if (n.includes('funnel lead') || n.includes('lead')) return 'Lead Generation';
  return 'Other';
}

function shouldExclude(name) {
  const n = String(name).toLowerCase();
  return n.includes('pos') && !n.includes('homeloan');
}

// ---- META PROCESSING ----

function processMetaData(adInsights) {
  const filtered = adInsights.filter(ad => !shouldExclude(ad.campaign_name || ad.ad_name || ''));

  const ads = filtered.map(ad => {
    const name = ad.ad_name || '';
    const platform = getMetaPlatform(name);
    const objective = getMetaObjective(ad.campaign_name || name);
    const actions = ad.actions || [];
    let results = 0;
    for (const action of actions) {
      if (['link_click', 'like', 'follow', 'landing_page_view', 'lead', 'onsite_conversion.lead_grouped'].includes(action.action_type)) {
        results += parseInt(action.value || 0);
      }
    }
    // Fallback: use inline_link_clicks if no action results
    if (results === 0 && ad.inline_link_clicks) {
      results = parseInt(ad.inline_link_clicks);
    }

    return {
      name, adsetName: ad.adset_name || '', campaignName: ad.campaign_name || '',
      platform, objective,
      impressions: parseInt(ad.impressions || 0),
      reach: parseInt(ad.reach || 0),
      spend: parseFloat(ad.spend || 0),
      clicks: parseInt(ad.clicks || 0),
      ctr: parseFloat(ad.ctr || 0),
      cpc: parseFloat(ad.cpc || 0),
      cpm: parseFloat(ad.cpm || 0),
      results,
      frequency: parseFloat(ad.frequency || 0),
      previewLink: ad.preview_shareable_link || ''
    };
  });

  // Platform aggregation
  function aggPlatform(plat) {
    const f = ads.filter(a => a.platform === plat);
    const imp = f.reduce((s, a) => s + a.impressions, 0);
    const sp = f.reduce((s, a) => s + a.spend, 0);
    const cl = f.reduce((s, a) => s + a.clicks, 0);
    return { impressions: imp, spend: sp, clicks: cl, reach: f.reduce((s,a) => s + a.reach, 0),
      cpm: imp > 0 ? sp / imp * 1000 : 0, ctr: imp > 0 ? cl / imp * 100 : 0, cpc: cl > 0 ? sp / cl : 0 };
  }

  // Objective aggregation
  function aggObjective(obj) {
    const f = ads.filter(a => a.objective === obj);
    const sp = f.reduce((s, a) => s + a.spend, 0);
    const res = f.reduce((s, a) => s + a.results, 0);
    const cl = f.reduce((s, a) => s + a.clicks, 0);
    const imp = f.reduce((s, a) => s + a.impressions, 0);
    return { results: res, spend: sp, clicks: cl, impressions: imp,
      cpc: res > 0 ? sp / res : (cl > 0 ? sp / cl : 0), ctr: imp > 0 ? cl / imp * 100 : 0 };
  }

  const facebook = aggPlatform('Facebook');
  const instagram = aggPlatform('Instagram');
  const metaTotal = {
    impressions: facebook.impressions + instagram.impressions,
    spend: facebook.spend + instagram.spend,
    clicks: facebook.clicks + instagram.clicks,
    cpm: (facebook.spend + instagram.spend) / ((facebook.impressions + instagram.impressions) || 1) * 1000,
    ctr: (facebook.clicks + instagram.clicks) / ((facebook.impressions + instagram.impressions) || 1) * 100,
    cpc: (facebook.spend + instagram.spend) / ((facebook.clicks + instagram.clicks) || 1)
  };

  const kpis = {
    appInstall: aggObjective('App Install Clicks'),
    pageLikes: aggObjective('Page Likes'),
    igFollowers: aggObjective('IG Followers'),
    homeloans: aggObjective('Homeloans Traffic'),
    leadGen: aggObjective('Lead Generation')
  };

  // Top ads by results
  function topAds(obj, limit) {
    return ads.filter(a => a.objective === obj && a.spend > 50)
      .sort((a, b) => b.results - a.results).slice(0, limit);
  }

  return {
    facebook, instagram, metaTotal, kpis, ads,
    topAds: {
      appInstall: topAds('App Install Clicks', 5),
      followers: topAds('IG Followers', 4),
      homeloans: topAds('Homeloans Traffic', 3),
      leadGen: topAds('Lead Generation', 8)
    }
  };
}

// ---- TIKTOK PROCESSING ----

function processTikTokData(adReport) {
  if (!adReport || !adReport.length) return null;

  const ads = adReport.map(item => {
    const m = item.metrics || item;
    const name = m.ad_name || item.ad_name || '';
    const n = name.toLowerCase();
    const campaignType = (n.includes('appinstall') || n.includes('app install')) ? 'App Install'
      : n.includes('follower') ? 'Follower' : 'Other';

    return {
      name, campaignType,
      impressions: parseInt(m.impressions || 0), spend: parseFloat(m.spend || 0),
      clicks: parseInt(m.clicks || 0), reach: parseInt(m.reach || 0),
      videoViews: parseInt(m.video_watched_2s || m.video_play_actions || 0),
      follows: parseInt(m.follows || 0), likes: parseInt(m.likes || 0),
      comments: parseInt(m.comments || 0), shares: parseInt(m.shares || 0)
    };
  }).filter(a => a.spend > 0);

  function sum(arr, f) { return arr.reduce((s, a) => s + (a[f] || 0), 0); }
  function clean(name) { return name.replace(/^Mar 26\|?/i, '').replace(/^MP4\|?/i, '').replace(/\|/g, ', ').trim(); }

  const ai = ads.filter(a => a.campaignType === 'App Install');
  const fo = ads.filter(a => a.campaignType === 'Follower');

  const appInstall = { impressions: sum(ai,'impressions'), spend: sum(ai,'spend'), clicks: sum(ai,'clicks'),
    cpm: sum(ai,'spend') / (sum(ai,'impressions') || 1) * 1000, videoViews: sum(ai,'videoViews') };

  const fFollows = sum(fo,'follows');
  const follower = { impressions: sum(fo,'impressions'), spend: sum(fo,'spend'), follows: fFollows,
    likes: sum(fo,'likes'), comments: sum(fo,'comments'), shares: sum(fo,'shares'),
    cpf: fFollows > 0 ? sum(fo,'spend') / fFollows : 0, videoViews: sum(fo,'videoViews') };

  const totalImp = sum(ads,'impressions');
  const totalViews = sum(ads,'videoViews');
  const total = { impressions: totalImp, spend: sum(ads,'spend'),
    cpm: sum(ads,'spend') / (totalImp || 1) * 1000,
    videoViews: totalViews, viewRate: totalImp > 0 ? totalViews / totalImp * 100 : 0,
    follows: sum(ads,'follows'), likes: sum(ads,'likes'), comments: sum(ads,'comments') };

  const topFollower = fo.filter(a => a.follows > 0).sort((a, b) => b.follows - a.follows).slice(0, 5)
    .map(a => ({ name: clean(a.name), follows: a.follows, cpf: a.spend / a.follows, spend: a.spend }));
  const topAppInstall = ai.sort((a, b) => b.clicks - a.clicks).slice(0, 5)
    .map(a => ({ name: clean(a.name), clicks: a.clicks, spend: a.spend }));

  return { appInstall, follower, total, topAds: { appInstall: topAppInstall, follower: topFollower }, ads };
}

// ---- COMBINED REPORT ----

function buildCombinedReport(meta, tiktok, config) {
  const hasTikTok = tiktok !== null && tiktok !== undefined;
  const ttImp = hasTikTok ? tiktok.total.impressions : 0;
  const ttSpend = hasTikTok ? tiktok.total.spend : 0;
  const ttFollows = hasTikTok ? tiktok.follower.follows : 0;

  const combinedImp = meta.metaTotal.impressions + ttImp;
  const combinedSpend = meta.metaTotal.spend + ttSpend;
  const combinedBudget = config.combinedBudget || config.metaBudget || 0;

  const community = {
    fbLikes: meta.kpis.pageLikes.results,
    igFollows: meta.kpis.igFollowers.results,
    ttFollows: ttFollows,
    total: meta.kpis.pageLikes.results + meta.kpis.igFollowers.results + ttFollows
  };

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysElapsed = Math.floor((today - monthStart) / 86400000);
  const totalDays = monthEnd.getDate();

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  return {
    meta, tiktok, hasTikTok,
    combined: {
      impressions: combinedImp, spend: combinedSpend, budget: combinedBudget,
      cpm: combinedImp > 0 ? combinedSpend / combinedImp * 1000 : 0,
      pacing: combinedBudget > 0 ? (combinedSpend / combinedBudget * 100).toFixed(1) : '0',
      timeElapsed: (daysElapsed / totalDays * 100).toFixed(1),
      daysElapsed, totalDays,
      tiktokShare: combinedImp > 0 ? (ttImp / combinedImp * 100).toFixed(1) : '0'
    },
    community,
    dateRange: {
      from: `1 ${months[today.getMonth()]} ${today.getFullYear()}`,
      to: `${daysElapsed} ${months[today.getMonth()]} ${today.getFullYear()}`
    }
  };
}

module.exports = { processMetaData, processTikTokData, buildCombinedReport, shouldExclude };
