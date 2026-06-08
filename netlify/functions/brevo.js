exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { email, url, score } = body;
  if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: "Email manquant" }) };

  const BREVO_KEY = process.env.BREVO_KEY;

  try {
    const https = require("https");

    const payload = JSON.stringify({
      email,
      listIds: [5],
      attributes: {
        SOURCE: "diagnostic_business",
        SITE_ANALYSE: url,
        BUSINESS_SCORE: score,
        ANALYSE_DATE: new Date().toISOString(),
      },
      updateEnabled: true,
    });

    const data = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: "api.brevo.com",
        path: "/v3/contacts",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": BREVO_KEY,
          "Content-Length": Buffer.byteLength(payload),
        },
      }, (res) => {
        let raw = "";
        res.on("data", chunk => raw += chunk);
        res.on("end", () => {
          try { resolve(JSON.parse(raw)); }
          catch(e) { resolve({ raw }); }
        });
      });
      req.on("error", reject);
      req.write(payload);
      req.end();
    });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, data }) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
