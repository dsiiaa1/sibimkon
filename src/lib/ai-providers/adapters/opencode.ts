import { AIProvider, GenerateOptions, AIResponse } from '../types';

export class OpenCodeAdapter implements AIProvider {
  name = 'OpenCode';
  
  isAvailable(): boolean {
    return !!process.env.OPENCODE_API_KEY || !!process.env.OPENCODE_BASE_URL;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
    const apiKey = process.env.OPENCODE_API_KEY || '';
    const baseUrl = process.env.OPENCODE_BASE_URL || 'http://localhost:11434/api'; // Defaulting to an ollama-like local structure as an example

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 30000);

    try {
      // TODO: verifikasi endpoint & format request saat API key/URL sudah tersedia untuk OpenCode
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
        },
        body: JSON.stringify({
          model: 'opencode',
          messages: [{ role: 'user', content: prompt }],
          temperature: options?.temperature ?? 0.1,
          max_tokens: options?.maxTokens ?? 2048,
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenCode API error ${res.status}: ${errText.substring(0, 300)}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('OpenCode returned empty content');

      return { text, provider: this.name };
    } finally {
      clearTimeout(timeout);
    }
  }
}
