/*
  Server-side example for connecting Allison's portfolio chat to the OpenAI API.

  Do not put OPENAI_API_KEY in browser JavaScript. Deploy this as a backend route
  such as /api/chat on Vercel, Netlify Functions, Cloudflare Workers, Express, or
  another server. The frontend in script.js will automatically try POST /api/chat.
*/

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { question, profile, history = [] } = request.body || {};

  if (!question || !profile) {
    response.status(400).json({ error: "Missing question or profile" });
    return;
  }

  const profileContext = `
Name: ${profile.name}
Role: ${profile.role}
Education: ${profile.education}
Experience: ${profile.experience}
Skills: ${profile.skills}
Strengths: ${profile.strengths}
Tourism fit: ${profile.tourism}
Hobbies: ${profile.hobbies}
Contact: ${profile.contact}
`;

  const result = await client.responses.create({
    model: "gpt-5.5",
    instructions:
      "You are Allison Rose Suarez's portfolio assistant for HR visitors. Answer warmly, professionally, and only from the provided profile. If information is missing, say it is not listed in the portfolio. Keep answers concise.",
    input: [
      {
        role: "developer",
        content: `Portfolio profile:\n${profileContext}`,
      },
      ...history.slice(-6),
      {
        role: "user",
        content: question,
      },
    ],
  });

  response.status(200).json({
    answer: result.output_text,
  });
}
