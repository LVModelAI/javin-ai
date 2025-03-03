import { VercelRequest, VercelResponse } from '@vercel/node';
import { sharedFunction } from '@javin/shared/util';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.json({ message: "Hello from Vercel!", data: sharedFunction() });
}
