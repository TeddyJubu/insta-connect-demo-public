# Stage 4: Frontend & User Experience - Implementation Plan

**Status:** Planning  
**Framework:** Next.js 14 with TypeScript  
**Styling:** Tailwind CSS (existing design system)  
**State Management:** React Context + SWR for data fetching

---

## Overview

Migrate from static HTML to a modern React/Next.js application with:
- Shared authentication state
- Improved error and empty state messaging
- Guided onboarding flow
- Better user experience throughout

---

## Architecture Decision

### Why Next.js?

1. **Server-Side Rendering (SSR)** - Better SEO and initial load performance
2. **API Routes** - Can keep existing Express backend or migrate gradually
3. **File-based Routing** - Intuitive page structure
4. **TypeScript Support** - Built-in, excellent DX
5. **Production Ready** - Optimized builds, image optimization, etc.
6. **Easy Deployment** - Works well with existing Node.js infrastructure

### Hybrid Approach

**Phase 1:** Keep Express backend, use Next.js as frontend only
- Express handles: Auth, OAuth, webhooks, database
- Next.js handles: UI rendering, client-side routing
- Communication: Next.js calls Express API endpoints

**Benefits:**
- Minimal disruption to working backend
- Can migrate incrementally
- Easier to test and deploy

---

## Project Structure

```
insta-connect-demo/
├── server.js                 # Express backend (existing)
├── src/                      # Express backend code (existing)
│   ├── db/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   └── jobs/
├── frontend/                 # NEW: Next.js application
│   ├── app/                  # App router (Next.js 14)
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── webhooks/
│   │   │   └── settings/
│   │   └── onboarding/
│   │       └── page.tsx
│   ├── components/           # React components
│   │   ├── ui/               # Reusable UI components
│   │   ├── auth/             # Auth-related components
│   │   ├── dashboard/        # Dashboard components
│   │   └── onboarding/       # Onboarding components
│   ├── lib/                  # Utilities
│   │   ├── api.ts            # API client
│   │   ├── auth.ts           # Auth helpers
│   │   └── hooks.ts          # Custom React hooks
│   ├── contexts/             # React contexts
│   │   └── AuthContext.tsx
│   ├── public/               # Static assets
│   ├── styles/               # Global styles
│   ├── next.config.js
│   ├── tsconfig.json
│   └── package.json
├── public/                   # OLD: Static HTML (will deprecate)
└── package.json              # Root package.json
```

---

## Implementation Phases

### Phase 1: Setup and Foundation (Tasks 1-2)

**1. Initialize Next.js Project**
```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
```

**2. Configure Next.js**
- Set up proxy to Express backend (port 3000)
- Configure Tailwind with existing design tokens
- Set up TypeScript strict mode
- Configure environment variables

**3. Install Dependencies**
```bash
npm install swr axios react-hook-form zod
npm install -D @types/node @types/react
```

### Phase 2: Authentication (Task 3)

**1. Create Auth Context**
- Shared authentication state
- Session management
- Auto-refresh on mount
- Logout functionality

**2. Build Auth Pages**
- `/login` - Login form with validation
- `/register` - Registration form with password confirmation
- Error handling and feedback
- Redirect after successful auth

**3. Protected Routes**
- Middleware to check authentication
- Redirect to login if not authenticated
- Loading states during auth check

### Phase 3: Dashboard Layout (Task 4)

**1. Main Layout**
- Top navigation bar
- User menu with avatar
- Responsive sidebar (mobile/desktop)
- Footer

**2. Navigation**
- Dashboard home
- Webhooks
- Settings
- Logout

**3. Responsive Design**
- Mobile-first approach
- Hamburger menu for mobile
- Collapsible sidebar for desktop

### Phase 4: OAuth Flow (Task 5)

**1. Connect Instagram Button**
- Loading state during OAuth
- Error handling
- Success feedback
- Redirect handling

**2. OAuth Callback Page**
- Handle OAuth redirect
- Show loading spinner
- Display success/error messages
- Auto-redirect to dashboard

**3. Account Selection**
- Display connected accounts
- Show Instagram Business accounts
- Select primary account
- Disconnect functionality

### Phase 5: Error & Empty States (Task 6)

**1. Error Messages**
- Network errors
- API errors
- Validation errors
- OAuth errors
- Helpful error messages with actions

**2. Empty States**
- No accounts connected
- No webhooks configured
- No events received
- Guidance on next steps

**3. Loading States**
- Skeleton loaders
- Spinner components
- Progress indicators
- Optimistic updates

### Phase 6: Onboarding Flow (Task 7)

**1. Welcome Screen**
- Introduction to the app
- Key features overview
- Get started button

**2. Step-by-Step Guide**
- Step 1: Create account
- Step 2: Connect Instagram
- Step 3: Configure webhooks
- Step 4: Test webhooks
- Progress indicator

**3. Contextual Help**
- Tooltips
- Info icons
- Help text
- Links to documentation

### Phase 7: Webhook Dashboard (Task 8)

**1. Event List**
- Table/card view
- Filtering by status
- Search functionality
- Pagination
- Real-time updates (SWR)

**2. Event Details**
- Modal or detail page
- Full payload display
- Retry button
- Status history
- Timestamps

**3. Statistics**
- Total events
- Success rate
- Failed events
- Processing time
- Charts (optional)

### Phase 8: Polish & Feedback (Task 9)

**1. Loading States**
- Button loading spinners
- Page transitions
- Skeleton screens
- Progress bars

**2. Notifications**
- Toast notifications
- Success messages
- Error alerts
- Info messages

**3. Animations**
- Smooth transitions
- Fade in/out
- Slide animations
- Micro-interactions

### Phase 9: Testing & Deployment (Task 10)

**1. Testing**
- Component testing
- Integration testing
- E2E testing (optional)
- Manual testing

**2. Build & Optimize**
- Production build
- Bundle size optimization
- Image optimization
- Performance testing

**3. Deployment**
- Build Next.js app
- Configure Nginx for Next.js
- Deploy to production
- Verify all functionality

---

## Technical Specifications

### API Client

```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  withCredentials: true, // Important for session cookies
});

export default api;
```

### Auth Context

```typescript
// contexts/AuthContext.tsx
interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
}
```

### SWR for Data Fetching

```typescript
// lib/hooks.ts
import useSWR from 'swr';
import api from './api';

export function useWebhookEvents() {
  const { data, error, mutate } = useSWR('/api/webhook-events', 
    (url) => api.get(url).then(res => res.data),
    { refreshInterval: 10000 } // Auto-refresh every 10s
  );
  
  return {
    events: data?.events || [],
    loading: !error && !data,
    error,
    mutate,
  };
}
```

---

## Design System

### Colors (from existing design)

```javascript
brand: {
  50: '#fff4f1',
  100: '#ffe7e1',
  200: '#ffcdc4',
  300: '#ffac9b',
  400: '#ff8269',
  500: '#ff5b40',  // Primary
  600: '#f74e32',
  700: '#dd3619',
  800: '#b02b14',
  900: '#81230f',
}
```

### Typography

- **Display:** Plus Jakarta Sans (headings)
- **Body:** Inter (body text)

### Components

- Buttons: Rounded-full, shadow-lg
- Cards: Rounded-2xl, border, shadow-sm
- Inputs: Rounded-lg, border
- Modals: Backdrop blur, slide-in animation

---

## Configuration

### Next.js Config

```javascript
// frontend/next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/:path*', // Proxy to Express
      },
      {
        source: '/auth/:path*',
        destination: 'http://localhost:3000/auth/:path*',
      },
      {
        source: '/webhook/:path*',
        destination: 'http://localhost:3000/webhook/:path*',
      },
    ];
  },
};
```

### Environment Variables

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Instagram Connect Console
```

---

## Deployment Strategy

### Development

1. Run Express backend: `node server.js` (port 3000)
2. Run Next.js frontend: `cd frontend && npm run dev` (port 3001)
3. Next.js proxies API calls to Express

### Production

**Option 1: Separate Ports**
- Express on port 3000
- Next.js on port 3001
- Nginx routes `/api/*` to Express, everything else to Next.js

**Option 2: Next.js as Frontend Only**
- Build Next.js: `npm run build`
- Export static files: `npm run export`
- Serve from Express `public/` directory
- Keep Express for all backend logic

**Recommended: Option 1** (more flexible, easier to scale)

---

## Success Criteria

- [ ] All existing functionality works in new UI
- [ ] Authentication flow is smooth and intuitive
- [ ] Error messages are helpful and actionable
- [ ] Empty states guide users on next steps
- [ ] Onboarding flow helps new users get started
- [ ] Webhook dashboard is easy to use
- [ ] Loading states prevent confusion
- [ ] Mobile responsive design works well
- [ ] Production build is optimized
- [ ] Deployment is successful

---

## Timeline Estimate

- **Setup & Foundation:** 1-2 hours
- **Authentication:** 2-3 hours
- **Dashboard Layout:** 2-3 hours
- **OAuth Flow:** 2-3 hours
- **Error & Empty States:** 1-2 hours
- **Onboarding Flow:** 2-3 hours
- **Webhook Dashboard:** 3-4 hours
- **Polish & Feedback:** 2-3 hours
- **Testing & Deployment:** 2-3 hours

**Total:** 17-26 hours

---

## Next Steps

1. Initialize Next.js project in `frontend/` directory
2. Set up basic configuration and dependencies
3. Create auth context and pages
4. Build dashboard layout
5. Implement features incrementally
6. Test thoroughly
7. Deploy to production

---

**Ready to begin implementation!**

