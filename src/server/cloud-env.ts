export interface CloudEnv {
  ART_GALLERY_DB: any;
  ART_GALLERY_IMAGES: any;
  ADMIN_PASSWORD?: string;
  APP_URL?: string;
}

// Helper to handle both Cloudflare and Node environments
let cloudEnv: CloudEnv | null = null;

export function setCloudEnv(env: any) {
  cloudEnv = env;
}

export function getCloudEnv(): CloudEnv {
  if (cloudEnv) return cloudEnv;
  
  // Fallback for Node environment (development)
  const isNode = typeof process !== 'undefined' && process.env;
  return {
    ART_GALLERY_DB: null as any,
    ART_GALLERY_IMAGES: null as any,
    ADMIN_PASSWORD: isNode ? process.env.ADMIN_PASSWORD : undefined,
    APP_URL: isNode ? process.env.APP_URL : undefined
  };
}
