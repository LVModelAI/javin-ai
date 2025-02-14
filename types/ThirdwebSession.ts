export type ThirdwebSession = {
  valid: boolean;
  parsedJWT: {
    sub: string;
    ctx: {
      id: string;
      tier: string;
      messageCount: number;
    };
  };
};
