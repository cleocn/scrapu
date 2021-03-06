const Base = require('./base.js');
// const puppeteer = require('puppeteer-firefox');
const puppeteer = require('puppeteer');
const FIRST_URL = 'http://qy1.sfda.gov.cn/datasearchcnda/face3/base.jsp?tableId=26&tableName=TABLE26&title=%B9%FA%B2%FA%C6%F7%D0%B5&bcId=118103058617027083838706701567';
const util = require('util');
const os = require('os');

module.exports = class extends Base {
  esmessage(type, id, msg, no_time) {
    if (type) this.ctx.res.write(`event:${type}\n`);
    if (id) this.ctx.res.write(`id: ${id}\n`);
    if (msg) this.ctx.res.write(`data:${(no_time ? '' : think.datetime(new Date()))} ${msg}\n\n`);
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
      .order(`hostname`).page(1, 100)
      .countSelect();
    this.esmessage('countDoing', session, countDoing.count, true);
    this.esmessage('message', session, `-进行中 list(${countDoing.count})----`, true);
    countDoing.data.forEach((el, idx) => {
      // this.esmessage(null, null, `<br/>${idx + 1}: ${el.hostname}->${el.title}@${el.ping}`);
      this.esmessage(null, null, `<br/>${idx + 1}:${el.hostname}->${el.title}`);
    });

    const countWaiting = await this.model('scrapu_task').where({hostname: null}).page(1, 20).countSelect();
    this.esmessage('countWaiting', session, countWaiting.count || '0', true);
    this.esmessage('message', session, '<br/><br/>', true);
    this.esmessage(null, null, `---等待中: list(${countWaiting.count})----`, true);
    countWaiting.data.forEach((el, idx) => {
      // this.esmessage(null, null, `<br/>${idx + 1}: ${el.hostname}->${el.title}@${el.ping}`);
      this.esmessage(null, null, `<br/>${idx + 1}:${el.hostname}->${el.title}`);
    });

    const countFinish = await this.model('scrapu_task').where({hostname: ['=', '已完成']}).order(`title`).page(1, 20).countSelect();
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
    // values.action = values.a || 'infoattachment2';
    this.assign('get', values);
    return this.display();
  }

  async indexAction() {
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
      .field('c.`col_title`, c.`col_first_page`, c.`total_page`, c.`total_items`, c.`url`, c.`pre_action`, c.`pager_js`, c.`list_path`, c.`item_path`, c.`table_name`, c.`detail_path`, c.`list_fields`, c.`item_fields`, c.`detail_back_path`, c.`items_now_sql`,t.id,t.title,t.first_page,t.to_page,t.hostname,t.session,t.ping').find();

    this.esmessage('message', hostname, `任务信息：${JSON.stringify(task)}`);
    this.esmessage('session', hostname, `[${task.id}#${task.title}@${session}@${hostname}] @${think.datetime((new Date()), 'DD日HH:mm:ss')}`, true);

    this.esmessage('message', hostname, `初始化 puppeteer..`);
    const browser = await puppeteer.launch({
      // 'product': 'firefox',
      'headless': think.config('scrapu').headless,
      // 'devtools': true,
      // # 'executablePath': '/Users/changjiang/apps/Chromium.app/Contents/MacOS/Chromium',
      'args': [
        '--proxy-server=http://127.0.0.1:8080',
        '--disable-extensions',
        '--hide-scrollbars',
        '--disable-bundled-ppapi-flash',
        '--mute-audio',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu'
      ],
      'dumpio': true
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
    // const url = `http://www.nmpa.gov.cn/WS04/CL2042/`;
    // // const url = `http://baidu.com`;
    // // await page.goto(task.url);
    // await page.goto(url);
    // await page.waitFor(200);

    await page.goto(task.url);

    // 保持浏览器打开，直到显式终止进程
    // await browser.waitForTarget(() => false);

    // const cookies = `JSESSIONID=1CE2AABABA05B7AB6B32170DE6D0EF9A.7; FSSBBIl1UgzbN7N82S=dK78jXIuxJvwp_gqgbEk7kGWB5BeLJeN8y_pkNfFCRVUWjLZGpyKqNKLLBK97BUN; FSSBBIl1UgzbN7N82T=2mgPrWsosWYwSJjQMIFoNR5yWnb15mcvNJ4SdTm3TSNAt2NEE7xbIY.xoAtbs9Y90G93WTKCh2Ne1jr6Kp2zhAfsupQdcvIbyS4DGcDAg.BdI4AbC_LVBMWoOPLn.UVlTz1EqfLB.4VvSAfN7sw_z3O98jM_GSwElPlTqqu3Nrx4SDARpSiHZ6PP2K_s2auaxPEfYvA1umnX3..JWskXZHdDpiFkN3HK5a2ebIm34rc_ehNG9iohSfyCFt8w7ZSA2ws5V.kion0wBj8pDRmn6reTA5gE8GR33vp46M9bgEMbOdgjTRtJv9WFBmDz8QKsm3bCo6JpqD_QNosi0wrM0mG9by4b5h0oA9PW.5DxI8GVoDq; FSSBBIl1UgzbN7N80S=iea5eQLtDeqG_dNzU3FOtHn6300WHmtPOYS9SFcO0Sc_x5jK6l1RBlCtQsDJXT4Z; FSSBBIl1UgzbN7N80T=3yAW.rrZS26j.tyxfgbeVQFNWhTORHbQC9z4Nw4ZuM9wtKIVV_qMj0gGb.h8ZNGUgrlu0MiOVKtho7SYna5zHCl3Mn8fOCInP6h83MtTRfPSTS8TTRBoiBh66y6l7w6JkJC4kN_C9xgNdtVa9oSZmlQaScdV7cpNw05In6vh.wTbKEmz0dK2AHkJuip0H7tTMiXvutlME7Xe.IGCNw076zGWUre6wlXBxXTWGoDYQCWaojNIkAN2UlxLWOwAdSiaRyYwQ45y40ROlVopDbjUOmKaZ57H1kCPXKoGUraVrHGSiaeakyQ3kZdxKZG.JzG145DLU5C0jtDwiinNyzVjJm_i2nbJDB0TFA4vn9BN.V1XOsA;`;
    // const ck = cookies.split(';').filter(c => c).map(c => {
    //   return {name: c.split('=')[0].trim(), value: c.split('=')[1].trim()};
    // });

    // console.log(JSON.stringify(ck));

    // await page.setCookie(...ck);

    // #  // 等待"后端开发"这部分内容呈现
    // # await page.waitForSelector('#pos-backend')
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

    let pageNoCurrent = task.first_page;
    let idx = 0;
    await this.gotoPage(page, pageNoCurrent, task, hostname);

    // #获取列表
    let ItemList = await page.$x(task.list_path);
    this.esmessage('message', hostname, `获得列表: ${ItemList.length}项 .`);
    // while (ItemList.length > 0 && pageNoCurrent < 3) {
    let lastPageItems = 'lastPageItems';
    let currentPageItems = 'currentPageItems';
    try {
      while (ItemList.length > 0 && lastPageItems !== currentPageItems) {
        const items_now = await this.model(task.table_name).where(task.items_now_sql).count();
        this.esmessage('page', hostname, `[(<b style="color:blue">${Math.floor(items_now * 100 / task.total_items)}%</b>)<b style="color:green">${items_now}</b>/${task.total_items}] P:[${task.first_page}-><b style="color:green">${pageNoCurrent}</b>->${task.to_page}]/${task.total_page}`, true);
        lastPageItems = currentPageItems; // 交换
        currentPageItems = 'currentPageItems';
        await model.where({id: task.id, hostname, session}).update({ping: think.datetime(new Date())});
        for (var j = 0; j < ItemList.length; j++) { // 详细条目,处理
          idx = j;
          const item = ItemList[j];

          const a = await item.$x(task.item_path);
          const from_source_link = (await page.evaluate(el => el.href, a[0])).trim();
          currentPageItems += from_source_link;
          const title = await page.evaluate(el => el.innerText, a[0]);

          const valuesUniq = {};
          const values = {from_source_link};
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
          const ct2 = await this.model(task.table_name + '_sda').where({from_source_link}).count();
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
            await this.model(task.table_name).where({from_source_link}).update(values); // 插入爬取的数据
            this.esmessage('message', hostname, `已存在数据:P${pageNoCurrent}.${j + 1}. ${title}`);
          } else {
            const box = await a[0].boundingBox();
            await page.mouse.click(box.x + 3, box.y + 3);
            await this.sleep(3);
            /*  0名称, 1字段名，2xpath或常量，3是否唯一键字段，4是否是常量
              ["许可证编号", "xkzbh", "//td[@width='17%' and translate(normalize-space(text()), ' ', '')='许可证编号']/following-sibling::td"]
              ...
              ["生产OR经营企业","is_maker",1,0,1]
              ... */
            await page.waitForXPath(task.detail_path);
            await page.waitFor(Math.random() * 3 * 1000); // 随机停留
            const detail = (await page.$x(task.detail_path))[0];

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
                  values[f[1]] = await page.evaluate(el => el.innerText, fv[0]);
                  if (f[3] === 1) valuesUniq[f[1]] = await page.evaluate(el => el.innerText, fv[0]); // 如果是唯一键成员
                }
              }
            };

            this.esmessage('message', hostname, `唯一键数据: P${pageNoCurrent}.${j + 1}.${JSON.stringify(valuesUniq)}`);
            this.esmessage('message', hostname, `获得数据: P${pageNoCurrent}.${j + 1}.${JSON.stringify(values)}`);

            await this.model(task.table_name + '_sda').thenAdd(values, {from_source_link}); // 插入进行把备份

            if (ct === 1) {
              this.esmessage('message', hostname, `$1`);
              delete values.from_source_link; // 重复相互覆盖的问题
              delete values.company; // 重复相互覆盖的问题
              await this.model(task.table_name).where({from_source_link}).update(values); // 插入爬取的数据
              this.esmessage('exist', hostname, 1); // 计数
            } else {
              this.esmessage('message', hostname, `$2`);
              let r = {};
              if (think.isEmpty(valuesUniq)) {
                r = await this.model(task.table_name).add(values);
              } else {
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
        ItemList = await page.$x(task.list_path);
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
    console.log(`\n\n\ngoto page no.${pageNoCurrent} 。\n\n\n`);
    await page.$eval('#goInt', input => { input.value = '' }); // 清除原有内容
    const goInts = await page.$x('//input[@id="goInt"]');
    const goInt = goInts[0];
    await goInt.type(pageNoCurrent.toString(), {delay: 100});
    const gotoBtn = await page.$x(`//input[@src="images/dataanniu_11.gif"]`);
    await gotoBtn[0].click();
    await page.waitForXPath(task.list_path);
    await page.waitFor(2000);
  }
};
