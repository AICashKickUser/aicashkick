// .github/scripts/ai-agent.js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const Parser = require('rss-parser');

// --- Configuration ---
const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
const branch = 'main';
const groqApiKey = process.env.GROQ_API_KEY;

// --- Main Logic ---

async function runAgent() {
  console.log("🚀 Starting AI Agent with RSS and Groq...");
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // 1. Get AI tools from RSS feeds
    console.log("📡 Fetching AI tools from RSS feeds...");
    const parser = new Parser();
    
    // Using more reliable RSS feeds
    const feeds = [
      'https://techcrunch.com/category/artificial-intelligence/feed/',
      'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml',
      'https://feeds.macrumors.com/MacRumors-All.xml'
    ];
    
    let allItems = [];
    for (const feedUrl of feeds) {
      try {
        console.log(`Trying to fetch from ${feedUrl}...`);
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
    ).slice(0, 3); // Limit to 3 tools
    
    console.log(`✅ Found ${aiTools.length} AI tools from feeds.`);

    // 2. Generate reviews using Groq
    console.log("🤖 Generating reviews with Groq...");
    let newArticlesHtml = '';
    
    for (const tool of aiTools) {
      const prompt = `
        Based on this information, write a professional review in HTML for an AI tool.
        
        Title: ${tool.title}
        Description: ${tool.contentSnippet || 'No description available'}
        Link: ${tool.link}
        
        Format your response as HTML:
        <article class="blog-post">
          <h3>[Extract tool name from title]</h3>
          <span class="date">${new Date().toLocaleDateString()}</span>
          <p>[Summarize tool and how it could be used for a side hustle]</p>
          <p><strong>Pros:</strong> [List 2-3 advantages]</p>
          <p><strong>Cons:</strong> [List 1-2 potential drawbacks]</p>
          <p><strong>Earning Potential:</strong> [Estimate earning potential for side hustles]</p>
          <a href="${tool.link}" target="_blank" class="affiliate">Read More</a>
          <a href="#newsletter" class="cta">Get Update Alerts</a>
        </article>
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
        console.log(`Groq response for ${tool.title}:`, JSON.stringify(data, null, 2));
        
        if (data.choices && data.choices.length > 0) {
          newArticlesHtml += data.choices[0].message.content;
        } else {
          throw new Error('No valid response from Groq API');
        }
      } catch (error) {
        console.error(`Error generating review for ${tool.title}:`, error.message);
        newArticlesHtml += `
          <article class="blog-post">
            <h3>${tool.title}</h3>
            <span class="date">${new Date().toLocaleDateString()}</span>
            <p>${tool.contentSnippet || 'No description available'}</p>
            <p><strong>Review:</strong> Unable to generate AI review at this time.</p>
            <a href="${tool.link}" target="_blank" class="affiliate">Read More</a>
            <a href="#newsletter" class="cta">Get Update Alerts</a>
          </article>
        `;
      }
    }

    // 3. Update index.html file
    console.log("📝 Updating index.html with new reviews...");
    
    // Get current index.html from repository root
    const indexPath = path.join(process.cwd(), 'index.html');
    let indexHtml = fs.readFileSync(indexPath, 'utf8');
    
    // Find live blog section and insert new articles
    const liveBlogSectionRegex = /(<section id="live-blog" class="live-blog">[\s\S]*?<\/section>)/;
    const liveBlogMatch = indexHtml.match(liveBlogSectionRegex);
    
    if (liveBlogMatch) {
      const liveBlogSection = liveBlogMatch[0];
      const insertionPoint = liveBlogSection.lastIndexOf('<!-- Add more <article> blocks here via AI agent script or manual edit -->');
      
      if (insertionPoint !== -1) {
        const beforeInsertion = liveBlogSection.substring(0, insertionPoint);
        const afterInsertion = liveBlogSection.substring(insertionPoint);
        const updatedLiveBlogSection = beforeInsertion + newArticlesHtml + afterInsertion;
        
        // Replace old live blog section with updated one
        indexHtml = indexHtml.replace(liveBlogSectionRegex, updatedLiveBlogSection);
        
        // Write updated index.html
        fs.writeFileSync(indexPath, indexHtml);
        console.log("✅ Updated index.html with new reviews.");
      } else {
        console.error("Could not find insertion point in live blog section.");
      }
    } else {
      console.error("Could not find live blog section in index.html.");
    }

    // 4. Commit and Push to GitHub
    console.log("📤 Committing and pushing to GitHub...");
    const { execSync } = require('child_process');
    
    execSync(`git config --global user.name "GitHub Actions Bot"`);
    execSync(`git config --global user.email "actions@github.com"`);
    execSync(`git add index.html`);
    execSync(`git commit -m "Add daily AI tools review to index.html: ${today}"`);
    execSync(`git push https://${process.env.PERSONAL_ACCESS_TOKEN}@github.com/${owner}/${repo}.git ${branch}`);

    console.log("✅ Workflow complete!");

  } catch (error) {
    console.error("❌ Workflow failed:", error.message);
    process.exit(1);
  }
}

runAgent();
