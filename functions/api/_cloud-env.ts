let cloudEnv: any = null;

export function getCloudEnv() {
  const processEnv = typeof process !== 'undefined' ? process.env : {};
  const env = cloudEnv || {};
  return { ...processEnv, ...env };
}

export function setCloudEnv(env: any) {
  if (env && Object.keys(env).length > 0) {
    cloudEnv = env;
  }
}

