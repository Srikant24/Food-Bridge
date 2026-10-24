import { Router, Request, Response } from 'express';
import { processAiChat } from '../services/aiService';

const router = Router();

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const result = await processAiChat(message, history || []);
    res.json(result);
  } catch (error: any) {
    console.error('AI chat route error:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
