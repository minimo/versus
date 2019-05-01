phina.define("RoundRectangleClip", {
  superClass: "Accessory",

  x: 0,
  y: 0,
  width: 0,
  height: 0,

  radius: 5,

  _enable: true,

  init: function() {
    this.superInit();
    this._init();
  },

  _init: function() {
    this.on("attached", () => {

      this.target.accessor("RoundRectangleClip.width", {
        "get": () => this.width,
        "set": (v) => this.width = v,
      });

      this.target.accessor("RoundRectangleClip.height", {
        "get": () => this.height,
        "set": (v) => this.height = v,
      });

      this.target.accessor("RoundRectangleClip.x", {
        "get": () => this.x,
        "set": (v) => this.x = v,
      });

      this.target.accessor("RoundRectangleClip.y", {
        "get": () => this.y,
        "set": (v) => this.y = v,
      });

      this.target.accessor("RoundRectangleClip.radius", {
        "get": () => this.radius,
        "set": (v) => this.radius = v,
      });

      this.x = 0;
      this.y = 0;
      this.width = this.target.width;
      this.height = this.target.height;

      this.target.clip = (c) => this._clip(c);
    });
  },

  _clip: function(canvas) {
    const width = this.target.width;
    const height = this.target.height;
    const x = this.x - (width * this.target.originX);
    const y = this.y - (height * this.target.originY);
    const radius = this.radius;

    const l = x + radius;
    const r = x + width - radius;
    const t = y + radius;
    const b = y + height - radius;

    canvas.beginPath();
    canvas.arc(l, t, radius, -Math.PI,       -Math.PI * 0.5, false);  // 左上
    canvas.arc(r, t, radius, -Math.PI * 0.5,              0, false);  // 右上
    canvas.arc(r, b, radius,              0,  Math.PI * 0.5, false);  // 右下
    canvas.arc(l, b, radius,  Math.PI * 0.5,        Math.PI, false);  // 左下
    canvas.closePath();
  },

  setRadius: function(v) {
    this.radius = v;
    return this;
  },

  setEnable: function(enable) {
    this._enable = enable;
    if (this._enable) {
      this.target.clip = (c) => this._clip(c);
    } else {
      this.target.clip = null;
    }
    return this;
  },

  _accessor: {
    enable: {
      set: function(v) {
        this.setEnable(v);
      },
      get: function() {
        return this._enable;
      }
    }
  },

});
