/**
 * Subscription Modal Component
 * Handles subscription upgrades and billing management
 */

import React, { useState } from 'react';
import { useAuthContext } from '~/lib/auth/auth-provider';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: 'free' | 'pro' | 'enterprise';
}

export function SubscriptionModal({ isOpen, onClose, currentTier = 'free' }: SubscriptionModalProps) {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise'>('pro');

  if (!isOpen) return null;

  const plans = {
    free: {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        '5 projects',
        '100 screens/month',
        '1 GB storage',
        'Basic support',
      ],
      current: currentTier === 'free',
    },
    pro: {
      name: 'Pro',
      price: '$19',
      period: 'per month',
      features: [
        '50 projects',
        '1,000 screens/month',
        '10 GB storage',
        'Figma export',
        'Priority support',
        'Advanced AI models',
      ],
      current: currentTier === 'pro',
      popular: true,
    },
    enterprise: {
      name: 'Enterprise',
      price: '$99',
      period: 'per month',
      features: [
        'Unlimited projects',
        'Unlimited screens',
        '100 GB storage',
        'Custom integrations',
        'Dedicated support',
        'Team collaboration',
        'SSO integration',
      ],
      current: currentTier === 'enterprise',
    },
  };

  const handleUpgrade = async (plan: 'pro' | 'enterprise') => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          clerkUserId: user.clerkUserId,
        }),
      });

      if (response.ok) {
        const { checkoutUrl } = await response.json();
        window.location.href = checkoutUrl;
      } else {
        const error = await response.json();
        console.error('Checkout error:', error);
        alert(`${error.error || 'Failed to create checkout session'}${error.details ? '\n\nDetails: ' + error.details : ''}`);
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Failed to start upgrade process');
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/billing/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkUserId: user.clerkUserId,
        }),
      });

      if (response.ok) {
        const { portalUrl } = await response.json();
        window.location.href = portalUrl;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert('Failed to open billing management');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-bolt-elements-background-depth-1 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-bolt-elements-borderColor">
          <h2 className="text-2xl font-bold text-bolt-elements-textPrimary">
            Choose Your Plan
          </h2>
          <button
            onClick={onClose}
            className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary transition-colors"
          >
            <div className="i-ph:x text-2xl" />
          </button>
        </div>

        {/* Plans Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(plans).map(([key, plan]) => (
              <div
                key={key}
                className={`relative rounded-lg border-2 p-6 ${
                  plan.current
                    ? 'border-green-500 bg-bolt-elements-background-depth-2'
                    : 'border-bolt-elements-borderColor bg-bolt-elements-background-depth-2'
                }`}
              >
                {plan.popular && !plan.current && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-bolt-elements-background-depth-3 text-bolt-elements-textPrimary px-3 py-1 rounded-full text-sm font-medium border border-bolt-elements-borderColor">
                      Most Popular
                    </span>
                  </div>
                )}

                {plan.current && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-bolt-elements-textPrimary mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-bolt-elements-textPrimary">
                      {plan.price}
                    </span>
                    <span className="text-bolt-elements-textSecondary ml-1">
                      {plan.period}
                    </span>
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <div className="i-ph:check text-green-600 mr-2 flex-shrink-0" />
                      <span className="text-bolt-elements-textSecondary">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  {plan.current ? (
                    <div className="space-y-2">
                      <button
                        disabled
                        className="w-full bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary border border-bolt-elements-borderColor py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        Current Plan
                      </button>
                      {key !== 'free' && (
                        <button
                          onClick={handleManageBilling}
                          disabled={loading}
                          className="w-full bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary border border-bolt-elements-borderColor py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          {loading ? <LoadingSpinner size="sm" /> : 'Manage Billing'}
                        </button>
                      )}
                    </div>
                  ) : key === 'free' ? (
                    <button
                      disabled
                      className="w-full bg-gray-400 text-white py-3 px-4 rounded-lg font-medium cursor-not-allowed"
                    >
                      Downgrade Not Available
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(key as 'pro' | 'enterprise')}
                      disabled={loading}
                      className="w-full bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary border border-bolt-elements-borderColor py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {loading ? <LoadingSpinner size="sm" /> : `Upgrade to ${plan.name}`}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center text-sm text-bolt-elements-textSecondary">
            <p>All plans include a 14-day free trial. Cancel anytime.</p>
            <p className="mt-2">
              Need a custom plan?{' '}
              <a href="mailto:support@bolt.ai" className="text-blue-600 hover:underline">
                Contact us
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
