// ============================================
// WAYFIND API - TRANSLATION ROUTES
// AI-powered multi-language translation
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../lib/config';
import { logger } from '../lib/logger';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Initialize Anthropic client
const anthropic = config.anthropic.apiKey 
  ? new Anthropic({ apiKey: config.anthropic.apiKey })
  : null;

// Supported languages
const SUPPORTED_LANGUAGES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  pt: 'Portuguese',
  ru: 'Russian',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  vi: 'Vietnamese',
  th: 'Thai',
} as const;

type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

// GET /translate/languages - List supported languages
router.get('/languages', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => ({
      code,
      name,
    })),
  });
});

// POST /translate - Translate text to multiple languages
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { text, sourceLanguage, targetLanguages, context } = z.object({
      text: z.string().min(1).max(1000),
      sourceLanguage: z.string().default('en'),
      targetLanguages: z.array(z.string()).min(1).max(15),
      context: z.enum(['navigation', 'landmark', 'warning', 'ad', 'general']).default('navigation'),
    }).parse(req.body);
    
    if (!anthropic) {
      return res.status(503).json({
        success: false,
        error: { code: 'NO_API_KEY', message: 'Translation service not configured' },
      });
    }
    
    // Filter to supported languages
    const validTargets = targetLanguages.filter(
      lang => lang in SUPPORTED_LANGUAGES && lang !== sourceLanguage
    );
    
    if (validTargets.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_VALID_LANGUAGES', message: 'No valid target languages specified' },
      });
    }
    
    // Context-specific instructions
    const contextInstructions = {
      navigation: 'These are navigation directions for indoor wayfinding. Keep translations concise and use imperative mood (e.g., "Turn left" not "You should turn left"). Use standard navigation terminology.',
      landmark: 'These are landmark or point-of-interest labels. Keep them brief and clear.',
      warning: 'These are safety or warning messages. Maintain urgency and clarity. Use appropriate warning language for the target culture.',
      ad: 'This is advertising copy. Maintain the marketing tone while adapting for cultural relevance.',
      general: 'Translate naturally while preserving meaning.',
    };
    
    const prompt = `Translate the following text from ${SUPPORTED_LANGUAGES[sourceLanguage as LanguageCode] || sourceLanguage} into these languages: ${validTargets.map(l => SUPPORTED_LANGUAGES[l as LanguageCode] || l).join(', ')}.

Context: ${contextInstructions[context]}

Text to translate: "${text}"

Respond with ONLY a JSON object mapping language codes to translations. No explanation, no markdown, just the JSON object.
Example format: {"es": "translated text", "fr": "translated text"}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    
    // Extract text content
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';
    
    // Parse JSON response
    let translations: Record<string, string>;
    try {
      // Clean up potential markdown formatting
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      translations = JSON.parse(cleanJson);
    } catch (parseError) {
      logger.error({ responseText, parseError }, 'Failed to parse translation response');
      return res.status(500).json({
        success: false,
        error: { code: 'PARSE_ERROR', message: 'Failed to parse translation response' },
      });
    }
    
    // Add source language
    translations[sourceLanguage] = text;
    
    logger.info({ 
      sourceLanguage, 
      targetCount: validTargets.length,
      textLength: text.length,
    }, 'Translation completed');
    
    res.json({
      success: true,
      data: {
        source: { language: sourceLanguage, text },
        translations,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Translation failed');
    res.status(500).json({
      success: false,
      error: { code: 'TRANSLATION_FAILED', message: 'Failed to translate text' },
    });
  }
});

// POST /translate/batch - Batch translate multiple texts
router.post('/batch', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { items, sourceLanguage, targetLanguages } = z.object({
      items: z.array(z.object({
        id: z.string(),
        text: z.string().min(1).max(500),
        context: z.enum(['navigation', 'landmark', 'warning', 'ad', 'general']).default('navigation'),
      })).min(1).max(20),
      sourceLanguage: z.string().default('en'),
      targetLanguages: z.array(z.string()).min(1).max(10),
    }).parse(req.body);
    
    if (!anthropic) {
      return res.status(503).json({
        success: false,
        error: { code: 'NO_API_KEY', message: 'Translation service not configured' },
      });
    }
    
    const validTargets = targetLanguages.filter(
      lang => lang in SUPPORTED_LANGUAGES && lang !== sourceLanguage
    );
    
    if (validTargets.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_VALID_LANGUAGES', message: 'No valid target languages specified' },
      });
    }
    
    // Build batch prompt
    const itemsList = items.map((item, idx) => 
      `${idx + 1}. [${item.context}] "${item.text}"`
    ).join('\n');
    
    const prompt = `Translate these texts from ${SUPPORTED_LANGUAGES[sourceLanguage as LanguageCode]} to: ${validTargets.map(l => SUPPORTED_LANGUAGES[l as LanguageCode]).join(', ')}.

Context types: navigation=directions, landmark=POI labels, warning=safety messages, ad=marketing, general=normal text.

Texts:
${itemsList}

Respond with ONLY a JSON array where each item has "index" (1-based) and "translations" object mapping language codes to translated text.
Example: [{"index": 1, "translations": {"es": "...", "fr": "..."}}]`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';
    
    let batchResults: Array<{ index: number; translations: Record<string, string> }>;
    try {
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      batchResults = JSON.parse(cleanJson);
    } catch (parseError) {
      logger.error({ responseText, parseError }, 'Failed to parse batch translation');
      return res.status(500).json({
        success: false,
        error: { code: 'PARSE_ERROR', message: 'Failed to parse translations' },
      });
    }
    
    // Map back to original IDs
    const results = items.map((item, idx) => {
      const result = batchResults.find(r => r.index === idx + 1);
      const translations = result?.translations || {};
      translations[sourceLanguage] = item.text;
      
      return {
        id: item.id,
        translations,
      };
    });
    
    logger.info({ itemCount: items.length, targetCount: validTargets.length }, 'Batch translation completed');
    
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error({ error }, 'Batch translation failed');
    res.status(500).json({
      success: false,
      error: { code: 'BATCH_FAILED', message: 'Failed to translate batch' },
    });
  }
});

// POST /translate/detect - Detect language of text
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const { text } = z.object({
      text: z.string().min(1).max(500),
    }).parse(req.body);
    
    if (!anthropic) {
      return res.status(503).json({
        success: false,
        error: { code: 'NO_API_KEY', message: 'Service not configured' },
      });
    }
    
    const prompt = `Detect the language of this text and respond with ONLY the ISO 639-1 two-letter code (e.g., "en", "es", "fr"). Text: "${text}"`;
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const detectedCode = message.content[0].type === 'text' 
      ? message.content[0].text.trim().toLowerCase().substring(0, 2)
      : 'en';
    
    res.json({
      success: true,
      data: {
        language: detectedCode,
        name: SUPPORTED_LANGUAGES[detectedCode as LanguageCode] || 'Unknown',
        confidence: detectedCode in SUPPORTED_LANGUAGES ? 0.9 : 0.5,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Language detection failed');
    res.status(500).json({
      success: false,
      error: { code: 'DETECT_FAILED', message: 'Failed to detect language' },
    });
  }
});

export default router;
