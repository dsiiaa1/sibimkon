import { GenerateOptions, AIResponse } from './types';
import { providerOrder } from './providerOrder';

export async function generateWithFallback(prompt: string, options?: GenerateOptions): Promise<AIResponse> {
  const availableProviders = providerOrder.filter(p => p.isAvailable());

  if (availableProviders.length === 0) {
    throw new Error('Semua provider AI gagal merespons, coba lagi nanti. (Tidak ada API Key yang dikonfigurasi)');
  }

  const errors: string[] = [];

  for (const provider of availableProviders) {
    try {
      // console.warn(`[AI-Fallback] Mencoba generate dengan provider: ${provider.name}`);
      const response = await provider.generate(prompt, options);
      return response;
    } catch (err: any) {
      // console.warn(`[AI-Fallback] Provider ${provider.name} gagal:`, err.message);
      errors.push(`${provider.name}: ${err.message}`);
      // Lanjut ke provider berikutnya
    }
  }

  throw new Error(`Semua provider AI gagal merespons, coba lagi nanti. Detail: ${errors.join(' | ')}`);
}
