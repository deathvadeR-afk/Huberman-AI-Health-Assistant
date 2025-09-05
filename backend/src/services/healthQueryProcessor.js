import { createLogger } from '../utils/logger.js';
import { DatabaseManager } from '../utils/database.js';

const logger = createLogger('HealthQueryProcessor');

export class HealthQueryProcessor {
    constructor() {
        this.db = new DatabaseManager();
        this.healthTopics = [];
        this.commonSymptoms = new Map();
        this.healthKeywords = new Set();
        
        // Health-related keywords and their categories
        this.healthCategories = {
            sleep: ['sleep', 'insomnia', 'circadian', 'melatonin', 'rest', 'tired', 'fatigue', 'drowsy'],
            stress: ['stress', 'anxiety', 'cortisol', 'worry', 'tension', 'overwhelmed', 'panic'],
            exercise: ['exercise', 'workout', 'fitness', 'strength', 'cardio', 'training', 'muscle'],
            nutrition: ['nutrition', 'diet', 'food', 'eating', 'supplement', 'vitamin', 'mineral'],
            pain: ['pain', 'ache', 'hurt', 'sore', 'inflammation', 'chronic', 'joint', 'back'],
            mental: ['depression', 'mood', 'focus', 'concentration', 'memory', 'cognitive', 'brain'],
            digestive: ['stomach', 'digestion', 'gut', 'gut health', 'intestinal', 'bloating', 'nausea', 'acid'],
            hormones: ['hormone', 'testosterone', 'estrogen', 'thyroid', 'insulin', 'growth'],
            immune: ['immune', 'infection', 'cold', 'flu', 'virus', 'bacteria', 'sick'],
            heart: ['heart', 'cardiovascular', 'blood pressure', 'cholesterol', 'circulation']
        };
    }

    async initialize() {
        try {
            logger.info('Initializing Health Query Processor...');
            
            // Load health topics from database
            this.healthTopics = await this.db.getAllHealthTopics();
            logger.info(`Loaded ${this.healthTopics.length} health topics`);
            
            // Build keyword sets
            this.buildKeywordSets();
            
            logger.info('✅ Health Query Processor initialized');
        } catch (error) {
            logger.error('Failed to initialize Health Query Processor:', error);
            throw error;
        }
    }

    buildKeywordSets() {
        // Add all health category keywords
        Object.values(this.healthCategories).forEach(keywords => {
            keywords.forEach(keyword => this.healthKeywords.add(keyword.toLowerCase()));
        });

        // Add health topic keywords from database
        this.healthTopics.forEach(topic => {
            if (topic.keywords) {
                topic.keywords.forEach(keyword => {
                    this.healthKeywords.add(keyword.toLowerCase());
                });
            }
        });

        logger.info(`Built keyword set with ${this.healthKeywords.size} health-related terms`);
    }

    async processQuery(query) {
        try {
            logger.info('Processing health query', { query });

            const processedQuery = {
                originalQuery: query,
                cleanedQuery: this.cleanQuery(query),
                healthTopics: [],
                searchTerms: [],
                queryType: 'general',
                confidence: 0,
                suggestedFilters: {},
                timestamp: new Date().toISOString()
            };

            // Clean and normalize the query
            const cleanedQuery = this.cleanQuery(query);
            processedQuery.cleanedQuery = cleanedQuery;

            // Extract health-related terms
            const healthTerms = this.extractHealthTerms(cleanedQuery);
            processedQuery.searchTerms = healthTerms;

            // Identify health topics
            const identifiedTopics = await this.identifyHealthTopics(healthTerms);
            processedQuery.healthTopics = identifiedTopics;

            // Determine query type and confidence
            const queryAnalysis = this.analyzeQueryType(cleanedQuery, healthTerms);
            processedQuery.queryType = queryAnalysis.type;
            processedQuery.confidence = queryAnalysis.confidence;

            // Generate suggested filters
            processedQuery.suggestedFilters = this.generateFilters(identifiedTopics, healthTerms);

            // Enhance search terms with synonyms
            processedQuery.enhancedSearchTerms = this.enhanceSearchTerms(healthTerms);

            logger.info('Query processed successfully', {
                queryType: processedQuery.queryType,
                confidence: processedQuery.confidence,
                topicsFound: processedQuery.healthTopics.length
            });

            return processedQuery;

        } catch (error) {
            logger.error('Error processing health query:', error);
            throw error;
        }
    }

    cleanQuery(query) {
        return query
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    extractHealthTerms(cleanedQuery) {
        const words = cleanedQuery.split(' ');
        const healthTerms = [];

        // Find individual health keywords
        words.forEach(word => {
            if (this.healthKeywords.has(word)) {
                healthTerms.push(word);
            }
        });

        // Find multi-word health phrases
        const phrases = this.extractHealthPhrases(cleanedQuery);
        healthTerms.push(...phrases);

        // Remove duplicates and return
        return [...new Set(healthTerms)];
    }

    extractHealthPhrases(query) {
        const phrases = [];
        const commonPhrases = [
            'stomach ache', 'back pain', 'joint pain', 'muscle pain',
            'sleep problems', 'sleep issues', 'can\'t sleep',
            'high blood pressure', 'low energy', 'weight loss',
            'weight gain', 'stress management', 'anxiety relief'
        ];

        commonPhrases.forEach(phrase => {
            if (query.includes(phrase)) {
                phrases.push(phrase);
            }
        });

        return phrases;
    }

    async identifyHealthTopics(healthTerms) {
        const identifiedTopics = [];
        let matchingKeywords = [];

        try {
            // Match against database health topics
            for (const topic of this.healthTopics) {
                let relevanceScore = 0;

                // Check if any health terms match topic keywords
                if (topic.keywords) {
                    matchingKeywords = healthTerms.filter(term =>
                        topic.keywords.some(keyword =>
                            keyword.toLowerCase().includes(term) ||
                            term.includes(keyword.toLowerCase())
                        )
                    );
                    relevanceScore += matchingKeywords.length * 2;
                }

                // Check if health terms match topic name
                const topicNameWords = topic.name.toLowerCase().split(' ');
                const nameMatches = healthTerms.filter(term =>
                    topicNameWords.some(word => word.includes(term) || term.includes(word))
                );
                relevanceScore += nameMatches.length * 3;

                if (relevanceScore > 0) {
                    identifiedTopics.push({
                        ...topic,
                        relevanceScore,
                        matchingTerms: [...new Set([...matchingKeywords, ...nameMatches])]
                    });
                }
            }

            // Sort by relevance score
            identifiedTopics.sort((a, b) => b.relevanceScore - a.relevanceScore);

            return identifiedTopics.slice(0, 5); // Return top 5 most relevant topics

        } catch (error) {
            logger.error('Error identifying health topics:', error);
            return [];
        }
    }

    analyzeQueryType(cleanedQuery, healthTerms) {
        let confidence = 0;
        let type = 'general';

        // Symptom-based queries
        const symptomWords = ['pain', 'ache', 'hurt', 'feel', 'have', 'experiencing'];
        if (symptomWords.some(word => cleanedQuery.includes(word))) {
            type = 'symptom';
            confidence += 0.3;
        }

        // How-to queries
        if (cleanedQuery.includes('how to') || cleanedQuery.includes('how can')) {
            type = 'howto';
            confidence += 0.4;
        }

        // Protocol/treatment queries
        const protocolWords = ['protocol', 'treatment', 'cure', 'fix', 'help', 'improve'];
        if (protocolWords.some(word => cleanedQuery.includes(word))) {
            type = 'protocol';
            confidence += 0.3;
        }

        // Information queries
        const infoWords = ['what is', 'explain', 'tell me about', 'information'];
        if (infoWords.some(phrase => cleanedQuery.includes(phrase))) {
            type = 'information';
            confidence += 0.2;
        }

        // Boost confidence based on health terms found
        confidence += Math.min(healthTerms.length * 0.1, 0.4);

        return {
            type,
            confidence: Math.min(confidence, 1.0)
        };
    }

    generateFilters(topics, healthTerms) {
        const filters = {
            categories: [],
            timeRange: null,
            minDuration: null,
            maxDuration: null
        };

        // Generate category filters based on identified topics
        topics.forEach(topic => {
            if (topic.category && !filters.categories.includes(topic.category)) {
                filters.categories.push(topic.category);
            }
        });

        // Suggest duration filters based on query type
        if (healthTerms.some(term => ['quick', 'fast', 'brief'].includes(term))) {
            filters.maxDuration = 1800; // 30 minutes
        }

        if (healthTerms.some(term => ['detailed', 'comprehensive', 'deep'].includes(term))) {
            filters.minDuration = 3600; // 60 minutes
        }

        return filters;
    }

    enhanceSearchTerms(healthTerms) {
        const enhanced = [...healthTerms];
        
        // Add synonyms and related terms
        const synonyms = {
            'pain': ['ache', 'hurt', 'discomfort'],
            'sleep': ['rest', 'slumber', 'insomnia'],
            'stress': ['anxiety', 'tension', 'worry'],
            'exercise': ['workout', 'fitness', 'training'],
            'nutrition': ['diet', 'food', 'eating']
        };

        healthTerms.forEach(term => {
            if (synonyms[term]) {
                enhanced.push(...synonyms[term]);
            }
        });

        return [...new Set(enhanced)];
    }
}

export default HealthQueryProcessor;
