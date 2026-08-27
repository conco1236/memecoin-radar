export function watchlistEntryKey(userId: number, tokenId: string) {
  return `${userId}:${tokenId}`;
}

export function shouldAlert(input: { enabled: boolean; potentialScore: number; riskScore: number; potentialThreshold: number; highRiskThreshold: number; watched: boolean }) {
  if (!input.enabled) return false;
  return input.potentialScore >= input.potentialThreshold || (input.watched && input.riskScore >= input.highRiskThreshold);
}
