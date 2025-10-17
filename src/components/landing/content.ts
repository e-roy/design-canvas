export const landingPageContent = {
  navbar: {
    logo: "CollabCanvas",
    links: ["Features", "Pricing", "FAQ", "Login"],
    cta: "Get Started Free",
  },

  hero: {
    eyebrow: "Collaborate in real time",
    h1: "Design Together, Smarter.",
    subhead:
      "CollabCanvas lets teams co-create beautiful designs in real time — with AI that helps you ideate, refine, and ship faster.",
    primaryCta: "Start Designing Free",
    secondaryCta: "Watch Demo",
    trustLine: "Trusted by teams at Acme • Northstar • Helix • Brightly",
    mockupAlt:
      "CollabCanvas interface with multiple cursors collaborating on a canvas.",
  },

  benefits: {
    h2: "Why Teams Love CollabCanvas",
    cards: [
      {
        title: "Real-Time Collaboration",
        description: "See every edit instantly as your team designs together.",
      },
      {
        title: "AI Design Assistant",
        description:
          "Generate layouts, color palettes, and on-brand copy in seconds.",
      },
      {
        title: "Simple Yet Powerful",
        description:
          "Focused tools for modern UI design without the complexity.",
      },
      {
        title: "Cloud-Synced",
        description: "Access your canvases anywhere, on any device.",
      },
    ],
  },

  process: {
    h2: "How It Works",
    steps: [
      {
        title: "Create a canvas",
        description: "Start from a template or a blank slate with your team.",
      },
      {
        title: "Collaborate live",
        description: "Sketch, comment, and iterate together in real time.",
      },
      {
        title: "Boost with AI",
        description:
          "Let AI refine layouts and suggest improvements instantly.",
      },
    ],
  },

  features: {
    h2: "Design + AI = Endless Creativity",
    blocks: [
      {
        title: "Smart Layout Suggestions",
        description:
          "Auto-align, resize, and balance your design with a single click.",
        alt: "Close-up of CollabCanvas showing Smart Layout Suggestions in use.",
      },
      {
        title: "AI Design Assistant",
        description:
          "Generate on-brand layouts, color palettes, and on-brand copy in seconds.",
        alt: "Close-up of CollabCanvas showing AI Design Assistant in use.",
      },
      {
        title: "Version History & Comments",
        description:
          "Keep collaboration transparent with threaded comments and quick restores.",
        alt: "Close-up of CollabCanvas showing Version History & Comments in use.",
      },
      {
        title: "Multiplayer Editing",
        description:
          "Everyone edits together — see cursors, selections, and presence.",
        alt: "Close-up of CollabCanvas showing Multiplayer Editing in use.",
      },
    ],
  },

  pricing: {
    h2: "Plans that Scale with You",
    plans: [
      {
        name: "Free",
        price: "$0/mo",
        features: [
          "3 canvases",
          "Basic AI",
          "2 collaborators",
          "Community support",
        ],
        cta: "Start Free",
        popular: false,
      },
      {
        name: "Pro",
        price: "$12/mo",
        badge: "Most Popular",
        features: [
          "Unlimited canvases",
          "Full AI toolkit",
          "Custom exports",
          "Priority support",
        ],
        cta: "Upgrade to Pro",
        popular: true,
      },
      {
        name: "Team",
        price: "$29/mo",
        features: [
          "Everything in Pro",
          "Admin controls",
          "SSO (coming soon)",
          "Unlimited collaborators",
        ],
        cta: "Start Team",
        popular: false,
      },
    ],
  },

  testimonials: {
    h2: "Loved by Designers Everywhere",
    quotes: [
      {
        text: "CollabCanvas makes collaboration effortless — our team ships designs 2× faster!",
        author: "Lina G.",
        role: "Product Designer at StudioOne",
      },
      {
        text: "The AI assistant is like a superpower — it unblocks our drafts in minutes.",
        author: "Marcus H.",
        role: "Design Lead at NovaLabs",
      },
      {
        text: "Simple, fast, and perfect for async work across time zones.",
        author: "Priya S.",
        role: "UX Manager at Brightly",
      },
    ],
  },

  faq: {
    h2: "Got Questions?",
    items: [
      {
        question: "Is there a free plan?",
        answer:
          "Yes. The Free plan includes 3 canvases, basic AI, and 2 collaborators.",
      },
      {
        question: "Can I invite my team?",
        answer: "Absolutely. Pro and Team plans are built for collaboration.",
      },
      {
        question: "Does it work on mobile?",
        answer:
          "You can view and comment on mobile; editing is best on desktop.",
      },
      {
        question: "What AI features are included?",
        answer:
          "Layout suggestions, color palettes, and AI copywriting. More coming soon!",
      },
    ],
  },

  cta: {
    h2: "Start Designing Smarter Today",
    subtext:
      "Join thousands of creators using CollabCanvas to design faster, together.",
    button: "Get Started Free",
  },

  footer: {
    tagline: "CollabCanvas helps teams design, iterate, and launch together.",
    links: ["Terms", "Privacy", "Contact"],
    copyright: `© ${new Date().getFullYear()} CollabCanvas`,
  },
} as const;
