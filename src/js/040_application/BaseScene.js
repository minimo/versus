/*
 *  MainScene.js
 *  2018/10/26
 */

phina.namespace(function() {

  phina.define("BaseScene", {
    superClass: 'DisplayScene',

    //廃棄エレメント
    disposeElements: null,

    init: function(options) {
      options = (options || {}).$safe({
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: 'transparent',
      });
      this.superInit(options);

      //シーン離脱時canvasメモリ解放
      this.disposeElements = [];
      this.one('destroy', () => {
        this.disposeElements.forEach(e => e.destroyCanvas());
      });

      this.app = phina_app;

      this.one('enterframe', e => {
        this.app = e.app;
        //別シーンへの移行時にキャンバスを破棄
        this.one('exit', () => {
          this.destroy();
          this.canvas.destroy();
          this.flare('destroy');
          console.log("Exit scene.");
        });
      });
    },

    destroy: function() {},

    fadeIn: function(options) {
      options = (options || {}).$safe({
        color: "white",
        millisecond: 500,
      });
      return new Promise(resolve => {
        const mask = RectangleShape({
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          fill: options.color,
          strokeWidth: 0,
        }).setPosition(SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.5).addChildTo(this);
        mask.tweener.clear()
          .fadeOut(options.millisecond)
          .call(() => {
            resolve();
            this.app.one('enterframe', () => mask.destroyCanvas());
          });
      });
    },

    fadeOut: function(options) {
      options = (options || {}).$safe({
        color: "white",
        millisecond: 500,
      });
      return new Promise(resolve => {
        const mask = RectangleShape({
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          fill: options.color,
          strokeWidth: 0,
        }).setPosition(SCREEN_WIDTH * 0.5, SCREEN_HEIGHT * 0.5).addChildTo(this);
        mask.alpha = 0;
        mask.tweener.clear()
          .fadeIn(options.millisecond)
          .call(() => {
            resolve();
            this.app.one('enterframe', () => mask.destroyCanvas());
          });
      });
    },

    //アセットをバックグラウンドで読み込み
    downloadAsset: function(assets) {
      if (!assets) return Promise.resolve();

      return new Promise(resolve => {
        const loader = phina.extension.AssetLoaderEx();
        loader.load(assets, this._onLoadAsset)
          .then(() => resolve());

        const loadLabel = Label({ text: "", align: "right", fontSize: 12, fill: "white", stroke: "black", strokeWidth: 3 })
            .addChildTo(this)
            .setPosition(SCREEN_WIDTH * 0.99, SCREEN_HEIGHT * 0.99);
        loadLabel.time = 1;
        loadLabel.isFinish = false;
        loadLabel.on('enterframe', () => {
          loadLabel.text = "Loading... " + Math.floor(loader.loadprogress * 100) + "%";
          if (loader.isLoadcomplete) {
            loadLabel.visible = false;
          } else {
            if (loadLabel.time % 20 == 0) loadLabel.visible = !loadLabel.visible;
          }
          loadLabel.time++;
        });
      });
    },

    _onLoadAsset: function(assets) {
      return Promise.resolve();
    },

    //シーン離脱時に破棄するShapeを登録
    dispose: function(element) {
      this.disposeElements.push(element);
    },
  });

});