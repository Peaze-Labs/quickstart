export const addresses = {
  10: {
    USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    WUSDC: '0xF0d6e84A7fAC7B9e8674Ed2a7B4301B007d8e415',
  },
  137: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    WUSDC: '0x47D06255b7F0b615ac24CE1477E3b0977dD2e979',
  },
  8453: {
    USDC: '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca',
    WUSDC: '0x93FB3243a1a36698583F3BF75611FcCb8f4c86aB',
  },
  42161: {
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    WUSDC: '0x5e4C58E2228c195fbddCb468c1d3F9b267Dd72B6',
  },
} as const;

export function getAddresses(chainId: number) {
  const res = addresses[chainId as keyof typeof addresses];
  if (res) return res;
  throw new Error(`Addresses for chain ${chainId} not found`);
}
