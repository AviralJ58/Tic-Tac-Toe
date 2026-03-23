// Minimal match handler skeleton.

export function matchInit(): object {
  return { label: 'waiting' };
}

export function matchJoinAttempt(): boolean {
  return true;
}

export function matchJoin(): void {
  // Will assign player roles
}

export function matchLeave(): void {
  // Handle disconnect
}

export function matchLoop(): void {
  // Tick function for match
}

export function matchTerminate(): void {
  // Cleanup
}
