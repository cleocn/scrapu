module.exports = class extends think.Controller {
  __before() {

  }

  colorMe(str, color) {
    return `<span style='color:${color || 'red'}'>${str}</span>`;
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
