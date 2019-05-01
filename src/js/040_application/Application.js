phina.namespace(function() {

  phina.define("Application", {
    superClass: "phina.display.CanvasApp",
  
    version: "0.7.002",
    quality: 1.0,
  
    webApi: null,
    mode: "default",

    isBusy: false,

    downloadImage: null,

    init: function() {
      this.superInit({
        fps: 30,
        width: SCREEN_WIDTH * this.quality,
        height: SCREEN_HEIGHT * this.quality,
        fit: true,
      });
  
      this.setupMouseWheel();

      //シーンの幅、高さの基本を設定
      phina.display.DisplayScene.defaults.$extend({
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
      });
  
      phina.input.Input.quality = this.quality;
      phina.display.DisplayScene.quality = this.quality;

      this.assetLoader = phina.extension.SerialAssetLoader();
      this.webApi = WebApi({ app: phina_app });
  
      this.replaceScene(FirstSceneFlow({}));
  
      this.setupEvents();
      this.setupSound();
      this.setupFontAttribute();

      //ダウンロードした画像キー配列
      this.downloadImage = [];
  
      this.on("changescene", () => {
        //シーンを離れる際、ボタン同時押しフラグを解除する
        Button.actionTarget = null;
        this.downloadImage.forEach(name => {
          const img = AssetManager.get("image", name);
          if (img) {
            img["domElement"].width = 0;
            img["domElement"].height = 0;
            delete img["domElement"];
            delete AssetManager.assets["image"][name];
          }
        });
        this.downloadImage = [];
      });
  
      console.log(window.debugApp = this);
    },
  
    //マウスのホールイベント関連
    setupMouseWheel: function() {
      this.wheelDeltaY = 0;
      this.domElement.addEventListener("mousewheel", function(e) {
        e.stopPropagation();
        e.preventDefault();
        this.wheelDeltaY = e.deltaY;
      }.bind(this), false);
  
      this.on("enterframe", function() {
        this.pointer.wheelDeltaY = this.wheelDeltaY;
        this.wheelDeltaY = 0;
      });
    },

    //アプリケーション全体のイベントフック
    setupEvents: function() {},
  
    setupSound: function() {},
    
    setupFontAttribute: function() {
      phina.display.Label.defaults.$extend({
        fontFamily: "Main-Regular"
      });
    },

    //認証ユーザーデータ最新取得
    updateUserData: function() {
      return new Promise(resolve => {
        let user = null;
        phina_app.webApi.get("user", {}, { isMock: false })
          .then(response => {
            console.log(response);
            user = response.result;
          })
          .then(() => phina_app.webApi.get(`user/${user.staff_code}/sales/result`, {}, { isMock: false }))
          .then(response => resolve({ user, sales: response.result }))
      })
      .then(data => {
        UserData.result = data.user;
        this.userData = data.user;
        this.userSales = data.sales;
      });
    },

    //サーバーから直列でアセットを読み込み
    downloadFromServer: function (requestUrl) {
      if (!requestUrl) {
        console.log("download request error: " + requestUrl);
        return Promise.resolve();
      }

      return new Promise(resolve => {
        const url = encodeURI(requestUrl);
        const tmp = url.split("/");
        const filename = tmp[tmp.length - 1];
        const filePath = `${app.rootDir}server_images/${filename}`;

        const fileTransfer = new FileTransfer();
        fileTransfer.download(url, filePath,
          entry => {
            // alert('success: ' + filePath);
            const assets = {
              image: {},
            };
            assets.image[requestUrl] = filePath;
            this.assetLoader.load(assets, () => {
              //ダウンロードしたイメージリストに追加
              this.downloadImage.push(requestUrl);
              resolve();
            });
          },
          error => {
            // alert('error: ' + error.code);
            resolve();
          });
      });
    },
  });
  
});