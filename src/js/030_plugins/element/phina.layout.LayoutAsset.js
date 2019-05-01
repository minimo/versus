phina.namespace(() => {

  const generateUUID = () => {
    let chars = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".split("");
    for (let i = 0, len = chars.length; i < len; i++) {
      switch (chars[i]) {
        case "x":
          chars[i] = Math.floor(Math.random() * 16).toString(16);
          break;
        case "y":
          chars[i] = (Math.floor(Math.random() * 4) + 8).toString(16);
          break;
      }
    }
    return chars.join("");
  };

  phina.define("phina.layout.LayoutAsset", {
    superClass: "phina.asset.File",

    id: null,
    atlas: null,
    textureIds: null,

    init: function() {
      this.superInit();
      this.id = generateUUID();
      this.textureIds = [];
    },

    build: function() {
      const root = phina.display.DisplayElement();
      root.ref = {};
      root.layoutAsset = this;

      root.fromJSON(this.data.root);

      const scanIds = (element) => {
        if (element.id) {
          root.ref[element.id] = element;
        }

        if (element.children) {
          element.children.forIn((key, child) => scanIds(child));
        }
      };
      scanIds(root);

      const traverse = (element) => {
        element.flare("ready");
        if (element.children) {
          element.children.forEach((child) => traverse(child));
        }
      }
      traverse(root);

      //生成レイアウトがremoveされた時に内容の破棄を行う
      const destroy = (child) => {
        if (!child) child = root;
        child.children.clone().forEach(c => {
          //ラベルで保持しているcanvasを破棄
          if (c instanceof Label) {
            c.destroyCanvas();
            c.remove();
          }
          root.destroy(c);
        });
      };
      root.destroy = destroy;

      return root;
    },

    release: function() {
      this.textureIds.forEach(id => {
        const canvas = phina.asset.AssetManager.assets["image"][id]["domElement"];
        canvas.width = 0;
        canvas.height = 0;
        delete phina.asset.AssetManager.assets["image"][id]["domElement"];
        delete phina.asset.AssetManager.assets["image"][id];
      });
      delete this.textureIds;
    },

    _load: function(resolve) {
      phina.util.Flow((resolve) => this.superMethod("_load", resolve))
        .then(() => {
          const json = JSON.parse(this.data);
          return phina.util.Flow.resolve(json);
        })
        .then((json) => this._loadAtlas(json))
        .then((json) => {
          this.data = json;
          resolve(this);
          //アトラスの参照削除
          const atlas = phina.asset.AssetManager.get("atlas", this.id);
          atlas.images.forIn((name) => {
            atlas.images[name].domElement.width = 0;
            atlas.images[name].domElement.height = 0;
            delete atlas.images[name].src;
            delete atlas.images[name].domElement;
          });
          delete json.atlases;
          delete atlas.images;
          delete phina.asset.AssetManager.assets["atlas"][this.id];
        });
    },

    _loadAtlas: function(json) {
      const atlas = phina.asset.Atlas();

      phina.asset.AssetManager.set("atlas", this.id, atlas);

      return phina.util.Flow((resolve) => {
        const flows = json.atlases.map((atlasData) => {
          const name = atlasData.atlas.meta.image;
          atlas.data = atlasData.atlas;
          atlas.images[name] = phina.asset.Texture();
          return atlas.images[name].load(atlasData.texture);
        });

        //アトラスが存在しない場合
        if(flows.length == 0) {
          resolve(json);
        } else {
          phina.util.Flow.all(flows)
            .then(() => {
              atlas._mergeData(json.atlases.map(_ => _.atlas));

              const unpackedTextures = atlas.unpackAll();
              unpackedTextures.forIn((name, tex) => {
                tex.id = generateUUID();
                phina.asset.AssetManager.set("image", tex.id, tex);
                this.textureIds.push(tex.id);
              });

              const scan = (element) => {
                if (element.className === "phina.display.AtlasSprite") {
                  element.arguments.atlas = this.id;
                } else if (element.className === "phina.display.Sprite") {
                  element.arguments[0] = unpackedTextures[element.arguments[0]].id;
                }

                if(element.accessories) {
                  //グレースケール用の画像が考慮されていなかったため取り急ぎ対応
                  const grayscale = element.accessories.Grayscale;
                  if(grayscale) {
                    grayscale.arguments.grayTextureName = unpackedTextures[grayscale.arguments.grayTextureName].id;
                  }
                }

                if (element.children) {
                  element.children.forIn((key, child) => scan(child));
                }
              };
              scan(json.root);

              resolve(json);
            });
        }
      });
    },

  });

  phina.asset.AssetLoader.assetLoadFunctions["layout"] = (key, path) => {
    const asset = phina.layout.LayoutAsset();
    const flow = asset.load(path);
    return flow;
  };

});