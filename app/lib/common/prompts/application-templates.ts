/**
 * Comprehensive application templates for intelligent multi-screen mockup generation
 * Each template defines all necessary screens for a specific application type
 */

export interface ScreenTemplate {
  fileName: string;
  title: string;
  description: string;
  priority: number; // 1 = essential, 2 = important, 3 = optional
}

export interface ApplicationTemplate {
  keywords: string[]; // Keywords that trigger this template
  name: string;
  description: string;
  screens: ScreenTemplate[];
}

export const APPLICATION_TEMPLATES: Record<string, ApplicationTemplate> = {
  ecommerce: {
    name: 'E-commerce Platform',
    keywords: ['ecommerce', 'e-commerce', 'shop', 'store', 'marketplace', 'retail', 'shopping'],
    description: 'Online shopping platform with product catalog, cart, and checkout',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Screen',
        description: 'Landing page with hero section, featured products, categories',
        priority: 1,
      },
      {
        fileName: 'products.html',
        title: 'Product Listing',
        description: 'Product catalog with filters, sorting, and grid/list view',
        priority: 1,
      },
      {
        fileName: 'product-detail.html',
        title: 'Product Detail',
        description: 'Individual product page with images, description, reviews, add to cart',
        priority: 1,
      },
      {
        fileName: 'cart.html',
        title: 'Shopping Cart',
        description: 'Cart with items, quantities, totals, promo codes',
        priority: 1,
      },
      {
        fileName: 'checkout.html',
        title: 'Checkout',
        description: 'Payment and shipping information form',
        priority: 1,
      },
      {
        fileName: 'order-confirmation.html',
        title: 'Order Confirmation',
        description: 'Order success page with order details',
        priority: 2,
      },
      {
        fileName: 'account.html',
        title: 'User Account',
        description: 'User profile with order history, saved addresses',
        priority: 2,
      },
      {
        fileName: 'login.html',
        title: 'Login/Register',
        description: 'Authentication forms for login and registration',
        priority: 2,
      },
      {
        fileName: 'wishlist.html',
        title: 'Wishlist',
        description: 'Saved products and favorites',
        priority: 3,
      },
    ],
  },

  social: {
    name: 'Social Media Platform',
    keywords: ['social media', 'social network', 'social platform', 'community', 'social app'],
    description: 'Social networking platform with feeds, profiles, and messaging',
    screens: [
      {
        fileName: 'landing.html',
        title: 'Landing Page',
        description: 'Marketing page with features and sign-up CTA',
        priority: 1,
      },
      {
        fileName: 'login.html',
        title: 'Login/Register',
        description: 'Authentication forms',
        priority: 1,
      },
      {
        fileName: 'feed.html',
        title: 'News Feed',
        description: 'Main feed with posts, stories, reactions',
        priority: 1,
      },
      {
        fileName: 'profile.html',
        title: 'User Profile',
        description: 'User profile with posts, bio, followers/following',
        priority: 1,
      },
      {
        fileName: 'post-create.html',
        title: 'Create Post',
        description: 'Interface for creating new posts with media upload',
        priority: 2,
      },
      {
        fileName: 'messages.html',
        title: 'Direct Messages',
        description: 'Chat interface with conversations list',
        priority: 2,
      },
      {
        fileName: 'notifications.html',
        title: 'Notifications',
        description: 'Activity notifications and alerts',
        priority: 2,
      },
      {
        fileName: 'explore.html',
        title: 'Explore',
        description: 'Discover new content and users',
        priority: 3,
      },
      {
        fileName: 'settings.html',
        title: 'Settings',
        description: 'Account settings and preferences',
        priority: 3,
      },
    ],
  },

  blog: {
    name: 'Blog/Content Platform',
    keywords: ['blog', 'blogging', 'content platform', 'magazine', 'news site', 'publication'],
    description: 'Content publishing platform with articles and authors',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Homepage with featured articles and recent posts',
        priority: 1,
      },
      {
        fileName: 'blog-list.html',
        title: 'Blog List',
        description: 'All posts listing with pagination and filters',
        priority: 1,
      },
      {
        fileName: 'blog-post.html',
        title: 'Blog Post',
        description: 'Individual article view with content and comments',
        priority: 1,
      },
      {
        fileName: 'author.html',
        title: 'Author Profile',
        description: 'Author bio and their posts',
        priority: 2,
      },
      {
        fileName: 'category.html',
        title: 'Category Page',
        description: 'Posts filtered by category',
        priority: 2,
      },
      {
        fileName: 'about.html',
        title: 'About Page',
        description: 'About the blog/publication',
        priority: 2,
      },
      {
        fileName: 'contact.html',
        title: 'Contact Page',
        description: 'Contact form and information',
        priority: 3,
      },
    ],
  },

  portfolio: {
    name: 'Portfolio Website',
    keywords: ['portfolio', 'personal website', 'portfolio site', 'showcase', 'creative portfolio'],
    description: 'Personal portfolio showcasing projects and work',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Hero section with introduction and highlights',
        priority: 1,
      },
      {
        fileName: 'portfolio.html',
        title: 'Portfolio Grid',
        description: 'Projects gallery with filtering',
        priority: 1,
      },
      {
        fileName: 'project-detail.html',
        title: 'Project Detail',
        description: 'Individual project showcase with images and description',
        priority: 1,
      },
      {
        fileName: 'about.html',
        title: 'About Me',
        description: 'Biography, skills, experience',
        priority: 1,
      },
      {
        fileName: 'services.html',
        title: 'Services',
        description: 'Services offered and pricing',
        priority: 2,
      },
      {
        fileName: 'contact.html',
        title: 'Contact',
        description: 'Contact form and social links',
        priority: 1,
      },
      {
        fileName: 'testimonials.html',
        title: 'Testimonials',
        description: 'Client reviews and feedback',
        priority: 3,
      },
    ],
  },

  saas: {
    name: 'SaaS/Dashboard Application',
    keywords: ['saas', 'dashboard', 'admin panel', 'analytics', 'crm', 'management system'],
    description: 'Software as a Service platform with dashboard and admin features',
    screens: [
      {
        fileName: 'landing.html',
        title: 'Landing Page',
        description: 'Marketing page with features and pricing',
        priority: 1,
      },
      {
        fileName: 'login.html',
        title: 'Login',
        description: 'Authentication page',
        priority: 1,
      },
      {
        fileName: 'dashboard.html',
        title: 'Dashboard',
        description: 'Main dashboard with stats and overview',
        priority: 1,
      },
      {
        fileName: 'analytics.html',
        title: 'Analytics',
        description: 'Detailed analytics and reports with charts',
        priority: 1,
      },
      {
        fileName: 'settings.html',
        title: 'Settings',
        description: 'User and application settings',
        priority: 2,
      },
      {
        fileName: 'billing.html',
        title: 'Billing',
        description: 'Subscription and payment management',
        priority: 2,
      },
      {
        fileName: 'profile.html',
        title: 'User Profile',
        description: 'User account information',
        priority: 2,
      },
      {
        fileName: 'support.html',
        title: 'Support',
        description: 'Help center and support tickets',
        priority: 3,
      },
    ],
  },

  restaurant: {
    name: 'Restaurant/Food Service',
    keywords: ['restaurant', 'food', 'cafe', 'diner', 'food delivery', 'menu'],
    description: 'Restaurant website with menu and reservations',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Hero section with restaurant ambiance and featured dishes',
        priority: 1,
      },
      {
        fileName: 'menu.html',
        title: 'Menu',
        description: 'Full menu with categories, prices, and descriptions',
        priority: 1,
      },
      {
        fileName: 'item-detail.html',
        title: 'Dish Detail',
        description: 'Individual dish page with images and ingredients',
        priority: 2,
      },
      {
        fileName: 'reservations.html',
        title: 'Reservations',
        description: 'Table booking system with date/time picker',
        priority: 1,
      },
      {
        fileName: 'about.html',
        title: 'About Us',
        description: 'Restaurant story, chef info',
        priority: 2,
      },
      {
        fileName: 'gallery.html',
        title: 'Gallery',
        description: 'Photos of food, restaurant, and events',
        priority: 3,
      },
      {
        fileName: 'contact.html',
        title: 'Contact',
        description: 'Location, hours, contact form',
        priority: 2,
      },
    ],
  },

  realestate: {
    name: 'Real Estate Platform',
    keywords: ['real estate', 'property', 'realtor', 'housing', 'rental', 'apartment finder'],
    description: 'Property listing and search platform',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Search bar, featured properties, categories',
        priority: 1,
      },
      {
        fileName: 'listings.html',
        title: 'Property Listings',
        description: 'Property search results with filters (price, location, type)',
        priority: 1,
      },
      {
        fileName: 'property-detail.html',
        title: 'Property Detail',
        description: 'Individual property page with gallery, details, map',
        priority: 1,
      },
      {
        fileName: 'agents.html',
        title: 'Agent Directory',
        description: 'Browse real estate agents',
        priority: 2,
      },
      {
        fileName: 'agent-profile.html',
        title: 'Agent Profile',
        description: 'Individual agent page with listings and contact',
        priority: 2,
      },
      {
        fileName: 'contact.html',
        title: 'Contact',
        description: 'Contact form for inquiries',
        priority: 2,
      },
      {
        fileName: 'about.html',
        title: 'About',
        description: 'Company information',
        priority: 3,
      },
    ],
  },

  education: {
    name: 'Educational Platform',
    keywords: ['education', 'learning', 'course', 'e-learning', 'online course', 'lms', 'academy'],
    description: 'Online learning platform with courses and lessons',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Hero with course categories and featured courses',
        priority: 1,
      },
      {
        fileName: 'courses.html',
        title: 'Course Catalog',
        description: 'Browse all courses with filters',
        priority: 1,
      },
      {
        fileName: 'course-detail.html',
        title: 'Course Detail',
        description: 'Individual course page with curriculum and enrollment',
        priority: 1,
      },
      {
        fileName: 'lesson.html',
        title: 'Lesson Viewer',
        description: 'Video/content lesson page with player',
        priority: 1,
      },
      {
        fileName: 'dashboard.html',
        title: 'Student Dashboard',
        description: 'Enrolled courses and progress',
        priority: 2,
      },
      {
        fileName: 'profile.html',
        title: 'User Profile',
        description: 'Student profile with achievements',
        priority: 2,
      },
      {
        fileName: 'login.html',
        title: 'Login',
        description: 'Authentication page',
        priority: 2,
      },
    ],
  },

  fitness: {
    name: 'Fitness/Health App',
    keywords: ['fitness', 'gym', 'workout', 'health', 'exercise', 'training'],
    description: 'Fitness tracking and workout planning platform',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: "Dashboard with today's workout and stats",
        priority: 1,
      },
      {
        fileName: 'workouts.html',
        title: 'Workout Library',
        description: 'Browse workout programs and exercises',
        priority: 1,
      },
      {
        fileName: 'workout-detail.html',
        title: 'Workout Detail',
        description: 'Individual workout with exercises and instructions',
        priority: 1,
      },
      {
        fileName: 'schedule.html',
        title: 'Workout Schedule',
        description: 'Calendar view of planned workouts',
        priority: 2,
      },
      {
        fileName: 'progress.html',
        title: 'Progress Tracking',
        description: 'Stats, charts, achievements',
        priority: 2,
      },
      {
        fileName: 'profile.html',
        title: 'User Profile',
        description: 'User info and goals',
        priority: 2,
      },
      {
        fileName: 'settings.html',
        title: 'Settings',
        description: 'App preferences',
        priority: 3,
      },
    ],
  },

  booking: {
    name: 'Booking/Reservation Platform',
    keywords: ['booking', 'reservation', 'hotel', 'travel', 'airbnb', 'vacation rental'],
    description: 'Booking platform for accommodations or services',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Search with location, dates, and featured listings',
        priority: 1,
      },
      {
        fileName: 'search.html',
        title: 'Search Results',
        description: 'Listings with filters (price, location, amenities)',
        priority: 1,
      },
      {
        fileName: 'listing-detail.html',
        title: 'Listing Detail',
        description: 'Property/service detail with photos, reviews, booking',
        priority: 1,
      },
      {
        fileName: 'booking.html',
        title: 'Booking Page',
        description: 'Reservation form with dates and guest info',
        priority: 1,
      },
      {
        fileName: 'confirmation.html',
        title: 'Booking Confirmation',
        description: 'Confirmation with booking details',
        priority: 2,
      },
      {
        fileName: 'account.html',
        title: 'My Account',
        description: 'User bookings and profile',
        priority: 2,
      },
      {
        fileName: 'favorites.html',
        title: 'Favorites',
        description: 'Saved listings',
        priority: 3,
      },
    ],
  },

  corporate: {
    name: 'Corporate/Business Website',
    keywords: ['corporate', 'business', 'company website', 'enterprise', 'professional services'],
    description: 'Professional business website',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Hero with company overview and value proposition',
        priority: 1,
      },
      {
        fileName: 'about.html',
        title: 'About Us',
        description: 'Company history, mission, team',
        priority: 1,
      },
      {
        fileName: 'services.html',
        title: 'Services',
        description: 'Services offered with descriptions',
        priority: 1,
      },
      {
        fileName: 'portfolio.html',
        title: 'Portfolio/Case Studies',
        description: 'Past projects and success stories',
        priority: 2,
      },
      {
        fileName: 'team.html',
        title: 'Our Team',
        description: 'Team members and leadership',
        priority: 2,
      },
      {
        fileName: 'contact.html',
        title: 'Contact',
        description: 'Contact form and information',
        priority: 1,
      },
      {
        fileName: 'careers.html',
        title: 'Careers',
        description: 'Job openings and company culture',
        priority: 3,
      },
    ],
  },

  music: {
    name: 'Music Streaming Platform',
    keywords: ['music', 'streaming', 'spotify', 'audio', 'music player', 'songs'],
    description: 'Music streaming and discovery platform',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Personalized recommendations and recently played',
        priority: 1,
      },
      {
        fileName: 'browse.html',
        title: 'Browse Music',
        description: 'Categories, genres, new releases',
        priority: 1,
      },
      {
        fileName: 'search.html',
        title: 'Search',
        description: 'Search for songs, artists, albums, playlists',
        priority: 1,
      },
      {
        fileName: 'player.html',
        title: 'Music Player',
        description: 'Now playing with controls and queue',
        priority: 1,
      },
      {
        fileName: 'artist-profile.html',
        title: 'Artist Profile',
        description: 'Artist page with discography and bio',
        priority: 2,
      },
      {
        fileName: 'album-detail.html',
        title: 'Album Detail',
        description: 'Album tracks and information',
        priority: 2,
      },
      {
        fileName: 'playlists.html',
        title: 'Playlists',
        description: 'User playlists and curated collections',
        priority: 2,
      },
      {
        fileName: 'library.html',
        title: 'My Library',
        description: 'Saved songs, albums, and artists',
        priority: 2,
      },
      {
        fileName: 'profile.html',
        title: 'User Profile',
        description: 'User account and listening stats',
        priority: 3,
      },
    ],
  },

  jobboard: {
    name: 'Job Board Platform',
    keywords: ['job board', 'jobs', 'career', 'recruitment', 'hiring', 'employment'],
    description: 'Job listing and application platform',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Search bar, featured jobs, categories',
        priority: 1,
      },
      {
        fileName: 'job-listings.html',
        title: 'Job Listings',
        description: 'Search results with filters (location, salary, type)',
        priority: 1,
      },
      {
        fileName: 'job-detail.html',
        title: 'Job Detail',
        description: 'Job description, requirements, company info',
        priority: 1,
      },
      {
        fileName: 'company-profile.html',
        title: 'Company Profile',
        description: 'Company page with open positions',
        priority: 2,
      },
      {
        fileName: 'saved-jobs.html',
        title: 'Saved Jobs',
        description: 'Bookmarked job listings',
        priority: 2,
      },
      {
        fileName: 'applications.html',
        title: 'My Applications',
        description: 'Applied jobs and application status',
        priority: 2,
      },
      {
        fileName: 'post-job.html',
        title: 'Post a Job',
        description: 'Employer job posting form',
        priority: 3,
      },
      {
        fileName: 'profile.html',
        title: 'User Profile',
        description: 'Candidate profile and resume',
        priority: 2,
      },
    ],
  },

  dating: {
    name: 'Dating App',
    keywords: ['dating', 'dating app', 'match', 'tinder', 'bumble', 'relationship'],
    description: 'Dating and matching platform',
    screens: [
      {
        fileName: 'home.html',
        title: 'Landing Page',
        description: 'Marketing page with sign-up',
        priority: 1,
      },
      {
        fileName: 'profile-setup.html',
        title: 'Profile Setup',
        description: 'Create profile with photos and bio',
        priority: 1,
      },
      {
        fileName: 'discover.html',
        title: 'Discover/Swipe',
        description: 'Browse profiles with swipe interface',
        priority: 1,
      },
      {
        fileName: 'matches.html',
        title: 'Matches',
        description: 'List of mutual matches',
        priority: 1,
      },
      {
        fileName: 'chat.html',
        title: 'Chat',
        description: 'Messaging with matches',
        priority: 1,
      },
      {
        fileName: 'profile-view.html',
        title: 'Profile View',
        description: 'Detailed view of another user profile',
        priority: 2,
      },
      {
        fileName: 'preferences.html',
        title: 'Match Preferences',
        description: 'Set matching criteria and filters',
        priority: 2,
      },
      {
        fileName: 'profile-edit.html',
        title: 'Edit Profile',
        description: 'Update profile information',
        priority: 2,
      },
    ],
  },

  recipe: {
    name: 'Recipe Sharing Platform',
    keywords: ['recipe', 'cooking', 'food blog', 'cookbook', 'recipes', 'culinary'],
    description: 'Recipe sharing and meal planning platform',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Featured recipes and trending dishes',
        priority: 1,
      },
      {
        fileName: 'recipe-browse.html',
        title: 'Browse Recipes',
        description: 'Recipe catalog with filters (cuisine, diet, difficulty)',
        priority: 1,
      },
      {
        fileName: 'recipe-detail.html',
        title: 'Recipe Detail',
        description: 'Full recipe with ingredients, steps, photos',
        priority: 1,
      },
      {
        fileName: 'create-recipe.html',
        title: 'Create Recipe',
        description: 'Recipe creation form with photo upload',
        priority: 2,
      },
      {
        fileName: 'chef-profile.html',
        title: 'Chef Profile',
        description: 'User profile with their recipes',
        priority: 2,
      },
      {
        fileName: 'my-cookbook.html',
        title: 'My Cookbook',
        description: 'Saved recipes collection',
        priority: 2,
      },
      {
        fileName: 'meal-planner.html',
        title: 'Meal Planner',
        description: 'Weekly meal planning calendar',
        priority: 3,
      },
      {
        fileName: 'shopping-list.html',
        title: 'Shopping List',
        description: 'Generated grocery list from recipes',
        priority: 3,
      },
    ],
  },

  video: {
    name: 'Video Streaming Platform',
    keywords: ['video', 'streaming', 'youtube', 'netflix', 'videos', 'watch'],
    description: 'Video content streaming and sharing platform',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Feed',
        description: 'Personalized video recommendations',
        priority: 1,
      },
      {
        fileName: 'browse.html',
        title: 'Browse Videos',
        description: 'Categories, trending, new uploads',
        priority: 1,
      },
      {
        fileName: 'search.html',
        title: 'Search',
        description: 'Search videos, channels, playlists',
        priority: 1,
      },
      {
        fileName: 'video-player.html',
        title: 'Video Player',
        description: 'Full video player with comments and recommendations',
        priority: 1,
      },
      {
        fileName: 'channel.html',
        title: 'Channel Page',
        description: 'Creator channel with videos and about',
        priority: 2,
      },
      {
        fileName: 'upload.html',
        title: 'Upload Video',
        description: 'Video upload form with metadata',
        priority: 2,
      },
      {
        fileName: 'library.html',
        title: 'Library',
        description: 'Watch history, saved videos, playlists',
        priority: 2,
      },
      {
        fileName: 'subscriptions.html',
        title: 'Subscriptions',
        description: 'Videos from subscribed channels',
        priority: 3,
      },
    ],
  },

  podcast: {
    name: 'Podcast Platform',
    keywords: ['podcast', 'podcasting', 'audio', 'episodes', 'shows'],
    description: 'Podcast listening and discovery platform',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Featured podcasts and recommendations',
        priority: 1,
      },
      {
        fileName: 'browse.html',
        title: 'Browse Podcasts',
        description: 'Categories, trending, top charts',
        priority: 1,
      },
      {
        fileName: 'search.html',
        title: 'Search',
        description: 'Search podcasts and episodes',
        priority: 1,
      },
      {
        fileName: 'podcast-detail.html',
        title: 'Podcast Detail',
        description: 'Show page with episodes list',
        priority: 1,
      },
      {
        fileName: 'episode-player.html',
        title: 'Episode Player',
        description: 'Audio player with show notes',
        priority: 1,
      },
      {
        fileName: 'library.html',
        title: 'My Library',
        description: 'Subscriptions and downloaded episodes',
        priority: 2,
      },
      {
        fileName: 'playlists.html',
        title: 'Playlists',
        description: 'Custom episode playlists',
        priority: 3,
      },
    ],
  },

  news: {
    name: 'News Platform',
    keywords: ['news', 'news site', 'journalism', 'articles', 'media'],
    description: 'News publishing and reading platform',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Top stories and breaking news',
        priority: 1,
      },
      {
        fileName: 'category.html',
        title: 'Category Page',
        description: 'Articles by category (politics, sports, tech)',
        priority: 1,
      },
      {
        fileName: 'article.html',
        title: 'Article Page',
        description: 'Full article with images and comments',
        priority: 1,
      },
      {
        fileName: 'trending.html',
        title: 'Trending',
        description: 'Most popular and trending articles',
        priority: 2,
      },
      {
        fileName: 'search.html',
        title: 'Search',
        description: 'Search articles and topics',
        priority: 2,
      },
      {
        fileName: 'author.html',
        title: 'Author Page',
        description: 'Journalist profile and their articles',
        priority: 2,
      },
      {
        fileName: 'saved.html',
        title: 'Saved Articles',
        description: 'Bookmarked articles for later',
        priority: 3,
      },
    ],
  },

  marketplace: {
    name: 'Marketplace Platform',
    keywords: ['marketplace', 'peer-to-peer', 'classifieds', 'buy sell', 'listings'],
    description: 'Peer-to-peer marketplace for buying and selling',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Featured listings and categories',
        priority: 1,
      },
      {
        fileName: 'browse.html',
        title: 'Browse Listings',
        description: 'All listings with filters and search',
        priority: 1,
      },
      {
        fileName: 'listing-detail.html',
        title: 'Listing Detail',
        description: 'Item details, photos, seller info',
        priority: 1,
      },
      {
        fileName: 'seller-profile.html',
        title: 'Seller Profile',
        description: 'Seller page with ratings and listings',
        priority: 2,
      },
      {
        fileName: 'create-listing.html',
        title: 'Create Listing',
        description: 'Form to post new item for sale',
        priority: 1,
      },
      {
        fileName: 'my-listings.html',
        title: 'My Listings',
        description: 'Manage active and sold listings',
        priority: 2,
      },
      {
        fileName: 'messages.html',
        title: 'Messages',
        description: 'Chat with buyers/sellers',
        priority: 2,
      },
      {
        fileName: 'favorites.html',
        title: 'Favorites',
        description: 'Saved listings to watch',
        priority: 3,
      },
    ],
  },

  event: {
    name: 'Event Platform',
    keywords: ['event', 'events', 'eventbrite', 'tickets', 'conference', 'meetup'],
    description: 'Event discovery and ticketing platform',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Featured events and categories',
        priority: 1,
      },
      {
        fileName: 'browse-events.html',
        title: 'Browse Events',
        description: 'Event listings with filters (date, location, type)',
        priority: 1,
      },
      {
        fileName: 'event-detail.html',
        title: 'Event Detail',
        description: 'Event information, date, venue, tickets',
        priority: 1,
      },
      {
        fileName: 'ticket-purchase.html',
        title: 'Ticket Purchase',
        description: 'Select tickets and checkout',
        priority: 1,
      },
      {
        fileName: 'my-tickets.html',
        title: 'My Tickets',
        description: 'Purchased tickets and QR codes',
        priority: 2,
      },
      {
        fileName: 'create-event.html',
        title: 'Create Event',
        description: 'Event creation form for organizers',
        priority: 2,
      },
      {
        fileName: 'organizer-dashboard.html',
        title: 'Organizer Dashboard',
        description: 'Manage events and attendees',
        priority: 3,
      },
      {
        fileName: 'calendar.html',
        title: 'My Calendar',
        description: 'Upcoming events calendar',
        priority: 3,
      },
    ],
  },

  gaming: {
    name: 'Gaming Platform',
    keywords: ['gaming', 'game', 'games', 'esports', 'gaming platform'],
    description: 'Gaming community and game library platform',
    screens: [
      {
        fileName: 'home.html',
        title: 'Home Page',
        description: 'Featured games and news',
        priority: 1,
      },
      {
        fileName: 'store.html',
        title: 'Game Store',
        description: 'Browse and purchase games',
        priority: 1,
      },
      {
        fileName: 'game-detail.html',
        title: 'Game Detail',
        description: 'Game page with screenshots, reviews, specs',
        priority: 1,
      },
      {
        fileName: 'library.html',
        title: 'Game Library',
        description: 'User-owned games collection',
        priority: 1,
      },
      {
        fileName: 'community.html',
        title: 'Community',
        description: 'Forums, discussions, and updates',
        priority: 2,
      },
      {
        fileName: 'profile.html',
        title: 'User Profile',
        description: 'Gamer profile with achievements and stats',
        priority: 2,
      },
      {
        fileName: 'friends.html',
        title: 'Friends',
        description: 'Friends list and social features',
        priority: 2,
      },
      {
        fileName: 'leaderboard.html',
        title: 'Leaderboards',
        description: 'Game rankings and achievements',
        priority: 3,
      },
    ],
  },
};

/**
 * Detect application type from user query
 */
export function detectApplicationType(query: string): ApplicationTemplate | null {
  const lowerQuery = query.toLowerCase();

  // Check for exact matches first
  for (const template of Object.values(APPLICATION_TEMPLATES)) {
    for (const keyword of template.keywords) {
      if (lowerQuery.includes(keyword)) {
        return template;
      }
    }
  }

  return null;
}

/**
 * Check if user wants a complete application (multiple screens)
 */
export function isMultiScreenRequest(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const multiScreenKeywords = [
    'full',
    'complete',
    'entire',
    'whole',
    'all pages',
    'application',
    'app',
    'platform',
    'website',
    'system',
  ];

  return multiScreenKeywords.some((keyword) => lowerQuery.includes(keyword));
}

/**
 * Get essential screens only (priority 1 and 2)
 */
export function getEssentialScreens(template: ApplicationTemplate): ScreenTemplate[] {
  return template.screens.filter((screen) => screen.priority <= 2);
}

/**
 * Get all screens including optional ones
 */
export function getAllScreens(template: ApplicationTemplate): ScreenTemplate[] {
  return template.screens;
}
