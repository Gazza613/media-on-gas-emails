// api/daily-internal.js
// Runs DAILY at 7am SAST via Vercel cron
// Creates a separate Gmail DRAFT for each active campaign
// Internal email with flags and optimisation recommendations
// All drafts to: gary@gasmarketing.co.za

const { pullAndProcessAll } = require('../lib/pull-data');
const claude = require('../lib/claude');
const emailBuilder = require('../lib/email-builder');
const gmail = require('../lib/gmail');

module.exports = async function handler(req, res) {
  const startTime = Date.now();
  const log = [];
  const draftsCreated = [];

  try {
    // ---- STEP 1: Pull and process all campaigns ----
    const campaignReports = await pullAndProcessAll(log);
    log.push(`Detected ${campaignReports.length} active campaigns`);

    if (campaignReports.length === 0) {
      log.push('No active campaigns found. No drafts created.');
      return res.status(200).json({ success: true, drafts: 0, log });
    }

    // ---- STEP 2: For each campaign, generate narratives and create draft ----
    const to = process.env.DRAFT_EMAIL || 'gary@gasmarketing.co.za';
    const today = new Date();
    const reportDate = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    for (const { campaign, reportData, metaCount, tiktokCount, hasTikTok } of campaignReports) {
      log.push(`--- Processing: ${campaign.name} ---`);

      // Generate internal narratives
      log.push(`Generating internal narratives for ${campaign.name}...`);
      const narratives = await claude.generateInternalNarratives(reportData);
      log.push('Narratives generated');

      // Build HTML
      log.push('Building internal email HTML...');
      const html = emailBuilder.buildInternalEmail(reportData, narratives);
      log.push(`HTML: ${html.length} chars`);

      // Build subject line
      const platforms = hasTikTok
        ? 'Facebook, Instagram and TikTok'
        : 'Facebook and Instagram';
      const subject = `${campaign.name} | Daily Media Insights and Flags | ${platforms} | ${reportDate}`;

      // Create Gmail draft
      log.push(`Creating draft for ${campaign.name}...`);
      const result = await gmail.createDraft(to, subject, html);
      log.push(`Draft created: ${result.draftId}`);

      draftsCreated.push({
        campaign: campaign.name,
        draftId: result.draftId,
        metaAds: metaCount,
        tiktokAds: tiktokCount,
        spend: Math.round(reportData.combined.spend),
        pacing: reportData.combined.pacing + '%'
      });
    }

    // ---- DONE ----
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log.push(`Completed in ${elapsed}s. ${draftsCreated.length} drafts created.`);

    return res.status(200).json({
      success: true,
      type: 'daily-internal',
      draftsCreated: draftsCreated.length,
      drafts: draftsCreated,
      elapsed: `${elapsed}s`,
      log
    });

  } catch (error) {
    log.push(`ERROR: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message, log });
  }
};
