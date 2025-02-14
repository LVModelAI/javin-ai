export interface User {
  id: string;
  email?: string;
  name?: string | null;
  image?: string | null;
  walletAddress: string;
  tier: string;
  messageCount: number;
}
