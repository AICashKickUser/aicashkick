// .github/scripts/ai-agent.js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const Parser = require('rss-parser');

// --- Configuration ---
const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
const branch = 'main';
const reviewsDir = 'reviews';
const groqApiKey = process.env.GROQ_API_KEY;

// Ensure the reviews directory exists
if (!fs.existsSync(reviewsDir)) {
  fs.mkdirSync(reviewsDir, { recursive: true });
}

// --- Main Logic ---

async function runAgent() {
  console.log("🚀 Starting AI Agent with RSS and Groq...");
  const today = new Date().toISOString().split('T')[0];
  const fileName = `ai-tools-${today}.html`;
  const filePath = path.join(reviewsDir, fileName);

  try {
    // 1. Get AI tools from RSS feeds
    console.log("📡 Fetching AI tools from RSS feeds...");
    const parser = new Parser();
    const feeds = [
      'https://www.producthunt.com/rss',
      'https://techcrunch.com/category/artificial-intelligence/feed/',
      'https://venturebeat.com/ai/feed/'
    ];
    
    let allItems = [];
    for (const feedUrl of feeds) {
      try {
        const feed = await parser.parseURL(feedUrl);
        allItems = allItems.concat(feed.items.slice(0, 3)); // Get top 3 from each feed
      } catch (error) {
        console.log(`Failed to parse feed ${feedUrl}: ${error.message}`);
      }
    }
    
    // Filter for AI-related content
    const aiTools = allItems.filter(item => 
      item.title.toLowerCase().includes('ai') || 
      item.title.toLowerCase().includes('artificial intelligence') ||
      (item.contentSnippet && item.contentSnippet.toLowerCase().includes('ai')) ||
      (item.contentSnippet && item.contentSnippet.toLowerCase().includes('artificial intelligence'))
    ).slice(0, 5); // Limit to 5 tools
    
    console.log(`✅ Found ${aiTools.length} AI tools from feeds.`);

    // 2. Generate reviews using Groq
    console.log("🤖 Generating reviews with Groq...");
    let toolsHtml = '';
    
    for (const tool of aiTools) {
      const prompt = `
        Based on this information, write a professional review in HTML for an AI tool.
        
        Title: ${tool.title}
        Description: ${tool.contentSnippet || 'No description available'}
        Link: ${tool.link}
        
        Format your response as HTML:
        <div class="ai-review">
          <h2>[Extract tool name from title]</h2>
          <p><strong>Description:</strong> [Summarize the description]</p>
          <p><strong>Key Features:</strong> [Extract 2-3 key features]</p>
          <p><strong>Target Audience:</strong> [Who would benefit from this tool]</p>
          <p><strong>Pros:</strong> [List 2-3 advantages]</p>
          <p><strong>Cons:</strong> [List 1-2 potential drawbacks]</p>
          <p><strong>Rating:</strong> [Give it a rating out of 10]</p>
          <p><strong>Source:</strong> <a href="${tool.link}" target="_blank">Read more</a></p>
        </div>
        <hr>
      `;
      
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192', // Free model on Groq
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
          })
        });
        
        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
          toolsHtml += data.choices[0].message.content;
        } else {
          throw new Error('No valid response from Groq API');
        }
      } catch (error) {
        console.error(`Error generating review for ${tool.title}:`, error.message);
        toolsHtml += `
          <div class="ai-review">
            <h2>${tool.title}</h2>
            <p><strong>Description:</strong> ${tool.contentSnippet || 'No description available'}</p>
            <p><strong>Review:</strong> Unable to generate AI review at this time.</p>
            <p><strong>Source:</strong> <a href="${tool.link}" target="_blank">Read more</a></p>
          </div>
          <hr>
        `;
      }
    }

    // 3. Create the HTML page
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Latest AI Tools - ${today}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .ai-review { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
          h1, h2 { color: #333; }
          a { color: #0066cc; }
          hr { border: none; border-top: 1px solid #ddd; margin: 30px 0; }
        </style>
      </head>
      <body>
        <h1>Latest AI Tools and Services</h1>
        <p><em>Updated on ${new Date().toLocaleDateString()}</em></p>
        ${toolsHtml}
      </body>
      </html>
    `;

    // 4. Save the HTML file
    fs.writeFileSync(filePath, fullHtml);
    console.log(`💾 Saved review to ${filePath}`);

    // 5. Commit and Push to GitHub
    console.log("📤 Committing and pushing to GitHub...");
    const { execSync } = require('child_process');
    
    execSync(`git config --global user.name "GitHub Actions Bot"`);
    execSync(`git config --global user.email "actions@github.com"`);
    execSync(`git add ${filePath}`);
    execSync(`git commit -m "Add daily AI tools review: ${fileName}"`);
    execSync(`git push https://${process.env.PERSONAL_ACCESS_TOKEN}@github.com/${owner}/${repo}.git ${branch}`);

    console.log("✅ Workflow complete!");

  } catch (error) {
    console.error("❌ Workflow failed:", error.message);
    process.exit(1);
  }
}

runAgent();
