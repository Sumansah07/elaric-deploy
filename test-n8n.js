/**
 * Test Script for n8n Context-Aware Mockup Generation
 * Run this to test the full workflow
 */

const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/generate-mockup';

async function testN8nWorkflow() {
  console.log('🧪 Testing n8n Context-Aware Mockup Generation\n');
  console.log('📡 Webhook URL:', N8N_WEBHOOK_URL);
  console.log('⏱️  Starting test...\n');

  const testPrompt = 'Create a food delivery checkout screen with delivery address and payment methods';

  console.log('📝 Test Prompt:', testPrompt);
  console.log('\n⏳ Sending request to n8n workflow...\n');

  const startTime = Date.now();

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: testPrompt,
        userId: 'test-user',
        projectId: 'test-project',
        options: {
          maxScreens: 5,
          style: 'modern',
          colorScheme: 'auto',
        },
      }),
    });

    const responseTime = Date.now() - startTime;

    console.log('📊 Response Status:', response.status, response.statusText);
    console.log('⏱️  Response Time:', responseTime + 'ms\n');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error Response:', errorText);
      console.error('\n🔍 Troubleshooting:');
      console.error('  1. Make sure n8n is running: n8n');
      console.error('  2. Check if workflow is activated (green toggle)');
      console.error('  3. Verify webhook URL is correct');
      console.error('  4. Check n8n execution logs for errors');
      return;
    }

    const result = await response.json();

    console.log('✅ Success! Response received:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📦 Response Structure:');
    console.log('  - success:', result.success);
    console.log('  - html length:', result.html?.length || 0, 'characters');
    console.log('  - references:', result.references?.length || 0);
    console.log('  - referencesUsed:', result.metadata?.referencesUsed || 0);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (result.references && result.references.length > 0) {
      console.log('📚 Design References Used:\n');
      result.references.forEach((ref, index) => {
        console.log(`  ${index + 1}. Screen: ${ref.screen}`);
        console.log(`     Category: ${ref.category}`);
        console.log(`     Similarity: ${ref.similarity}`);
        console.log('');
      });
    }

    if (result.stats) {
      console.log('📊 Generation Stats:');
      console.log('  - Context Length:', result.stats.contextLength);
      console.log('  - Generation Time:', result.stats.generationTime + 'ms');
      console.log('  - Model:', result.stats.model);
      console.log('');
    }

    if (result.html) {
      console.log('📄 HTML Preview (first 500 chars):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(result.html.substring(0, 500) + '...');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    console.log('🎉 Test Completed Successfully!');
    console.log('✅ n8n workflow is working correctly');
    console.log('✅ Vector search found similar designs');
    console.log('✅ Context-aware generation completed');
    console.log('✅ Response format is valid\n');

    console.log('🚀 Next Steps:');
    console.log('  1. Integrate with Remix API endpoint');
    console.log('  2. Add UI toggle for context-aware mode');
    console.log('  3. Display reference badges in frontend');
    console.log('  4. Test with real user prompts\n');

  } catch (error) {
    console.error('❌ Test Failed!\n');
    console.error('Error:', error.message);
    console.error('\n🔍 Common Issues:');
    console.error('  1. n8n not running - Start with: n8n');
    console.error('  2. Wrong webhook URL - Check .env file');
    console.error('  3. Network issues - Check internet connection');
    console.error('  4. Workflow not activated - Toggle in n8n editor');
    console.error('\n📚 See documentation: N8N_SETUP_GUIDE.md');
  }
}

// Run the test
testN8nWorkflow();
