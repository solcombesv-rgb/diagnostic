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

  const PS_KEY = process.env.PAGESPEED_KEY || "AIzaSyBdvbIu7iEg39CezY1M-xGta2bGIrpGjHw";
  const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo&key=${PS_KEY}`;

  try {
    const resp = await fetch(psUrl);
    const data = await resp.json();

    if (data.error) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ error: "site_unreachable", detail: data.error.message }),
      };
    }

    const cats  = data.lighthouseResult?.categories ?? {};
    const audits = data.lighthouseResult?.audits ?? {};

    function score(key) {
      return Math.round((cats[key]?.score ?? 0) * 100);
    }

    const result = {
      performance:      score("performance"),
      seo:              score("seo"),
      accessibility:    score("accessibility"),
      bestPractices:    score("best-practices"),
      fcp:  audits["first-contentful-paint"]?.displayValue ?? "—",
      lcp:  audits["largest-contentful-paint"]?.displayValue ?? "—",
      cls:  audits["cumulative-layout-shift"]?.displayValue ?? "—",
      tbt:  audits["total-blocking-time"]?.displayValue ?? "—",
      speedIndex: audits["speed-index"]?.displayValue ?? "—",
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
