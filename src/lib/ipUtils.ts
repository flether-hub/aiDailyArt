/**
 * Mask IP address by replacing the last two segments with asterisks.
 * Handles both IPv4 and IPv6 partially.
 */
export function maskIP(ip: string | null | undefined): string {
  if (!ip || ip === "Unknown") return "Unknown";
  
  // Handle comma-separated IPs (sometimes from proxies like X-Forwarded-For)
  const firstIp = ip.split(',')[0].trim();
  
  // IPv4 masking
  if (firstIp.includes('.')) {
    const parts = firstIp.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
    // Fallback for weird IPv4-like strings
    return firstIp.replace(/(\d+)\.(\d+)$/, '*.*');
  }
  
  // IPv6 masking
  if (firstIp.includes(':')) {
    const parts = firstIp.split(':');
    if (parts.length > 2) {
      // Keep first 2-3 segments
      return parts.slice(0, 3).join(':') + ':****:****:****';
    }
    return firstIp.substring(0, 8) + '...';
  }

  return firstIp;
}
