let cloudEnv: any = null;

export function getCloudEnv() {
  return cloudEnv || process.env;
}

export function setCloudEnv(env: any) {
  cloudEnv = env;
}

