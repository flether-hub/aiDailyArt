let cloudEnv: any = null;

// Cloudflare Pages context is passed to the handler in functions/[[path]].ts
// We use a global setter to capture it.
export function getCloudEnv() {
  return cloudEnv || process.env;
}

export function setCloudEnv(env: any) {
  cloudEnv = env;
}

