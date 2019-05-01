/*
 *  phina.assetloaderex.js
 *  2016/11/25
 *  @auther minimo  
 *  This Program is MIT license.
 *
 */

phina.extension = phina.extension || {};

phina.namespace(function() {

  //バックグラウンドでアセット読み込み
  phina.define("phina.extension.AssetLoaderEx", {
    superClass: "phina.util.EventDispatcher",

    //進捗
    loadprogress: 0,

    //読み込み終了フラグ
    isLoadcomplete: false,

    init: function() {
      this.superInit();
    },

    load: function(assets, callback) {
      this._onLoadAssets = callback || function() {};
      
      const loadAssets = this.yetLoadedAssets(assets);
      if (!loadAssets) {
        this.isLoadcomplete = true;
        this.loadprogress = 1;
        return Promise.resolve();
      }

      return new Promise(resolve => {
        var loader = phina.asset.AssetLoader();
        loader.load(loadAssets);
        loader.on('load', (e) => {
          this.flare('loadcomplete');
          this.isLoadcomplete = true;
          this._onLoadAssets(assets);
          resolve();
        });
        loader.on('progress', e => {
          this.loadprogress = e.progress;
          this.flare('progress', { progress: e.progress });
        });
      });
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