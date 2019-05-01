/*
 *  phina.SerialAssetLoader.js
 *  2019/02/21
 *  @auther minimo  
 *  This Program is MIT license.
 *
 */

phina.extension = phina.extension || {};

phina.namespace(function() {

  //バックグラウンドでアセットを直列に読み込み
  phina.define("phina.extension.SerialAssetLoader", {
    superClass: "phina.util.EventDispatcher",

    //ロードするアセットのリスト
    loadList: null,

    //ロード中アセット
    loadingAsset: null,

    init: function() {
      this.superInit();

      this.loadList = [];
      this._surveillance();
    },

    //読み込み待機リスト監視
    _surveillance: function() {
      setTimeout(this._surveillance.bind(this), 100);
      if (this.loadingAsset || this.loadList.length == 0) return;

      this.loadingAsset = this.loadList.shift();
      const assets = this.loadingAsset.assets;
      const callback = this.loadingAsset.callback;

      var loader = phina.asset.AssetLoader();
      loader.load(assets);
      loader.on('load', (e) => {
        this.loadingAsset = null;
        if (callback) {
          callback(assets);
        }
        console.log("**** Serial load finish: ". assets);
      });
    },

    load: function(assets, callback) {
      callback = callback || function() {};

      //ロード済みのアセットを除外する
      const loadAssets = this.yetLoadedAssets(assets);
      if (!loadAssets) {
        return this;
      }

      const element = {
        assets: loadAssets,
        callback,
      };
      this.loadList.push(element);
      console.log("**** Serial load: ". loadAssets);
    },

    //パラメータの中で読み込みをしていないアセットを返す
    yetLoadedAssets: function(params) {
      if (!params) return null;

      const yet = {};
      params.forIn((type, assets) => {
        assets.forIn((key, value) => {
          if (!phina.asset.AssetManager.get(type, key)) {
            yet[type] = yet[type] || {};
            yet[type][key] = value;
          }
        });
      });
      return (Object.keys(yet).length > 0) ? yet : null;
    }
  });

});
