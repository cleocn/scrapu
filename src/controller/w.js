const Base = require('./base.js');
// const puppeteer = require('puppeteer-firefox');
const puppeteer = require('puppeteer');
const FIRST_URL = 'http://qy1.sfda.gov.cn/datasearchcnda/face3/base.jsp?tableId=26&tableName=TABLE26&title=%B9%FA%B2%FA%C6%F7%D0%B5&bcId=118103058617027083838706701567';
const util = require('util');
const os = require('os');
var sprintf = require('sprintf-js').sprintf,
  vsprintf = require('sprintf-js').vsprintf;
const htmlToText = require('html-to-text');

module.exports = class extends Base {
  esmessage(type, id, msg, no_time) {
    if (type) this.ctx.res.write(`event:${type}\n`);
    if (id) this.ctx.res.write(`id: ${id}\n`);
    if (msg) this.ctx.res.write(`data:${(no_time ? '' : think.datetime((new Date()), 'HH:mm:ss'))} ${msg}\n\n`); // YYYY-MM-DD HH:ii:ss
  }

  async pingAction() {
    const scrapu = think.config('scrapu');

    const sql = `
          INSERT INTO think_scrapu_host (hostname, url, last_ping)
          values('${scrapu.hostname}@${os.hostname()}', '${scrapu.url}', NOW())
          ON DUPLICATE KEY UPDATE last_ping = NOW();
          `;
    const infoSqlOptions = this.model().parseSql(sql);
    await this.model().query(infoSqlOptions);

    return this.success('ping OK');
  }

  async resetAction() {
    const ct = await this.model('scrapu_task').where({hostname: ['!=', '已完成']}).count(); // https://51xhd.cn/zbjst/api/api/process/infoOfCompany1IniG
    const sql = "update think_scrapu_task set hostname=null , `session`=null where hostname!='已完成';";

    const infoSqlOptions = this.model().parseSql(sql);
    await this.model().query(infoSqlOptions);

    return this.success(`reset ${ct} items OK`);
  }

  async sAction() {
    this.assign('get', this.get());
    return this.display();
  }

  async statusAction() {
    this.ctx.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      // 'Content-Type': 'text/plain',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
      // 'Content-Length': 100
    });
    const session = (new Date()).getTime();

    const countDoing = await this.model('scrapu_task')
      .where(`hostname is not null and hostname != '已完成' `)
      .order(`hostname`)
      .countSelect();
    this.esmessage('countDoing', session, countDoing.count, true);
    this.esmessage('message', session, `-进行中 list(${countDoing.count})----`, true);
    countDoing.data.forEach((el, idx) => {
      // this.esmessage(null, null, `<br/>${idx + 1}: ${el.hostname}->${el.title}@${el.ping}`);
      this.esmessage(null, null, `<br/>${idx + 1}:${el.hostname}->${el.title}`);
    });

    const countWaiting = await this.model('scrapu_task').where({hostname: null}).countSelect();
    this.esmessage('countWaiting', session, countWaiting.count || '0', true);
    this.esmessage('message', session, '<br/><br/>', true);
    this.esmessage(null, null, `---等待中: list(${countWaiting.count})----`, true);
    countWaiting.data.forEach((el, idx) => {
      // this.esmessage(null, null, `<br/>${idx + 1}: ${el.hostname}->${el.title}@${el.ping}`);
      this.esmessage(null, null, `<br/>${idx + 1}:${el.hostname}->${el.title}`);
    });

    const countFinish = await this.model('scrapu_task').where({hostname: ['=', '已完成']}).order(`title`).countSelect();
    this.esmessage('countFinish', session, countFinish.count || 0, true);
    this.esmessage('message', session, '<br/><br/>', true);
    this.esmessage(null, null, `-----------已完成: list(${countFinish.count})-----------`, true);
    countFinish.data.forEach((el, idx) => {
      // this.esmessage(null, null, `<br/>${idx + 1}: ${el.title} @ ${el.ping}`);
      this.esmessage(null, null, `<br/>${idx + 1}: ${el.title}`);
    });

    this.esmessage('message', session, '<br/>-----end---- ');
    let n = 0;
    while (n < 100) {
      await think.timeout(1 * 1000); // 等待
      this.esmessage('message', session, ` ${100 - n}..`, true);
      n++;
    }
  }

  async gAction() {
    const values = this.get();
    values.do = values.do || 'ga';
    this.assign('get', values);
    return this.display();
  }

  /***
   * ["法人名称", "company", "//td[translate(normalize-space(text()), ' ', '')='法人名称：']/following-sibling::td"]
["主要经营产品", "主要经营产品", "//td[translate(normalize-space(text()), ' ', '')='主要经营产品：']/following-sibling::td"]
["经营范围","经营范围", "//td[text()='经营范围：']/following-sibling::td"]
["营业执照号码","营业执照号码", "//td[text()='营业执照号码：']/following-sibling::td"]
["发证机关", "发证机关", "//td[text()='发证机关：']/following-sibling::td"]
["经营状态", "经营状态", "//td[text()='经营状态：']/following-sibling::td"]
["成立时间", "成立时间", "//td[text()='成立时间：']/following-sibling::td"]
["职员人数","职员人数", "//td[text()='职员人数：']/following-sibling::td"]
["注册资本","注册资本", "//td[text()='注册资本：']/following-sibling::td"]
["所属分类","所属分类", "//td[text()='所属分类：']/following-sibling::td"]
["所属城市","所属城市", "//td[text()='所属城市：']/following-sibling::td"]
["类型","类型", "//td[text()='类型：']/following-sibling::td"]
["顺企编码","顺企编码","//td[text()='顺企编码：']/following-sibling::td"]

["公司地址","companyaddress","//dt[contains(text(),'公司地址')]/following-sibling::dd"]
["固定电话","work_tel","//dt[contains(text(),'固定电话')]/following-sibling::dd"]
["联系人","name","//dt[contains(text(),'手机')]/preceding-sibling::dd"]
["手机","tel","//dt[contains(text(),'手机')]/following-sibling::dd"]
["邮箱","mail","//dt[contains(text(),'邮件')]/following-sibling::dd"]

[" 公司简介","aboutuscontent","//div[@id='aboutuscontent']"]

   */
  async gaAction() {
    const hostname = (think.config('scrapu').hostname || os.hostname()) + '@' + (this.get('t') || '');
    const hosturl = think.config('scrapu').url;
    const session = (new Date()).getTime();

    const GO_INT_PATH = `'//input[@id="goInt"]`;

    console.info(`+++++++++++++++++++++insertZfcg0Action called `, think.datetime(new Date()));

    if (think.env === 'development' && this.isCli) {
      console.info('+++++++++++++++开发环境 不执行crontab insertZfcg0Action++++++++++++++++');
      return;
    }

    const model = this.model('scrapu_task');

    this.ctx.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      // 'Content-Type': 'text/plain',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
      // 'Content-Length': 100
    });

    if (this.get('a') === 'D') {
      const list = await model.where({hostname, is_publish: 1, is_delete: 0}).select();

      await model.where({hostname, is_publish: 1, is_delete: 0}).update({hostname: null, session: null});

      this.esmessage('message', hostname, `删除${list.length}个: ${list.map(l => l.hostname + l.session).join(',')}...<br/><br/><br/>`);
      return this.ctx.res.end();
    }

    this.esmessage('message', hostname, `<b style="color:red;">重启 session: ${session}@${hostname}</b>...<br/><br/><br/>`);
    this.esmessage('session', hostname, `[${session}@${hostname}] ${think.datetime((new Date()), 'MM/DD HH:mm:ss')} }`, true);

    // 获取任务
    let task = await model.where(`(hostname='${hostname}') and is_publish=1 and is_delete=0`).order('id asc').find();
    if (think.isEmpty(task)) {
      this.esmessage('message', hostname, '没有可以继续的未完成任务');

      task = await model.where(`(isnull(hostname)) and is_publish=1 and is_delete=0`).order('id asc').find();
      if (think.isEmpty(task)) {
        this.esmessage('message', hostname, '没有新任务');
        let n = 0;
        while (n < 20) {
          await think.timeout(1 * 1000); // 等待20
          this.esmessage('message', hostname, `等待新任务 ${20 - n}..`, true);
          n++;
        }
        this.ctx.res.end();
        return;
      }
      this.esmessage('message', hostname, '找到新任务');
    }

    if (task.hostname === null) { // 抢任务
      console.log('抢任务');
      this.esmessage('message', hostname, `抢占${task.title}..`);
      await model.where({id: task.id, hostname: null, is_publish: 1, is_delete: 0}).update({hostname, session});

      task = await model.where({hostname, session, is_publish: 1, is_delete: 0}).find(); // 判断是否抢成功
      if (task.hostname === null) { // 抢任务失败
        console.log('任务抢失败');
        this.esmessage('message', hostname, '任务抢失败');
        this.ctx.res.end();
        return;
      } else {
        console.log('任务抢成功');
        this.esmessage('message', hostname, '任务抢成功');
      }
    } else {
      await model.where({id: task.id}).update({hostname, session, ping: think.datetime(new Date())});
      this.esmessage('message', hostname, `继续任务：${task.title}..`);
    }

    // 获取完整的task信息
    task = await model.alias('t')
      .join({
        table: 'scrapu_col',
        join: 'inner', // join 方式，有 left, right, inner 3 种方式
        as: 'c', // 表别名
        on: ['c.id', 't.col_id'] // ON 条件
      })
      .where({'t.id': task.id})
      .field('c.`col_title`, c.`col_first_page`, c.`total_page`, if(c.`total_items`>0,c.`total_items`,t.total_items) total_items, c.`url`, c.`pre_action`, c.`pager_js`, c.`list_path`, c.`item_path`, c.`table_name`, c.`detail_path`, c.`list_fields`, c.`item_fields`, c.`detail_back_path`, c.`items_now_sql`,t.id,t.title,t.first_page,t.to_page,t.hostname,t.session,t.ping,t.task_url,t.pager,t.values').find();

    // task_url 覆盖 task.url
    task.url = task.task_url || task.url;

    this.esmessage('message', hostname, `任务信息：${JSON.stringify(task)}`);
    this.esmessage('session', hostname, `[${task.id}#${task.title}@${hostname}] @${think.datetime((new Date()), 'DD日HH:mm:ss')}`, true);

    this.esmessage('message', hostname, `初始化 puppeteer..`);
    const browser = await puppeteer.launch({
      // 'product': 'firefox',
      'headless': think.config('scrapu').headless,
      // 'headless': false,
      // 'devtools': true,
      // # 'executablePath': '/Users/changjiang/apps/Chromium.app/Contents/MacOS/Chromium',
      'args': [
        // '--proxy-server=http://127.0.0.1:8080',
        '--disable-extensions',
        '--hide-scrollbars',
        '--disable-bundled-ppapi-flash',
        '--mute-audio',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu'
      ]
      // 'dumpio': true
    });

    const page = await browser.newPage();

    page.on('dialog', async dialog => {
      console.log(dialog.message());
      await dialog.dismiss();
    });
    // // 当页面发生错误事件时发出(例如，页面崩溃)
    // page.on('error', error => console.error(` ${error}`));
    // // 当页面中的脚本有未捕获异常时发出
    // page.on('pageerror', error => console.error(` ${error}`));
    // // 当页面产生请求时发出
    // page.on('request', request => console.info(`➞ Request: ${request.url()}`));
    // // 当页面生成的请求失败时发出
    // page.on('requestfailed', request => console.info(` Failed request: ${request.url()}`));
    // // 当页面生成的请求成功完成时发出
    // page.on('requestfinished', request => console.info(`➞ Finished request: ${request.url()}`));
    // 当接收到响应时发出
    // page.on('response', response => console.info(`➞ Response: ${response.url()}`));

    // # await page.setRequestInterception(True)
    // # page.on('request',  intercept_request)
    // # page.on('response',  intercept_response)
    const UA = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.116 Safari/537.36',
      'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
      'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.11 TaoBrowser/2.0 Safari/536.11',
      'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0; SLCC2; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30729; Media Center PC 6.0; .NET4.0C; .NET4.0E; QQBrowser/7.0.3698.400)',
      'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.84 Safari/535.11 SE 2.X MetaSr 1.0',
      'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/534.57.2 (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2'
    ];
    await page.setUserAgent(UA[Math.floor((Math.random() * UA.length))]);
    await page.setViewport({'width': 1280, 'height': 1920});
    await page.evaluate(`
        () =>{
                Object.defineProperties(navigator,{
                  webdriver:{
                    get: () => false
                  }
                })
  
                delete navigator.__proto__.webdriver
  
                console.log('delete navigator.__proto__.webdriver finish.')
        }
    `);
    this.esmessage('message', hostname, `开始打开首页: ${task.url}..`);

    let pageNoCurrent = task.first_page;
    let idx = 0;
    try {
      await page.goto(task.url);

      await this.sleep(2);
      await page.waitFor(Math.random() * 3 * 1000); // 随机停留

      this.esmessage('message', hostname, `开始执行前序动作: ..`);
      const preTasks = task.pre_action.split('\n').filter(a => !think.isEmpty(a));
      for (var i = 0; i < preTasks.length; i++) {
        this.esmessage('message', hostname, `前序动作: ${i + 1}/${preTasks.length} :${preTasks[i]}..`);
        const thisTask = JSON.parse(preTasks[i]);
        // ["click","//td[@class='zs1' and text()='医疗器械']"]
        // ["sleep",1]

        // ["click", "//td[@onclick=\\"javascript:sform(2,10,this,'132')\\"]"]
        // ["sleep",1]
        switch (thisTask[0]) {
          case 'sleep':
            await this.sleep(thisTask[1]);
            await page.waitFor(Math.random() * 3 * 1000); // 随机停留
            break;
          case 'click':
            // # 点点击 医疗器械
            // x_Path = `//td[@class="zs1" and text()='医疗器械']`;
            // # YLQX_PATH =  """//td[@class="zs1" and text()='广　　告']"""
            // await page.waitForNavigation();
            await page.waitForXPath(thisTask[1]);
            const el = await page.$x(thisTask[1]);
            // console.log('YLQX: ', YLQX.length);
            const box = await el[thisTask[2] || 0].boundingBox();
            await page.mouse.click(box.x + 3, box.y + 3);
            break;
          default:
            break;
        }
      }

      await this.gotoPage(page, pageNoCurrent, task, hostname);

      // #获取列表
      let ItemList = await page.$x(task.list_path);
      this.esmessage('message', hostname, `获得列表: ${ItemList.length}项 .`);
      // while (ItemList.length > 0 && pageNoCurrent < 3) {
      let lastPageItems = 'lastPageItems';
      let currentPageItems = 'currentPageItems';

      while (ItemList.length > 0 && lastPageItems !== currentPageItems) {
        const items_now = await this.model(task.table_name).where(task.items_now_sql || {task_id: task.id}).count();
        this.esmessage('page', hostname, `[(<b style="color:blue">${(items_now * 100 / task.total_items).toFixed(1)}%</b>)<b style="color:green">${items_now}</b>/${task.total_items}] P:[${task.first_page}-><b style="color:green">${pageNoCurrent}</b>->${task.to_page}]/${task.total_page}`, true);
        lastPageItems = currentPageItems; // 交换
        currentPageItems = 'currentPageItems';
        await model.where({id: task.id, hostname, session}).update({ping: think.datetime(new Date())});
        for (var j = 0; j < ItemList.length; j++) { // 详细条目,处理
          this.esmessage('message', hostname, `P${pageNoCurrent}: ${j}项 .<br/><br/>`);
          idx = j;
          const item = ItemList[j];

          const a = await item.$x(task.item_path);
          const from_source_link = (await page.evaluate(el => el.href, a[0])).trim();
          currentPageItems += from_source_link;
          const title = await page.evaluate(el => el.innerText, a[0]);

          const valuesUniq = {};
          const values = {from_source_link, task_id: task.id};
          if (!think.isEmpty(task.values)) Object.assign(values, JSON.parse(task.values || '{}')); // 加载默认值，比如city_id
          // ["0字段标题", "1数据库字段名", "2属性名称", "3正则提取", "4是否属于唯一键成员=1,0"]
          // ["公司名称", "company", "innerText", "\((\S+)\)", 1]
          const list_fields = task.list_fields.split('\n').filter(a => !think.isEmpty(a));
          for (var k = 0; k < list_fields.length; k++) {
            const field = list_fields[k];
            const f = JSON.parse(field);
            let value = await page.evaluate(el => el.innerText, a[0]);
            if (f[3]) { // 3正则提取
              // this.esmessage('message', hostname, `正则提取: ${f[3]}`);
              const r = new RegExp(f[3]);
              if (r.exec(value) && r.exec(value).length > 1) {
                value = r.exec(value)[1];
              }
            }
            values[f[1]] = value;
            if (f[4] === 1) valuesUniq[f[1]] = value; // 如果是唯一键成员
          };
          // this.esmessage('message', hostname, `列表提取字段: P${pageNoCurrent}.${j + 1}.${JSON.stringify(values)}`);
          // this.esmessage('message', hostname, `列表提取唯一字段: P${pageNoCurrent}.${j + 1}.${JSON.stringify(valuesUniq)}`);

          const ct = await this.model(task.table_name).where({from_source_link}).count();
          const ct2 = await this.model(task.table_name + '_gs').where({from_source_link}).count();
          if (ct > 0 && ct2 > 0) { // 已经存在
            // 更新常量数据
            task.item_fields.split('\n').filter(a => !think.isEmpty(a)).forEach(field => {
              const f = JSON.parse(field);
              if (f[4] === 1) { // 是否是常量
                values[f[1]] = f[2];
              }
            });
            this.esmessage('message', hostname, `$0: 更新常量数据`);
            delete values.from_source_link; // 重复相互覆盖的问题
            delete values.company; // 重复相互覆盖的问题
            delete values.name_0;
            if (!think.isEmpty(values)) await this.model(task.table_name).where({from_source_link}).update(values); // 插入爬取的数据
            this.esmessage('message', hostname, `已存在数据:P${pageNoCurrent}.${j + 1}. ${title}`);
          } else {
            // const box = await a[0].boundingBox();
            // await page.mouse.click(box.x + 3, box.y + 3);
            await a[0].click();
            await this.sleep(3);
            /*  0名称, 1字段名，2xpath或常量，3是否唯一键字段，4是否是常量
              ["许可证编号", "xkzbh", "//td[@width='17%' and translate(normalize-space(text()), ' ', '')='许可证编号']/following-sibling::td"]
              ...
              ["生产OR经营企业","is_maker",1,0,1]
              ... */
            // await page.waitForXPath(task.detail_path);
            // await page.waitFor(Math.random() * 3 * 1000); // 随机停留
            await page.waitFor(4000); // 等待3秒，等待新窗口打开

            let loop = 0;
            while ((await browser.pages()).length < 3 && loop < 3) {
              await page.waitFor(3000); // 等待3秒，等待新窗口打开
              loop += 1;
            }

            const page2 = (await browser.pages())[2]; // 得到所有窗口使用列表索引得到新的窗口
            await page2.setViewport({width: 1280, height: 800});
            // run js
            await page2.evaluate(() => {
              if (document.getElementById('aboutuscontent') && document.getElementById('aboutuscontent').children.length > 1) {
                document.getElementById('aboutuscontent').children[1].click();
              }
            });
            await page2.waitFor(3000);
            await page2.waitForXPath('//body');

            const detail = (await page2.$x(task.detail_path))[0];
            if (!detail) {
              this.esmessage('message', hostname, `P${pageNoCurrent}.${idx}<b style="color:red;">ERROR: 本条已经删除.${vsprintf(task.pager, [pageNoCurrent])}</b>`);
              this.esmessage('errorCount', hostname, `P${pageNoCurrent}.${idx}<b style="color:red;">ERROR: 本条已经删除.${vsprintf(task.pager, [pageNoCurrent])}</b>`);
              const body = await page2.evaluate(el => el.innerHTML, (await page2.$x('//body'))[0]);
              this.esmessage('errorCount', hostname, `P${pageNoCurrent}.${idx}<b style="color:red;">body:${body}</b>`);

              await page.waitFor(5000); // 等待5秒，
              await page2.close();
              continue; // 有部分在列表中，但是已经删除的 //https://www.11467.com/guangzhou/search/371-15.htm 第一条 https://www.11467.com/guangzhou/co/434047.htm
            }

            const item_fields = task.item_fields.split('\n').filter(a => !think.isEmpty(a));
            for (var k = 0; k < item_fields.length; k++) {
              const field = item_fields[k];
              const f = JSON.parse(field);
              if (f[4] === 1) { // 是否是常量
                values[f[1]] = f[2];
                if (f[3] === 1) valuesUniq[f[1]] = f[2]; // 如果是唯一键成员
              } else {
                // this.esmessage('message', hostname, `正在处理字段数据: ${f[1]}：${f[2]}  ..`);
                const fv = await detail.$x(f[2]);
                if (fv.length > 0) { // 有个别网页 不完整的情况，跳过吧，没办法。 比如这条数据： 国产医疗器械产品（注册） 注册证编号	京械注准20172080620
                  values[f[1]] = htmlToText.fromString((await page2.evaluate(el => el.innerHTML, fv[0])), {ignoreHref: true});
                  if (f[3] === 1) valuesUniq[f[1]] = await page2.evaluate(el => el.innerText, fv[0]); // 如果是唯一键成员
                }
              }
            };

            this.esmessage('message', hostname, `唯一键数据: P${pageNoCurrent}.${j + 1}.${JSON.stringify(valuesUniq)}`);
            this.esmessage('message', hostname, `获得数据: P${pageNoCurrent}.${j + 1}.${JSON.stringify(values)}`);

            await this.model(task.table_name + '_gs').thenAdd(values, {from_source_link}); // 插入进行把备份

            if (ct === 1) {
              this.esmessage('message', hostname, `$1.主表存在`);
              delete values.from_source_link; // 重复相互覆盖的问题
              delete values.company; // 重复相互覆盖的问题
              await this.model(task.table_name).where({from_source_link}).update(values); // 插入爬取的数据
              this.esmessage('exist', hostname, 1); // 计数
            } else {
              this.esmessage('message', hostname, `$2.主表不存在`);
              let r = {};
              if (think.isEmpty(valuesUniq)) {
                this.esmessage('message', hostname, `$2.1 唯一键为空`);
                r = await this.model(task.table_name).thenAdd(values, {from_source_link});
              } else {
                this.esmessage('message', hostname, `$2.2 唯一键不为空`);
                r = await this.model(task.table_name).thenAdd(values, valuesUniq);
              }

              this.esmessage('message', hostname, `插入数据状态: .${JSON.stringify(r)}`);
              if (r.type === 'exist') {
                this.esmessage('message', hostname, `$3`);
                delete values.from_source_link; // 重复相互覆盖的问题
                delete values.company; // 重复相互覆盖的问题
                await this.model(task.table_name).where({id: r.id}).update(values); // 插入爬取的数据
              }
              this.esmessage(r.type || 'add', hostname, r.id || r); // 计数， 当think.isEmpty(valuesUniq) ，r=id
            }
            if (task.detail_back_path) {
              // //img[@onclick="javascript:viewList()"] // 返回
              const el = await page.$x(task.detail_back_path);
              // console.log('YLQX: ', YLQX.length);
              const box2 = await el[0].boundingBox();
              await page.mouse.click(box2.x + 3, box2.y + 3);
              await page.waitForXPath(task.list_path);
              ItemList = await page.$x(task.list_path); // 重新赋值
              this.esmessage('message', hostname, `回到列表状态: j=${j},ItemList.length=${ItemList.length} .`);
              await page.waitFor(2000);
              await page.waitFor(Math.random() * 3 * 1000);
            } else {
              page2.close();
              await page.waitFor(2000);
            }

            // 检查session
            if ((await model.where({hostname, session}).count()) === 0) {
              this.esmessage('message', hostname, `被另外进程抢占，本进程关闭: session= ${session}.`);
              await browser.close();
              return this.ctx.res.end();
            }
          }
        } // for end

        // # NEXT PAGE
        pageNoCurrent++;
        await model.where({id: task.id}).update({first_page: pageNoCurrent}); // 完成页码
        if (task.to_page && pageNoCurrent > task.to_page) { // 结束，分段处理
          this.esmessage('message', hostname, `结束啦， 已完成任务页数：${pageNoCurrent - 1}`);
          await model.where({id: task.id}).update({hostname: '已完成'}); // 完成页码
          await browser.close();
          return this.ctx.res.end();
        }
        await this.gotoPage(page, pageNoCurrent, task, hostname);

        // #重新获取列表
        // ItemList = await page.$x(task.list_path);
        this.esmessage('message', hostname, `重新获取列表 ItemList.length=${ItemList.length}.`);
      } // while end

      this.esmessage('message', hostname, `结束啦， 已完成.`);
      await model.where({id: task.id}).update({hostname: '已完成'}); // 完成页码
      await browser.close();
    } catch (error) { // error
      console.error(error);
      this.esmessage('errorCount', hostname, `P${pageNoCurrent}.${idx}<b style="color:red;">ERROR: .${JSON.stringify(error)}${error.stack}</b>`);
      await browser.close();
    }
  }

  async gotoPage(page, pageNoCurrent, task, hostname) {
    this.esmessage('message', hostname, `goto page no.${pageNoCurrent} 。`);
    if (task.pager) {
      this.esmessage('message', hostname, `goto  ${vsprintf(task.pager, [pageNoCurrent])} 。`);
      await page.goto(vsprintf(task.pager, [pageNoCurrent]));
      await page.waitFor(3 * 1000); // 停留3s
      // await page.waitFor(task.list_path); // 随机停留
    } else {
      await page.$eval('#goInt', input => { input.value = '' }); // 清除原有内容
      const goInts = await page.$x('//input[@id="goInt"]');
      const goInt = goInts[0];
      await goInt.type(pageNoCurrent.toString(), {delay: 100});
      const gotoBtn = await page.$x(`//input[@src="images/dataanniu_11.gif"]`);
      await gotoBtn[0].click();
    }

    // await page.waitForXPath(task.list_path);
    await page.waitFor(2000);
  }
};
