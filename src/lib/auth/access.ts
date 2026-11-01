export function needsAuthenticator(currentLevel: string | null, verifiedFactors: number) {
  return currentLevel !== 'aal2' || verifiedFactors < 1;
}

export function canRemoveAuthenticator(verifiedIds: string[], factorId: string, currentLevel: string | null) {
  return currentLevel === 'aal2' && verifiedIds.length > 1 && verifiedIds.includes(factorId);
}
