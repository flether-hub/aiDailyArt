let cloudEnv: any = null;

export function getCloudEnv() {
  return { ...process.env, ...cloudEnv };
}

export function setCloudEnv(env: any) {
  cloudEnv = env;
}

