phina.namespace(function() {

  phina.define("Dialog", {
    superClass: "Modal",

    _static: {
      openCount: 0,
    },

    //開始前に読み込みが必要なアセットリスト
    assetList: null,

    //廃棄エレメント
    disposeElements: null,

    init: function() {
      this.superInit();

      this.app = phina_app;

      this.background = Sprite("black")
        .addChildTo(this)
        .setPosition(SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.5)
      this.background.alpha = 0;

      this.layoutBase = DisplayElement({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT })
        .addChildTo(this)
        .setPosition(SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.5);

      this.disposeElements = [];
      this.on('closed', () => this.disposeElements.forEach(e => e.remove().destroyCanvas()));
    },

    //シーン離脱時に破棄するShapeを登録
    dispose: function(element) {
      this.disposeElements.push(element);
    },

    //===================================
    //表示
    open: function(scene, options) {
      options = options || {};

      this.parentScene = scene;
      Dialog.openCount++;
      if (options.isNothingBackground) {
        this.background.hide();
      }
      this.addChildTo(scene);
      this.downloadAsset(this.assetList)
        .then(() => {
          this.setup(options);
          this.openAnimation();
          if (StatusBar) {
            StatusBar.show();
            StatusBar.overlaysWebView(true);
            StatusBar.styleLightContent();
          }
        });
      return this;
    },

    //===================================
    //非表示
    close: function() {
      Dialog.openCount--;
      this.closeAnimation();
      return this;
    },

    //===================================
    //表示アニメーション
    openAnimation: function() {
      this.flare("openstart", { dialog: this });
      this.parentScene.flare("dialogopen", { dialog: this });
      return Promise.all([
        new Promise(resolve => {
          this.background.alpha = 0;
          this.background.tweener.clear()
            .fadeIn(250)
            .call(() => resolve());
        }),
        new Promise(resolve => {
          this.layoutBase.scaleX = 0.0;
          this.layoutBase.scaleY = 0.0;
          this.layoutBase.tweener.clear()
            .to({ scaleX: 1.0, scaleY: 1.0 }, 250, "easeInOutQuad")
            .call(() => {
              this.flare("opened", { dialog: this });
              this.parentScene.flare("dialogopened", { dialog: this });
              resolve();
            });
        })
      ]);
    },

    //===================================
    //非表示アニメーション
    closeAnimation: function() {
      this.flare("closestart", { dialog: this });
      this.parentScene.flare("dialogclose", { dialog: this });
      return Promise.all([
        new Promise(resolve => {
          this.background.alpha = 1;
          this.background.tweener.clear()
            .fadeOut(250)
            .call(() => resolve());
        }),
        new Promise(resolve => {
          this.layoutBase.scaleX = 1.0;
          this.layoutBase.scaleY = 1.0;
          this.layoutBase.tweener.clear()
            .to({ scaleX: 0.0, scaleY: 0.0 }, 250, "easeInOutQuad")
            .call(() => {
              this.flare("closed", { dialog: this });
              this.parentScene.flare("dialogclosed", { dialog: this });
              resolve();
            });
        })
      ]).then(() => {
        this.remove();
        if (this.layout) {
          this.layout.destroy();
          delete this.layout;
        }
        this.flare("destroy");
      });
    },

    //アセットをバックグラウンドで読み込み
    downloadAsset: function(assets) {
      if (!assets) return Promise.resolve();

      return new Promise(resolve => {
        const loader = phina.extension.AssetLoaderEx();
        loader.load(assets, this._onLoadAsset)
          .then(() => resolve());
      });
    },

    //APIからデータ取得
    getData: function(apiParam) {
      return new Promise(resolve => {
        resolve();
      });
    },
  });

});
