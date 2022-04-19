class Color {
  constructor(index, name, rgb) {
    this.index = index;
    this.name = name;
    this.rgb = rgb;

    return this;
  }
}

class EnumColor {
  constructor() {
    this.ENUM = [
      new Color(-1, 'transparent', [255, 255, 255, 0]),
      new Color(0, 'white', [255, 255, 255, 255]),
      new Color(1, 'gainsboro', [228, 228, 228, 255]),
      new Color(2, 'grey', [136, 136, 136, 255]),
      new Color(3, 'nero', [34, 34, 34, 255]),
      new Color(4, 'carnation pink', [255, 167, 209, 255]),
      new Color(5, 'red', [229, 0, 0, 255]),
      new Color(6, 'orange', [229, 149, 0, 255]),
      new Color(7, 'brown', [160, 106, 66, 255]),
      new Color(8, 'yellow', [229, 217, 0, 255]),
      new Color(9, 'conifer', [148, 224, 68, 255]),
      new Color(10, 'green', [2, 190, 1, 255]),
      new Color(11, 'dark turquoise', [0, 211, 221, 255]),
      new Color(12, 'pacific blue', [0, 131, 199, 255]),
      new Color(13, 'blue', [0, 0, 234, 255]),
      new Color(14, 'violet', [207, 110, 228, 255]),
      new Color(15, 'purple', [130, 0, 128, 255])
    ]

    return this;
  }

  index(i) {
    for (const c of this.ENUM) {
      if (c.index === i) return c;
    }
    return this.ENUM[0];
  }
  rgb(rgb, silent, sensitive, brightness) {
    if (!sensitive) sensitive = 1;
    if (!brightness) brightness = 0;

    this.ENUM.forEach((c) => {
      if (c.rgb[0] === rgb[0] && c.rgb[1] === rgb[1] && c.rgb[2] === rgb[2] && c.rgb[3] === rgb[3]) {
        return c;
      }
    });

    let diffMin = [[255, 255, 255], 1038366];

    if (rgb[3] != 255) return this.index(-1);

    for (const color of this.ENUM) {
      if (color.index == -1) continue;

      let diffR = ((rgb[0] + brightness) - color.rgb[0]) * ((rgb[0] + brightness) - color.rgb[0]);
      let diffG = ((rgb[1] + brightness) - color.rgb[1]) * ((rgb[1] + brightness) - color.rgb[1]);
      let diffB = ((rgb[2] + brightness) - color.rgb[2]) * ((rgb[2] + brightness) - color.rgb[2]);

      let x = Math.min(diffR, diffG, diffB);
      let z = Math.max(diffR, diffG, diffB); // ATTENTION: LAST diffB SHOULD BE diffR?
      let y = (diffR + diffG + diffB) - (x + z);

      x = x / sensitive;
      z = z * sensitive;

      let diffys = Math.sqrt(x + y + z);

      if (diffys < diffMin[1]) {
        diffMin[1] = diffys;
        diffMin[0] = color.rgb;
      }
    }

    return this.rgb(diff_min[0]);
  }

  sortByDiff(arr) {
    return (arr.length <= 1) ? arr : [...this.sortByDiff(arr.slice(1).filter((el) => el[1] <= arr[0][1])), arr[0], ...this.sortByDiff(arr.slice(1).filter(el => el[1] > arr[0][1]))];
  }

  convertColor(rgba) {
    if (rgba.r || rgba.r === 0) rgba = [ rgba.r, rgba.g, rgba.b]
    let diffs = [];
    for (let i = 0; i < this.ENUM.length; i++) {
      let diff = Math.abs(rgba[0] - this.ENUM[i].rgb[0]) + Math.abs(rgba[1] - this.ENUM[i].rgb[1]) + Math.abs(rgba[2] - this.ENUM[i].rgb[2]);
      diffs.push([this.ENUM[i].index, diff]);
    }
    return this.index(this.sortByDiff(diffs)[0][0]);
  }
}

module.exports = EnumColor;
