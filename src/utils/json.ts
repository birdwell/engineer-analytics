export function parseJson(text: string): unknown {
  return JSON.parse(text) as unknown;
}

export async function readResponseJson(response: Response): Promise<unknown> {
  return await response.json() as unknown;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

export function parseAs<T>(text: string, isValue: (value: unknown) => value is T): T | null {
  const parsed = parseJson(text);
  return isValue(parsed) ? parsed : null;
}
