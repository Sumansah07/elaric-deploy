/**
 * Context-Aware Mockup Generation Utility
 * Integrates with n8n workflow for intelligent design generation
 */

export interface ContextAwareRequest {
  prompt: string;
  userId?: string;
  projectId?: string;
  options?: {
    maxScreens?: number;
    style?: 'modern' | 'minimal' | 'classic';
    colorScheme?: string;
  };
}

export interface DesignReference {
  screen: string;
  category: string;
  similarity: string;
}

export interface ContextAwareResponse {
  success: boolean;
  html?: string;
  metadata?: {
    originalPrompt: string;
    referenceScreens: DesignReference[];
    generatedAt: string;
    htmlSize: number;
    referencesUsed: number;
  };
  references?: DesignReference[];
  stats?: {
    contextLength: number;
    generationTime: number;
    model: string;
  };
  error?: string;
}

/**
 * Calls the n8n context-aware mockup generation workflow
 * @param request - The generation request with prompt and options
 * @returns Promise with generated mockup and references
 */
export async function generateContextAwareMockup(request: ContextAwareRequest): Promise<ContextAwareResponse> {
  console.log('🧠 Context-aware generation requested:', request.prompt.substring(0, 50) + '...');

  try {
    const response = await fetch('/api/generate-mockup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Context-aware generation failed:', response.status, errorText);

      return {
        success: false,
        error: `Generation failed: ${response.statusText}`,
      };
    }

    const result: ContextAwareResponse = await response.json();

    console.log('✅ Context-aware generation completed');
    console.log('📊 References used:', result.metadata?.referencesUsed || 0);
    console.log('📄 HTML size:', result.metadata?.htmlSize || 0, 'bytes');

    return result;
  } catch (error) {
    console.error('❌ Context-aware generation error:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Checks if a prompt is suitable for context-aware generation
 * @param prompt - User's input prompt
 * @returns true if prompt is design-related
 */
export function isDesignPrompt(prompt: string): boolean {
  const designKeywords = [
    'create',
    'design',
    'build',
    'make',
    'generate',
    'mockup',
    'screen',
    'page',
    'interface',
    'ui',
    'layout',
    'checkout',
    'menu',
    'home',
    'landing',
    'dashboard',
    'profile',
    'settings',
    'cart',
    'payment',
    'delivery',
    'food',
    'restaurant',
    'order',
  ];

  const lowerPrompt = prompt.toLowerCase();

  return designKeywords.some((keyword) => lowerPrompt.includes(keyword));
}

/**
 * Formats design references for display
 * @param references - Array of design references
 * @returns Formatted string for UI display
 */
export function formatReferences(references: DesignReference[]): string {
  if (!references || references.length === 0) {
    return 'No references used';
  }

  return references.map((ref, index) => `${index + 1}. ${ref.screen} (${ref.category}) - ${ref.similarity}`).join('\n');
}

/**
 * Extracts clean HTML from generation response
 * References are used internally for context, not displayed to user
 * @param html - Generated HTML content
 * @param references - Design references used (for logging only)
 * @returns Clean HTML string without reference badges
 */
export function createMessageWithReferences(html: string, references: DesignReference[]): string {
  // Log references for internal tracking only
  if (references && references.length > 0) {
    console.log('🎨 Design references used internally:', references.length);
    references.forEach((ref) => {
      console.log(`  - ${ref.screen} (${ref.category}): ${ref.similarity}`);
    });
  }

  // Return clean HTML without exposing internal reference details to UI
  return html;
}

/**
 * Extracts HTML from context-aware response for rendering
 * @param response - The context-aware generation response
 * @returns Clean HTML string
 */
export function extractHTML(response: ContextAwareResponse): string {
  if (!response.success || !response.html) {
    return '<div>Error: No HTML generated</div>';
  }

  return response.html;
}

/**
 * Checks if n8n is available
 * @returns Promise<boolean> indicating if n8n is reachable
 */
export async function checkN8nAvailability(): Promise<boolean> {
  try {
    const response = await fetch('/api/generate-mockup', {
      method: 'GET',
    });

    return response.ok;
  } catch (error) {
    console.warn('⚠️ n8n not available:', error);
    return false;
  }
}
