/**
 * Quick script to get Stripe Price IDs from Product IDs
 * Run: node get-stripe-prices.js
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'your_stripe_secret_key_here';

const PRODUCT_IDS = {
  pro: 'prod_TJ1Sq9EKyrzVXg',
  enterprise: 'prod_TJwu12AeCEv1UB'
};

async function getPriceIds() {
  console.log('🔍 Fetching Price IDs from Stripe...\n');

  for (const [tier, productId] of Object.entries(PRODUCT_IDS)) {
    try {
      const response = await fetch(
        `https://api.stripe.com/v1/prices?product=${productId}&active=true`,
        {
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`
          }
        }
      );

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const price = data.data[0];
        console.log(`✅ ${tier.toUpperCase()} Plan:`);
        console.log(`   Product ID: ${productId}`);
        console.log(`   Price ID: ${price.id}`);
        console.log(`   Amount: $${price.unit_amount / 100}/${price.recurring.interval}`);
        console.log(`   \n   Add to .env:`);
        console.log(`   STRIPE_PRICE_ID_${tier.toUpperCase()}=${price.id}\n`);
      } else {
        console.log(`❌ ${tier.toUpperCase()}: No active prices found for ${productId}\n`);
      }
    } catch (error) {
      console.error(`❌ Error fetching ${tier}:`, error.message);
    }
  }
}

getPriceIds();
