import type { NextApiRequest, NextApiResponse } from 'next';
import { orchestrate } from '../../lib/orchestrator';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    const { result, analysis } = await orchestrate(prompt);
    res.status(200).json({ result, analysis });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}