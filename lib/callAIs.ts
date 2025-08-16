import axios from 'axios';
import { generateText } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import { 
  V0_API_KEY, 
  V0_MODEL, 
  AI_GATEWAY_API_KEY, 
  AI_GATEWAY_BASE_URL, 
  AI_GATEWAY_MODEL 
} from './config';
import { getSystemPrompt } from './prompts';

export async function callV0Dev(prompt: string, systemPrompt?: string, model?: string, apiKey?: string) {
  const finalSystemPrompt = systemPrompt || getSystemPrompt('v0');
  const finalModel = model || V0_MODEL;
  const finalApiKey = apiKey || V0_API_KEY;
  
  const response = await axios.post(
    'https://api.v0.dev/v1/chat/completions',
    {
      prompt,
      system: finalSystemPrompt,
      model: finalModel,
    },
    {
      headers: { Authorization: `Bearer ${finalApiKey}` },
    }
  );
  return response.data.result;
}

// AI Gateway using AI SDK
export async function callAIGateway(prompt: string, systemPrompt?: string, model?: string, apiKey?: string) {
  const finalSystemPrompt = systemPrompt || getSystemPrompt('gate5');
  const finalModel = model || AI_GATEWAY_MODEL;
  const finalApiKey = apiKey || AI_GATEWAY_API_KEY;
  
  // Create gateway instance
  const gateway = createGateway({
    baseURL: AI_GATEWAY_BASE_URL,
    headers: {
      Authorization: `Bearer ${finalApiKey}`,
    },
  });
  
  // Generate response using AI SDK
  const { text } = await generateText({
    model: gateway(finalModel),
    system: finalSystemPrompt,
    prompt: prompt,
    temperature: 0.7,
    maxTokens: 4000,
  });
  
  return text;
}

// Legacy function for backward compatibility
export async function callGateway5(prompt: string) {
  return callAIGateway(prompt);
}