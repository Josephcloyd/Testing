const fallbackModel = "gpt-4.1-mini";

function json(response, status = 200) {
  return new Response(JSON.stringify(response), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
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

export default async function handler(request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!process.env.OPENAI_API_KEY) {
    return json({ error: "OPENAI_API_KEY is not configured" }, 503);
  }

  let body;

  try {
    body = await request.json();
  } catch (error) {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { question, profile, history = [] } = body;

  if (!question || !profile) {
    return json({ error: "Missing question or profile" }, 400);
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
    return json(
      {
        error: "OpenAI request failed",
        detail: result.error?.message || "Unknown API error",
      },
      openaiResponse.status
    );
  }

  return json({
    answer: readOutputText(result),
  });
}
