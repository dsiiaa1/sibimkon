import { AIProvider, GenerateOptions, AIResponse, ImagePart } from '../types';

export class OpenRouterAdapter implements AIProvider {
  name = 'OpenRouter';
  
  // Model default OpenRouter — abaikan model dari options karena tiap provider punya nama model sendiri
  private defaultModel = 'google/gemini-2.0-flash-001';

  isAvailable(): boolean {
    return !!process.env.OPENROUTER_API_KEY;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is missing');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 30000);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
        throw new Error(`OpenRouter API error ${res.status}: ${errText.substring(0, 300)}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('OpenRouter returned empty content');

      return { text, provider: this.name };
    } finally {
      clearTimeout(timeout);
    }
  }
  async generateVision(prompt: string, images: ImagePart[], options?: GenerateOptions): Promise<AIResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY is missing');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || 45000);

    const contentParts: any[] = [{ type: 'text', text: prompt }];
    for (const img of images) {
      if (img.mimeType.startsWith('image/')) {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: `data:${img.mimeType};base64,${img.data}`
          }
        });
      }
    }

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [{ role: 'user', content: contentParts }],
          temperature: options?.temperature ?? 0.1,
          max_tokens: options?.maxTokens ?? 2048,
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenRouter Vision API error ${res.status}: ${errText.substring(0, 300)}`);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('OpenRouter Vision returned empty content');

      return { text, provider: this.name };
    } finally {
      clearTimeout(timeout);
    }
  }
}
