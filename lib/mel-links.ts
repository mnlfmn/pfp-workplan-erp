export function indicatorActivityKeys(value: string) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Legacy records contain one plain activity key.
    }
  }
  return [trimmed];
}
