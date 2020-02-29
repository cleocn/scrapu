const puppeteer = require('puppeteer');

puppeteer.launch({
  'headless': true,
  // 'devtools': true,
  // # 'executablePath': '/Users/changjiang/apps/Chromium.app/Contents/MacOS/Chromium',
  'args': [
    '--disable-extensions',
    '--hide-scrollbars',
    '--disable-bundled-ppapi-flash',
    '--mute-audio',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu'
  ],
  'dumpio': true
}).then(async browser => {
// const browser = await puppeteer.launch({
//   'headless': think.config('scrapu').headless,
//   // 'devtools': true,
//   // # 'executablePath': '/Users/changjiang/apps/Chromium.app/Contents/MacOS/Chromium',
//   'args': [
//     '--disable-extensions',
//     '--hide-scrollbars',
//     '--disable-bundled-ppapi-flash',
//     '--mute-audio',
//     '--no-sandbox',
//     '--disable-setuid-sandbox',
//     '--disable-gpu'
//   ],
//   'dumpio': true
// });

  const page = await browser.newPage();

  // # await page.setRequestInterception(True)
  // # page.on('request',  intercept_request)
  // # page.on('response',  intercept_response)
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16299');
  await page.setViewport({'width': 1080, 'height': 960});
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
  const response = await page.goto('http://qy1.sfda.gov.cn/datasearchcnda/face3/base.jsp?tableId=26&tableName=TABLE26&title=%B9%FA%B2%FA%C6%F7%D0%B5&bcId=118103058617027083838706701567');
  console.log(await response.text());
  browser.close();
});
