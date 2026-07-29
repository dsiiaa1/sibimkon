import { GenerateOptions, AIResponse, ImagePart } from './types';
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

export async function generateVisionWithFallback(
  prompt: string,
  images: ImagePart[],
  options?: GenerateOptions
): Promise<AIResponse> {
  if (!images || images.length === 0) {
    return generateWithFallback(prompt, options);
  }

  const visionProviders = providerOrder.filter(p => p.isAvailable() && typeof p.generateVision === 'function');

  if (visionProviders.length === 0) {
    // Fallback to text mode if no vision providers are available
    return generateWithFallback(prompt, options);
  }

  const errors: string[] = [];
  for (const provider of visionProviders) {
    try {
      return await provider.generateVision!(prompt, images, options);
    } catch (err: any) {
      errors.push(`${provider.name}: ${err.message}`);
    }
  }

  // If all vision providers failed, try text fallback as last resort
  try {
    return await generateWithFallback(prompt, options);
  } catch (err: any) {
    throw new Error(`Semua provider AI (vision & fallback teks) gagal. Detail vision: ${errors.join(' | ')}. Detail fallback: ${err.message}`);
  }
}
