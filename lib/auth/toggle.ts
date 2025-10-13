// Server/Edge-safe utility to toggle authentication globally
// AUTH=true  -> auth required (default)
// AUTH=false -> auth disabled for public access (admin still protected)

export function isAuthEnabled(): boolean {
  const raw = String(process.env.AUTH || '').trim().toLowerCase();
  if (!raw) return true; // default to enabled when unset
  if (raw === 'false' || raw === '0' || raw === 'off' || raw === 'no') return false;
  if (raw === 'true' || raw === '1' || raw === 'on' || raw === 'yes') return true;
  return true;
}


