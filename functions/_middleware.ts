import { getDB, initDB } from './api/_db';
import { runAIAggregation } from './api/_ai-fetcher';
import { setCloudEnv } from './api/_cloud-env';

export const scheduled = async (event: any, env: any, ctx: any) => {
  setCloudEnv(env);
  try {
    const db = await getDB();
    await initDB(db);
    // Run the AI aggregation (not manual)
    await runAIAggregation(false);
  } catch (e) {
    console.error('Scheduled task error:', e);
  }
};
