/*
 *  AssetList.js
 */

phina.namespace(function() {

  phina.define("AssetList", {
    _static: {
      loaded: [],
      isLoaded: function(assetType) {
        return AssetList.loaded[assetType]? true: false;
      },
      get: function(assetType) {
        AssetList.loaded[assetType] = true;
        switch (assetType) {
          case "preload":
            return {
              image: {
                "black": "assets/textures/common/black.png",
              },
              layout: {
              },
              // font: {
              //   "Main-Bold": "assets/fonts/SourceHanSansJP-Bold.otf",
              //   "Main-Regular": "assets/fonts/SourceHanSansJP-Regular.otf",
              // },
            };
            case "common":
            return {
              image: {
              },
            };

          default:
            throw "invalid assetType: " + options.assetType;
        }
      },
    },
  });

});
