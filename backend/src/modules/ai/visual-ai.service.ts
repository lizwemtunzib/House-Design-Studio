import { config } from '../../config';
import { VisualDesignRequest, VisualDesignResult } from './ai.types';

// ─── Visual AI Service ────────────────────────────────────────────────────────
// Responsibility: Generate house exterior/interior/landscape renders.
// Abstracted behind a provider interface so you can swap DALL-E, Stable Diffusion,
// Midjourney, Replicate, etc. without changing callers.
// Visual AI output is for INSPIRATION only — not for engineering decisions.

type ImageGenProvider = 'openai' | 'stability' | 'replicate' | 'mock';

interface GeneratedImage {
  url: string;
  prompt: string;
}

export class VisualAIService {
  private provider: ImageGenProvider;

  constructor() {
    this.provider = config.imageGen.provider;
  }

  async generateDesign(request: VisualDesignRequest): Promise<VisualDesignResult> {
    const prompts = this.buildPrompts(request);
    const results = await Promise.allSettled([
      this.generateImages(prompts.exterior, request.numberOfVariations),
      this.generateImages(prompts.interior, 2),
      this.generateImages(prompts.landscaping, 1),
    ]);

    const exteriorRenders = results[0].status === 'fulfilled' ? results[0].value.map((r) => r.url) : [];
    const interiorConcepts = results[1].status === 'fulfilled' ? results[1].value.map((r) => r.url) : [];
    const landscapingRender = results[2].status === 'fulfilled' ? results[2].value[0]?.url : undefined;

    return {
      exteriorRenders,
      interiorConcepts,
      landscapingRender,
      designNotes: this.buildDesignNotes(request),
      styleUsed: request.style,
    };
  }

  private buildPrompts(request: VisualDesignRequest) {
    const { intent, style, iterationPrompt } = request;
    const styleDesc = STYLE_DESCRIPTIONS[style] ?? style;
    const baseDesc = intent.textDescription ?? `${intent.bedrooms ?? 3} bedroom house`;
    const iterNote = iterationPrompt ? `, ${iterationPrompt}` : '';

    const common = `${styleDesc} architectural design${iterNote}. Professional architectural photography, photorealistic render, high quality, 4K, natural lighting.`;

    return {
      exterior: `${baseDesc}, ${common} Exterior front elevation view. Beautiful landscaping visible.`,
      interior: `${baseDesc} interior, ${common} Open plan living room with high ceilings, modern finishes.`,
      landscaping: `${baseDesc} garden and landscape design, ${common} Top view and perspective view showing driveway, garden, pool area.`,
    };
  }

  private buildDesignNotes(request: VisualDesignRequest): string {
    const { intent, style } = request;
    const styleDesc = STYLE_DESCRIPTIONS[style] ?? style;
    const parts: string[] = [
      `${styleDesc} architectural concept generated.`,
    ];
    if (intent.bedrooms) parts.push(`${intent.bedrooms} bedroom layout planned.`);
    if (intent.hasPool) parts.push('Pool area included in landscaping concept.');
    if (intent.hasFencing) parts.push('Perimeter boundary treatment included.');
    return parts.join(' ');
  }

  private async generateImages(prompt: string, count: number): Promise<GeneratedImage[]> {
    switch (this.provider) {
      case 'openai': return this.generateWithOpenAI(prompt, count);
      case 'stability': return this.generateWithStability(prompt, count);
      case 'replicate': return this.generateWithReplicate(prompt, count);
      case 'mock': default: return this.generateMock(prompt, count);
    }
  }

  private async generateWithOpenAI(prompt: string, count: number): Promise<GeneratedImage[]> {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.imageGen.openaiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: Math.min(count, 1),  // DALL-E 3 generates 1 at a time
        size: '1792x1024',
        quality: 'hd',
        style: 'natural',
      }),
    });
    const data = await response.json() as { data: { url: string }[] };
    return (data.data ?? []).map((d) => ({ url: d.url, prompt }));
  }

  private async generateWithStability(prompt: string, count: number): Promise<GeneratedImage[]> {
    const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${config.imageGen.stabilityKey}`,
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt, weight: 1 }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        samples: count,
        steps: 30,
      }),
    });
    const data = await response.json() as { artifacts: { base64: string }[] };
    // In production, save base64 to storage and return URL
    return (data.artifacts ?? []).map((_a, i) => ({
      url: `data:image/png;base64,${_a.base64}`,
      prompt,
    }));
  }

  private async generateWithReplicate(prompt: string, _count: number): Promise<GeneratedImage[]> {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${config.imageGen.replicateToken}`,
      },
      body: JSON.stringify({
        version: 'stability-ai/sdxl:39ed52f2319f9b7b3e0a8a1e02e4a4b8c4b4c2b5',
        input: { prompt },
      }),
    });
    const prediction = await response.json() as { id: string; output?: string[] };
    // Poll for result (simplified — in production use webhook)
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${config.imageGen.replicateToken}` },
    });
    const result = await pollResponse.json() as { output?: string[] };
    return (result.output ?? []).map((url) => ({ url, prompt }));
  }

  private generateMock(_prompt: string, count: number): Promise<GeneratedImage[]> {
    // Returns placeholder images for development/testing
    const placeholders = [
      'https://placehold.co/1792x1024/1a1a2e/white?text=Exterior+Render+(Mock)',
      'https://placehold.co/1792x1024/16213e/white?text=Interior+Concept+(Mock)',
      'https://placehold.co/1792x1024/0f3460/white?text=Landscaping+(Mock)',
    ];
    return Promise.resolve(
      Array.from({ length: count }, (_, i) => ({
        url: placeholders[i % placeholders.length],
        prompt: _prompt,
      })),
    );
  }
}

const STYLE_DESCRIPTIONS: Record<string, string> = {
  MODERN: 'Contemporary modern minimalist',
  CONTEMPORARY: 'Contemporary sleek',
  LUXURY: 'High-end luxury premium',
  MINIMALIST: 'Clean minimalist Scandinavian',
  AFRICAN_VERNACULAR: 'African vernacular with local materials, earthy tones, thatched or local roofing',
  MEDITERRANEAN: 'Mediterranean with terracotta, arches, and warm stone',
  TIMBER_HEAVY: 'Timber-heavy natural wood exterior',
  GLASS_HEAVY: 'Glass-heavy modern with floor-to-ceiling glazing and steel accents',
  PREFAB_MODULAR: 'Modular prefabricated contemporary',
};

export const visualAI = new VisualAIService();
