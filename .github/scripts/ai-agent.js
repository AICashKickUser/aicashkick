// .github/scripts/ai-agent.js

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// --- Configuration ---
const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
const branch = 'main'; // or 'master'
const reviewsDir = 'reviews';
const openaiApiKey = process.env.OPENAI_API_KEY;

// Ensure the reviews directory exists
if (!fs.existsSync(reviewsDir)) {
  fs.mkdirSync(reviewsDir, { recursive: true });
}

// --- Helper Function for Retry Logic ---
async function callOpenAIWithRetry(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🤖 Calling OpenAI... (Attempt ${i + 1}/${maxRetries})`);
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-3.5-turbo", // Using the more established model
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      }, {
        headers: { 'Authorization': `Bearer ${openaiApiKey}` }
      });
      return response;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 20000 * (i + 1); // Exponential backoff
        console.log(`⏳ Rate limited. Waiting ${waitTime / 1000} seconds before retrying...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error; // Re-throw non-429 errors
      }
    }
  }
  throw new Error(`Failed to complete OpenAI request after ${maxRetries} retries.`);
}

// --- Main Logic ---

async function runAgent() {
  console.log("🚀 Starting AI Agent...");
  const today = new Date().toISOString().split('T')[0];
  const fileName = `ai-tools-${today}.html`;
  const filePath = path.join(reviewsDir, fileName);

  // 1. Search for AI Tools using OpenAI
  console.log("🔍 Searching for AI tools...");
  const searchPrompt = `You are an AI tool expert. Recommend 3 popular and reliable AI tools. Return your response as a JSON array of objects with this structure: {"name": "Tool Name", "description": "Brief description", "category": "Category", "pricing": "Pricing model", "website": "Official website URL if known", "useCase": "Specific use case"}. I'm looking for the latest AI tools and services.`;
  
  const searchResponse = await callOpenAIWithRetry(searchPrompt);
  const recommendations = JSON.parse(searchResponse.data.choices[0].message.content.match(/\[[\s\S]*\]/)[0]);
  console.log(`✅ Found ${recommendations.length} tools.`);

  // 2. Generate Reviews and Format HTML
  console.log("📝 Generating reviews and formatting HTML...");
  let toolsHtml = '';
  for (const tool of recommendations) {
    const reviewPrompt = `
      Based on this info, write a professional review in HTML for ${tool.name}.
      Info: Name: ${tool.name}, Desc: ${tool.description}, Category: ${tool.category}, Pricing: ${tool.pricing}, Website: ${tool.website}
      Format:
      <div class="ai-review">
        <h2>${tool.name}</h2>
        <p><strong>Category:</strong> ${tool.category}</p>
        <p><strong>Description:</strong> ${tool.description}</p>
        <p><strong>Pricing:</strong> ${tool.pricing}</p>
        <p><strong>Pros:</strong> [List 2-3 pros]</p>
        <p><strong>Cons:</strong> [List 1-2 cons]</p>
        <p><strong>Rating:</strong> [X/10]</p>
        <p><strong>Website:</strong> <a href="${tool.website}" target="_blank">Visit</a></p>
      </div>
      <hr>
    `;
    const reviewResponse = await callOpenAIWithRetry(reviewPrompt);
    toolsHtml += reviewResponse.data.choices[0].message.content;
  }

  const fullHtml = `
    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Latest AI Tools - ${today}</title><style>body{font-family:Arial,sans-serif;max-width:800px;margin:auto;padding:20px}.ai-review{margin-bottom:30px;padding:20px;border:1px solid #ddd;border-radius:5px}h1,h2{color:#333}a{color:#0066cc}hr{border:none;border-top:1px solid #ddd;margin:30px 0}</style></head><body><h1>Latest AI Tools</h1><p><em>Updated on ${new Date().toLocaleDateString()}</em></p>${toolsHtml}</body></html>
  `;

  // 3. Save the HTML file
  fs.writeFileSync(filePath, fullHtml);
  console.log(`💾 Saved review to ${filePath}`);

  // 4. Commit and Push to GitHub
  console.log("📤 Committing and pushing to GitHub...");
  const { execSync } = require('child_process');
  
  execSync(`git config --global user.name "GitHub Actions Bot"`);
  execSync(`git config --global user.email "actions@github.com"`);
  execSync(`git add ${filePath}`);
  execSync(`git commit -m "Add daily AI tools review: ${fileName}"`);
  execSync(`git push https://${process.env.PERSONAL_ACCESS_TOKEN}@github.com/${owner}/${repo}.git ${branch}`);

  console.log("✅ Workflow complete!");
}

runAgent().catch(error => {
  console.error("❌ Workflow failed:", error.message);
  if (error.response) {
    console.error("API Response Data:", error.response.data);
  }
  process.exit(1);
});
