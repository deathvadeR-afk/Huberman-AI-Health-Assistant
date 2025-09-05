# Huberman Health AI Assistant - Demo Video Script

## Video Overview
**Duration:** 3-5 minutes  
**Target Audience:** Developers, health enthusiasts, AI/MCP enthusiasts  
**Objective:** Showcase the complete functionality of the Huberman Health AI Assistant

---

## Script Structure

### Opening (0:00 - 0:30)
**[Screen: Project logo/title card]**

**Narrator:** "Meet the Huberman Health AI Assistant - a comprehensive platform that makes Dr. Andrew Huberman's vast library of health and neuroscience knowledge instantly searchable and actionable. Built with real data from 392 Huberman Lab podcast episodes, this system combines AI-powered search, semantic understanding, and a Model Context Protocol server to deliver precise health insights."

**[Screen: Quick montage of the tech stack - React frontend, Node.js backend, PostgreSQL, MCP server]**

---

### Section 1: Real Data Foundation (0:30 - 1:00)
**[Screen: Terminal showing data collection script]**

**Narrator:** "First, let's see the foundation - real data. Our system automatically collects and processes actual Huberman Lab content using advanced web scraping."

**[Demo Action: Run data collection script]**
```bash
node scripts/collect-huberman-data.js
```

**[Screen: Show console output with video counts and processing status]**

**Narrator:** "The system has processed 392 real episodes with full transcripts, timestamps, and metadata - no mock data here."

**[Screen: Database view showing actual video entries]**

---

### Section 2: Frontend Interface & Search (1:00 - 2:00)
**[Screen: Frontend application loading]**

**Narrator:** "The React frontend provides an intuitive interface for health queries. Watch as we demonstrate both basic and advanced search capabilities."

**[Demo Action: Navigate to the application]**
- Show the clean, modern interface
- Display the search bar and backend status indicator

**[Demo Query 1: Basic Health Question]**
**Type:** "What does Huberman say about improving sleep quality?"

**[Screen: Show real-time search results with:]**
- Relevant video titles
- Specific timestamps
- Key quotes from transcripts
- Confidence scores

**Narrator:** "Notice how the system returns specific episodes, exact timestamps, and relevant quotes - all from real Huberman content."

**[Demo Query 2: Complex Protocol Question]**
**Type:** "What's the optimal morning routine for dopamine and focus according to Huberman?"

**[Screen: Show comprehensive results with multiple episodes and specific protocols]**

---

### Section 3: AI-Powered Semantic Search (2:00 - 2:30)
**[Screen: Backend API calls in developer tools]**

**Narrator:** "Behind the scenes, our semantic search engine uses vector embeddings to understand context, not just keywords."

**[Demo Query 3: Conceptual Search]**
**Type:** "How to recover from burnout and stress"

**[Screen: Show how the system finds relevant content even when Huberman doesn't use those exact words]**

**Narrator:** "The AI understands that 'burnout' relates to stress management, cortisol regulation, and recovery protocols - finding relevant content across multiple episodes."

**[Screen: Show the semantic matching scores and related topics]**

---

### Section 4: MCP Server Integration (2:30 - 3:30)
**[Screen: MCP server terminal/interface]**

**Narrator:** "The Model Context Protocol server enables seamless integration with AI assistants and other tools. Let's see the six specialized tools in action."

**[Demo Action: Show MCP server running]**
```bash
node backend/start-mcp-server.js
```

**[Screen: List the 6 MCP tools:]**
1. **process_health_query** - Natural language health questions
2. **semantic_search** - Vector-based content search  
3. **extract_timestamps** - Precise moment extraction
4. **get_video_stats** - Episode analytics
5. **scrape_huberman_videos** - Real-time data updates
6. **get_health_topics** - Topic categorization

**[Demo Action: Test MCP tool via API call]**
```json
{
  "method": "process_health_query",
  "params": {
    "query": "Best supplements for cognitive enhancement",
    "limit": 3
  }
}
```

**[Screen: Show structured JSON response with specific recommendations, dosages, and episode references]**

**Narrator:** "Each tool returns structured data that can be consumed by other applications, making this a true integration platform."

---

### Section 5: Technical Architecture Highlight (3:30 - 4:00)
**[Screen: Architecture diagram or code structure]**

**Narrator:** "The system architecture demonstrates production-ready best practices:"

**[Screen: Show key components:]**
- **Real-time data processing** with Apify integration
- **Vector database** for semantic search
- **OpenRouter AI integration** with cost tracking
- **PostgreSQL** for reliable data storage
- **Docker containerization** for easy deployment
- **Comprehensive monitoring** and logging

**[Screen: Show deployment script]**
```bash
./start-production.sh
```

**Narrator:** "One command deploys the entire stack - frontend, backend, database, and MCP server."

---

### Section 6: Advanced Features Demo (4:00 - 4:30)
**[Demo Query 4: Multi-topic Complex Query]**
**Type:** "Create a protocol combining Huberman's advice on cold exposure, exercise timing, and supplement stacking for athletic performance"

**[Screen: Show the AI synthesizing information from multiple episodes to create a comprehensive protocol]**

**[Demo Action: Show error handling]**
- Demonstrate graceful handling of API failures
- Show backend status indicators
- Display fallback mechanisms

**Narrator:** "The system intelligently combines insights from multiple episodes, handles errors gracefully, and provides confidence indicators for all recommendations."

---

### Closing (4:30 - 5:00)
**[Screen: Summary of key features]**

**Narrator:** "The Huberman Health AI Assistant transforms hours of podcast content into instant, actionable health insights. With real data from 392 episodes, AI-powered search, and MCP integration, it's ready for both personal use and enterprise integration."

**[Screen: GitHub repository or deployment information]**

**Narrator:** "Ready to explore Dr. Huberman's knowledge in a whole new way? The complete system is production-ready and available for deployment."

**[Screen: End card with key stats:]**
- 392 Real Episodes Processed
- 6 MCP Tools Available  
- AI-Powered Semantic Search
- Production-Ready Architecture

---

## Demo Preparation Checklist

### Before Recording:
- [ ] Ensure all services are running (`./start-production.sh`)
- [ ] Verify database has real data (check video count)
- [ ] Test all demo queries to ensure expected results
- [ ] Clear browser cache for clean demo
- [ ] Prepare backup queries in case of API issues
- [ ] Set up screen recording software
- [ ] Test audio levels and clarity

### Demo Queries to Test:
1. **Sleep:** "What does Huberman say about improving sleep quality?"
2. **Morning Routine:** "What's the optimal morning routine for dopamine and focus?"
3. **Stress:** "How to recover from burnout and stress"
4. **Supplements:** "Best supplements for cognitive enhancement"
5. **Complex Protocol:** "Create a protocol combining cold exposure, exercise timing, and supplement stacking"

### Expected Results:
- Each query should return 3-5 relevant episodes
- Timestamps should be accurate and clickable
- Confidence scores should be displayed
- Backend status should show "Connected"
- Response time should be under 3 seconds

### Technical Setup:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MCP Server: http://localhost:3001
- Database: PostgreSQL on port 5432

### Fallback Plans:
- If API is slow, mention "processing large dataset"
- If a query fails, have backup queries ready
- If MCP demo fails, show the code/configuration instead
- Keep the demo moving - don't wait for slow responses

---

## Post-Production Notes

### Key Messages to Emphasize:
1. **Real Data** - Not mock data, actual Huberman content
2. **AI-Powered** - Semantic understanding, not just keyword matching
3. **Production Ready** - Complete architecture with monitoring
4. **Integration Ready** - MCP server for external tool integration
5. **Comprehensive** - 392 episodes, full transcripts, timestamps

### Visual Elements to Include:
- Clean, modern UI screenshots
- Code snippets showing real implementation
- Database views with actual data
- Architecture diagrams
- Performance metrics and response times

This script provides a comprehensive showcase of all major features while maintaining a professional, engaging pace suitable for a 3-5 minute demo video.