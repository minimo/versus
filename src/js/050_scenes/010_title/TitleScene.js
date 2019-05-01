/*
 *  TitleScene.js
 */

phina.namespace(function() {

  phina.define('TitleScene', {
    superClass: 'BaseScene',

    _static: {
      isAssetLoad: false,
    },

    init: function(options) {
      this.superInit();

      this.unlock = false;
      this.loadcomplete = false;
      this.progress = 0;

      //ロード済みならアセットロードをしない
      if (TitleScene.isAssetLoad) {
        this.setup();
      } else {
        //preload asset
        const assets = AssetList.get("preload")
        this.loader = phina.asset.AssetLoader();
        this.loader.load(assets);
        this.loader.on('load', () => this.setup());
        TitleScene.isAssetLoad = true;
      }
    },

    setup: function() {
      this.base = DisplayElement().addChildTo(this).setPosition(SCREEN_OFFSET_X, SCREEN_OFFSET_Y);

      Sprite("bg")
        .setPosition(this.gridX.center(), this.gridY.center())
        .addChildTo(this.base)

      Sprite("logo")
        .setPosition(this.gridX.center(), this.gridY.center())
        .addChildTo(this.base)

      Sprite("copyright")
        .setPosition(this.gridX.center(), this.gridY.center(8) - 16)
        .addChildTo(this.base)

      const startButton = Sprite("startButton")
        .setPosition(this.gridX.center(), this.gridY.center(5))
        .addChildTo(this.base)

      startButton.button = Button().attachTo(startButton);
      startButton.on('clicked' ,() => {
        LoginDialog().open(this)
          .on('login', (e) => {
            this.exit('home');
          });
      });

      //時間差でDeviceReadyになる場合もあるのでもう一回念の為
      if (StatusBar) {
        StatusBar.show();
        StatusBar.overlaysWebView(true);
        StatusBar.styleLightContent();
      }

      this.one('enterframe', (e) => {
        Label({ text: `v${e.app.version}`, fontSize: 16, align: "right" })
          .addChildTo(this.base)
          .setPosition(SCREEN_WIDTH, SCREEN_HEIGHT - 20);
      })

      // this.label = Label({ text: "x: " + window.innerWidth + " y: " + window.innerHeight })
      //   .addChildTo(this.base)
      //   .setPosition(SCREEN_WIDTH_HALF, 100);
    },

    update: function() {
    },
  });

});
