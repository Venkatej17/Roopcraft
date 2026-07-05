# RoopCraft OS — PRD

## Vision
An AI-powered mobile app for creative agencies to research businesses, generate growth strategies, and produce client-ready sales kits and proposals — going from **business name → intelligence report → sales kit → proposal** in minutes.

## MVP Scope (v1)
Focus: **Research → Strategy → Pitch**. Deferred: CRM automation, payments, team collaboration, PDF/PPT export, meeting coach, analytics charts.

## Features Implemented

### Auth
- Email/password JWT auth (bcrypt, expo-secure-store token storage)
- Register, Login, Auto-login on app open
- Protected navigation via expo-router

### Dashboard
- 5 KPI cards: Total Leads, Meetings, Proposals Sent, Active Clients, Win Rate
- Recent leads preview
- Sticky floating `+ New Business Audit` CTA
- Empty state onboarding

### New Business Audit
- Full form: business name, category (9 categories), city, state, IG URL, website, Google Maps URL, USP, goal, notes
- AI model picker: **Gemini 3 Pro / Claude Sonnet 4.5 / GPT-5.2**
- Generates full intelligence report on submit (20-60s)

### AI Intelligence Report (per lead)
All generated in a single LLM call producing structured JSON:
- Business summary (positioning, customer experience, target audience)
- Google Maps analysis (rating, positive themes, common complaints, peak hours)
- Instagram audit (bio, highlights, reels, engagement, strengths, weaknesses, quick wins)
- Nearby opportunities (5-8 with type + how-to-target)
- Competitor analysis (5-8 competitors)
- Growth strategy (target audience primary/secondary/future, content pillars, monthly mix bars)
- **30 personalized reel ideas** grouped by category

### Sales Kit (per lead)
On-demand generation:
- Cold call script
- Instagram DM
- WhatsApp message
- Meeting opening
- Slide-by-slide speaker notes (8 slides)
- Objection handling (5 objections)
- Closing script
- Copy-to-clipboard on every card

### Proposal (per lead)
On-demand generation:
- Cover, Audit, Opportunities, Strategy, Timeline (3 months), Pricing card, Portfolio, Closing
- "Copy full proposal" bulk clipboard

### Leads / Reports
- Filterable lead list (All + 6 status filters)
- Status update (7 statuses: New → Won/Lost pipeline)
- Delete lead

### Profile
- User info, sign out

## Tech Stack
- **Backend**: FastAPI + Motor (async MongoDB) + JWT + bcrypt + emergentintegrations
- **AI**: Emergent LLM key routing to Gemini 3.1 Pro / Claude Sonnet 4.5 / GPT-5.2
- **Frontend**: Expo SDK 54, expo-router (file-based routes), react-native-safe-area-context, expo-clipboard, expo-linear-gradient, expo-image, Ionicons
- **Storage**: MongoDB (users, leads collections). Token via expo-secure-store.
- **Design**: white + black + orange (#FF6B00), Linear/Notion inspired

## Design System
- Surface: `#FFFFFF`, text: `#000`, brand: `#FF6B00`, secondary: `#F7F7F7`
- Radius: 12–16px cards, pill for chips
- Typography: system font, weight 400–800, letter-spacing –0.8 for titles
- Bottom tabs: Dashboard / Leads / New (FAB style) / Reports / Profile

## Personal Use
This app is a personal tool for the user. Access is controlled via their own email/password registration — only they can access their leads/reports. No public sign-ups need to be enabled/disabled explicitly.
