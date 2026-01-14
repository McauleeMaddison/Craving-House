export function calculateEarnedStampsFromEligibleItems(params: {
  eligibleItemCount: number;
}): number {
  const { eligibleItemCount } = params;
  if (!Number.isFinite(eligibleItemCount) || eligibleItemCount <= 0) return 0;
  return Math.floor(eligibleItemCount);
}
