import axios from 'axios';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OpenRouterService');

class OpenRouterService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3001',
        'X-Title': 'Huberman Health AI Assistant'
      }
    });

    this.totalCost = 0;
    this.requestCount = 0;
  }

  async processHealthQuery(query) {
    logger.info(`Processing health query with AI: "${query}"`);

    try {
      const response = await this.client.post('/chat/completions', {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a health information assistant specializing in Dr. Andrew Huberman's content. 
            Analyze health queries and extract key information. Always respond with valid JSON only.
            
            Extract:
            - healthTopics: relevant health topics (array)
            - symptoms: any symptoms mentioned (array)
            - intent: user's intent (health_improvement|information_seeking|symptom_relief|protocol_request)
            - relevantAreas: relevant scientific areas (array)
            - urgency: urgency level (low|medium|high)
            - recommendations: brief recommendations (array)`
          },
          {
            role: 'user',
            content: `Analyze this health query: "${query}"`
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      const usage = response.data.usage;
      const cost = this.calculateCost(usage);
      this.totalCost += cost;
      this.requestCount++;

      logger.info(`AI processing completed. Cost: $${cost.toFixed(6)}, Total: $${this.totalCost.toFixed(6)}`);

      try {
        const result = JSON.parse(response.data.choices[0].message.content);
        return {
          ...result,
          processingCost: cost,
          totalCost: this.totalCost
        };
      } catch (parseError) {
        logger.warn('Failed to parse AI response, using fallback');
        return this.getFallbackAnalysis(query, cost);
      }
    } catch (error) {
      logger.error('OpenRouter API error:', error.message);
      return this.getFallbackAnalysis(query, 0);
    }
  }

  async generateHealthInsight(videoResult, query) {
    logger.info(`Generating health insight for: "${videoResult.title}"`);

    try {
      const response = await this.client.post('/chat/completions', {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are Dr. Andrew Huberman's AI assistant. Generate a brief, helpful insight about how this video content relates to the user's health query. Be specific and actionable. Keep it under 100 words.`
          },
          {
            role: 'user',
            content: `Video: "${videoResult.title}" - ${videoResult.description}
            
            User Query: "${query}"
            
            Generate a helpful insight connecting this video to the user's query:`
          }
        ],
        max_tokens: 150,
        temperature: 0.4
      });

      const usage = response.data.usage;
      const cost = this.calculateCost(usage);
      this.totalCost += cost;

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      logger.error('Failed to generate health insight:', error);
      return `This video discusses ${videoResult.title} which contains relevant information for your query about ${query}.`;
    }
  }

  async semanticSearch(query, documents) {
    logger.info(`Performing semantic search for: "${query}"`);

    try {
      // Use AI to find semantic matches
      const response = await this.client.post('/chat/completions', {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a semantic search engine. Given a query and a list of documents, rank them by relevance (0-1 score). Return JSON only with format: {"results": [{"index": 0, "score": 0.95, "reason": "explanation"}]}`
          },
          {
            role: 'user',
            content: `Query: "${query}"
            
            Documents:
            ${documents.map((doc, i) => `${i}: ${doc.title} - ${doc.description?.substring(0, 200)}`).join('\n')}
            
            Rank by relevance:`
          }
        ],
        max_tokens: 500,
        temperature: 0.2
      });

      const usage = response.data.usage;
      const cost = this.calculateCost(usage);
      this.totalCost += cost;

      try {
        const result = JSON.parse(response.data.choices[0].message.content);
        return result.results || [];
      } catch (parseError) {
        logger.warn('Failed to parse semantic search results');
        return [];
      }
    } catch (error) {
      logger.error('Semantic search failed:', error);
      return [];
    }
  }

  calculateCost(usage) {
    if (!usage) return 0;
    
    // GPT-3.5-turbo pricing (approximate)
    const promptCost = (usage.prompt_tokens || 0) * 0.0015 / 1000;
    const completionCost = (usage.completion_tokens || 0) * 0.002 / 1000;
    
    return promptCost + completionCost;
  }

  getFallbackAnalysis(query, cost) {
    const queryLower = query.toLowerCase();
    
    // Simple keyword-based analysis
    const healthTopics = [];
    const symptoms = [];
    const relevantAreas = [];
    
    // Health topics detection
    if (queryLower.includes('sleep')) healthTopics.push('sleep');
    if (queryLower.includes('exercise') || queryLower.includes('workout')) healthTopics.push('exercise');
    if (queryLower.includes('nutrition') || queryLower.includes('diet')) healthTopics.push('nutrition');
    if (queryLower.includes('stress') || queryLower.includes('anxiety')) healthTopics.push('stress management');
    if (queryLower.includes('focus') || queryLower.includes('concentration')) healthTopics.push('focus');
    if (queryLower.includes('gut') || queryLower.includes('stomach')) healthTopics.push('gut health');
    
    // Symptoms detection
    if (queryLower.includes('pain') || queryLower.includes('ache')) symptoms.push('pain');
    if (queryLower.includes('tired') || queryLower.includes('fatigue')) symptoms.push('fatigue');
    if (queryLower.includes('insomnia') || queryLower.includes('can\'t sleep')) symptoms.push('sleep issues');
    
    // Intent detection
    let intent = 'information_seeking';
    if (symptoms.length > 0) intent = 'symptom_relief';
    if (queryLower.includes('how to') || queryLower.includes('protocol')) intent = 'protocol_request';
    if (queryLower.includes('improve') || queryLower.includes('optimize')) intent = 'health_improvement';
    
    // Relevant areas
    if (healthTopics.includes('sleep')) relevantAreas.push('neuroscience', 'circadian biology');
    if (healthTopics.includes('exercise')) relevantAreas.push('exercise physiology', 'fitness');
    if (healthTopics.includes('nutrition')) relevantAreas.push('nutrition science', 'metabolism');
    if (healthTopics.includes('stress management')) relevantAreas.push('psychology', 'neuroscience');
    
    return {
      healthTopics: healthTopics.length > 0 ? healthTopics : ['general health'],
      symptoms,
      intent,
      relevantAreas: relevantAreas.length > 0 ? relevantAreas : ['health'],
      urgency: symptoms.length > 0 ? 'medium' : 'low',
      recommendations: [`Consider exploring Dr. Huberman's content on ${healthTopics[0] || 'health optimization'}`],
      processingCost: cost,
      totalCost: this.totalCost,
      fallback: true
    };
  }

  getUsageStats() {
    return {
      totalCost: this.totalCost,
      requestCount: this.requestCount,
      averageCostPerRequest: this.requestCount > 0 ? this.totalCost / this.requestCount : 0,
      remainingBudget: 2.0 - this.totalCost // Assuming $2 budget
    };
  }

  resetStats() {
    this.totalCost = 0;
    this.requestCount = 0;
    logger.info('OpenRouter usage stats reset');
  }
}

export { OpenRouterService };