/**
 * Background Prompt Enhancement Service
 * Uses n8n context-aware system to enrich prompts with design references
 * Works silently - no changes to chat UI, just better context for AI
 */

import type { DesignReference } from './contextAwareGeneration';

interface EnhancementResult {
  enhancedPrompt: string;
  originalPrompt: string;
  referencesUsed: number;
  contextAdded: boolean;
}

/**
 * Fetches design context from n8n workflow in background
 * Returns enhanced prompt with hidden context for better AI generation
 */
export async function enhancePromptWithContext(
  userPrompt: string,
  options?: {
    maxReferences?: number;
    timeout?: number;
  },
): Promise<EnhancementResult> {
  const maxReferences = options?.maxReferences || 3;
  const timeout = options?.timeout || 5000; // 5 second timeout

  console.log('🔍 Fetching design context in background...');

  try {
    // Call n8n with timeout to get references
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch('/api/generate-mockup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: userPrompt,
        options: { maxScreens: maxReferences },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result: any = await response.json();

      if (result.success && result.references && result.references.length > 0) {
        console.log(`✅ Got ${result.references.length} design references for context`);

        // Extract key patterns from references (don't expose technical details)
        const contextHints = buildContextHints(result.references);

        // Enhance the prompt with context (invisible to user)
        const enhancedPrompt = `${userPrompt}

[Design Context - Use these patterns as inspiration, not strict templates:]
${contextHints}

Remember: Be creative and innovative while following modern design best practices.`;

        return {
          enhancedPrompt,
          originalPrompt: userPrompt,
          referencesUsed: result.references.length,
          contextAdded: true,
        };
      }
    }

    console.log('ℹ️ No context available, using original prompt');
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('⏱️ Context fetch timeout, proceeding with original prompt');
    } else {
      console.log('ℹ️ Context fetch failed, proceeding with original prompt');
    }
  }

  // Return original prompt if context fetch fails or times out
  return {
    enhancedPrompt: userPrompt,
    originalPrompt: userPrompt,
    referencesUsed: 0,
    contextAdded: false,
  };
}

/**
 * Builds hidden context hints from design references
 * Extracts patterns without exposing technical details
 */
function buildContextHints(references: DesignReference[]): string {
  // Extract categories to understand context
  const categories = references.map((ref) => ref.category).filter(Boolean);
  const uniqueCategories = [...new Set(categories)];

  // Build generic design guidance based on references
  const hints: string[] = [];

  if (uniqueCategories.includes('Bolt Food') || uniqueCategories.includes('Food')) {
    hints.push('- Use clean, modern food delivery app patterns');
    hints.push('- Focus on clear CTAs and easy navigation');
    hints.push('- Include visual hierarchy for content sections');
  }

  if (references.some((r) => r.screen.includes('checkout') || r.screen.includes('payment'))) {
    hints.push('- Use trust indicators for payment flows');
    hints.push('- Clear step progression for checkout');
  }

  if (references.some((r) => r.screen.includes('menu') || r.screen.includes('list'))) {
    hints.push('- Use card-based layouts for items');
    hints.push('- Include filtering and categorization');
  }

  // Generic fallback hints
  if (hints.length === 0) {
    hints.push('- Use modern, clean design patterns');
    hints.push('- Focus on user experience and accessibility');
    hints.push('- Follow mobile-first responsive design');
  }

  return hints.join('\n');
}

/**
 * Checks if prompt would benefit from design context
 */
export function shouldEnhancePrompt(prompt: string): boolean {
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
    'checkout',
    'menu',
    'landing',
    'dashboard',
    'profile',
  ];

  const lowerPrompt = prompt.toLowerCase();

  return designKeywords.some((keyword) => lowerPrompt.includes(keyword));
}

/**
 * Background enhancement - non-blocking
 * Returns immediately with original prompt, enhances in background
 */
export async function tryEnhancePrompt(prompt: string): Promise<string> {
  // Quick check if enhancement would be useful
  if (!shouldEnhancePrompt(prompt)) {
    return prompt;
  }

  // Try to enhance with short timeout
  const result = await enhancePromptWithContext(prompt, {
    maxReferences: 3,
    timeout: 2000, // 6 second max wait for n8n
  });

  if (result.contextAdded) {
    console.log(`🎨 Prompt enhanced with ${result.referencesUsed} design patterns`);
  }

  return result.enhancedPrompt;
}
