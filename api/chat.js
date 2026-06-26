const fallbackModel = "gpt-4.1-mini";

function sendJson(response, body, status = 200) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(body);
}

function parseBody(request) {
  if (!request.body) {
    return null;
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body);
  }

  return request.body;
}

function readOutputText(result) {
  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  const text = result.output
    ?.flatMap((item) => item.content || [])
    .map((content) => content.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  return text || "I am sorry, I could not generate an answer right now.";
}

function buildProfileContext(profile) {
  return `
Name: ${profile.name}
Role: ${profile.role}
Education: ${profile.education}
Experience: ${profile.experience}
Skills: ${profile.skills}
Strengths: ${profile.strengths}
Tourism fit: ${profile.tourism}
Hobbies: ${profile.hobbies}
Contact: ${profile.contact}
Summary: ${profile.summary}
`.trim();
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return sendJson(response, { error: "Method not allowed" }, 405);
  }

  if (!process.env.OPENAI_API_KEY) {
    return sendJson(response, { error: "OPENAI_API_KEY is not configured" }, 503);
  }

  let body;

  try {
    body = parseBody(request);
  } catch (error) {
    return sendJson(response, { error: "Invalid JSON body" }, 400);
  }

  if (!body || typeof body !== "object") {
    return sendJson(response, { error: "Invalid JSON body" }, 400);
  }

  const { question, profile, history = [] } = body;

  if (!question || !profile) {
    return sendJson(response, { error: "Missing question or profile" }, 400);
  }

  const safeHistory = Array.isArray(history)
    ? history
        .slice(-6)
        .filter((message) => ["user", "assistant"].includes(message.role))
        .map((message) => ({
          role: message.role,
          content: String(message.content || "").slice(0, 1200),
        }))
    : [];

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || fallbackModel,
        instructions:
          "You are Allison Rose Suarez's portfolio assistant for HR visitors. Answer warmly, professionally, and only from the provided profile. If information is missing, say it is not listed in the portfolio. Keep answers concise and helpful.",
        input: [
          {
            role: "developer",
            content: `Portfolio profile:\n${buildProfileContext(profile)}`,
          },
          ...safeHistory,
          {
            role: "user",
            content: String(question).slice(0, 1200),
          },
        ],
      }),
    });

    const result = await openaiResponse.json();

    if (!openaiResponse.ok) {
      return sendJson(
        response,
        {
          error: "OpenAI request failed",
          detail: result.error?.message || "Unknown API error",
        },
        openaiResponse.status
      );
    }

    return sendJson(response, {
      answer: readOutputText(result),
    });
  } catch (error) {
    return sendJson(
      response,
      {
        error: "Chat service failed",
        detail: error.message || "Unknown server error",
      },
      500
    );
  }
}
