/*
 *  TitleScene.js
 */

phina.namespace(function() {

  phina.define('TitleScene', {
    superClass: 'BaseScene',

    init: function(options) {
      this.superInit();
    },

    setup: function() {
      this.base = DisplayElement().addChildTo(this).setPosition(SCREEN_OFFSET_X, SCREEN_OFFSET_Y);

      Sprite("black")
        .setPosition(this.gridX.center(), this.gridY.center())
        .addChildTo(this.base)

      Label({
        text: "Versus",
      })
        .setPosition(this.gridX.center(), this.gridY.center())
        .addChildTo(this.base)
  },

    update: function() {
    },
  });

});
