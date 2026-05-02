// 这是一个独立的 Cloudflare Worker 代码
// 它的作用是定时给你的 Pages 应用发送带有安全凭证的请求，触发后台任务

export default {
  // fetch 事件用于处理直接的 HTTP 访问 (例如你在浏览器中打开 worker 的地址)
  // 我们加在这里只是为了避免直接访问时看到 "No fetch handler!" 报错
  async fetch(request, env, ctx) {
    return new Response("Cron worker 运行正常！此 Worker 主要在后台定期执行，请查看 Cloudflare 的 'Trigger' 或 '触发器' 页面以配置定时事件。", { status: 200 });
  },

  // scheduled 事件是专门处理 cron 定期任务的
  async scheduled(event, env, ctx) {
    // 你的 Pages 项目的定时任务接口地址
    // 你需要在 Worker 的环境变量中配置 CRON_TARGET_URL
    // 例如: https://你的项目名.pages.dev/api/cron?secret=你的自定义秘钥
    const targetUrl = env.CRON_TARGET_URL;
    
    if (!targetUrl) {
      console.error("未配置环境变量: CRON_TARGET_URL");
      return;
    }

    try {
      console.log(`正在触发后台任务: ${targetUrl}`);
      const response = await fetch(targetUrl);
      const text = await response.text();
      console.log(`触发结果 (${response.status}): ${text}`);
    } catch (e) {
      console.error(`触发请求失败:`, e);
    }
  }
};
