module.exports = [
  // {
  //   interval: '60m',
  //   immediate: true,
  //   handle: () => {
  //     // do something
  //     console.log("crontab call.", new Date());
  //   }
  // },
  {
    cron: '*/1 * * * *', // 1分钟检查一次
    handle: 'worker/ping',
    type: 'one'
  }
  /// api/crontab/activeheroku 激活heroku
  // {
  //   cron: '*/2 * * * *', // 2分钟检查一次
  //   handle: 'api/crontab/activeheroku',
  //   type: 'one'
  // },
  // {
  //   cron: '*/15 * * * *', // 15分钟检查一次
  //   handle: 'api/crontab/insertZfcg0',
  //   type: 'one'
  // },
  // {
  //   cron: '*/15 * * * *', // 15分钟检查一次
  //   handle: 'api/crontab/innsertZfcg1',
  //   type: 'one'
  // },
  // {
  //   cron: '*/30 7-23 * * *', // 30分钟检查一次
  //   handle: 'api/crontab/scrapyLogCheck',
  //   type: 'one'
  // },
  // {
  //   cron: '0 20 * * *',
  //   handle: 'api/crontab/todaymail',
  //   type: 'one'
  // },

  // 已经不需要处理了，已经直接在爬虫进行内容处理
  // {
  //   // cron: '*/5 6-23 * * *', // 10分钟检查一次
  //   cron: '*/1 * * * *', // 10分钟检查一次
  //   handle: 'api/crontab/wc',
  //   type: 'one'
  // },
  // {
  //   cron: '50 6-23 * * *', // 1小时检查一次
  //   handle: 'api/crontab/calRecords',
  //   type: 'one'
  // },
  // {
  //   cron: '30 11,17,21 * * *',
  //   handle: 'api/crontab/todaywechat',
  //   type: 'one'
  // },
  // {
  //   cron: '0 11,21 * * *',
  //   handle: 'api/crontab/notifykeyword',
  //   type: 'one'
  // }
];
