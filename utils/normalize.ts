export function normalizeSubs(subs: string) {
  return subs.replace(/\r\n/g, "\n").replace(/\n\n$/, "\n");
}
