exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const { email, url, score } = body;
  if (!email) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Email manquant" }),
    };
  }

  const BREVO_KEY = process.env.BREVO_KEY;

  try {
    const resp = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": BREVO_KEY,
      },
      body: JSON.stringify({
        email,
        listIds: [5],
        attributes: {
          SOURCE: "diagnostic_virgule",
          SITE_ANALYSE: url,
          SCORE: score,
        },
        updateEnabled: true,
      }),
    });

    const data = await resp.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, data }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: e.message }),
    };
  }
};
