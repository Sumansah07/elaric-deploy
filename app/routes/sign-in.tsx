/**
 * Sign In Route
 * Clerk authentication sign-in page
 */

import { SignIn } from '@clerk/remix';
import type { MetaFunction } from '@remix-run/cloudflare';
import BackgroundRays from '~/components/ui/BackgroundRays.tsx';

export const meta: MetaFunction = () => {
  return [{ title: 'Sign In - Elaric AI' }, { name: 'description', content: 'Sign in to your Elaric AI account' }];
};

export default function SignInPage() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />

      <div className="flex items-center justify-center min-h-screen p-4 bg-black">
        <div className="relative z-10">
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            afterSignInUrl="/"
            appearance={{
              variables: {
                colorPrimary: '#3b82f6',
                colorBackground: '#0a0a0a',
                colorInputBackground: '#171717',
                colorInputText: '#ffffff',
                colorText: '#ffffff',
                colorTextSecondary: '#a3a3a3',
                colorDanger: '#ef4444',
                colorSuccess: '#22c55e',
                colorWarning: '#f59e0b',
                borderRadius: '0.5rem',
              },
              elements: {
                rootBox: 'mx-auto',
                card: 'bg-[#0a0a0a] shadow-2xl border border-neutral-800',
                headerTitle: 'text-white',
                headerSubtitle: 'text-neutral-400',
                socialButtonsBlockButton: 'bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800',
                socialButtonsBlockButtonText: 'text-white',
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
                formFieldInput: 'bg-neutral-900 border-neutral-700 text-white',
                formFieldLabel: 'text-neutral-300',
                footerActionLink: 'text-blue-500 hover:text-blue-400',
                identityPreviewText: 'text-white',
                identityPreviewEditButton: 'text-blue-500',
                formHeaderTitle: 'text-white',
                formHeaderSubtitle: 'text-neutral-400',
                otpCodeFieldInput: 'bg-neutral-900 border-neutral-700 text-white',
                formResendCodeLink: 'text-blue-500',
                dividerLine: 'bg-neutral-700',
                dividerText: 'text-neutral-400',
                footer: 'bg-[#0a0a0a]',
                footerActionText: 'text-neutral-400',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
