/**
 * Context-Aware Mockup Generation API
 * Integrates with n8n workflow for intelligent design generation
 */

import type { ActionFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';

interface MockupRequest {
  prompt: string;
  userId?: string;
  projectId?: string;
  options?: {
    maxScreens?: number;
    style?: 'modern' | 'minimal' | 'classic';
    colorScheme?: string;
  };
}

interface MockupResponse {
  success: boolean;
  html?: string;
  metadata?: {
    originalPrompt: string;
    referenceScreens: Array<{
      screen: string;
      category: string;
      similarity: string;
    }>;
    generatedAt: string;
    htmlSize: number;
    referencesUsed: number;
  };
  references?: Array<{
    screen: string;
    category: string;
    similarity: string;
  }>;
  stats?: {
    contextLength: number;
    generationTime: number;
    model: string;
  };
  error?: string;
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    console.log('🚀 API: Context-aware mockup generation request received');

    // Parse request body
    const body = (await request.json()) as MockupRequest;
    const { prompt, userId, projectId, options } = body;

    // Validate input
    if (!prompt || prompt.trim().length === 0) {
      console.log('❌ API: Empty prompt provided');
      return json<MockupResponse>(
        {
          success: false,
          error: 'Prompt is required',
        },
        { status: 400 },
      );
    }

    console.log('📝 API: User prompt:', prompt.substring(0, 100) + '...');
    console.log('👤 API: User ID:', userId || 'anonymous');
    console.log('📁 API: Project ID:', projectId || 'none');

    // Get n8n webhook URL from environment
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/generate-mockup';

    console.log('🔗 API: Calling n8n workflow:', n8nWebhookUrl);

    // Call n8n workflow
    const startTime = Date.now();
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        userId,
        projectId,
        options: {
          maxScreens: options?.maxScreens || 5,
          style: options?.style || 'modern',
          colorScheme: options?.colorScheme || 'auto',
        },
        timestamp: new Date().toISOString(),
      }),
    });

    const responseTime = Date.now() - startTime;
    console.log(`⏱️ API: n8n workflow completed in ${responseTime}ms`);

    // Check response status
    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('❌ API: n8n workflow failed:', n8nResponse.status, errorText);

      return json<MockupResponse>(
        {
          success: false,
          error: `Workflow execution failed: ${n8nResponse.statusText}`,
        },
        { status: 500 },
      );
    }

    // Parse n8n response
    const result = (await n8nResponse.json()) as MockupResponse;

    console.log('✅ API: Mockup generated successfully');
    console.log('📊 API: HTML size:', result.metadata?.htmlSize || 0, 'bytes');
    console.log('📚 API: References used:', result.metadata?.referencesUsed || 0);

    // Log reference screens for debugging
    if (result.references && result.references.length > 0) {
      console.log('📱 API: Reference screens:');
      result.references.forEach((ref, index) => {
        console.log(`   ${index + 1}. ${ref.screen} (${ref.category}) - ${ref.similarity} match`);
      });
    }

    // Add API metadata
    const enhancedResult: MockupResponse = {
      ...result,
      metadata: {
        ...result.metadata!,
        apiResponseTime: responseTime,
        processedAt: new Date().toISOString(),
        userId: userId || 'anonymous',
        projectId: projectId || null,
      } as any,
    };

    return json<MockupResponse>(enhancedResult, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Generation-Time': responseTime.toString(),
        'X-References-Used': (result.metadata?.referencesUsed || 0).toString(),
      },
    });
  } catch (error) {
    console.error('❌ API: Unexpected error:', error);

    return json<MockupResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 },
    );
  }
}

/**
 * Health check endpoint
 */
export async function loader() {
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/generate-mockup';

  return json({
    status: 'ok',
    service: 'context-aware-mockup-generation',
    n8nWebhook: n8nWebhookUrl,
    timestamp: new Date().toISOString(),
  });
}
