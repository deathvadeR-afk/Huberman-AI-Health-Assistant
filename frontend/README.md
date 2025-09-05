# Huberman Health AI Frontend

The frontend application for the Huberman Health AI Assistant, built with React, TypeScript, and Vite. Provides an intuitive interface for users to search Dr. Andrew Huberman's podcast content for health-related information.

## 🎯 Features

- **Health Query Search**: Natural language search for health topics
- **Video Recommendations**: AI-powered video suggestions with relevance scoring
- **Timestamp Navigation**: Jump directly to relevant moments in videos
- **Responsive Design**: Optimized for desktop and mobile devices
- **Health Disclaimers**: Appropriate medical disclaimers for health content
- **Real-time Search**: Fast, responsive search with loading states

## 🏗️ Architecture

The frontend follows a component-based architecture with TypeScript:

```
frontend/
├── src/
│   ├── App.tsx                 # Main application component
│   ├── main.tsx               # Application entry point
│   ├── components/            # Reusable UI components
│   │   ├── VideoResult.tsx    # Video search result display
│   │   ├── HealthDisclaimer.tsx # Medical disclaimer component
│   │   ├── SearchInterface.tsx # Search input interface
│   │   ├── VideoPlayer.tsx    # YouTube video player
│   │   └── LoadingSpinner.tsx # Loading state component
│   ├── pages/                 # Page components (advanced routing)
│   │   ├── HomePage.tsx       # Landing page with search
│   │   ├── SearchPage.tsx     # Search results page
│   │   ├── VideoPage.tsx      # Individual video page
│   │   └── TopicsPage.tsx     # Health topics browser
│   ├── lib/                   # Utility libraries
│   │   ├── api.ts            # API client functions
│   │   └── utils.ts          # Helper utilities
│   └── hooks/                 # Custom React hooks
├── public/                    # Static assets
└── dist/                      # Built application
```

## 🎨 Tech Stack

- **React 19**: Latest React with concurrent features
- **TypeScript**: Type-safe JavaScript development
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Smooth animations and transitions
- **React Query**: Server state management and caching
- **React Router**: Client-side routing
- **Lucide React**: Beautiful icon library

## 🚀 Development

### Installation
```bash
cd frontend
npm install
```

### Development Server
```bash
# Start development server with hot reload
npm run dev
```

### Building for Production
```bash
# Build optimized production bundle
npm run build

# Preview production build locally
npm run preview
```

### Code Quality
```bash
# Run ESLint
npm run lint

# Type checking
npx tsc --noEmit
```

## 🎯 Component Overview

### Core Components

#### App.tsx
- Main application component with simple routing
- Manages global state for search and navigation
- Provides mock data for demonstration

#### VideoResult.tsx
- Displays individual video search results
- Shows relevance scores and AI-generated snippets
- Includes timestamp navigation for precise content location

#### HealthDisclaimer.tsx
- Displays appropriate medical disclaimers
- Multiple variants (banner, inline) for different contexts
- Ensures responsible presentation of health information

### Advanced Components (pages/)

The `pages/` directory contains more sophisticated components using React Router and React Query:

- **HomePage**: Advanced landing page with real API integration
- **SearchPage**: Full-featured search with filters and sorting
- **VideoPage**: Detailed video view with transcript segments
- **TopicsPage**: Browse health topics by category

## 🔧 Configuration

### Environment Variables
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here
```

### Tailwind Configuration
The project uses a custom Tailwind configuration with:
- Custom color palette for health/science theme
- Responsive breakpoints
- Custom animations and transitions
- Typography optimizations

## 📱 Responsive Design

The application is fully responsive with:
- Mobile-first design approach
- Optimized touch interactions
- Adaptive layouts for different screen sizes
- Performance optimizations for mobile devices

## 🎭 User Experience

### Search Experience
- Natural language query input
- Real-time search suggestions
- Loading states with skeleton screens
- Error handling with user-friendly messages

### Video Integration
- Embedded YouTube player
- Timestamp-based navigation
- Relevance highlighting
- Related content suggestions

### Accessibility
- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility

## 🚀 Deployment

### Docker Deployment
```bash
# Build Docker image
docker build -t huberman-health-ai-frontend .

# Run container
docker run -p 3000:80 huberman-health-ai-frontend
```

### Static Hosting
The built application can be deployed to any static hosting service:
- Vercel (recommended)
- Netlify
- AWS S3 + CloudFront
- GitHub Pages

## 🤝 Contributing

1. Follow React and TypeScript best practices
2. Use Tailwind CSS for styling
3. Add TypeScript interfaces for all data structures
4. Include proper error handling
5. Test components across different screen sizes
6. Ensure accessibility compliance
