/*
 *  AssetLoadScene.js
 */

phina.namespace(function() {

  phina.define('AssetLoadScene', {
    superClass: 'BaseScene',

    init: function(options) {
      this.superInit();
      options = (options || {}).$safe({
        assetType: "preload",
      });

      // load asset
      const assets = AssetList.get(options.assetType);
      if (!assets) {
        console.log("Unable asset load: " + options.assetType);
        this.exit();
      }
      this.loader = phina.asset.AssetLoader();
      this.loader.load(assets);
      this.loader.on('load', () => this.exit());
    },
  });

});
