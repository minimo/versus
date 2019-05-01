phina.define("PathClip", {
  superClass: "Accessory",

  isEnable: true,

  init: function() {
    this.superInit();
    this._init();
  },

  _init: function() {
    this.on("attached", () => {
      const x1 = -(this.target.width * this.target.originX);
      const y1 = -(this.target.height * this.target.originY);
      const x2 =  (this.target.width * (1 - this.target.originX));
      const y2 =  (this.target.height * (1 - this.target.originY));

      this.clearPath();
      this.path.push({x: x1, y: y1 });
      this.path.push({x: x2, y: y1 });
      this.path.push({x: x2, y: y2 });
      this.path.push({x: x1, y: y2 });
      this.target.clip = (c) => this._clip(c);
    });
  },

  setEnable: function(enable) {
    this.inEnable = enable;
    if (this.isEnable) {
      this.target.clip = (c) => this._clip(c);
    } else {
      this.target.clip = null;
    }
  },

  clearPath: function() {
    this.path = [];
    return this;
  },

  addPath: function(path) {
    if (path instanceof Array) {
      this.path = this.path.concat(path);
    } else {
      this.path.push(path);
    }
    return this;
  },

  offsetPath: function(offsetX, offsetY) {
    this.path.forEach(pt => {
      pt.x += offsetX;
      pt.y += offsetY;
    });
    return this;
  },

  _clip: function(canvas) {
    if (this.path.length < 3) return;
    canvas.beginPath();
    canvas.moveTo(this.path[0].x, this.path[0].y);
    this.path.forEach(pt => canvas.lineTo(pt.x, pt.y));
    canvas.closePath();
  },

  _accessor: {
    enable: {
      set: function(v) {
        this.setEnable(v);
      },
      get: function() {
        return this.isEnable;
      }
    }
  },

});
