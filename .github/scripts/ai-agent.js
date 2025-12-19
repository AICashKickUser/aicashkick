// .github/scripts/ai-agent.js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// --- Configuration ---
const owner = process.env.GITHUB_REPOSITORY.split('/')[0];
const repo = process.env.GITHUB_REPOSITORY.split('/')[1];
const branch = 'main';
const groqApiKey = process.env.GROQ_API_KEY;

// --- Helper Function to Check for Existing Content ---
function hasContentForToday(html) {
  const today = new Date().toLocaleDateString();
  const dateRegex = /<span class="date">([^<]+)<\/span>/g;
  const matches = html.match(dateRegex);
  
  if (matches) {
    return matches.some(match => match.includes(today));
  }
  return false;
}

// --- Main Logic ---

async function runAgent() {
  console.log("🚀 Starting AI Tutorial Generator...");
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // 0. Check if content for today already exists
    console.log("🔍 Checking if today's content already exists...");
    const indexPath = path.join(process.cwd(), 'index.html');
    let indexHtml = fs.readFileSync(indexPath, 'utf8');
    
    if (hasContentForToday(indexHtml)) {
      console.log("✅ Content for today already exists. Skipping execution.");
      return; // Exit script gracefully
    }
    
    console.log("📝 Today's content not found. Proceeding with generation...");

    // 1. Generate a detailed tutorial using Groq
    console.log("🤖 Generating detailed AI tutorial with Groq...");
    
    const prompt = `
      Create a detailed tutorial on how to build a full-stack web application using a modern AI tool.
      
      Choose one interesting, trending AI tool that allows users to build applications without coding or with minimal coding.
      Examples include: Bubble, Softr, Zapier interfaces, Glide, AppGyver, or a similar no-code/low-code platform with AI capabilities.
      
      Create a step-by-step tutorial that shows how to:
      1. Set up an account with the AI tool
      2. Create a database structure for the app
      3. Build the user interface
      4. Implement core functionality
      5. Add AI features
      6. Deploy the application for free
      
      Include specific examples, screenshots or descriptions of what each step would look like.
      Include a link to a live demo of the application.
      
      Format your response as HTML:
      <article class="blog-post">
        <h3>[Tutorial Title: How to Build a [App Type] with [AI Tool Name]]</h3>
        <span class="date">${new Date().toLocaleDateString()}</span>
        <p><strong>What We're Building:</strong> [Brief description of the app we're building]</p>
        
        <h4>Step 1: Setting Up [AI Tool Name]</h4>
        <p>[Detailed instructions on how to set up an account and navigate the interface]</p>
        
        <h4>Step 2: Creating the Database</h4>
        <p>[Instructions on how to set up the data structure for the app]</p>
        
        <h4>Step 3: Building the User Interface</h4>
        <p>[Instructions on how to create the front-end of the application]</p>
        
        <h4>Step 4: Implementing Core Functionality</h4>
        <p>[Instructions on how to add the main features of the app]</p>
        
        <h4>Step 5: Adding AI Features</h4>
        <p>[Instructions on how to integrate AI capabilities into the app]</p>
        
        <h4>Step 6: Deploying for Free</h4>
        <p>[Instructions on how to deploy the application without cost]</p>
        
        <p><strong>Live Demo:</strong> <a href="[Link to live demo]" target="_blank">Try the App Here</a></p>
        <p><strong>Earning Potential:</strong> [How this app could be monetized]</p>
        <a href="#newsletter" class="cta">Get More AI Tutorials</a>
      </article>
    `;
    
    let tutorialHtml = '';
    
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      });
      
      const data = await response.json();
      
      if (data.choices && data.choices.length > 0) {
        tutorialHtml = data.choices[0].message.content;
        console.log("✅ Successfully generated tutorial.");
      } else {
        throw new Error('No valid response from Groq API');
      }
    } catch (error) {
      console.error("Error generating tutorial:", error.message);
      tutorialHtml = `
        <article class="blog-post">
          <h3>Tutorial Temporarily Unavailable</h3>
          <span class="date">${new Date().toLocaleDateString()}</span>
          <p>We're working on today's AI tutorial. Please check back later.</p>
          <a href="#newsletter" class="cta">Get Notified When It's Ready</a>
        </article>
      `;
    }

    // 2. Update index.html file
    console.log("📝 Updating index.html with new tutorial...");
    
    // Find live blog section and insert new tutorial
    const liveBlogSectionRegex = /(<section id="live-blog" class="live-blog">[\s\S]*?<\/section>)/;
    const liveBlogMatch = indexHtml.match(liveBlogSectionRegex);
    
    if (liveBlogMatch) {
      const liveBlogSection = liveBlogMatch[0];
      const insertionPoint = liveBlogSection.lastIndexOf('<!-- Add more <article> blocks here via AI agent script or manual edit -->');
      
      if (insertionPoint !== -1) {
        const beforeInsertion = liveBlogSection.substring(0, insertionPoint);
        const afterInsertion = liveBlogSection.substring(insertionPoint);
        const updatedLiveBlogSection = beforeInsertion + tutorialHtml + afterInsertion;
        
        // Replace old live blog section with updated one
        indexHtml = indexHtml.replace(liveBlogSectionRegex, updatedLiveBlogSection);
        
        // Write updated index.html
        fs.writeFileSync(indexPath, indexHtml);
        console.log("✅ Updated index.html with new tutorial.");
      } else {
        console.error("Could not find insertion point in live blog section.");
      }
    } else {
      console.error("Could not find live blog section in index.html.");
    }

    // 3. Commit and Push to GitHub
    console.log("📤 Committing and pushing to GitHub...");
    const { execSync } = require('child_process');
    
    execSync(`git config --global user.name "GitHub Actions Bot"`);
    execSync(`git config --global user.email "actions@github.com"`);
    execSync(`git add index.html`);
    execSync(`git commit -m "Add daily AI tutorial to index.html: ${today}"`);
    execSync(`git push https://${process.env.PERSONAL_ACCESS_TOKEN}@github.com/${owner}/${repo}.git ${branch}`);

    console.log("✅ Workflow complete!");

  } catch (error) {
    console.error("❌ Workflow failed:", error.message);
    process.exit(1);
  }
}

runAgent();
