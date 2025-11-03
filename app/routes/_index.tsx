import { json, type MetaFunction } from '@remix-run/cloudflare';
import { useUser } from '@clerk/remix';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import { SplineScene } from '~/components/ui/splite';
import { Spotlight } from '~/components/ui/spotlight';
import { BackgroundPaths } from '~/components/ui/background-paths';
import { HeroGeometric } from '~/components/ui/hero-geometric';
import { Timeline } from '~/components/ui/timeline';
import { useEffect } from 'react';

export const meta: MetaFunction = () => {
  return [
    { title: 'Elaric AI - AI-Powered Development Assistant' },
    { name: 'description', content: 'Talk with Elaric AI, your intelligent design assistant' },
  ];
};

export const loader = () => json({ id: undefined });

/**
 * Landing page component for Elaric AI with Clerk Authentication
 * Features beautiful Spline 3D scene for non-authenticated users
 */
export default function Index() {
  const { isSignedIn, isLoaded } = useUser();
  const { id } = useLoaderData<{ id?: string }>();
  const navigate = useNavigate();

  /**
   * Check if we're on a chat route by looking at the loader data
   * The chat.$id.tsx route will pass an id, while the homepage won't
   */
  const isChatRoute = !!id;

  // Handle redirect for unauthenticated users on chat route
  useEffect(() => {
    if (isLoaded && isChatRoute && !isSignedIn) {
      navigate('/sign-in', { replace: true });
    }
  }, [isLoaded, isChatRoute, isSignedIn, navigate]);

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="flex flex-col h-full w-full bg-black">
        <Header />
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // If on a chat route, always show chat interface (if signed in)
  if (isChatRoute && isSignedIn) {
    // Show chat interface for authenticated users on chat route
    return (
      <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
        <Header />
        <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
      </div>
    );
  }

  // If on chat route but not signed in, show loading while redirecting
  if (isChatRoute && !isSignedIn) {
    return (
      <div className="flex flex-col h-full w-full bg-black">
        <Header />
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Redirecting to sign in...</p>
          </div>
        </div>
      </div>
    );
  }

  // If user is signed in on homepage, show the chat interface
  if (isSignedIn) {
    return (
      <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
        <Header />
        <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
      </div>
    );
  }

  // Beautiful landing page with Spline 3D scene
  return (
    <div className="flex flex-col w-full bg-black overflow-hidden">
      {/* Animated Background Paths */}
      <BackgroundPaths pathColor="rgba(139, 92, 246, 0.4)" pathWidth={2} pathCount={8} duration={20} />

      {/* Header with Logo and Auth Buttons */}
      <Header />

      {/* Main Content with Spline 3D Scene */}
      <main className="relative overflow-hidden h-screen">
        {/* Spotlight Effect */}
        <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

        {/* Content Container */}
        <div className="flex h-full w-full">
          {/* Left Section - Text Content */}
          <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 relative z-10">
            <div className="max-w-2xl">
              <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 mb-15" style={{ lineHeight: '1.3' }}>
                Build with
                <br />
                Elaric Ai
              </h1>
              {/* <p className="text-lg md:text-xl text-neutral-300 mb-8 leading-relaxed">
                Transform your ideas into reality with AI-powered development. Create, deploy, and scale applications
                faster than ever before.
              </p> */}

              {/* CTA Buttons */}
              {/* <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-black hover:bg-gray-700 border border-gray-800 rounded-lg transition-colors"
                >
                  <span>Start Building Free</span>
                </a>

                <a
                  href="/sign-in"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-black hover:bg-gray-700 border border-gray-800 rounded-lg transition-colors"
                >
                  Sign In
                </a>
              </div> */}

              {/* Feature Tags */}
              {/* <div className="flex flex-wrap gap-3 mt-12">
                <div className="px-4 py-2 bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-full text-sm text-neutral-300">
                  <span className="mr-2">🤖</span>
                  AI-Powered
                </div>
                <div className="px-4 py-2 bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-full text-sm text-neutral-300">
                  <span className="mr-2">⚡</span>
                  Best AI Models
                </div>
                <div className="px-4 py-2 bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-full text-sm text-neutral-300">
                  <span className="mr-2">💻</span>
                  Full-Stack UI Designs
                </div>
              </div> */}
            </div>
          </div>

          {/* Right Section - Spline 3D Scene */}
          <div className="hidden lg:flex flex-1 items-center justify-center relative">
            <div className="w-full h-full relative">
              <ClientOnly
                fallback={
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                  </div>
                }
              >
                {() => (
                  <SplineScene
                    scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                    className="w-full h-full"
                  />
                )}
              </ClientOnly>
            </div>
          </div>
        </div>

        {/* Bottom Gradient Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-10"></div>
      </main>

      {/* Hero Geometric Section */}
      <HeroGeometric
        badge="Beta-Version"
        title1="Best Ui in this planet

"
        title2=""
        description="Instant previews. Zero configuration. Build and iterate on web interfaces at the speed of thought"
      />

      {/* Timeline Section */}
      <ClientOnly fallback={<div className="min-h-screen bg-neutral-950" />}>
        {() => {
          const timelineData = [
            {
              title: 'Coming Soon',
              content: (
                <div>
                  <p className="text-neutral-200 text-xs md:text-sm font-normal mb-8">
                    Build Games with AI-powered development tools to revolutionize games development.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <img
                      src="/1643406510129.png.webp"
                      alt="Development"
                      className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
                    />
                    <img
                      src="/unnamed-2.webp"
                      alt="Development"
                      className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
                    />
                    <img
                      src="/preview3_20.jpg"
                      alt="Development"
                      className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
                    />
                    <img
                      src="/unnamed.webp"
                      alt="Development"
                      className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
                    />
                  </div>
                </div>
              ),
            },
            {
              title: 'December',
              content: (
                <div>
                  <p className="text-neutral-200 text-xs md:text-sm font-normal mb-8">
                    Generate Mobile Apps with AI-powered development tools to revolutionize app development.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <img
                      src="/mobile-app.jpg"
                      alt="Development"
                      className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
                    />
                  </div>
                </div>
              ),
            },
            {
              title: 'November',
              content: (
                <div>
                  <p className="text-neutral-200 text-xs md:text-sm font-normal mb-8">
                    Generate UI with Elaric AI - Your intelligent design assistant
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <img
                      src="/7-Eleven iOS 16.png"
                      alt="AI Development"
                      className="rounded-lg object-contain h-40 md:h-52 lg:h-64 w-full border border-gray-700 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] bg-black"
                    />
                    <img
                      src="/Plata Card iOS 124.png"
                      alt="Coding"
                      className="rounded-lg object-contain h-40 md:h-52 lg:h-64 w-full border border-gray-700 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] bg-black"
                    />
                    <img
                      src="/Max iOS 16.png"
                      alt="Analytics"
                      className="rounded-lg object-contain h-40 md:h-52 lg:h-64 w-full border border-gray-700 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] bg-black"
                    />
                    <img
                      src="/Apple Health iOS 100.png"
                      alt="Design"
                      className="rounded-lg object-contain h-40 md:h-52 lg:h-64 w-full border border-gray-700 shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset] bg-black"
                    />
                  </div>
                </div>
              ),
            },
            // {
            //   title: 'Changelog',
            //   content: (
            //     <div>
            //       <p className="text-neutral-200 text-xs md:text-sm font-normal mb-4">
            //         Latest features and improvements to Elaric AI
            //       </p>
            //       <div className="mb-8">
            //         <div className="flex gap-2 items-center text-neutral-300 text-xs md:text-sm">
            //            AI-powered code generation
            //         </div>
            //         <div className="flex gap-2 items-center text-neutral-300 text-xs md:text-sm">
            //            Real-time collaboration
            //         </div>
            //         <div className="flex gap-2 items-center text-neutral-300 text-xs md:text-sm">
            //            Instant deployment
            //         </div>
            //         <div className="flex gap-2 items-center text-neutral-300 text-xs md:text-sm">
            //            Beautiful UI components
            //         </div>
            //         <div className="flex gap-2 items-center text-neutral-300 text-xs md:text-sm">
            //            Multi-language support
            //         </div>
            //       </div>
            //       <div className="grid grid-cols-2 gap-4">
            //         <img
            //           src="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&h=500&fit=crop"
            //           alt="Features"
            //           className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            //         />
            //         <img
            //           src="https://images.unsplash.com/photo-1551650975-87deedd944c3?w=500&h=500&fit=crop"
            //           alt="Updates"
            //           className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            //         />
            //         <img
            //           src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=500&h=500&fit=crop"
            //           alt="Collaboration"
            //           className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            //         />
            //         <img
            //           src="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=500&h=500&fit=crop"
            //           alt="Success"
            //           className="rounded-lg object-cover h-20 md:h-44 lg:h-60 w-full shadow-[0_0_24px_rgba(34,_42,_53,_0.06),_0_1px_1px_rgba(0,_0,_0,_0.05),_0_0_0_1px_rgba(34,_42,_53,_0.04),_0_0_4px_rgba(34,_42,_53,_0.08),_0_16px_68px_rgba(47,_48,_55,_0.05),_0_1px_0_rgba(255,_255,_255,_0.1)_inset]"
            //         />
            //       </div>
            //     </div>
            //   ),
            // },
          ];
          return <Timeline data={timelineData} />;
        }}
      </ClientOnly>

      {/* Animated Background Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
}
