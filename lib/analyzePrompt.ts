export interface PromptAnalysis {
  type: 'component' | 'site';
  style: 'modern' | 'professional' | 'business' | 'minimal';
  library: 'shadcn' | 'nextui' | 'antd' | 'chakra';
  confidence: number;
}

const SITE_KEYWORDS = ['landing page', 'website', 'home page', 'dashboard', 'multi-page'];
const COMPONENT_KEYWORDS = ['button', 'form', 'card', 'modal', 'input', 'table'];
const STYLE_INDICATORS = {
  modern: ['modern', 'sleek', 'clean'],
  professional: ['professional', 'corporate'],
  business: ['business', 'enterprise'],
  minimal: ['minimal', 'simple', 'plain'],
};
const LIBRARY_MAPPING = {
  modern: 'shadcn',
  professional: 'nextui',
  business: 'antd',
  minimal: 'chakra',
} as const;

export function analyzePrompt(prompt: string): PromptAnalysis {
  const lower = prompt.toLowerCase();
  let type: 'component' | 'site' = 'component';
  let style: keyof typeof LIBRARY_MAPPING = 'modern';
  let confidence = 0.7;

  if (SITE_KEYWORDS.some(k => lower.includes(k))) {
    type = 'site';
    confidence += 0.15;
  }
  if (COMPONENT_KEYWORDS.some(k => lower.includes(k))) {
    type = 'component';
    confidence += 0.1;
  }
  for (const [styleKey, indicators] of Object.entries(STYLE_INDICATORS)) {
    if (indicators.some(i => lower.includes(i))) {
      style = styleKey as keyof typeof LIBRARY_MAPPING;
      confidence += 0.05;
      break;
    }
  }
  const library = LIBRARY_MAPPING[style];
  return { type, style, library, confidence: Math.min(confidence, 1) };
}