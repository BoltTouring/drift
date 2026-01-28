#!/usr/bin/env node
/**
 * Test script for PPQ.ai API connection
 * Reads API key from .env.local and tests the connection
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env.local
let apiKey;
try {
  const envContent = readFileSync(join(__dirname, '.env.local'), 'utf-8');
  const match = envContent.match(/PPQ_API_KEY=(.+)/);
  if (match && match[1]) {
    apiKey = match[1].trim();
  } else {
    console.error('❌ PPQ_API_KEY not found in .env.local');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Failed to read .env.local:', error.message);
  process.exit(1);
}

console.log('🔑 API key loaded from .env.local');
console.log('🌐 Testing PPQ.ai API connection...\n');

// Test API call
try {
  const response = await fetch('https://api.ppq.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'claude-3.5-sonnet', // PPQ.ai recommended model
      messages: [
        {
          role: 'system',
          content: 'You are a Japanese language learning content generator. Generate exactly 2 language learning items for testing. Return a JSON object with an "items" array. Each item must have: id (string UUID), jp (Japanese text), en (English translation), level (one of: N5, N4, N3, N2), and optional mediaPrompt (string image description). Return ONLY valid JSON, no markdown, no code blocks.',
        },
        {
          role: 'user',
          content: 'Generate 2 Japanese language learning items with varying difficulty levels. Return as JSON object with "items" array.',
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API returned ${response.status}: ${errorText}`);
    process.exit(1);
  }

  const data = await response.json();
  console.log('✅ API connection successful!\n');
  console.log('📦 Response structure:');
  console.log(`   - Has choices: ${!!data.choices}`);
  console.log(`   - Choices count: ${data.choices?.length || 0}`);
  
  if (data.choices && data.choices[0]?.message?.content) {
    const content = data.choices[0].message.content;
    console.log(`   - Content length: ${content.length} characters\n`);
    
    try {
      const parsed = JSON.parse(content);
      let items = Array.isArray(parsed) ? parsed : parsed.items || [];
      
      console.log(`✅ Successfully parsed ${items.length} items\n`);
      
      if (items.length > 0) {
        console.log('📝 Sample item:');
        const item = items[0];
        console.log(`   - ID: ${item.id || 'missing'}`);
        console.log(`   - Japanese: ${item.jp || item.japanese || 'missing'}`);
        console.log(`   - English: ${item.en || item.english || 'missing'}`);
        console.log(`   - Level: ${item.level || 'missing'}`);
        console.log(`   - Media Prompt: ${item.mediaPrompt || item.media_prompt || 'none'}\n`);
      }
      
      // Validate structure
      const isValid = items.every(item => 
        item.id && 
        (item.jp || item.japanese) && 
        (item.en || item.english) && 
        item.level
      );
      
      if (isValid) {
        console.log('✅ All items have required fields');
      } else {
        console.log('⚠️  Some items missing required fields');
      }
      
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError.message);
      console.log('\nRaw content preview:');
      console.log(content.substring(0, 200) + '...');
      process.exit(1);
    }
  } else {
    console.log('⚠️  Unexpected response structure:');
    console.log(JSON.stringify(data, null, 2).substring(0, 500));
  }
  
  console.log('\n✅ Connection test completed successfully!');
  
} catch (error) {
  console.error('❌ Connection test failed:', error.message);
  if (error.cause) {
    console.error('   Cause:', error.cause);
  }
  process.exit(1);
}
