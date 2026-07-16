import { AIProvider } from './types';
import { OpenRouterAdapter } from './adapters/openrouter';
import { GeminiAdapter } from './adapters/gemini';
import { DeepSeekAdapter } from './adapters/deepseek';
import { GroqAdapter } from './adapters/groq';
import { MistralAdapter } from './adapters/mistral';
import { OpenCodeAdapter } from './adapters/opencode';

export const providerOrder: AIProvider[] = [
  new OpenRouterAdapter(),
  new GeminiAdapter(),
  new DeepSeekAdapter(),
  new GroqAdapter(),
  new MistralAdapter(),
  new OpenCodeAdapter()
];
