export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  timeoutMs?: number;
}

export interface AIResponse {
  text: string;
  provider: string;
}

export interface ImagePart {
  mimeType: string;   // e.g. 'image/jpeg', 'image/png', 'application/pdf'
  data: string;       // base64 data (without data URI prefix)
  label?: string;     // optional label for reference
}

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  generate(prompt: string, options?: GenerateOptions): Promise<AIResponse>;
  generateVision?(prompt: string, images: ImagePart[], options?: GenerateOptions): Promise<AIResponse>;
}

