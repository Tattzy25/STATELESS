import fs from 'fs';
import path from 'path';

export function getSystemPrompt(ai: 'v0' | 'gateway5'): string {
  // Reads the system prompt from the /system-prompts directory
  const fileName = ai === 'v0' ? 'v0-system.txt' : 'gateway5-system.txt';
  const filePath = path.join(process.cwd(), 'system-prompts', fileName);
  return fs.readFileSync(filePath, 'utf8');
}

export function getMultiPageSitePrompt(library: string): string {
  return `You are to generate a multi-page site using the ${library} UI library.`;
}

export function getGenerationPrompt(library: string): string {
  return `You are to generate a UI component using the ${library} UI library.`;
}