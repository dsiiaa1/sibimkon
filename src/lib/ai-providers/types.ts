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

export interface AIProvider {
  name: string;
  isAvailable(): boolean;
  generate(prompt: string, options?: GenerateOptions): Promise<AIResponse>;
}

