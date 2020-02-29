module.exports = class extends think.Controller {
  __before() {

  }

  async sleep(time) {
    return new Promise((resolve, reject) => {
      try {
        setTimeout(resolve, time * 1000);
      } catch (error) {
        reject(error);
      }
    });
  }
};
