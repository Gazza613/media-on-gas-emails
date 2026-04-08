const Anthropic = require('@anthropic-ai/sdk');

async function generateClientNarratives(reportData) {
  const client = new Anthropic();
  const { meta, tiktok, combined, community, dateRange } = reportData;

  const prompt = `You are SAMI, Head of AI Agents Team at GAS Marketing Automation. Generate campaign report narratives for the MTN MoMo client email.

RULES (LOCKED):
- No em dashes anywhere. Use commas or "to" instead.
- British English spelling (optimise, analyse, behaviour)
- Never say "Meta Paid Social", only "Paid Social"
- Never say "programme", always "campaign"
- CPC throughout (not CPR). CPF for follower/community metrics only.
- Never say "Pangle Dest. Clicks", always "App Install Clicks"
- TikTok clicks = App Install Clicks (clicks to app store)
- No optimisation strategies in client email
- Keep reads factual, data-driven, concise

DATA:
Facebook: ${JSON.stringify(meta.facebook)}
Instagram: ${JSON.stringify(meta.instagram)}
Meta KPIs: App Install ${JSON.stringify(meta.kpis.appInstall)}, Page Likes ${JSON.stringify(meta.kpis.pageLikes)}, IG Followers ${JSON.stringify(meta.kpis.igFollowers)}, Homeloans ${JSON.stringify(meta.kpis.homeloans)}
TikTok Total: ${JSON.stringify(tiktok.total)}
TikTok App Install: ${JSON.stringify(tiktok.appInstall)}
TikTok Follower: ${JSON.stringify(tiktok.follower)}
Combined: ${JSON.stringify(combined)}
Community: ${JSON.stringify(community)}

Generate these sections as JSON:
1. "facebookRead" - 3 to 4 sentences on Facebook performance
2. "instagramRead" - 2 to 3 sentences on Instagram performance
3. "tiktokRead" - 3 to 4 sentences on TikTok (mention App Install Clicks and Follower campaign)
4. "combinedRead" - 3 to 4 sentences on combined 3-platform performance
5. "insights" - Array of 3 to 4 objects with "title" and "body"

Respond ONLY with valid JSON, no markdown backticks.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514', max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });
  return JSON.parse(response.content[0].text.replace(/\`\`\`json|\`\`\`/g, '').trim());
}

async function generateInternalNarratives(reportData) {
  const client = new Anthropic();
  const { meta, tiktok, combined, community, dateRange } = reportData;

  const prompt = `You are SAMI, Head of AI Agents Team at GAS Marketing Automation. Generate internal briefing narratives for Georgia on the MTN MoMo campaign.

RULES (LOCKED):
- No em dashes anywhere. Use commas or "to" instead.
- British English spelling (optimise, analyse, behaviour)
- This IS the internal email, so include optimisation strategies and flags
- CPC throughout (not CPR). CPF for follower/community metrics only.
- Never say "Pangle Dest. Clicks", always "App Install Clicks"
- TikTok clicks = App Install Clicks (clicks to app store)
- Be direct, analytical, action-oriented

DATA:
Facebook: ${JSON.stringify(meta.facebook)}
Instagram: ${JSON.stringify(meta.instagram)}
Meta KPIs: App Install ${JSON.stringify(meta.kpis.appInstall)}, Page Likes ${JSON.stringify(meta.kpis.pageLikes)}, IG Followers ${JSON.stringify(meta.kpis.igFollowers)}, Homeloans ${JSON.stringify(meta.kpis.homeloans)}
TikTok Total: ${JSON.stringify(tiktok.total)}
TikTok App Install: ${JSON.stringify(tiktok.appInstall)}
TikTok Follower: ${JSON.stringify(tiktok.follower)}
Top TT Follower Ads: ${JSON.stringify(tiktok.topAds.follower)}
Top TT App Install Ads: ${JSON.stringify(tiktok.topAds.appInstall?.slice(0, 3))}
Combined: ${JSON.stringify(combined)}
Community: ${JSON.stringify(community)}

Generate these sections as JSON:
1. "metaInsight" - 4 to 5 sentences covering App Install efficiency, Page Likes budget concern, IG Follower dependency, Homeloans
2. "tiktokInsight" - 3 to 4 sentences on TikTok App Install clicks, Follower CPF comparison, budget shift recommendation
3. "flags" - Array of 4 to 5 objects with "code" (F1, F2...), "level" (HIGH/MEDIUM/WATCH), "body" 1 to 2 sentences
4. "optimisations" - Array of 4 to 5 objects with "code" (O1, O2...), "action", "impact"

Respond ONLY with valid JSON, no markdown backticks.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514', max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }]
  });
  return JSON.parse(response.content[0].text.replace(/\`\`\`json|\`\`\`/g, '').trim());
}

module.exports = { generateClientNarratives, generateInternalNarratives };
