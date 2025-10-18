CollabCanvas Landing Page (with Scroll Animations + Final Copy)

**Goal:** Build a production-quality, responsive landing page for **CollabCanvas** (collaborative design app with AI features) using **Next.js, TypeScript, Tailwind, shadcn/ui, and Framer Motion**.
**Important:** Use the **exact copy** below for each section (minor grammar fixes allowed). No purple anywhere.

---

## Brand System (no purple)

- Background: **#FFFFFF**
- Text primary: **#0F172A** (deep navy)
- Primary brand: **#1E6DFF** (blue)
- Accent: **#10B981** (green)
- Grays: Tailwind `slate`
- Radius: `rounded-2xl`
- Shadows: soft elevation on cards/CTAs
- Font: **Inter** or **Manrope**
- CTA hierarchy: Primary = blue on white; Secondary = outline

---

## Section Order (each = its own component in `/components/landing/*`)

1. Navbar (sticky)
2. Hero
3. Benefits
4. Process
5. Features (alternating image/text rows)
6. Pricing
7. Testimonials
8. FAQ (accordion)
9. CTA (final)
10. Footer

Use shadcn/ui where helpful: **Button, Card, Badge, Accordion, Separator**.
Centralize all copy in a `content` module; components consume from there.

---

## Final Copy (use verbatim unless small polish improves clarity)

### 1) Navbar

- **Logo:** CollabCanvas
- **Links:** Features • Pricing • FAQ • Login
- **CTA:** Get Started Free

### 2) Hero

- **Eyebrow:** Collaborate in real time
- **H1:** Design Together, Smarter.
- **Subhead:** CollabCanvas lets teams co-create beautiful designs in real time — with AI that helps you ideate, refine, and ship faster.
- **Primary CTA:** Start Designing Free
- **Secondary CTA:** Watch Demo
- **Trust line:** Trusted by teams at Acme • Northstar • Helix • Brightly
- **Hero mockup alt text:** “CollabCanvas interface with multiple cursors collaborating on a canvas.”

### 3) Benefits (4 cards)

- **Section H2:** Why Teams Love CollabCanvas
- **Cards:**

  1. **Real-Time Collaboration** — See every edit instantly as your team designs together.
  2. **AI Design Assistant** — Generate layouts, color palettes, and on-brand copy in seconds.
  3. **Simple Yet Powerful** — Focused tools for modern UI design without the complexity.
  4. **Cloud-Synced** — Access your canvases anywhere, on any device.

### 4) Process (3 steps)

- **Section H2:** How It Works
- **Steps:**

  1. **Create a canvas** — Start from a template or a blank slate with your team.
  2. **Collaborate live** — Sketch, comment, and iterate together in real time.
  3. **Boost with AI** — Let AI refine layouts and suggest improvements instantly.

### 5) Features (alternating rows)

- **Section H2:** Design + AI = Endless Creativity
- **Feature blocks:**

  - **Smart Layout Suggestions** — Auto-align, resize, and balance your design with a single click.
  - **AI Copywriter** — Generate on-brand product copy or headlines directly in the canvas.
  - **Version History & Comments** — Keep collaboration transparent with threaded comments and quick restores.
  - **Multiplayer Editing** — Everyone edits together — see cursors, selections, and presence.

- **Feature mockup alt text for each row:** “Close-up of CollabCanvas showing [feature title] in use.”

### 6) Pricing (3 cards)

- **Section H2:** Plans that Scale with You
- **Free — $0/mo**

  - 3 canvases • Basic AI • 2 collaborators • Community support
  - **CTA:** Start Free

- **Pro — $12/mo (Most Popular)**

  - Unlimited canvases • Full AI toolkit • Custom exports • Priority support
  - **CTA:** Upgrade to Pro

- **Team — $29/mo**

  - Everything in Pro • Admin controls • SSO (coming soon) • Unlimited collaborators
  - **CTA:** Start Team

### 7) Testimonials (3 quotes)

- **Section H2:** Loved by Designers Everywhere
- **Quotes:**

  - “CollabCanvas makes collaboration effortless — our team ships designs 2× faster!” — **Lina G., Product Designer at StudioOne**
  - “The AI assistant is like a superpower — it unblocks our drafts in minutes.” — **Marcus H., Design Lead at NovaLabs**
  - “Simple, fast, and perfect for async work across time zones.” — **Priya S., UX Manager at Brightly**

### 8) FAQ (accordion)

- **Section H2:** Got Questions?
- **Items:**

  - **Is there a free plan?** — Yes. The Free plan includes 3 canvases, basic AI, and 2 collaborators.
  - **Can I invite my team?** — Absolutely. Pro and Team plans are built for collaboration.
  - **Does it work on mobile?** — You can view and comment on mobile; editing is best on desktop.
  - **What AI features are included?** — Layout suggestions, color palettes, and AI copywriting. More coming soon!

### 9) CTA (final)

- **H2:** Start Designing Smarter Today
- **Subtext:** Join thousands of creators using CollabCanvas to design faster, together.
- **Button:** Get Started Free

### 10) Footer

- **Line:** CollabCanvas helps teams design, iterate, and launch together.
- **Links:** Terms • Privacy • Contact
- **Copyright:** © {current year} CollabCanvas

---

## Layout & Responsiveness

- Container: centered **max-w-7xl**, horizontal **px-6 md:px-8**, vertical **py-20** per section.
- Grids: mobile 1-col → tablet 2-col → desktop 3–4 col (benefits, pricing, testimonials).
- Buttons: full-width on mobile, inline above `sm`.
- Navbar: sticky, translucent white, border-bottom + backdrop-blur.

---

## Animation System (Framer Motion + Tailwind)

**Core principles**

- Subtle scroll-reveal; consistent timing; **stagger** lists.
- Animate only **opacity** and **transform**.
- Respect **prefers-reduced-motion** (disable or simplify).
- Keep 60fps, no jank, no layout shift.

**Motion tokens**

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out).
- Durations: hover 150–200ms; reveals 400–700ms; stagger 60–100ms.
- Offsets: reveal from `y=16–24px` (opacity 0→1).
- Viewport triggers: `once: true`, threshold ≈ 0.25, margin `-10% 0px -10% 0px`.

**Choreography by section**

1. **Navbar:** On scroll-down add shadow & slight height shrink; on scroll-up remove. Optional 2px scroll progress bar in brand blue (30% opacity).
2. **Hero:** Eyebrow → H1 → Subhead → CTA group → trust logos with **stagger**. Mockup gets a subtle parallax (translateY up to 12px) and faint float loop (1–2px).
3. **Benefits:** Heading reveals; cards appear with stagger; hover/focus micro-lift (−2px) and shadow increase.
4. **Process:** Steps 1→2→3 slide/fade left-to-right with stagger; step badge scales 0.95→1 once.
5. **Features:** Per row, image slides in from nearest edge first, then text (120ms delay).
6. **Pricing:** Cards reveal with slight scale/opacity stagger; “Most Popular” badge gets a one-time soft pulse; strong focus ring on that card.
7. **Testimonials:** Cards stagger in; hover/focus elevates shadow; decorative quote mark fades.
8. **FAQ:** Whole list reveals; accordion expand/collapse animated height/opacity; keyboard and ARIA compliant (use shadcn Accordion).
9. **CTA:** Card reveals from y=20px; primary button hover scale 1.02 and lift; visible focus ring.
10. **Footer:** Gentle fade-in only.

**Micro-interactions**

- Links/CTAs: hover 150–200ms ease-out, underline or lift; active 0.98 scale; clear 2px focus ring in brand blue or accent green.
- Disable parallax/float when reduced motion is requested.

---

## Accessibility & SEO

- Semantic landmarks and correct heading hierarchy.
- Alt text for mockups (or mark decorative if purely visual).
- Keyboard focus states on all interactive elements.
- **WCAG AA** contrast on white background.
- SEO: `<title>CollabCanvas — Design Together, Smarter</title>`, meta description, OG/Twitter tags, favicon.

---

## Acceptance Criteria

- **Structure:** Each section is an isolated component and composed in the specified order; copy sourced from a single content module.
- **Brand:** White bg, navy text, blue primary, green accent; **no purple**.
- **Responsiveness:** Clean at 360px → large desktop; grids step 1→2→3/4; hero stacks gracefully.
- **Animation:** Scroll-reveal + stagger used tastefully per choreography; respects reduced motion; zero jank.
- **A11y:** Keyboard-navigable, visible focus, proper roles/ARIA, AA contrast.
- **Copy:** Exactly matches the **Final Copy** above (tiny polish allowed); no lorem ipsum.
- **SEO:** Title, description, OG/Twitter meta present.
- **Polish:** Consistent spacing rhythm, alignment, and shadows; trust logos grayscale.

> If any scaffold default conflicts with these instructions, **honor this prompt**. Deliver a refined, production-ready landing page for **CollabCanvas** with the exact copy and animation behaviors defined above.
