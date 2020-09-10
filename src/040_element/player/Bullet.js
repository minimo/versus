phina.define("Bullet", {
  superClass: 'phina.display.DisplayElement',

  init: function(options) {
    options = (options || {}).$safe({ x: 0, y: 0, power: 10, speed: 10, direction: 0 });
    this.superInit(options);

    this.x = options.x;
    this.y = options.y;

    this.sprite = Sprite("shot1").addChildTo(this);
    this.sprite.rotation = options.direction + 90;

    const rad = options.direction.toRadian();
    this.vx = Math.cos(rad) * options.speed;
    this.vy = Math.sin(rad) * options.speed;
  },

  update: function() {
    this.x += this.vx;
    this.y += this.vy;

    //画面外に出たら消去
    if (this.x < -SCREEN_WIDTH_HALF - 64 || this.x > SCREEN_WIDTH_HALF + 64) this.remove();
    if (this.y < -SCREEN_HEIGHT_HALF - 64 || this.y > SCREEN_HEIGHT_HALF + 64) this.remove();
  },

});

