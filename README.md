# Allison Rose Suarez Portfolio

Deployment-ready static portfolio with an optional OpenAI-powered HR chat assistant.

## Files

- `index.html` - main portfolio page
- `styles.css` - responsive styling
- `script.js` - chat UI, local fallback answers, and `/api/chat` integration
- `assets/` - portfolio images
- `api/chat.js` - serverless OpenAI chat endpoint for Vercel-style deployment

## Deploy on Vercel

1. Create a new Vercel project using this folder as the project root.
2. Add environment variables:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` optional, defaults to `gpt-4.1-mini`
3. Deploy.

This project uses `index.html` as the site entry point. Do not add or deploy an
`index.php` entry file on Vercel because PHP is not executed by this setup and
can be served as a download instead of a webpage.

If `OPENAI_API_KEY` is not set, the chatbot still works in local fallback mode with built-in portfolio answers.

## Deploy as Static Only

You can also upload this folder to GitHub Pages, Netlify, or any static host. In that mode, the portfolio works normally and the chatbot uses local fallback answers instead of the OpenAI API.

## Local Checks

Run:

```bash
npm run check
```

For Vercel local API testing, install/use Vercel CLI and run:

```bash
vercel dev
```
