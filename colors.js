const Jimp = require("Jimp");

class Colors {
  constructor(colors) {
    if (!colors) {
      this.colors = [ // array with all the colors from COLOR_MAPPINGS
        '#6D001A',
        '#BE0039',
        '#FF4500',
        '#FFA800',
        '#FFD635',
        '#FFF8B8',
        '#00A368',
        '#00CC78',
        '#7EED56',
        '#00756F',
        '#009EAA',
        '#00CCC0',
        '#2450A4',
        '#3690EA',
        '#51E9F4',
        '#493AC1',
        '#6A5CFF',
        '#94B3FF',
        '#811E9F',
        '#B44AC0',
        '#E4ABFF',
        '#DE107F',
        '#FF3881',
        '#FF99AA',
        '#6D482F',
        '#9C6926',
        '#FFB470',
        '#000000',
        '#515252',
        '#898D90',
        '#D4D7D9',
        '#FFFFFF'
      ];
    }

    this.rgbaColors = this.colors.slice().map(el => Jimp.intToRGBA(parseInt(el.replace("#", ""),16)));

    //this.intColors = this.colors.slice().map(el => parseInt(el, 16));

    return this;
  }

  convertColor(color) {
    var c;
    var cDiff;
    this.rgbaColors.forEach((el, i) => {
      let diff = Math.abs(el.r - color.r) + Math.abs(el.g - color.g) + Math.abs(el.b - color.b) + Math.abs(el.a - color.a);
      if (diff < cDiff || cDiff === undefined) {
        cDiff = diff;
        c = el;
      }
    });
    return c;
  }
}

module.exports = Colors;
