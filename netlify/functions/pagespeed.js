exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const { url } = event.queryStringParameters || {};

  if (!url) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "URL manquante" }) };
  }

  const PS_KEY = process.env.PAGESPEED_KEY;const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&key=${PS_KEY}&category=performance&category=accessibility&category=best-practices&category=seo`;

  try {
    const https = require("https");

    const data = await new Promise((resolve, reject) => {
      https.get(psUrl, (res) => {
        let raw = "";
        res.on("data", chunk => raw += chunk);
        res.on("end", () => {
          try { resolve(JSON.parse(raw)); }
          catch(e) { reject(e); }
        });
      }).on("error", reject);
    });

    if (data.error) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ error: "site_unreachable", detail: data.error.message }),
      };
    }

    const cats   = data.lighthouseResult?.categories ?? {};
    const audits = data.lighthouseResult?.audits ?? {};

    function score(key) {
      return Math.round((cats[key]?.score ?? 0) * 100);
    }

    // Extract Lighthouse scores (0-100)
    const performanceScore = score("performance");
    const seoScore = score("seo");
    const accessibilityScore = score("accessibility");
    const bestPracticesScore = score("best-practices");

    // ═══════════════════════════════════════════════════════════════
    // DETERMINISTIC BUSINESS SCORE CALCULATION
    // 100% based on Lighthouse + fixed weighted rules
    // ═══════════════════════════════════════════════════════════════

    // 1. CONVERSION SCORE (30% weight in business score)
    // = Performance (50%) + Best Practices (50%)
    // Conversion depends heavily on site loading speed and trust signals
    const conversionScore = Math.round(
      (performanceScore * 0.5) + (bestPracticesScore * 0.5)
    );

    // 2. DESIGN UX SCORE (25% weight)
    // = Performance (60%) + Accessibility (40%)
    // Good UX = fast loading + accessible to all users
    const designScore = Math.round(
      (performanceScore * 0.6) + (accessibilityScore * 0.4)
    );

    // 3. CREDIBILITY SCORE (20% weight)
    // = Best Practices (70%) + Accessibility (30%)
    // Trust comes from following web standards + being usable by everyone
    const credibilityScore = Math.round(
      (bestPracticesScore * 0.7) + (accessibilityScore * 0.3)
    );

    // 4. PERFORMANCE PERCEIVED (15% weight)
    // = Performance score directly
    // This is how fast the site *feels* to users
    const performancePerceivedScore = performanceScore;

    // 5. SEO SCORE (10% weight)
    // = SEO score directly from Lighthouse
    const seoBusinessScore = seoScore;

    // ═══════════════════════════════════════════════════════════════
    // BUSINESS SCORE = Weighted average of all dimensions
    // ═══════════════════════════════════════════════════════════════
    const businessScore = Math.round(
      (conversionScore * 0.30) +
      (designScore * 0.25) +
      (credibilityScore * 0.20) +
      (performancePerceivedScore * 0.15) +
      (seoBusinessScore * 0.10)
    );

    const result = {
      // Business metrics (for conversion-focused reporting)
      businessScore: Math.min(100, Math.max(0, businessScore)),
      conversion: Math.min(100, Math.max(0, conversionScore)),
      design: Math.min(100, Math.max(0, designScore)),
      credibility: Math.min(100, Math.max(0, credibilityScore)),
      seo: Math.min(100, Math.max(0, seoBusinessScore)),
      performancePerceived: Math.min(100, Math.max(0, performancePerceivedScore)),

      // Raw Lighthouse scores (for reference)
      performance: performanceScore,
      accessibility: accessibilityScore,
      bestPractices: bestPracticesScore,
      
      // Performance metrics (optional, if needed)
      fcp:        audits["first-contentful-paint"]?.displayValue ?? "—",
      lcp:        audits["largest-contentful-paint"]?.displayValue ?? "—",
      cls:        audits["cumulative-layout-shift"]?.displayValue ?? "—",
    };

    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "fetch_failed", detail: e.message }),
    };
  }
};
