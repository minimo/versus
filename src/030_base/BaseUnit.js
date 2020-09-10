phina.namespace(function() {

  phina.define('BaseUnit', {
    superClass: 'DisplayElement',

    _static: {
      defaultOptions: {
        world: null,
      },
    },

    state: null,
    velocity: null,
    speed: 0,

    sprite: null,

    hp: 100,

    init: function(options) {
      this.superInit(options);
      this.world = options.world || null;
      this.base = DisplayElement().addChildTo(this);

      this.before = null;

      this.velocity = Vector2(0, 0);
    },
  });

});
