phina.namespace(function() {

  phina.define('Rock', {
    superClass: 'BaseUnit',

    init: function(options) {
      this.superInit(options.$safe({ width: 32, height: 32 }));
      this.sprite = Sprite("rock1", 80, 64).addChildTo(this.base);
    },

    update: function() {
    },

  });
});
