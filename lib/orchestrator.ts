import { analyzePrompt } from './analyzePrompt';
import { getMultiPageSitePrompt, getGenerationPrompt } from './prompts';
import { callV0Dev, callGateway5 } from './callAIs';

export async function orchestrate(prompt: string) {
  // 1. Analyze
  const analysis = analyzePrompt(prompt);

  // 2. Plan (assign sections/tasks)
  let v0Task, gateway5Task;
  if (analysis.type === 'site') {
    v0Task = getMultiPageSitePrompt(analysis.library) + '\n' + prompt;
    gateway5Task = getMultiPageSitePrompt(analysis.library) + '\n' + prompt;
  } else {
    v0Task = getGenerationPrompt(analysis.library) + '\n' + prompt;
    gateway5Task = getGenerationPrompt(analysis.library) + '\n' + prompt;
  }

  // 3. Call AIs in parallel
  const [v0Result, gateway5Result] = await Promise.all([
    callV0Dev(v0Task),
    callGateway5(gateway5Task),
  ]);

  // 4. Merge results (simple concat, can be made more advanced)
  const finalResult = `${v0Result}\n\n// === AI SEPARATOR ===\n\n${gateway5Result}`;

  return { result: finalResult, analysis };
}