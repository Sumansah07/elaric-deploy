/**
 * Planning Phase Prompt
 * Forces AI to propose a plan before building
 */

export const PLANNING_PHASE_PROMPT = `
CRITICAL INSTRUCTION - YOU MUST FOLLOW THIS:

The user has requested to build a multi-screen application. Before creating ANY code or artifacts, you MUST:

1. Respond with ONLY a text plan (NO boltArtifact tags, NO boltAction tags, NO code)
2. List each screen/page with a brief description
3. State the total number of screens
4. End with: "Does this plan look good? Reply 'yes' to proceed or suggest changes."

DO NOT create any files yet. DO NOT use any artifact tags. JUST provide the plan in plain text.

Example response format:
I will create an e-commerce website with these screens:

1. home.html - Hero section, featured products, and categories
2. products.html - Product listing with filters and search
3. product-detail.html - Single product view with add to cart
4. cart.html - Shopping cart with items and checkout button
5. checkout.html - Payment and delivery information form
6. order-confirmation.html - Order success page with details
7. account.html - User dashboard with order history

Total: 7 screens

Does this plan look good? Reply 'yes' to proceed or suggest changes.
`;

export const BUILDING_PHASE_PROMPT = `
The user has approved your plan. Now create ALL the screens using boltArtifact tags.
`;

/**
 * Detects if user request requires planning phase
 */
export function requiresPlanning(userMessage: string): boolean {
  const planningKeywords = [
    'build a',
    'create a',
    'make a',
    'design a',
    'develop a',
    'full',
    'complete',
    'entire',
    'website',
    'app',
    'application',
    'system',
    'platform',
    'dashboard',
    'portal',
  ];

  const approvalKeywords = [
    'yes',
    'approved',
    'looks good',
    'proceed',
    'build it',
    'perfect',
    'go ahead',
    'start building',
    'create it',
    'make it',
    'correct',
    'right',
    'okay',
    'ok',
  ];

  const messageLower = userMessage.toLowerCase();

  // Check if it's an approval
  const isApproval = approvalKeywords.some(keyword => messageLower.includes(keyword));
  if (isApproval) {
    return false; // Don't need planning, user approved
  }

  // Check if it's a multi-screen request
  const needsPlanning = planningKeywords.some(keyword => messageLower.includes(keyword));
  
  return needsPlanning;
}

/**
 * Detects if user is approving a plan
 */
export function isApproval(userMessage: string): boolean {
  const approvalKeywords = [
    'yes',
    'approved',
    'looks good',
    'proceed',
    'build it',
    'perfect',
    'go ahead',
    'start building',
    'create it',
    'make it',
    'correct',
    'right',
    'okay',
    'ok',
    'good',
    'great',
  ];

  const messageLower = userMessage.toLowerCase().trim();
  
  return approvalKeywords.some(keyword => messageLower.includes(keyword));
}
