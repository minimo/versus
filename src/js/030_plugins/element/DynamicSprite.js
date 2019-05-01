phina.namespace(() => {

  phina.define("DynamicSprite", {
    superClass: "phina.display.Sprite",

    isLoaded: false,
    _dummy: null,

    init: function(image, width, height) {
      //指定されたイメージが既に読み込まれているかチェック
      if (typeof image === 'string') {
        const img = phina.asset.AssetManager.get('image', image);
        if (img) {
          //イメージ読み込み済
          this.isLoaded = true;
          this.superInit(img, width, height);
        } else {
          //諸々困るので一旦初期化だけしておく
          this.superInit(null, width, height);
          this.one("enterframe", (e) => {
            this.app = e.app;
            this.dynamicLoad(image, width, height);
          });
        }
      } else {
        //イメージ直渡し
        this.isLoaded = true;
        this.superInit(image, width, height);
      }
    },

    //動的に読み込みを行う
    dynamicLoad: function(image, width, height) {
      this.isLoaded = false;
      //ローカル版
      const assets = { image: {} };
      assets.image[image] = image;
      this.app.assetLoader.load(assets, () => {
        this.isLoaded = true;
        const texture = phina.asset.AssetManager.get("image", image);
        this.setImage(texture, width, height);
        if (this._dummy) {
          this._dummy.remove();
          this._dummy = null;
        }
      });

      //cordova-file-transfre版
      this.app.downloadFromServer(image)
        .then(() => {
          this.isLoaded = true;
          const texture = phina.asset.AssetManager.get("image", image);
          this.setImage(texture, width, height);
          if (this._dummy) {
            this._dummy.remove();
            this._dummy = null;
          }
        });
    },

    draw: function(canvas) {
      if (!this.isLoaded || !this.image) return;

      var image = this.image.domElement;
      var srcRect = this.srcRect;
      canvas.context.drawImage(image,
        srcRect.x, srcRect.y, srcRect.width, srcRect.height,
        -this._width * this.originX, -this._height * this.originY, this._width, this._height
        );
    },

    setImage: function(image, width, height) {
      if (!this.isLoaded || !image) return this;

      if (typeof image === 'string') {
        image = phina.asset.AssetManager.get('image', image);
      }
      this._image = image;
      this.width = this._image.domElement.width;
      this.height = this._image.domElement.height;

      if (width) { this.width = width; }
      if (height) { this.height = height; }

      this.frameIndex = 0;

      return this;
    },

    setDummyImage: function(image, width, height, updateFunction) {
      if (this.isLoaded) return;
      this._dummy = Sprite(image, width, height).addChildTo(this);
      if (updateFunction) {
        this._dummy.update = updateFunction;
      }
      return this;
    },
  });

});
