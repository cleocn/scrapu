// default config
module.exports = {
  port: process.env.PORT || 6464, // server port
  workers: 1,
  scrapu: {
    hostname: process.env.scrapu_hostname || null,
    url: process.env.scrapu_url || 'http://127.0.0.1:6464',
    headless: true
  }
};
