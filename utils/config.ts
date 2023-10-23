export const addresses = {
  10: {
    USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    WUSDC: '0xFd4885148054b43518980e8007417d8fB7348EF6',
  },
  137: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    WUSDC: '0x9D047586a25267b426949c77CCdE0B4D0D3c5D92',
  },
  8453: {
    USDC: '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca',
    WUSDC: '0x38Ab044d394F797A37ac24229c0bC1250ED78daA',
  },
  42161: {
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    WUSDC: '0x31700970b666d04b316Cfb46138cae5787A4FF9D',
  },
} as const;

export function getAddresses(chainId: number) {
  const res = addresses[chainId as keyof typeof addresses];
  if (res) return res;
  throw new Error(`Addresses for chain ${chainId} not found`);
}
