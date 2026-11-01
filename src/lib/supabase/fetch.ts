// Bound provider calls, including authentication before a management action.
// A timeout never proves that a write failed: the UI asks to reload its version.
export function timedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const deadline = AbortSignal.timeout(12000);
  const signal = init?.signal
    ? AbortSignal.any([init.signal, deadline])
    : deadline;
  return fetch(input, { ...init, signal });
}
