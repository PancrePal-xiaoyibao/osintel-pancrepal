export type RollbackState = {
  stableCommit: string;
  lastAttemptedCommit?: string;
  lastAttemptedAt?: string;
};

export function createRollbackState(stableCommit: string): RollbackState {
  return { stableCommit };
}

