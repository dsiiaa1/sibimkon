import { AIProvider, GenerateOptions, AIResponse } from '../types';

export class GroqAdapter implements AIProvider {
  name = 'Groq';
  
  // Model default Groq
  private defaultModel = 'llama-3.3-70b-versatile';

  isAvailable(): boolean {
    return !!process.env.GROQ_API_KEY;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is missing');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 30000);

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: options?.temperature ?? 0.1,
          max_tokens: options?.maxTokens ?? 2048,
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq API error ${res.status}: ${errText.substring(0, 300)}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Groq returned empty content');

      return { text, provider: this.name };
    } finally {
      clearTimeout(timeout);
    }
  }
}
