phina.namespace(function() {

  phina.define('World', {
    superClass: 'DisplayElement',

    init: function(options) {
      this.superInit();
      this.setup();

      this.time = 0;
    },

    setup: function() {
      this.mapBase = DisplayElement()
        .setPosition(0, 0)
        .addChildTo(this);

      //レイヤー構築
      this.mapLayer = [];
      (NUM_LAYERS).times(i => {
        const layer = DisplayElement().addChildTo(this.mapBase);
        this.mapLayer[i] = layer;
      });

      this.player = Player({ world: this })
        .setPosition(64, SCREEN_HEIGHT_HALF - 100)
        .addChildTo(this.mapLayer[LAYER_PLAYER]);

      this.setupMap();
    },

    update: function() {
      this.controlPlayer();
      this.time++;
    },

    setupMap: function() {
      for (let i = 0; i < 100; i++) {
        RectangleShape({
          width: Math.randint(50, 200),
          height: Math.randint(50, 200),
          fill: 'blue',
          stroke: '#aaa',
          strokeWidth: 4,
          cornerRadius: 0,
          x: Math.randint(-1000, 1000),
          y: Math.randint(-1000, 1000),
        }).addChildTo(this.mapLayer[LAYER_BACKGROUND]);
      }
    },

    controlPlayer: function() {
      const player = this.player;
      const ct = phina_app.controller;
      if (ct.up) {
        player.speed -= 0.2;
        if (player.speed < -4) player.speed = -4;
      } else if (ct.down) {
        player.speed += 0.2;
        if (player.speed > 4) player.speed = 4;
      } else {
        player.speed *= 0.98;
      }
      player.y += player.speed;
    },
  });

});
