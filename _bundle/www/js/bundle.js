/*
 *  main.js
 */

phina.globalize();

const FULL_WIDTH = 1334;
const FULL_HEIGHT = 750;
const FULL_WIDTH_HALF = FULL_WIDTH * 0.5;
const FULL_HEIGHT_HALF = FULL_HEIGHT * 0.5;

const LAYOUT_WIDTH = 1334;
const LAYOUT_HEIGHT = 750;

const SCREEN_WIDTH = LAYOUT_WIDTH;
const SCREEN_HEIGHT = LAYOUT_HEIGHT;
const SCREEN_WIDTH_HALF = SCREEN_WIDTH * 0.5;
const SCREEN_HEIGHT_HALF = SCREEN_HEIGHT * 0.5;

const SCREEN_OFFSET_X = 0;
const SCREEN_OFFSET_Y = 0;

let phina_app;

window.onload = function() {
  phina_app = Application();
  phina_app.run();
};

//スクロール禁止
// document.addEventListener('touchmove', function(e) {
//  e.preventDefault();
// }, { passive: false });

/*
 *  TitleScene.js
 */

phina.namespace(function() {

  phina.define('CameraPlugin', {

    _static: {
      open: function (type) {
        if (type !== Camera.PictureSourceType.CAMERA && type !== Camera.PictureSourceType.PHOTOLIBRARY) {
          type = Camera.PictureSourceType.CAMERA;
        }

        return new Promise(resolve => {
          navigator.camera.getPicture(
            imageDataURI => {
              console.log("camera success: " + imageDataURI);
              resolve({
                isSuccess: true,
                imageDataURI,
              })
            },
            message => {
              console.log("camera error: " + message);
              resolve({
                isSuccess: false,
                message,
              })
            },
            {
              quality: 100,
              destinationType: Camera.DestinationType.FILE_URI,
              saveToPhotoAlbum: false,
              cameraDirection: Camera.Direction.FRONT,
              sourceType: type,
              correctOrientation: true,
            });
        });
      },
    },
  });

});

phina.namespace(function() {

  phina.graphics.Canvas.prototype.$method("init", function(canvas) {
    this.isCreateCanvas = false;
    if (typeof canvas === 'string') {
      this.canvas = document.querySelector(canvas);
    } else {
      if (canvas) {
        this.canvas = canvas;
      } else {
        this.canvas = document.createElement('canvas');
        this.isCreateCanvas = true;
      }
    }

    this.domElement = this.canvas;
    this.context = this.canvas.getContext('2d');
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
  });

  phina.graphics.Canvas.prototype.$method('destroy', function(canvas) {
    if (!this.isCreateCanvas) return;
    console.log(`#### delete canvas ${this.canvas.width} x ${this.canvas.height} ####`);
    this.setSize(0, 0);
    delete this.canvas;
    delete this.domElement;
  });

});

phina.namespace(function() {

  phina.display.DisplayElement.prototype.$method("setAlpha", function(a) {
    this.alpha = a;
    return this;
  });

});

phina.namespace(function() {

  phina.display.PlainElement.prototype.$method("destroyCanvas", function() {
    this.remove();
    if (!this.canvas) return;
    this.canvas.destroy();
    delete this.canvas;
  });

});

phina.namespace(function() {

  phina.asset.Texture.prototype.$method("_load", function(resolve) {
    this.domElement = new Image();

    var isLocal = (location.protocol == 'file:');
    if (!(/^data:/.test(this.src))) {
      this.domElement.crossOrigin = 'anonymous'; // クロスオリジン解除
    }

    var self = this;
    this.domElement.onload = function(e) {
      self.loaded = true;
      e.target.onload = null;
      e.target.onerror = null;
      resolve(self);
    };

    this.domElement.onerror = function(e) {
      e.target.onload = null;
      e.target.onerror = null;
      console.error("phina.asset.Texture _load onError ", this.src);
    };

    this.domElement.src = this.src;
  });

  phina.asset.Texture.prototype.$method('destroy', function(canvas) {
    console.log(`#### delete canvas ${this.domElement.width} x ${this.domElement.height} ####`);
    this.domElement.width = 0;
    this.domElement.height = 0;
    delete this.domElement;
  });

});

phina.namespace(function() {

  const API_URI = "https://cwcwdev02.pet-coo.jp/api/v1/"; //是枝さんサーバー
  // const API_URI = "https://cwcwdev01.pet-coo.jp/api/v1/"; //西岡さんサーバー

  const MOCK_URI = "http://ue.pease.jp/fujimotodev01/api/v1/"; //テスト用モックサーバー

  // const API_URI = "http://52.10.247.158/api/"; //Bright案件サーバー（外部接続確認用）
  
  phina.define("WebApi", {
    superClass: "EventDispatcher",
    init: function() {
      this.superInit();
    },

    request: function(requestType, apiName, params, options) {
      options = (options || {}).$safe({
        ignoreErrorCode: [],
        auth: true, //認証必要かフラグ
        isFormData: false,  //pramasがFormDataかフラグ
        isBackground: false, //通信中に入力を受け付けるか(trueで受け付ける)
      });

      //デバッグ用強制APIモック使用
      if (API_MOCK_FORSE) options.isMock = true;

      if (options.isMock) {
        //TODO swaggerへのリバースプロキシ接続が出来たら書き換える
        return new Promise(resolve => {
          const param = this.encodeHTMLForm(params);
          console.log(`API CALL : ${requestType} ${apiName} ${param}`);
          const result = WebApiMock[apiName] || { stasus: "mock error.", result: {} };
          resolve(result);
        });
      }

      const cover = InputIntercept().addChildTo(phina_app.currentScene);
      if (options.isBackground) {
        cover.disable();
      } else {
        //通信が終わるまで操作をさせない様にする
        cover.enable();
      }

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (!options.isBackground) cover.disable();
            if ([200, 201, 0].indexOf(xhr.status) !== -1 || options.ignoreErrorCode.indexOf(xhr.status) !== -1) {
              const response = JSON.parse(xhr.response);
              if (response.status == "success") {
                resolve(response);
              } else {
                resolve(response);
              }
            } else {
              const options = {
                status: "error",
                code: xhr.status,
                result: xhr.response,
                api: apiName,
              };
              reject(options);
              //エラーメッセージシーンへ強制遷移
              phina_app.currentScene.flare("apierror", { options });
            }
          }
        };

        //GETの場合、クエリパラメータをurlに付ける
        let url = API_URI + apiName;
        if (requestType == "GET") {
          const param = this.encodeHTMLForm(params);
          if (param && param != "") url += "?" + param;
        }
        xhr.open(requestType, url);

        //POSTの場合、ヘッダを付加する
        if (requestType == "POST") {
          if (options.isFormData) {
            //フォーム送信の場合はヘッダをつけない
          } else {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
          }
        }

        //認証データをヘッダに付加
        if (options.auth) {
          const token = UserData.token;
          const authString = `${token.token_type} ${token.access_token}`;
          xhr.setRequestHeader('Authorization', authString);
          // xhr.withCredentials = true;  //不要の可能性がある
        }

        if (options.isFormData) {
          xhr.send(params);
        } else {
          if (requestType == "POST") {
            const param_string = this.encodeHTMLForm(params)
            xhr.send(param_string);
          } else {
            xhr.send();
          }
        }
      });
    },

    get: function(apiName, params, options) {
      return this.request("GET", apiName, params, options);
    },

    post: function(apiName, params, options) {
      return this.request("POST", apiName, params, options);
    },

    // HTMLフォームの形式にデータを変換する
    encodeHTMLForm: function(data) {
      const params = [];
      if (!data) return null;
      for (let name in data) {
        let param = encodeURIComponent(name) + '=' + encodeURIComponent(data[name]);
        params.push(param);
      }
      return params.join('&').replace(/%20/g, '+');
    },

  });

});

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
/*
 *  FirstSceneFlow.js
 */

phina.namespace(function() {

  phina.define("FirstSceneFlow", {
    superClass: "ManagerScene",

    init: function(options) {
      options = options || {};
      startLabel = options.startLabel || "title";
      this.superInit({
        startLabel: startLabel,
        scenes: [
          {
            label: "title",
            className: "TitleScene",
            nextLabel: "home",
          },
          {
            label: "home",
            className: "HomeScene",
          },
          {
            label: "editpicture",
            className: "EditPictureScene",
            nextLabel: "home",
          },
          {
            label: "realtimesales",
            className: "RealtimeSalesScene",
            nextLabel: "home",
          },
          {
            label: "staffinformation",
            className: "StaffInformationScene",
            nextLabel: "home",
          },
          {
            label: "ranking",
            className: "RankingScene",
            nextLabel: "home",
          },
          {
            label: "detaildata",
            className: "DetailDataScene",
            nextLabel: "home",
          },
          {
            label: "error",
            className: "ErrorMessageScene",
            nextLabel: "home",
          },
        ],
      });
    }
  });

});
//文字列を指定した長さごとに改行を入れる
function CutText(srcText, between) {
  between = between || 20;

  function splitByLength(str, length) {
    if (!str || !length || length < 1) return [];
    var regexPattern = new RegExp('(?:[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\uD800-\uDFFF]){1,' + length + '}','g');
    return str.match(regexPattern) || [];
  }

  let destText = "";
  const list = srcText.split('\n');
  list.forEach(text => {
    const line = splitByLength(text, between);
    line.forEach(t => destText += t + "\n");
  });
  return destText;
}

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
phina.define("Button", {
  superClass: "Accessory",

  lognpressTime: 500,
  doLongpress: false,

  //長押しで連打モード
  longpressBarrage: false,

  init: function() {
    this.superInit();

    this.on("attached", () => {
      this.target.interactive = true;
      this.target.clickSound = Button.defaults.clickSound;

      //ボタン押し時用
      this.target.scaleTweener = Tweener().attachTo(this.target);

      //長押し用
      this.target.twLongpress = Tweener().attachTo(this.target);

      //長押し中特殊対応用
      this.target.twLongpressing = Tweener().attachTo(this.target);

      this.target.on("pointstart", (e) => {

        //イベント貫通にしておく
        e.pass = true;

        //ボタンの同時押しを制限
        if (Button.actionTarget !== null) return;

        //リストビューの子供だった場合はviewportとのあたり判定をする
        const listView = Button.findListView(e.target);
        if (listView && !listView.viewport.hitTest(e.pointer.x, e.pointer.y)) return;

        if (listView) {
          //ポインタが移動した場合は長押しキャンセル（listView内版）
          listView.inner.$watch('y', (v1, v2) => {
            if (this.target !== Button.actionTarget) return;
            if (Math.abs(v1 - v2) < 10) return;

            Button.actionTarget = null;
            this.target.twLongpress.clear();
            this.target.scaleTweener.clear().to({ scaleX: 1.0 * this.sx, scaleY: 1.0 * this.sy }, 50);
            // if (this.target.twLongpress.playing && v1 != v2) {
            //   Button.actionTarget = null;
            //   this.target.twLongpress.clear();
            // }
          });
        }

        //ボタンの処理を実行しても問題ない場合のみ貫通を停止する
        e.pass = false;
        Button.actionTarget = this.target;

        //反転しているボタン用に保持する
        this.sx = (this.target.scaleX > 0) ? 1 : -1;
        this.sy = (this.target.scaleY > 0) ? 1 : -1;

        this.target.scaleTweener.clear()
          .to({ scaleX: 0.8 * this.sx, scaleY: 0.8 * this.sy }, 50);

        this.doLongpress = false;
        this.target.twLongpress.clear()
          .wait(this.lognpressTime)
          .call(() => {
            if (!this.longpressBarrage) {
              Button.actionTarget = null;
              this.target.scaleTweener.clear()
                .to({ scaleX: 1.0 * this.sx, scaleY: 1.0 * this.sy }, 50)
              this.target.flare("longpress")
            } else {
              this.target.flare("clickSound");
              this.target.twLongpressing.clear()
                .wait(5)
                .call(() => {
                  this.target.flare("clicked", { longpress: true });
                  this.target.flare("longpressing");
                })
                .setLoop(true);
            }
          });
      });

      this.target.on("pointend", (e) => {
        //イベント貫通にしておく
        e.pass = true;

        //
        this.target.twLongpress.clear();
        this.target.twLongpressing.clear();

        //ターゲットがnullかpointstartで保持したターゲットと違う場合はスルーする
        if (Button.actionTarget === null) return;
        if (Button.actionTarget !== this.target) return;

        //ボタンの処理を実行しても問題ない場合のみ貫通を停止する
        e.pass = false;

        //押した位置からある程度移動している場合はクリックイベントを発生させない
        const isMove = e.pointer.startPosition.sub(e.pointer.position).length() > 50;
        const hitTest = this.target.hitTest(e.pointer.x, e.pointer.y);
        if (hitTest && !isMove) this.target.flare("clickSound");

        this.target.scaleTweener.clear()
          .to({ scaleX: 1.0 * this.sx, scaleY: 1.0 * this.sy }, 50)
          .call(() => {
            Button.actionTarget = null;
            if (!hitTest || isMove || this.doLongpress) return;
            this.target.flare("clicked", { pointer: e.pointer });
          });
      });

      //アニメーションの最中に削除された場合に備えてremovedイベント時にフラグを元に戻しておく
      this.target.one("removed", () => {
        if (Button.actionTarget === this.target) {
          Button.actionTarget = null;
        }
      });

      this.target.on("clickSound", () => {
        // if (!this.target.clickSound || this.target.clickSound == "") return;
        // phina.asset.SoundManager.play(this.target.clickSound);
      });
    });
  },

  //長押しの強制キャンセル
  longpressCancel: function() {
    this.target.twLongpress.clear();
    this.target.twLongpressing.clear();
  },

  _static: {
    //ボタン同時押しを制御するためにstatusはstaticにする
    status: 0,
    actionTarget: null,
    //基本設定
    defaults: {
      clickSound: "se_click", //TODO:とりあえず無音
    },

    //ListViewを親をたどって探す
    findListView: function(element, p) {
      //リストビューを持っている場合
      if (element.ListView != null) return element.ListView;
      //親がなければ終了
      if (element.parent == null) return null;
      //親をたどる
      return this.findListView(element.parent);
    }

  }

});

phina.define("Gauge", {
  superClass: "RectangleClip",

  _min: 0,
  _max: 1.0,
  _value: 1.0, //min ~ max

  direction: "horizontal", // horizontal or vertical

  init: function() {
    this.superInit();
    this.on("attached", () => {
      this._width = this.width;
      this._height = this.width;

      this.target.accessor("Gauge.min", {
        "get": () => this.min,
        "set": (v) => this.min = v,
      });

      this.target.accessor("Gauge.max", {
        "get": () => this.max,
        "set": (v) => this.max = v,
      });

      this.target.accessor("Gauge.value", {
        "get": () => this.value,
        "set": (v) => this.value = v,
      });

      this.target.accessor("Gauge.progress", {
        "get": () => this.progress,
        "set": (v) => this.progress = v,
      });
    });
  },

  _refresh: function() {
    if (this.direction !== "vertical") {
      this.width = this.target.width * this.progress;
      this.height = this.target.height;
    } else {
      this.width = this.target.width;
      this.height = this.target.height * this.progress;
    }
  },

  _accessor: {
    progress: {
      get: function() {
        const p = (this.value - this.min) / (this.max - this.min);
        return (isNaN(p)) ? 0.0 : p;
      },
      set: function(v) { this.value = this.max * v; }
    },

    max: {
      get: function() { return this._max; },
      set: function(v) {
        this._max = v;
        this._refresh();
      }
    },

    min: {
      get: function() { return this._min; },
      set: function(v) {
        this._min = v;
        this._refresh();
      }
    },

    value: {
      get: function() { return this._value; },
      set: function(v) {
        this._value = v;
        this._refresh();
      }
    },
  }

});

phina.define("Grayscale", {
  superClass: "Accessory",

  grayTextureName: null,

  init: function(options) {
    this.superInit();
    this.on("attached", () => {
      this.grayTextureName = options.grayTextureName;
      this.normal = this.target.image;
    });
  },

  toGrayscale: function() {
    this.target.image = this.grayTextureName;
  },

  toNormal: function() {
    this.target.image = this.normal;
  },

});

phina.namespace(() => {

  phina.define("ListView", {
    superClass: "Accessory",

    scrollType: null,

    items: null,

    getViewId: null, // itemから対応するviewのJSONを選別 (item) => json
    bind: null, // itemの情報をviewに反映 (view, item, listView) => void,

    viewJSONs: null,

    scrollBar: null,
    scrollBarHandle: null,
    viewport: null,
    inner: null,

    scroll: 0,
    scrollLock: false,

    viewHeight: 1,

    init: function(options) {
      this.superInit(options);

      options = ({}).$safe(options, ListView.defaults);

      this.items = [];

      this.getViewId = (item) => null;
      this.bind = (view, item, listView) => {};

      this.itemMarginLeft = options.itemMarginLeft;
      this.itemMarginTop = options.itemMarginTop;

      this.on("attached", () => {
        this.target.one("ready", () => {
          this.setup(options)
        });
        // if (this.target.parent) {
        //   this.setup(options);
        // } else {
        //   this.target.one("added", () => {
        //     this.setup(options);
        //   });
        // }
      });
    },

    setup: function(options) {
      const findLayoutRoot = (element) => {
        if (element.layoutAsset) {
          return element;
        } else if (element.parent) {
          return findLayoutRoot(element.parent);
        } else {
          return null;
        }
      };

      const layoutRoot = findLayoutRoot(this.target);
      const asset = layoutRoot.layoutAsset;

      this.scrollType = options.scrollType;

      this.viewport = this._createViewport(options).addChildTo(this.target);
      this.inner = this._createInner(options, this.viewport).addChildTo(this.viewport);
      this.front = this._createFront(options, this.viewport, this.inner).addChildTo(this.target);
      this._setupScrollBar(options, this.viewport, this.inner);

      this._setupWheelControl(options, this.viewport, this.inner, this.front);
      this._setupTouchControl(options, this.viewport, this.inner, this.front);

      const findById = (id, element) => {
        if (element.id === id) {
          return element;
        } else {
          const children = Object.keys(element.children || {}).map(key => element.children[key]);
          for (let i = 0; i < children.length; i++) {
            const hit = findById(id, children[i]);
            if (hit) return hit;
          }
          return null;
        }
      };
      const viewIds = options.item.split(",").map(_ => _.trim());
      this.viewJSONs = viewIds
        .map(id => findById(id, asset.data.root))
        .reduce((obj, view) => {
          obj[view.id] = view;
          return obj;
        }, {});
      this.getViewId = (item) => viewIds[0];

      // 実体化されたビューを一旦削除する
      viewIds.forEach(id => layoutRoot.ref[id].remove());

      this.scrollBar = layoutRoot.ref[options.scrollBar];
      this.scrollBarHandle = layoutRoot.ref[options.scrollBarHandle];

    },

    _createViewport: function(options) {
      const viewport = DisplayElement();

      viewport.x = options.scrollRect.x;
      viewport.y = options.scrollRect.y;
      viewport.width = options.scrollRect.width;
      viewport.height = options.scrollRect.height;
      viewport.clip = (canvas) => {
        const w = viewport.width;
        const h = viewport.height;

        const ctx = canvas.context;
        ctx.beginPath();
        ctx.moveTo(w * -0.5, h * -0.5);
        ctx.lineTo(w * +0.5, h * -0.5);
        ctx.lineTo(w * +0.5, h * +0.5);
        ctx.lineTo(w * -0.5, h * +0.5);
        ctx.closePath();
      };

      return viewport;
    },

    _createInner: function(options, viewport) {
      if (options.inner) {
        // TODO
      } else {
        const inner = DisplayElement();

        inner.x = -viewport.width * viewport.originX;
        inner.y = -viewport.height * viewport.originY;
        inner.originX = 0;
        inner.originY = 0;

        return inner;
      }
    },

    _createFront: function(options, viewport, inner) {
      const front = DisplayElement();

      front.x = options.scrollRect.x;
      front.y = options.scrollRect.y;
      front.width = options.scrollRect.width;
      front.height = options.scrollRect.height;
      front.interactive = true;

      return front;
    },

    _setupScrollBar: function(options, viewport, inner) {
      this.target.on("enterframe", () => {
        if (!this.scrollBar && !this.scrollBarHandle) return;

        if (this.scrollType !== "horizontal") {
          const top = viewport.height * -viewport.originY;
          const bottom = viewport.height * (1 - viewport.originY);
          const scrollMin = top;
          const scrollMax = bottom - inner.height;
          const scrollValue = Math.clamp((inner.top - scrollMin) / (scrollMax - scrollMin), 0, 1);

          const yMin = this.scrollBar.height * -this.scrollBar.originY + this.scrollBarHandle.height * this.scrollBarHandle.originY + this.scrollBar.y;
          const yMax = this.scrollBar.height * (1 - this.scrollBar.originY) - this.scrollBarHandle.height * (1 - this.scrollBarHandle.originY) + this.scrollBar.y;
          if (inner.height <= viewport.height) {
            this.scrollBarHandle.y = yMin;
          } else {
            this.scrollBarHandle.y = yMin + (yMax - yMin) * scrollValue;
          }
        } else {
          const left = viewport.width * -viewport.originY;
          const right = viewport.height * (1 - viewport.originY);
          const scrollMin = left;
          const scrollMax = right - inner.height;
          const scrollValue = Math.clamp((inner.left - scrollMin) / (scrollMax - scrollMin), 0, 1);

          const yMin = this.scrollBar.height * -this.scrollBar.originY + this.scrollBarHandle.height * this.scrollBarHandle.originY + this.scrollBar.y;
          const yMax = this.scrollBar.height * (1 - this.scrollBar.originY) - this.scrollBarHandle.height * (1 - this.scrollBarHandle.originY) + this.scrollBar.y;
          if (inner.height <= viewport.height) {
            this.scrollBarHandle.y = yMin;
          } else {
            this.scrollBarHandle.y = yMin + (yMax - yMin) * scrollValue;
          }
        }
      });
    },

    _setupWheelControl: function(options, viewport, inner, front) {
      if (this.scrollType !== "horizontal") {
        this.target.on("enterframe", (e) => {
          if (inner.height <= viewport.height) return;
          if (this.scrollLock) return;

          const p = e.app.pointer;
          const delta = p.wheelDeltaY;
          if (delta && front.hitTest(p.x, p.y)) {
            this.scroll += delta / inner.height * 0.8;
          }
        });
      } else {
        this.target.on("enterframe", (e) => {
          if (inner.width <= viewport.width) return;
          if (this.scrollLock) return;

          const p = e.app.pointer;
          const delta = p.wheelDeltaY;
          if (delta && front.hitTest(p.x, p.y)) {
            this.scroll += delta / inner.width * 0.8;
          }
        });
      }
    },

    _setupTouchControl: function(options, viewport, inner, front) {
      const tweener = Tweener().attachTo(inner);
      const velocity = Vector2(0, 0);

      let dragging = false;
      front.on('pointstart', (e) => {
        e.pass = true;

        if (inner.height <= viewport.height) return;

        dragging = true;
        velocity.set(0, 0);
        tweener.stop();
      });
      front.on('pointstay', (e) => {
        if (!dragging) return;
        velocity.set(e.pointer.dx, e.pointer.dy);

        if (this.scrollType !== "horizontal") {
          const top = -viewport.height * viewport.originY;
          const bottom = viewport.height * (1 - viewport.originY);
          let overdistance = 0;
          if (top < inner.top) {
            overdistance = top - inner.top;
          } else if (inner.top < bottom - inner.height) {
            overdistance = inner.top - (bottom - inner.height);
          }
          velocity.mul(1.0 - Math.abs(overdistance) / 200);
        } else {
          const left = -viewport.width * viewport.originY;
          const right = viewport.width * (1 - viewport.originY);
          let overdistance = 0;
          if (left < inner.left) {
            overdistance = left - inner.left;
          } else if (inner.left < right - inner.width) {
            overdistance = inner.left - (right - inner.width);
          }
          velocity.mul(1.0 - Math.abs(overdistance) / 200);
        }
      });
      front.on('pointend', (e) => {
        e.pass = true;
        e.velocity = velocity;
        dragging = false;
      });

      this.on("viewstop", (e) => {
        velocity.set(0, 0);
      });

      this.target.on("enterframe", (e) => {
        if (this.scrollType !== "horizontal") {
          if (inner.height <= viewport.height) return;
          inner.top += velocity.y;
        } else {
          if (inner.width <= viewport.width) return;
          inner.left += velocity.x;
        }

        if (dragging) return;

        if (!tweener.playing) {
          velocity.mul(0.9);
          if (Math.abs(velocity.x) < 0.1 && Math.abs(velocity.y) < 0.1) {
            velocity.set(0, 0);
          }

          if (this.scrollType !== "horizontal") {
            const top = -viewport.height * viewport.originY;
            const bottom = viewport.height * (1 - viewport.originY);
            if (top < inner.top) {
              velocity.set(0, 0);
              tweener.clear().to({ y: top }, 100, "easeInQuad");
            } else if (inner.top < bottom - inner.height) {
              velocity.set(0, 0);
              tweener.clear().to({ y: bottom - inner.height }, 100, "easeInQuad");
            } else {
              tweener.stop();
            }
          } else {
            const left = -viewport.height * viewport.originY;
            const right = viewport.height * (1 - viewport.originY);
            if (left < inner.left) {
              velocity.set(0, 0);
              tweener.clear().to({ y: left }, 100, "easeInQuad");
            } else if (inner.left < right - inner.height) {
              velocity.set(0, 0);
              tweener.clear().to({ y: right - inner.height }, 100, "easeInQuad");
            } else {
              tweener.stop();
            }
          }
        }
      });
    },

    createView: function(item) {
      const viewJSON = this.viewJSONs[this.getViewId(item)];
      // console.log(viewJSON);
      this.inner.fromJSON({
        children: [viewJSON],
      });
      const view = this.inner.children.last;
      return view;
    },

    addItem: function(item) {
      this.items.push(item);
      return this;
    },

    addItems: function(items) {
      Array.prototype.push.apply(this.items, items);
      return this;
    },

    removeItem: function(item) {
      this.items.erase(item);
      return this;
    },

    clearItem: function() {
      this.items.clear();
      this.scroll = 0;
      this.flare('viewstop');
      return this;
    },

    invalidate: function() {
      this.inner.children.clone().forEach((child) => child.remove());

      let y = 0;
      let x = 0;

      this.inner.height = 1;

      this.items.forEach((item, index) => {
        const view = this.createView(item);
        view._listView = this;
        view._index = index;
        this.bind(view, item, this);
        this.viweHeight = view.height;

        if (this.scrollType !== "horizontal") {
          view.left = x + this.itemMarginLeft;
          view.top = y + this.itemMarginTop;

          if ((view.right + view.width + this.itemMarginLeft) < this.viewport.width) {
            x = view.right;
          } else {
            x = 0;
            y = view.bottom;
          }

          this.inner.height = Math.max(this.viewport.height, view.top + view.height + this.itemMarginTop);
        } else {
          // TODO
        }
      });

      //お試し実装
      if (this.updateFunc) this.target.off("enterframe", this.updateFunc);

      if (!this.updateFunc) {
        this.updateFunc = () => {
          let y = 0;
          let x = 0;
          this.inner.children.forEach((child, i) => {
            if (this.scrollType !== "horizontal") {
              child.left = x + this.itemMarginLeft;
              child.top = y + this.itemMarginTop;

              if ((child.right + child.width + this.itemMarginLeft) < this.viewport.width) {
                x = child.right;
              } else {
                x = 0;
                y = child.bottom;
              }

              this.inner.height = Math.max(this.viewport.height, child.top + child.height + this.itemMarginTop);
            } else {
              // TODO
            }
          });
        };
      }

      //enterframeではなくてwatchでheightみてもいいかな
      this.target.on("enterframe", this.updateFunc);
    },

    // return 0.0～1.0
    getScroll: function() {
      const viewport = this.viewport;
      const inner = this.inner;

      if (this.scrollType !== "horizontal") {
        const top = viewport.height * -viewport.originY;
        const bottom = viewport.height * (1 - viewport.originY);
        const min = top;
        const max = bottom - inner.height;

        return (inner.top - min) / (max - min);
      } else {
        // TOOD
        return 0;
      }
    },

    // v: 0.0～1.0
    setScroll: function(v) {
      v = Math.clamp(v, 0, 1);

      const viewport = this.viewport;
      const inner = this.inner;

      if (this.scrollType !== "horizontal") {
        if (inner.height <= viewport.height) return;

        const top = viewport.height * -viewport.originY;
        const bottom = viewport.height * (1 - viewport.originY);
        const min = top;
        const max = bottom - inner.height;

        inner.top = min + (max - min) * v;
      } else {
        // TOOD
      }

      return this;
    },

    //指定したカラムのアイテムの先頭にスクロールを移動
    setScrollByColumn: function(column) {
      column = Math.clamp(column, 0, this.items.length);
      const scrollValue = Math.clamp(column / this.items.length, 0, 1);
      this.setScroll(scrollValue);
      return this;
    },

    _accessor: {
      elements: {
        get: function() {
          return this.inner.children;
        },
      },
      scroll: {
        get: function() {
          return this.getScroll();
        },
        set: function(v) {
          this.setScroll(v);
        },
      },
    },

    _static: {
      defaults: {
        scrollType: "vertical",
        itemMarginLeft: 0,
        itemMarginTop: 0,
      },
    },

  });

});

phina.namespace(function() {

  phina.define("PieClip", {
    superClass: "Accessory",

    init: function(options) {
      options = ({}).$safe(options, PieClip.defaults)
      this.superInit(options);

      this.pivotX = options.pivotX;
      this.pivotY = options.pivotY;
      this.angleMin = options.angleMin;
      this.angleMax = options.angleMax;
      this.radius = options.radius;
      this.anticlockwise = options.anticlockwise;
    },

    onattached: function() {
      this.target.clip = (canvas) => {
        const angleMin = this.angleMin * Math.DEG_TO_RAD;
        const angleMax = this.angleMax * Math.DEG_TO_RAD;
        const ctx = canvas.context;
        ctx.beginPath();
        ctx.moveTo(this.pivotX, this.pivotY);
        ctx.lineTo(this.pivotX + Math.cos(angleMin) * this.radius, this.pivotY + Math.sin(angleMin) * this.radius);
        ctx.arc(this.pivotX, this.pivotY, this.radius, angleMin, angleMax, this.anticlockwise);
        ctx.closePath();
      };
    },

    _static: {
      defaults: {
        pivotX: 32,
        pivotY: 32,
        angleMin: 0,
        angleMax: 360,
        radius: 64,
        anticlockwise: false,
      },
    },

  });
});

phina.define("RectangleClip", {
  superClass: "Accessory",

  x: 0,
  y: 0,
  width: 0,
  height: 0,

  _enable: true,

  init: function() {
    this.superInit();
    this._init();
  },

  _init: function() {
    this.on("attached", () => {

      this.target.accessor("RectangleClip.width", {
        "get": () => this.width,
        "set": (v) => this.width = v,
      });

      this.target.accessor("RectangleClip.height", {
        "get": () => this.height,
        "set": (v) => this.height = v,
      });

      this.target.accessor("RectangleClip.x", {
        "get": () => this.x,
        "set": (v) => this.x = v,
      });

      this.target.accessor("RectangleClip.y", {
        "get": () => this.y,
        "set": (v) => this.y = v,
      });

      this.x = 0;
      this.y = 0;
      this.width = this.target.width;
      this.height = this.target.height;

      this.target.clip = (c) => this._clip(c);
    });
  },

  _clip: function(canvas) {
    const x = this.x - (this.width * this.target.originX);
    const y = this.y - (this.height * this.target.originY);

    canvas.beginPath();
    canvas.rect(x, y, this.width, this.height);
    canvas.closePath();
  },

  setEnable: function(enable) {
    this._enable = enable;
    if (this._enable) {
      this.target.clip = (c) => this._clip(c);
    } else {
      this.target.clip = null;
    }
  },

  _accessor: {
    enable: {
      set: function(v) {
        this.setEnable(v);
      },
      get: function() {
        return this._enable;
      }
    }
  },

});

phina.define("Toggle", {
  superClass: "Accessory",

  init: function(isOn) {
    this.superInit();
    this._init(isOn);
  },

  _init: function(isOn) {
    this.isOn = isOn || false;
  },

  setStatus: function(status) {
    this.isOn = status;
    this.target.flare((this.isOn) ? "switchOn" : "switchOff");
  },

  switchOn: function() {
    if (this.isOn) return;
    this.setStatus(true);
  },

  switchOff: function() {
    if (!this.isOn) return;
    this.setStatus(false);
  },

  switch: function() {
    this.isOn = !this.isOn;
    this.setStatus(this.isOn);
  },

  _accessor: {
    status: {
      "get": function() { return this.isOn; },
      "set": function(v) { return setStatus(v); },
    },
  },

});

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
      // this.app.downloadFromServer(image)
      //   .then(() => {
      //     this.isLoaded = true;
      //     const texture = phina.asset.AssetManager.get("image", image);
      //     this.setImage(texture, width, height);
      //     if (this._dummy) {
      //       this._dummy.remove();
      //       this._dummy = null;
      //     }
      //   });
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

phina.define("Gauge", {
  superClass: "RectangleClip",

  _min: 0,
  _max: 1.0,
  _value: 1.0, //min ~ max

  direction: "horizontal", // horizontal or vertical

  init: function() {
    this.superInit();
    this.on("attached", () => {
      this._width = this.width;
      this._height = this.width;

      this.target.accessor("Gauge.min", {
        "get": () => this.min,
        "set": (v) => this.min = v,
      });

      this.target.accessor("Gauge.max", {
        "get": () => this.max,
        "set": (v) => this.max = v,
      });

      this.target.accessor("Gauge.value", {
        "get": () => this.value,
        "set": (v) => this.value = v,
      });

      this.target.accessor("Gauge.progress", {
        "get": () => this.progress,
        "set": (v) => this.progress = v,
      });
    });
  },

  _refresh: function() {
    if (this.direction !== "vertical") {
      this.width = this.target.width * this.progress;
      this.height = this.target.height;
    } else {
      this.width = this.target.width;
      this.height = this.target.height * this.progress;
    }
  },

  _accessor: {
    progress: {
      get: function() {
        const p = (this.value - this.min) / (this.max - this.min);
        return (isNaN(p)) ? 0.0 : p;
      },
      set: function(v) { this.value = this.max * v; }
    },

    max: {
      get: function() { return this._max; },
      set: function(v) {
        this._max = v;
        this._refresh();
      }
    },

    min: {
      get: function() { return this._min; },
      set: function(v) {
        this._min = v;
        this._refresh();
      }
    },

    value: {
      get: function() { return this._value; },
      set: function(v) {
        this._value = v;
        this._refresh();
      }
    },
  }

});

phina.define("PathClip", {
  superClass: "Accessory",

  isEnable: true,

  init: function() {
    this.superInit();
    this._init();
  },

  _init: function() {
    this.on("attached", () => {
      const x1 = -(this.target.width * this.target.originX);
      const y1 = -(this.target.height * this.target.originY);
      const x2 =  (this.target.width * (1 - this.target.originX));
      const y2 =  (this.target.height * (1 - this.target.originY));

      this.clearPath();
      this.path.push({x: x1, y: y1 });
      this.path.push({x: x2, y: y1 });
      this.path.push({x: x2, y: y2 });
      this.path.push({x: x1, y: y2 });
      this.target.clip = (c) => this._clip(c);
    });
  },

  setEnable: function(enable) {
    this.inEnable = enable;
    if (this.isEnable) {
      this.target.clip = (c) => this._clip(c);
    } else {
      this.target.clip = null;
    }
  },

  clearPath: function() {
    this.path = [];
    return this;
  },

  addPath: function(path) {
    if (path instanceof Array) {
      this.path = this.path.concat(path);
    } else {
      this.path.push(path);
    }
    return this;
  },

  offsetPath: function(offsetX, offsetY) {
    this.path.forEach(pt => {
      pt.x += offsetX;
      pt.y += offsetY;
    });
    return this;
  },

  _clip: function(canvas) {
    if (this.path.length < 3) return;
    canvas.beginPath();
    canvas.moveTo(this.path[0].x, this.path[0].y);
    this.path.forEach(pt => canvas.lineTo(pt.x, pt.y));
    canvas.closePath();
  },

  _accessor: {
    enable: {
      set: function(v) {
        this.setEnable(v);
      },
      get: function() {
        return this.isEnable;
      }
    }
  },

});

phina.define("RectangleClip", {
  superClass: "Accessory",

  x: 0,
  y: 0,
  width: 0,
  height: 0,

  _enable: true,

  init: function() {
    this.superInit();
    this._init();
  },

  _init: function() {
    this.on("attached", () => {

      this.target.accessor("RectangleClip.width", {
        "get": () => this.width,
        "set": (v) => this.width = v,
      });

      this.target.accessor("RectangleClip.height", {
        "get": () => this.height,
        "set": (v) => this.height = v,
      });

      this.target.accessor("RectangleClip.x", {
        "get": () => this.x,
        "set": (v) => this.x = v,
      });

      this.target.accessor("RectangleClip.y", {
        "get": () => this.y,
        "set": (v) => this.y = v,
      });

      this.x = 0;
      this.y = 0;
      this.width = this.target.width;
      this.height = this.target.height;

      this.target.clip = (c) => this._clip(c);
    });
  },

  _clip: function(canvas) {
    const x = this.x - (this.target.width * this.target.originX);
    const y = this.y - (this.target.height * this.target.originY);

    canvas.beginPath();
    canvas.rect(x, y, this.target.width, this.target.height);
    canvas.closePath();
  },

  setEnable: function(enable) {
    this._enable = enable;
    if (this._enable) {
      this.target.clip = (c) => this._clip(c);
    } else {
      this.target.clip = null;
    }
  },

  _accessor: {
    enable: {
      set: function(v) {
        this.setEnable(v);
      },
      get: function() {
        return this._enable;
      }
    }
  },

});

phina.define("RoundRectangleClip", {
  superClass: "Accessory",

  x: 0,
  y: 0,
  width: 0,
  height: 0,

  radius: 5,

  _enable: true,

  init: function() {
    this.superInit();
    this._init();
  },

  _init: function() {
    this.on("attached", () => {

      this.target.accessor("RoundRectangleClip.width", {
        "get": () => this.width,
        "set": (v) => this.width = v,
      });

      this.target.accessor("RoundRectangleClip.height", {
        "get": () => this.height,
        "set": (v) => this.height = v,
      });

      this.target.accessor("RoundRectangleClip.x", {
        "get": () => this.x,
        "set": (v) => this.x = v,
      });

      this.target.accessor("RoundRectangleClip.y", {
        "get": () => this.y,
        "set": (v) => this.y = v,
      });

      this.target.accessor("RoundRectangleClip.radius", {
        "get": () => this.radius,
        "set": (v) => this.radius = v,
      });

      this.x = 0;
      this.y = 0;
      this.width = this.target.width;
      this.height = this.target.height;

      this.target.clip = (c) => this._clip(c);
    });
  },

  _clip: function(canvas) {
    const width = this.target.width;
    const height = this.target.height;
    const x = this.x - (width * this.target.originX);
    const y = this.y - (height * this.target.originY);
    const radius = this.radius;

    const l = x + radius;
    const r = x + width - radius;
    const t = y + radius;
    const b = y + height - radius;

    canvas.beginPath();
    canvas.arc(l, t, radius, -Math.PI,       -Math.PI * 0.5, false);  // 左上
    canvas.arc(r, t, radius, -Math.PI * 0.5,              0, false);  // 右上
    canvas.arc(r, b, radius,              0,  Math.PI * 0.5, false);  // 右下
    canvas.arc(l, b, radius,  Math.PI * 0.5,        Math.PI, false);  // 左下
    canvas.closePath();
  },

  setRadius: function(v) {
    this.radius = v;
    return this;
  },

  setEnable: function(enable) {
    this._enable = enable;
    if (this._enable) {
      this.target.clip = (c) => this._clip(c);
    } else {
      this.target.clip = null;
    }
    return this;
  },

  _accessor: {
    enable: {
      set: function(v) {
        this.setEnable(v);
      },
      get: function() {
        return this._enable;
      }
    }
  },

});

phina.namespace(function() {

  phina.define("phina.asset.Atlas", {
    superClass: "phina.asset.Asset",

    data: null,
    images: null,

    init: function() {
      this.superInit();
      this.images = {};
      this.frameCache = {};
    },

    load: function(key, src) {
      this.key = key;
      if (typeof(src) === "string") {
        this.src = [src];
      } else {
        this.src = src;
      }
      return phina.util.Flow(this._load.bind(this));
    },

    _load: function(resolve) {
      var self = this;

      var flows = self.src.map(function(src) {
        var basePath = null;
        if (src.indexOf('/') < 0) {
          basePath = './';
        } else {
          basePath = src.substring(0, src.lastIndexOf('/') + 1);
        }

        return self._loadJson(src)
          .then(function(data) {
            return self._loadImage(data, basePath);
          });
      });

      phina.util.Flow.all(flows)
        .then(function(dataList) {
          return self._mergeData(dataList);
        })
        .then(function() {
          resolve(self);
        });
    },

    _loadJson: function(src) {
      var self = this;
      return phina.util.Flow(function(resolve) {
        var xml = new XMLHttpRequest();
        xml.open('GET', src);
        xml.onreadystatechange = function() {
          if (xml.readyState === 4) {
            if ([200, 201, 0].indexOf(xml.status) !== -1) {
              var data = JSON.parse(xml.responseText);
              resolve(data);
            }
          }
        };
        xml.send(null);
      });
    },

    _loadImage: function(data, basePath) {
      var self = this;
      return phina.util.Flow(function(resolve) {
        var image = phina.asset.Texture();
        self.images[data.meta.image] = image;
        image.load(basePath + data.meta.image).then(function() {
          resolve(data);
        });
      });
    },

    _mergeData: function(dataList) {
      var self = this;
      this.data = {
        frames: [],
        meta: {
          app: dataList[0].meta.appapp,
          version: dataList[0].meta.version,
          format: dataList[0].meta.format,
          scale: dataList[0].meta.scale,
          smartupdate: dataList[0].meta.smartupdate,
        },
      };
      dataList.forEach(function(data) {
        var frames = data.frames;
        if (frames instanceof Array == false) {
          frames = Object.keys(frames).map(function(key) {
            var frame = frames[key];
            frame.filename = key;
            return frame;
          });
        }

        frames.forEach(function(frame) {
          frame.image = data.meta.image;
          frame.size = data.meta.size;
        });

        self.data.frames = self.data.frames.concat(frames);
      });

      this.data.frames.sort(function(lhs, rhs) {
        return (lhs.filename <= rhs.filename) ? -1 : 1;
      });
    },

    getFrameByName: function(name) {
      var frame = this.frameCache[name];
      if (!frame) {
        frame = this.frameCache[name] = this.data.frames.find(function(f) {
          return f.filename === name;
        });
      }
      return frame;
    },

    unpackAll: function() {
      var self = this;
      var data = self.data;
      var frames = data.frames;
      if (frames instanceof Array == false) {
        frames = Object.keys(frames).map(function(key) {
          var frame = frames[key];
          frame.filename = key;
          return frame;
        });
      }

      return frames.reduce(function(ret, frame) {
        var canvas = phina.graphics.Canvas();

        var f = frame.frame;
        var s = frame.spriteSourceSize;
        var src = frame.sourceSize;
        var p = frame.pivot;

        var image = self.images[frame.image].domElement;

        canvas.setSize(src.w, src.h);
        if (!frame.rotated) {
          canvas.context.drawImage(image,
            f.x, f.y, f.w, f.h,
            s.x, s.y, s.w, s.h
          );
        } else {
          canvas.context.save();
          canvas.context.translate(src.w * p.x, src.h * p.y);
          canvas.context.rotate(Math.PI * -0.5);
          canvas.context.translate(-src.h * p.y, -src.w * p.x);
          canvas.context.drawImage(image,
            f.x, f.y, f.h, f.w,
            s.y, s.x, s.h, s.w
          );
          canvas.context.restore();
        }

        ret[frame.filename] = canvas;
        return ret;
      }, {});
    },

    unpack: function(frame) {
      var data = this.data;
      var frames = data.frames;
      if (frames instanceof Array == false) {
        frames = Object.keys(frames).map(function(key) {
          var frame = frames[key];
          frame.filename = key;
          return frame;
        });
      }

      var canvas = phina.graphics.Canvas();

      var f = frame.frame;
      var s = frame.spriteSourceSize;
      var src = frame.sourceSize;
      var p = frame.pivot;

      var image = this.images[frame.image].domElement;

      canvas.setSize(src.w, src.h);
      if (!frame.rotated) {
        canvas.context.drawImage(image,
          f.x, f.y, f.w, f.h,
          s.x, s.y, s.w, s.h
        );
      } else {
        canvas.context.save();
        canvas.context.translate(src.w * p.x, src.h * p.y);
        canvas.context.rotate(Math.PI * -0.5);
        canvas.context.translate(-src.h * p.y, -src.w * p.x);
        canvas.context.drawImage(image,
          f.x, f.y, f.h, f.w,
          s.y, s.x, s.h, s.w
        );
        canvas.context.restore();
      }

      return canvas;
    },

    /**
     * フレームを切り分けた配列をatlasFramesとしてAssetManagerにつっこむ
     * すでに存在すれば、 AssetManagerから取得する
     */ 
    getAtlasFrames: function() {
      var self = this;
      var atlasFrames = phina.asset.AssetManager.get('atlasFrames', self.key);
      if (atlasFrames) {
        return atlasFrames;
      }
      var data = self.data;
      var frames = data.frames;
      var meta = data.meta;
      if (frames instanceof Array == false) {
        frames = Object.keys(frames).map(function(key) {
          var frame = frames[key];
          frame.filename = key;
          return frame;
        });
      }

      atlasFrames = frames.map(function(frame) {
        var key = self.key + "/" + frame.filename;
        var canvas = phina.graphics.Canvas();

        var f = frame.frame;
        var s = frame.spriteSourceSize;
        var src = frame.sourceSize;
        var p = frame.pivot;

        var image = self.images[frame.image].domElement;

        canvas.setSize(s.w, s.h);
        if (!frame.rotated) {
          canvas.context.drawImage(image,
            f.x, f.y, f.w, f.h,
            0, 0, s.w, s.h
          );
        } else {
          canvas.context.save();
          canvas.context.translate(s.w * p.x, s.h * p.y);
          canvas.context.rotate(Math.PI * -0.5);
          canvas.context.translate(-s.h * p.y, -s.w * p.x);
          canvas.context.drawImage(image,
            f.x, f.y, f.h, f.w,
            0, 0, s.h, s.w
          );
          canvas.context.restore();
        }
        canvas.frame = frame;
        canvas.meta = meta;
        phina.asset.AssetManager.set('image', key, canvas);
        return canvas;
      });

      phina.asset.AssetManager.set('atlasFrames', self.key, atlasFrames);
      return atlasFrames;
    },

  });

  phina.asset.AssetLoader.register('atlas', function(key, src) {
    var asset = phina.asset.Atlas();
    return asset.load(key, src);
  });

  phina.define("phina.display.AtlasSprite", {
    superClass: "phina.display.DisplayElement",

    init: function(options) {
      options = ({}).$safe(options, phina.display.AtlasSprite.defaults);
      this.superInit(options);
      this.srcRect = phina.geom.Rect();
      this.dstRect = phina.geom.Rect();
      this.srcPivot = phina.geom.Vector2();
      this.rotated = false;

      this.atlas = phina.asset.AssetManager.get("atlas", options.atlas);

      this.setFrame(options.frame);

      this.alpha = options.alpha;
    },

    setFrame: function(frameName) {
      var atlas = this.atlas;
      if (typeof (frameName) === "string") {
        this.frame = atlas.getFrameByName(frameName);
      } else {
        this.frame = atlas.data.frames.at(frameName);
      }

      this.image = atlas.images[this.frame.image];

      var f = this.frame.frame;
      var sss = this.frame.spriteSourceSize;
      var p = this.frame.pivot;
      this.srcRect.set(f.x, f.y, f.w, f.h);
      this.dstRect.set(sss.x, sss.y, sss.w, sss.h);
      this.width = this.frame.sourceSize.w;
      this.height = this.frame.sourceSize.h;
      if (atlas.data.meta.scale != "1") {
        var s = 1 / (+atlas.data.meta.scale);
        this.dstRect.x *= s;
        this.dstRect.y *= s;
        this.dstRect.width *= s;
        this.dstRect.height *= s;
        this.width *= s;
        this.height *= s;
      }
      this.srcPivot.set(p.x, p.y);
      this.rotated = this.frame.rotated;

      return this;
    },

    draw: function(canvas) {
      var sr = this.srcRect;
      var dr = this.dstRect;
      var p = this.srcPivot;
      var image = this.image.domElement;

      if (!this.rotated) {
        canvas.context.drawImage(image,
          sr.x, sr.y, sr.width, sr.height, -this._width * this.originX + dr.x, -this._height * this.originY + dr.y, dr.width, dr.height
        );
      } else {
        var ctx = canvas.context;
        ctx.save();
        ctx.rotate(Math.PI * -0.5);
        ctx.drawImage(image,
          sr.x, sr.y, sr.height, sr.width,
          this._height * (1 - this.originY) - dr.height - dr.y, -this._width * this.originX + dr.x, dr.height, dr.width
        );
        ctx.restore();
      }
    },

    _static: {
      defaults: {
        frame: 0,
        alpha: 1,
      },
    },

  });

  phina.define("phina.display.AtlasFrameSprite", {
    superClass: "phina.display.DisplayElement",
    _atlasIndex: 0,
    init: function(options) {
      if (typeof options === 'string') {
        options = {
          atlas: options,
        };
      }
      options = ({}).$safe(options, phina.display.AtlasFrameSprite.defaults);
      this.atlasName = options.atlas;
      this.atlas = phina.asset.AssetManager.get('atlas', this.atlasName);
      this.atlasFrames = this.atlas.getAtlasFrames();
      this.superInit();
      this.dstRect = phina.geom.Rect();
      this.srcPivot = phina.geom.Vector2();

      this.setImage(this.atlasName);
      this.atlasIndex = options.atlasIndex;

      this.alpha = options.alpha;
    },

    setImage: function(image, width, height) {
      if (typeof image === 'string') {
        this.atlasFrames = phina.asset.AssetManager.get('atlas', image).getAtlasFrames();
        image = this.atlasFrames[this.atlasIndex];
      }
      this._image = image;
      this.width = this._image.domElement.width;
      this.height = this._image.domElement.height;

      if (width) { this.width = width; }
      if (height) { this.height = height; }

      return this;
    },

    setFrame: function(atlasIndex) {
      var image = this.image = this.atlasFrames.at(atlasIndex);
      this.frame = image.frame;
      var f = this.frame.frame;
      var ss = this.frame.sourceSize;
      var sss = this.frame.spriteSourceSize;
      var p = this.frame.pivot;
      var dr = this.dstRect;
      dr.set(sss.x, sss.y, sss.w, sss.h);

      dr.x -= ss.w * this.originX;
      dr.y -= ss.h * this.originY;
      if (image.meta.scale != "1") {
        var s = 1 / (+image.meta.scale);
        dr.x *= s;
        dr.y *= s;
        dr.width *= s;
        dr.height *= s;
        this.width *= s;
        this.height *= s;
      }
      this.srcPivot.set(p.x, p.y);

      return this;
    },

    draw: function(canvas) {
      var dr = this.dstRect;
      // 一旦使ってない
      // var p = this.srcPivot;
      var image = this.image.domElement;

      canvas.context.drawImage(image, 0, 0, image.width, image.height, dr.x, dr.y, dr.width, dr.height);
    },

    _accessor: {
      image: {
        get: function() { return this._image; },
        set: function(v) {
          this.setImage(v);
          return this;
        }
      },
      atlasIndex: {
        get: function() {
          return this._atlasIndex;
        },
        set: function(v) {
          this._atlasIndex = v;
          this.setFrame(v);
        },
      }
    },

    _static: {
      defaults: {
        atlasIndex: 0,
        alpha: 1,
      },
    },

  });

});
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

/**
 * DomButton
 * elementにかぶせる形でDOMボタンを作成します。
 * 
 * Paramater
 * app      CanvasApp
 * element  かぶせる対象element
 * func     クリックされた時に実行される関数
 */

phina.namespace(() => {
  phina.define("DomButton", {
    superClass: "DisplayElement",

    init: function(app, element) {
      this.superInit();

      this.app = app;

      this.btn = null;
      this.setup(element);
    },

    setup: function(element) {
      if (this.btn) this.btn.remove();

      this.btn = document.createElement("button");
      this.btn.id = "btn"
      this.btn.style.position = "absolute";
      this.btn.style.display = "none";
      this.btn.style.padding = "0px";
      this.btn.style.borderWidth = "0px";

      this.btn.style.filter = 'alpha(opacity=0)';
      this.btn.style.MozOpacity = 0.0;
      this.btn.style.opacity = 0.0;

      document.body.appendChild(this.btn);

      this.btn.onclick = () => {
        element.flare('clicked');
        this.flare('clicked');
      };

      this.on('enterframe', () => {
        if (!this.btn) return;
        const scale = parseInt(this.app.domElement.style.width) / this.app.domElement.width;
        let width = element.width * scale;
        let height = element.height * scale;
        let canvasLeft = parseInt(this.app.domElement.style.left);
        let canvasTop = parseInt(this.app.domElement.style.top);

        //自身のグローバル座標に合わせる
        canvasLeft += element._worldMatrix.m02 * scale;
        canvasTop += element._worldMatrix.m12 * scale;
        canvasLeft += -element.originX * width;
        canvasTop += -element.originY * height;

        this.btn.style.display = "";
        this.btn.style.width = `${width}px`;
        this.btn.style.height = `${height}px`;
        this.btn.style.left = `${canvasLeft}px`;
        this.btn.style.top = `${canvasTop}px`;
      });

    },

    onremoved: function() {
      if (!this.btn) return;
      this.btn.remove();
      this.btn = null;
    },

  });
});

phina.namespace(() => {
  phina.define("InputField", {
    superClass: "DisplayElement",

    domElement: null,

    init: function(options) {
      this.options = ({}).$safe(options, InputField.defaults);
      this.superInit(options);

      this.domElement = document.createElement("input");
      this.domElement.type = this.options.type;
      this.domElement.value = this.options.text;

      this.domElement.style.position = "absolute";
      this.domElement.style.display = "none";
      this.domElement.style.padding = "0px";
      this.domElement.style.borderWidth = "0px";
      document.body.appendChild(this.domElement);

      this.domElement.addEventListener("focus", () => {
        this.flare("focus");
      });

      this.domElement.addEventListener("focusout", () => {
        this.flare("focusout");
      });

      this.domElement.addEventListener("keyup", () => {
        this.flare("change");
      });

      //TODO:appの参照方法で他に良い方法があれば変更する
      this.one("enterframe", (e) => {
        this.app = e.app;
        this.setup();
      });
    },

    setup: function() {
      this.on("enterframe", () => {
        const scale = parseInt(this.app.domElement.style.width) / this.app.domElement.width * this.app.quality;

        let fontSize = (this.options.fontSize * scale).round();
        //キャンバスの左上に合わせる
        let width = this.width * scale;
        let height = this.height * scale;
        let canvasLeft = parseInt(this.app.domElement.style.left);
        let canvasTop = parseInt(this.app.domElement.style.top);

        //自身のグローバル座標に合わせる
        canvasLeft += this._worldMatrix.m02 * scale;
        canvasTop += this._worldMatrix.m12 * scale;
        //originの調整
        canvasLeft += -this.originX * width;
        canvasTop += -this.originY * height;

        this.domElement.style.display = "";
        this.domElement.style.width = `${width}px`;
        this.domElement.style.height = `${height}px`;
        this.domElement.style.left = `${canvasLeft}px`;
        this.domElement.style.top = `${canvasTop}px`;
        this.domElement.style.fontSize = `${fontSize}px`;
        this.domElement.style.fontFamiliy = "Main-Bold";
      });
    },

    setVisible: function(flag) {
      this.visible = flag;
      if (this.domElement) {
        this.domElement.style.display = (flag) ? "" : "none";
      }
      return this;
    },

    show: function() {
      this.setVisible(true);
      return this;
    },

    hide: function() {
      this.setVisible(false);
      this.domElement.blur();
      return this;
    },

    //ソフトウェアキーボード非表示
    blur: function() {
      this.domElement.blur();
      return this;
    },

    readOnly: function(flag) {
      if (flag == undefined) flag = true;
      if (flag) {
        this.domElement.readOnly = true;
      } else {
        this.domElement.readOnly = false;
      }
      return this;
    },

    addCSS: function(css) {
      if (css instanceof Array) {
        css.forEach((c) => {
          this.domElement.classList.add(c);
        });
      } else {
        if (this.domElement) {
          this.domElement.classList.add(css);
        }
      }
      return this;
    },

    removeCSS: function(css) {
      if (css instanceof Array) {
        css.forEach((c) => {
          this.domElement.classList.remove(c);
        });
      } else {
        if (this.domElement) {
          this.domElement.classList.remove(css);
        }
      }
      return this;
    },

    onremoved: function() {
      if (this.domElement) {
        this.domElement.remove();
      }
    },

    //絵文字の除去
    removeEmoji: function() {
      var ranges = [
        '\ud83c[\udf00-\udfff]',
        '\ud83d[\udc00-\ude4f]',
        '\ud83d[\ude80-\udeff]',
        '\ud7c9[\ude00-\udeff]',
        '[\u2600-\u27BF]',
      ];
      var reg = new RegExp(ranges.join('|'), 'g');
      this.domElement.value = (this.domElement.value).replace(reg, '');
    },
    
    _accessor: {
      text: {
        "get": function() {
          return (this.domElement) ? this.domElement.value : "";
        },
        "set": function(v) {
          if (!this.domElement) return;
          this.domElement.value = v;
        }
      }
    },

    _static: {
      defaults: {
        width: 200,
        height: 40,
        fontSize: 20,
        text: "",
        type: "text",
      }
    },
  });
});

//
// クリックやタッチをインターセプトする
//
phina.define("InputIntercept", {
  superClass: "DisplayElement",

  init: function() {
    this.superInit();

    this.on("added", () => {
      //親に対して覆いかぶせる
      this.width = this.parent.width;
      this.height = this.parent.height;
      this.originX = this.parent.originX || 0;
      this.originY = this.parent.originY || 0;
      this.x = 0;
      this.y = 0;
    });
    this.disable();
  },

  enable: function() {
    this.setInteractive(true);
    return this;
  },

  disable: function() {
    this.setInteractive(false);
    return this;
  },

});

phina.define("Modal", {
  superClass: "InputIntercept",

  init: function() {
    this.superInit();
    this.enable();
  },
  //===================================
  //表示アニメーション
  // アニメーションについては継承元で再定義
  openAnimation: function() {
    return Promise.resolve();
  },

  //===================================
  //非表示アニメーション
  // アニメーションについては継承元で再定義
  closeAnimation: function() {
    return Promise.resolve();
  },

  //===================================
  //表示
  open: function() {
    return this.openAnimation();
  },

  //===================================
  //非表示
  close: function() {
    return this.closeAnimation();
  }

});

phina.namespace(() => {
  phina.define("TextArea", {
    superClass: "DisplayElement",

    domElement: null,

    init: function(options) {
      this.options = ({}).$safe(options, TextArea.defaults);
      this.superInit(options);

      this.domElement = document.createElement("textarea");
      this.domElement.type = "text";
      this.domElement.value = this.options.text;
      this.domElement.resize = "none";
      if (options.rows) this.domElement.rows = options.rows;

      this.domElement.style.position = "absolute";
      this.domElement.style.display = "none";
      this.domElement.style.padding = "0px";
      this.domElement.style.borderWidth = "0px";
      document.body.appendChild(this.domElement);

      this.domElement.addEventListener("focus", () => {
        this.flare("focus");
      });

      this.domElement.addEventListener("focusout", () => {
        this.flare("focusout");
      });

      this.domElement.addEventListener("keyup", () => {
        this.flare("change");
      });

      //TODO:appの参照方法で他に良い方法があれば変更する
      this.one("enterframe", (e) => {
        this.app = e.app;
        this.setup();
      });
    },

    setup: function() {
      this.on("enterframe", () => {
        const scale = parseInt(this.app.domElement.style.width) / this.app.domElement.width * this.app.quality;

        let fontSize = (this.options.fontSize * scale).round();
        //キャンバスの左上に合わせる
        let width = this.width * scale;
        let height = this.height * scale;
        let canvasLeft = parseInt(this.app.domElement.style.left);
        let canvasTop = parseInt(this.app.domElement.style.top);

        //自身のグローバル座標に合わせる
        canvasLeft += this._worldMatrix.m02 * scale;
        canvasTop += this._worldMatrix.m12 * scale;
        //originの調整
        canvasLeft += -this.originX * width;
        canvasTop += -this.originY * height;

        this.domElement.style.display = "";
        this.domElement.style.width = `${width}px`;
        this.domElement.style.height = `${height}px`;
        this.domElement.style.left = `${canvasLeft}px`;
        this.domElement.style.top = `${canvasTop}px`;
        this.domElement.style.fontSize = `${fontSize}px`;
        this.domElement.style.fontFamiliy = "Main-Bold";
      });
    },

    setVisible: function(flag) {
      this.visible = flag;
      if (this.domElement) {
        this.domElement.style.display = (flag) ? "" : "none";
      }
      return this;
    },

    show: function() {
      this.setVisible(true);
      return this;
    },

    hide: function() {
      this.setVisible(false);
      this.domElement.blur();
      return this;
    },

    //ソフトウェアキーボード非表示
    blur: function() {
      this.domElement.blur();
      return this;
    },

    readOnly: function(flag) {
      if (flag == undefined) flag = true;
      if (flag) {
        this.domElement.readOnly = true;
      } else {
        this.domElement.readOnly = false;
      }
      return this;
    },

    addCSS: function(css) {
      if (css instanceof Array) {
        css.forEach((c) => {
          this.domElement.classList.add(c);
        });
      } else {
        if (this.domElement) {
          this.domElement.classList.add(css);
        }
      }
      return this;
    },

    removeCSS: function(css) {
      if (css instanceof Array) {
        css.forEach((c) => {
          this.domElement.classList.remove(c);
        });
      } else {
        if (this.domElement) {
          this.domElement.classList.remove(css);
        }
      }
      return this;
    },

    onremoved: function() {
      if (this.domElement) {
        this.domElement.remove();
      }
    },

    //絵文字があるかチェック
    checkEmoji: function() {
      var ranges = [
        '\ud83c[\udf00-\udfff]',
        '\ud83d[\udc00-\ude4f]',
        '\ud83d[\ude80-\udeff]',
        '\ud7c9[\ude00-\udeff]',
        '[\u2600-\u27BF]',
      ];
      var reg = new RegExp(ranges.join('|'), 'g');
      return this.domElement.value.match(reg);
    },

    //絵文字の除去
    removeEmoji: function() {
      var ranges = [
        '\ud83c[\udf00-\udfff]',
        '\ud83d[\udc00-\ude4f]',
        '\ud83d[\ude80-\udeff]',
        '\ud7c9[\ude00-\udeff]',
        '[\u2600-\u27BF]',
      ];
      var reg = new RegExp(ranges.join('|'), 'g');
      this.domElement.value = (this.domElement.value).replace(reg, '');
    },
    
    _accessor: {
      text: {
        "get": function() {
          return (this.domElement) ? this.domElement.value : "";
        },
        "set": function(v) {
          if (!this.domElement) return;
          this.domElement.value = v;
        }
      }
    },

    _static: {
      defaults: {
        width: 200,
        height: 40,
        fontSize: 20,
        text: "",
      }
    },
  });
});

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

/*
 *  TitleScene.js
 */

phina.namespace(function() {

  phina.define('TitleScene', {
    superClass: 'BaseScene',

    init: function(options) {
      this.superInit();
    },

    setup: function() {
      this.base = DisplayElement().addChildTo(this).setPosition(SCREEN_OFFSET_X, SCREEN_OFFSET_Y);

      Sprite("black")
        .setPosition(this.gridX.center(), this.gridY.center())
        .addChildTo(this.base)

      Label({
        text: "Versus",
      })
        .setPosition(this.gridX.center(), this.gridY.center())
        .addChildTo(this.base)
  },

    update: function() {
    },
  });

});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCIwMDBfY29yZG92YS9DYW1lcmFQbHVnaW4uanMiLCIwMjBfZXh0ZW5zaW9uL0NhbnZhcy5qcyIsIjAyMF9leHRlbnNpb24vRGlzcGxheUVsZW1lbnQuanMiLCIwMjBfZXh0ZW5zaW9uL1BsYWluRWxlbWVudC5qcyIsIjAyMF9leHRlbnNpb24vVGV4dHVyZS5qcyIsIjAxMF9jb21tb24vV2ViQXBpLmpzIiwiMDQwX2FwcGxpY2F0aW9uL0FwcGxpY2F0aW9uLmpzIiwiMDQwX2FwcGxpY2F0aW9uL0Fzc2V0TGlzdC5qcyIsIjA0MF9hcHBsaWNhdGlvbi9CYXNlU2NlbmUuanMiLCIwNDBfYXBwbGljYXRpb24vRmlyc3RTY2VuZUZsb3cuanMiLCIwMzBfcGx1Z2lucy9DdXRUZXh0LmpzIiwiMDMwX3BsdWdpbnMvcGhpbmEuU2VyaWFsQXNzZXRMb2FkZXIuanMiLCIwMzBfcGx1Z2lucy9waGluYS5hc3NldGxvYWRlcmV4LmpzIiwiMDMwX3BsdWdpbnMvYWNjZXNzb3J5L0J1dHRvbi5qcyIsIjAzMF9wbHVnaW5zL2FjY2Vzc29yeS9HYXVnZS5qcyIsIjAzMF9wbHVnaW5zL2FjY2Vzc29yeS9HcmF5c2NhbGUuanMiLCIwMzBfcGx1Z2lucy9hY2Nlc3NvcnkvTGlzdFZpZXcuanMiLCIwMzBfcGx1Z2lucy9hY2Nlc3NvcnkvUGllQ2xpcC5qcyIsIjAzMF9wbHVnaW5zL2FjY2Vzc29yeS9SZWN0YW5nbGVDbGlwLmpzIiwiMDMwX3BsdWdpbnMvYWNjZXNzb3J5L1RvZ2dsZS5qcyIsIjAzMF9wbHVnaW5zL2VsZW1lbnQvRHluYW1pY1Nwcml0ZS5qcyIsIjAzMF9wbHVnaW5zL2VsZW1lbnQvR2F1Z2UuanMiLCIwMzBfcGx1Z2lucy9lbGVtZW50L1BhdGhDbGlwLmpzIiwiMDMwX3BsdWdpbnMvZWxlbWVudC9SZWN0YW5nbGVDbGlwLmpzIiwiMDMwX3BsdWdpbnMvZWxlbWVudC9Sb3VuZFJlY3RhbmdsZUNsaXAuanMiLCIwMzBfcGx1Z2lucy9lbGVtZW50L3BoaW5hLmF0bGFzLmpzIiwiMDMwX3BsdWdpbnMvZWxlbWVudC9waGluYS5sYXlvdXQuTGF5b3V0QXNzZXQuanMiLCIwMzBfcGx1Z2lucy91aS9EaWFsb2cuanMiLCIwMzBfcGx1Z2lucy91aS9Eb21CdXR0b24uanMiLCIwMzBfcGx1Z2lucy91aS9JbnB1dEZpZWxkLmpzIiwiMDMwX3BsdWdpbnMvdWkvSW5wdXRJbnRlcmNlcHQuanMiLCIwMzBfcGx1Z2lucy91aS9Nb2RhbC5qcyIsIjAzMF9wbHVnaW5zL3VpL1RleHRBcmVhLmpzIiwiMDUwX3NjZW5lcy8wMTBfdGl0bGUvQXNzZXRMb2FkU2NlbmUuanMiLCIwNTBfc2NlbmVzLzAxMF90aXRsZS9UaXRsZVNjZW5lLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNoSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNySkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqICBtYWluLmpzXG4gKi9cblxucGhpbmEuZ2xvYmFsaXplKCk7XG5cbmNvbnN0IEZVTExfV0lEVEggPSAxMzM0O1xuY29uc3QgRlVMTF9IRUlHSFQgPSA3NTA7XG5jb25zdCBGVUxMX1dJRFRIX0hBTEYgPSBGVUxMX1dJRFRIICogMC41O1xuY29uc3QgRlVMTF9IRUlHSFRfSEFMRiA9IEZVTExfSEVJR0hUICogMC41O1xuXG5jb25zdCBMQVlPVVRfV0lEVEggPSAxMzM0O1xuY29uc3QgTEFZT1VUX0hFSUdIVCA9IDc1MDtcblxuY29uc3QgU0NSRUVOX1dJRFRIID0gTEFZT1VUX1dJRFRIO1xuY29uc3QgU0NSRUVOX0hFSUdIVCA9IExBWU9VVF9IRUlHSFQ7XG5jb25zdCBTQ1JFRU5fV0lEVEhfSEFMRiA9IFNDUkVFTl9XSURUSCAqIDAuNTtcbmNvbnN0IFNDUkVFTl9IRUlHSFRfSEFMRiA9IFNDUkVFTl9IRUlHSFQgKiAwLjU7XG5cbmNvbnN0IFNDUkVFTl9PRkZTRVRfWCA9IDA7XG5jb25zdCBTQ1JFRU5fT0ZGU0VUX1kgPSAwO1xuXG5sZXQgcGhpbmFfYXBwO1xuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gIHBoaW5hX2FwcCA9IEFwcGxpY2F0aW9uKCk7XG4gIHBoaW5hX2FwcC5ydW4oKTtcbn07XG5cbi8v44K544Kv44Ot44O844Or56aB5q2iXG4vLyBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBmdW5jdGlvbihlKSB7XG4vLyAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuLy8gfSwgeyBwYXNzaXZlOiBmYWxzZSB9KTtcbiIsIi8qXG4gKiAgVGl0bGVTY2VuZS5qc1xuICovXG5cbnBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoJ0NhbWVyYVBsdWdpbicsIHtcblxuICAgIF9zdGF0aWM6IHtcbiAgICAgIG9wZW46IGZ1bmN0aW9uICh0eXBlKSB7XG4gICAgICAgIGlmICh0eXBlICE9PSBDYW1lcmEuUGljdHVyZVNvdXJjZVR5cGUuQ0FNRVJBICYmIHR5cGUgIT09IENhbWVyYS5QaWN0dXJlU291cmNlVHlwZS5QSE9UT0xJQlJBUlkpIHtcbiAgICAgICAgICB0eXBlID0gQ2FtZXJhLlBpY3R1cmVTb3VyY2VUeXBlLkNBTUVSQTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICBuYXZpZ2F0b3IuY2FtZXJhLmdldFBpY3R1cmUoXG4gICAgICAgICAgICBpbWFnZURhdGFVUkkgPT4ge1xuICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImNhbWVyYSBzdWNjZXNzOiBcIiArIGltYWdlRGF0YVVSSSk7XG4gICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgIGlzU3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBpbWFnZURhdGFVUkksXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWVzc2FnZSA9PiB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY2FtZXJhIGVycm9yOiBcIiArIG1lc3NhZ2UpO1xuICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICBpc1N1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2UsXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBxdWFsaXR5OiAxMDAsXG4gICAgICAgICAgICAgIGRlc3RpbmF0aW9uVHlwZTogQ2FtZXJhLkRlc3RpbmF0aW9uVHlwZS5GSUxFX1VSSSxcbiAgICAgICAgICAgICAgc2F2ZVRvUGhvdG9BbGJ1bTogZmFsc2UsXG4gICAgICAgICAgICAgIGNhbWVyYURpcmVjdGlvbjogQ2FtZXJhLkRpcmVjdGlvbi5GUk9OVCxcbiAgICAgICAgICAgICAgc291cmNlVHlwZTogdHlwZSxcbiAgICAgICAgICAgICAgY29ycmVjdE9yaWVudGF0aW9uOiB0cnVlLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSxcbiAgICB9LFxuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZ3JhcGhpY3MuQ2FudmFzLnByb3RvdHlwZS4kbWV0aG9kKFwiaW5pdFwiLCBmdW5jdGlvbihjYW52YXMpIHtcbiAgICB0aGlzLmlzQ3JlYXRlQ2FudmFzID0gZmFsc2U7XG4gICAgaWYgKHR5cGVvZiBjYW52YXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoY2FudmFzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGNhbnZhcykge1xuICAgICAgICB0aGlzLmNhbnZhcyA9IGNhbnZhcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIHRoaXMuaXNDcmVhdGVDYW52YXMgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuZG9tRWxlbWVudCA9IHRoaXMuY2FudmFzO1xuICAgIHRoaXMuY29udGV4dCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgdGhpcy5jb250ZXh0LmxpbmVDYXAgPSAncm91bmQnO1xuICAgIHRoaXMuY29udGV4dC5saW5lSm9pbiA9ICdyb3VuZCc7XG4gIH0pO1xuXG4gIHBoaW5hLmdyYXBoaWNzLkNhbnZhcy5wcm90b3R5cGUuJG1ldGhvZCgnZGVzdHJveScsIGZ1bmN0aW9uKGNhbnZhcykge1xuICAgIGlmICghdGhpcy5pc0NyZWF0ZUNhbnZhcykgcmV0dXJuO1xuICAgIGNvbnNvbGUubG9nKGAjIyMjIGRlbGV0ZSBjYW52YXMgJHt0aGlzLmNhbnZhcy53aWR0aH0geCAke3RoaXMuY2FudmFzLmhlaWdodH0gIyMjI2ApO1xuICAgIHRoaXMuc2V0U2l6ZSgwLCAwKTtcbiAgICBkZWxldGUgdGhpcy5jYW52YXM7XG4gICAgZGVsZXRlIHRoaXMuZG9tRWxlbWVudDtcbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRpc3BsYXkuRGlzcGxheUVsZW1lbnQucHJvdG90eXBlLiRtZXRob2QoXCJzZXRBbHBoYVwiLCBmdW5jdGlvbihhKSB7XG4gICAgdGhpcy5hbHBoYSA9IGE7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0pO1xuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kaXNwbGF5LlBsYWluRWxlbWVudC5wcm90b3R5cGUuJG1ldGhvZChcImRlc3Ryb3lDYW52YXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5yZW1vdmUoKTtcbiAgICBpZiAoIXRoaXMuY2FudmFzKSByZXR1cm47XG4gICAgdGhpcy5jYW52YXMuZGVzdHJveSgpO1xuICAgIGRlbGV0ZSB0aGlzLmNhbnZhcztcbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmFzc2V0LlRleHR1cmUucHJvdG90eXBlLiRtZXRob2QoXCJfbG9hZFwiLCBmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgdGhpcy5kb21FbGVtZW50ID0gbmV3IEltYWdlKCk7XG5cbiAgICB2YXIgaXNMb2NhbCA9IChsb2NhdGlvbi5wcm90b2NvbCA9PSAnZmlsZTonKTtcbiAgICBpZiAoISgvXmRhdGE6Ly50ZXN0KHRoaXMuc3JjKSkpIHtcbiAgICAgIHRoaXMuZG9tRWxlbWVudC5jcm9zc09yaWdpbiA9ICdhbm9ueW1vdXMnOyAvLyDjgq/jg63jgrnjgqrjg6rjgrjjg7Pop6PpmaRcbiAgICB9XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5kb21FbGVtZW50Lm9ubG9hZCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHNlbGYubG9hZGVkID0gdHJ1ZTtcbiAgICAgIGUudGFyZ2V0Lm9ubG9hZCA9IG51bGw7XG4gICAgICBlLnRhcmdldC5vbmVycm9yID0gbnVsbDtcbiAgICAgIHJlc29sdmUoc2VsZik7XG4gICAgfTtcblxuICAgIHRoaXMuZG9tRWxlbWVudC5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgICAgZS50YXJnZXQub25sb2FkID0gbnVsbDtcbiAgICAgIGUudGFyZ2V0Lm9uZXJyb3IgPSBudWxsO1xuICAgICAgY29uc29sZS5lcnJvcihcInBoaW5hLmFzc2V0LlRleHR1cmUgX2xvYWQgb25FcnJvciBcIiwgdGhpcy5zcmMpO1xuICAgIH07XG5cbiAgICB0aGlzLmRvbUVsZW1lbnQuc3JjID0gdGhpcy5zcmM7XG4gIH0pO1xuXG4gIHBoaW5hLmFzc2V0LlRleHR1cmUucHJvdG90eXBlLiRtZXRob2QoJ2Rlc3Ryb3knLCBmdW5jdGlvbihjYW52YXMpIHtcbiAgICBjb25zb2xlLmxvZyhgIyMjIyBkZWxldGUgY2FudmFzICR7dGhpcy5kb21FbGVtZW50LndpZHRofSB4ICR7dGhpcy5kb21FbGVtZW50LmhlaWdodH0gIyMjI2ApO1xuICAgIHRoaXMuZG9tRWxlbWVudC53aWR0aCA9IDA7XG4gICAgdGhpcy5kb21FbGVtZW50LmhlaWdodCA9IDA7XG4gICAgZGVsZXRlIHRoaXMuZG9tRWxlbWVudDtcbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIGNvbnN0IEFQSV9VUkkgPSBcImh0dHBzOi8vY3djd2RldjAyLnBldC1jb28uanAvYXBpL3YxL1wiOyAvL+aYr+aeneOBleOCk+OCteODvOODkOODvFxuICAvLyBjb25zdCBBUElfVVJJID0gXCJodHRwczovL2N3Y3dkZXYwMS5wZXQtY29vLmpwL2FwaS92MS9cIjsgLy/opb/lsqHjgZXjgpPjgrXjg7zjg5Djg7xcblxuICBjb25zdCBNT0NLX1VSSSA9IFwiaHR0cDovL3VlLnBlYXNlLmpwL2Z1amltb3RvZGV2MDEvYXBpL3YxL1wiOyAvL+ODhuOCueODiOeUqOODouODg+OCr+OCteODvOODkOODvFxuXG4gIC8vIGNvbnN0IEFQSV9VUkkgPSBcImh0dHA6Ly81Mi4xMC4yNDcuMTU4L2FwaS9cIjsgLy9CcmlnaHTmoYjku7bjgrXjg7zjg5Djg7zvvIjlpJbpg6jmjqXntprnorroqo3nlKjvvIlcbiAgXG4gIHBoaW5hLmRlZmluZShcIldlYkFwaVwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJFdmVudERpc3BhdGNoZXJcIixcbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgfSxcblxuICAgIHJlcXVlc3Q6IGZ1bmN0aW9uKHJlcXVlc3RUeXBlLCBhcGlOYW1lLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSAob3B0aW9ucyB8fCB7fSkuJHNhZmUoe1xuICAgICAgICBpZ25vcmVFcnJvckNvZGU6IFtdLFxuICAgICAgICBhdXRoOiB0cnVlLCAvL+iqjeiovOW/heimgeOBi+ODleODqeOCsFxuICAgICAgICBpc0Zvcm1EYXRhOiBmYWxzZSwgIC8vcHJhbWFz44GMRm9ybURhdGHjgYvjg5Xjg6njgrBcbiAgICAgICAgaXNCYWNrZ3JvdW5kOiBmYWxzZSwgLy9cYumAmuS/oeS4reOBq+WFpeWKm+OCkuWPl+OBkeS7mOOBkeOCi+OBiyh0cnVl44Gn5Y+X44GR5LuY44GR44KLKVxuICAgICAgfSk7XG5cbiAgICAgIC8v44OH44OQ44OD44Kw55So5by35Yi2QVBJ44Oi44OD44Kv5L2/55SoXG4gICAgICBpZiAoQVBJX01PQ0tfRk9SU0UpIG9wdGlvbnMuaXNNb2NrID0gdHJ1ZTtcblxuICAgICAgaWYgKG9wdGlvbnMuaXNNb2NrKSB7XG4gICAgICAgIC8vVE9ETyBzd2FnZ2Vy44G444Gu44Oq44OQ44O844K544OX44Ot44Kt44K35o6l57aa44GM5Ye65p2l44Gf44KJ5pu444GN5o+b44GI44KLXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICBjb25zdCBwYXJhbSA9IHRoaXMuZW5jb2RlSFRNTEZvcm0ocGFyYW1zKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhgQVBJIENBTEwgOiAke3JlcXVlc3RUeXBlfSAke2FwaU5hbWV9ICR7cGFyYW19YCk7XG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gV2ViQXBpTW9ja1thcGlOYW1lXSB8fCB7IHN0YXN1czogXCJtb2NrIGVycm9yLlwiLCByZXN1bHQ6IHt9IH07XG4gICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgY292ZXIgPSBJbnB1dEludGVyY2VwdCgpLmFkZENoaWxkVG8ocGhpbmFfYXBwLmN1cnJlbnRTY2VuZSk7XG4gICAgICBpZiAob3B0aW9ucy5pc0JhY2tncm91bmQpIHtcbiAgICAgICAgY292ZXIuZGlzYWJsZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy/pgJrkv6HjgYzntYLjgo/jgovjgb7jgafmk43kvZzjgpLjgZXjgZvjgarjgYTmp5jjgavjgZnjgotcbiAgICAgICAgY292ZXIuZW5hYmxlKCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgaWYgKHhoci5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMuaXNCYWNrZ3JvdW5kKSBjb3Zlci5kaXNhYmxlKCk7XG4gICAgICAgICAgICBpZiAoWzIwMCwgMjAxLCAwXS5pbmRleE9mKHhoci5zdGF0dXMpICE9PSAtMSB8fCBvcHRpb25zLmlnbm9yZUVycm9yQ29kZS5pbmRleE9mKHhoci5zdGF0dXMpICE9PSAtMSkge1xuICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PSBcInN1Y2Nlc3NcIikge1xuICAgICAgICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc29sdmUocmVzcG9uc2UpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgICAgICAgICAgIHN0YXR1czogXCJlcnJvclwiLFxuICAgICAgICAgICAgICAgIGNvZGU6IHhoci5zdGF0dXMsXG4gICAgICAgICAgICAgICAgcmVzdWx0OiB4aHIucmVzcG9uc2UsXG4gICAgICAgICAgICAgICAgYXBpOiBhcGlOYW1lLFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICByZWplY3Qob3B0aW9ucyk7XG4gICAgICAgICAgICAgIC8v44Ko44Op44O844Oh44OD44K744O844K444K344O844Oz44G45by35Yi26YG356e7XG4gICAgICAgICAgICAgIHBoaW5hX2FwcC5jdXJyZW50U2NlbmUuZmxhcmUoXCJhcGllcnJvclwiLCB7IG9wdGlvbnMgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vR0VU44Gu5aC05ZCI44CB44Kv44Ko44Oq44OR44Op44Oh44O844K/44KSdXJs44Gr5LuY44GR44KLXG4gICAgICAgIGxldCB1cmwgPSBBUElfVVJJICsgYXBpTmFtZTtcbiAgICAgICAgaWYgKHJlcXVlc3RUeXBlID09IFwiR0VUXCIpIHtcbiAgICAgICAgICBjb25zdCBwYXJhbSA9IHRoaXMuZW5jb2RlSFRNTEZvcm0ocGFyYW1zKTtcbiAgICAgICAgICBpZiAocGFyYW0gJiYgcGFyYW0gIT0gXCJcIikgdXJsICs9IFwiP1wiICsgcGFyYW07XG4gICAgICAgIH1cbiAgICAgICAgeGhyLm9wZW4ocmVxdWVzdFR5cGUsIHVybCk7XG5cbiAgICAgICAgLy9QT1NU44Gu5aC05ZCI44CB44OY44OD44OA44KS5LuY5Yqg44GZ44KLXG4gICAgICAgIGlmIChyZXF1ZXN0VHlwZSA9PSBcIlBPU1RcIikge1xuICAgICAgICAgIGlmIChvcHRpb25zLmlzRm9ybURhdGEpIHtcbiAgICAgICAgICAgIC8v44OV44Kp44O844Og6YCB5L+h44Gu5aC05ZCI44Gv44OY44OD44OA44KS44Gk44GR44Gq44GEXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy/oqo3oqLzjg4fjg7zjgr/jgpLjg5jjg4Pjg4Djgavku5jliqBcbiAgICAgICAgaWYgKG9wdGlvbnMuYXV0aCkge1xuICAgICAgICAgIGNvbnN0IHRva2VuID0gVXNlckRhdGEudG9rZW47XG4gICAgICAgICAgY29uc3QgYXV0aFN0cmluZyA9IGAke3Rva2VuLnRva2VuX3R5cGV9ICR7dG9rZW4uYWNjZXNzX3Rva2VufWA7XG4gICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0F1dGhvcml6YXRpb24nLCBhdXRoU3RyaW5nKTtcbiAgICAgICAgICAvLyB4aHIud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTsgIC8v5LiN6KaB44Gu5Y+v6IO95oCn44GM44GC44KLXG4gICAgICAgIH1cblxuICAgICAgICBpZiAob3B0aW9ucy5pc0Zvcm1EYXRhKSB7XG4gICAgICAgICAgeGhyLnNlbmQocGFyYW1zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAocmVxdWVzdFR5cGUgPT0gXCJQT1NUXCIpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtX3N0cmluZyA9IHRoaXMuZW5jb2RlSFRNTEZvcm0ocGFyYW1zKVxuICAgICAgICAgICAgeGhyLnNlbmQocGFyYW1fc3RyaW5nKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgeGhyLnNlbmQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBnZXQ6IGZ1bmN0aW9uKGFwaU5hbWUsIHBhcmFtcywgb3B0aW9ucykge1xuICAgICAgcmV0dXJuIHRoaXMucmVxdWVzdChcIkdFVFwiLCBhcGlOYW1lLCBwYXJhbXMsIG9wdGlvbnMpO1xuICAgIH0sXG5cbiAgICBwb3N0OiBmdW5jdGlvbihhcGlOYW1lLCBwYXJhbXMsIG9wdGlvbnMpIHtcbiAgICAgIHJldHVybiB0aGlzLnJlcXVlc3QoXCJQT1NUXCIsIGFwaU5hbWUsIHBhcmFtcywgb3B0aW9ucyk7XG4gICAgfSxcblxuICAgIC8vIEhUTUzjg5Xjgqnjg7zjg6Djga7lvaLlvI/jgavjg4fjg7zjgr/jgpLlpInmj5vjgZnjgotcbiAgICBlbmNvZGVIVE1MRm9ybTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgY29uc3QgcGFyYW1zID0gW107XG4gICAgICBpZiAoIWRhdGEpIHJldHVybiBudWxsO1xuICAgICAgZm9yIChsZXQgbmFtZSBpbiBkYXRhKSB7XG4gICAgICAgIGxldCBwYXJhbSA9IGVuY29kZVVSSUNvbXBvbmVudChuYW1lKSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChkYXRhW25hbWVdKTtcbiAgICAgICAgcGFyYW1zLnB1c2gocGFyYW0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBhcmFtcy5qb2luKCcmJykucmVwbGFjZSgvJTIwL2csICcrJyk7XG4gICAgfSxcblxuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwiQXBwbGljYXRpb25cIiwge1xuICAgIHN1cGVyQ2xhc3M6IFwicGhpbmEuZGlzcGxheS5DYW52YXNBcHBcIixcbiAgXG4gICAgdmVyc2lvbjogXCIwLjcuMDAyXCIsXG4gICAgcXVhbGl0eTogMS4wLFxuICBcbiAgICB3ZWJBcGk6IG51bGwsXG4gICAgbW9kZTogXCJkZWZhdWx0XCIsXG5cbiAgICBpc0J1c3k6IGZhbHNlLFxuXG4gICAgZG93bmxvYWRJbWFnZTogbnVsbCxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zdXBlckluaXQoe1xuICAgICAgICBmcHM6IDMwLFxuICAgICAgICB3aWR0aDogU0NSRUVOX1dJRFRIICogdGhpcy5xdWFsaXR5LFxuICAgICAgICBoZWlnaHQ6IFNDUkVFTl9IRUlHSFQgKiB0aGlzLnF1YWxpdHksXG4gICAgICAgIGZpdDogdHJ1ZSxcbiAgICAgIH0pO1xuICBcbiAgICAgIHRoaXMuc2V0dXBNb3VzZVdoZWVsKCk7XG5cbiAgICAgIC8v44K344O844Oz44Gu5bmF44CB6auY44GV44Gu5Z+65pys44KS6Kit5a6aXG4gICAgICBwaGluYS5kaXNwbGF5LkRpc3BsYXlTY2VuZS5kZWZhdWx0cy4kZXh0ZW5kKHtcbiAgICAgICAgd2lkdGg6IFNDUkVFTl9XSURUSCxcbiAgICAgICAgaGVpZ2h0OiBTQ1JFRU5fSEVJR0hULFxuICAgICAgfSk7XG4gIFxuICAgICAgcGhpbmEuaW5wdXQuSW5wdXQucXVhbGl0eSA9IHRoaXMucXVhbGl0eTtcbiAgICAgIHBoaW5hLmRpc3BsYXkuRGlzcGxheVNjZW5lLnF1YWxpdHkgPSB0aGlzLnF1YWxpdHk7XG5cbiAgICAgIHRoaXMuYXNzZXRMb2FkZXIgPSBwaGluYS5leHRlbnNpb24uU2VyaWFsQXNzZXRMb2FkZXIoKTtcbiAgICAgIHRoaXMud2ViQXBpID0gV2ViQXBpKHsgYXBwOiBwaGluYV9hcHAgfSk7XG4gIFxuICAgICAgdGhpcy5yZXBsYWNlU2NlbmUoRmlyc3RTY2VuZUZsb3coe30pKTtcbiAgXG4gICAgICB0aGlzLnNldHVwRXZlbnRzKCk7XG4gICAgICB0aGlzLnNldHVwU291bmQoKTtcbiAgICAgIHRoaXMuc2V0dXBGb250QXR0cmlidXRlKCk7XG5cbiAgICAgIC8v44OA44Km44Oz44Ot44O844OJ44GX44Gf55S75YOP44Kt44O86YWN5YiXXG4gICAgICB0aGlzLmRvd25sb2FkSW1hZ2UgPSBbXTtcbiAgXG4gICAgICB0aGlzLm9uKFwiY2hhbmdlc2NlbmVcIiwgKCkgPT4ge1xuICAgICAgICAvL+OCt+ODvOODs+OCkumbouOCjOOCi+mam+OAgeODnOOCv+ODs+WQjOaZguaKvOOBl+ODleODqeOCsOOCkuino+mZpOOBmeOCi1xuICAgICAgICBCdXR0b24uYWN0aW9uVGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5kb3dubG9hZEltYWdlLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgICAgY29uc3QgaW1nID0gQXNzZXRNYW5hZ2VyLmdldChcImltYWdlXCIsIG5hbWUpO1xuICAgICAgICAgIGlmIChpbWcpIHtcbiAgICAgICAgICAgIGltZ1tcImRvbUVsZW1lbnRcIl0ud2lkdGggPSAwO1xuICAgICAgICAgICAgaW1nW1wiZG9tRWxlbWVudFwiXS5oZWlnaHQgPSAwO1xuICAgICAgICAgICAgZGVsZXRlIGltZ1tcImRvbUVsZW1lbnRcIl07XG4gICAgICAgICAgICBkZWxldGUgQXNzZXRNYW5hZ2VyLmFzc2V0c1tcImltYWdlXCJdW25hbWVdO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZG93bmxvYWRJbWFnZSA9IFtdO1xuICAgICAgfSk7XG4gIFxuICAgICAgY29uc29sZS5sb2cod2luZG93LmRlYnVnQXBwID0gdGhpcyk7XG4gICAgfSxcbiAgXG4gICAgLy/jg57jgqbjgrnjga7jg5vjg7zjg6vjgqTjg5njg7Pjg4jplqLpgKNcbiAgICBzZXR1cE1vdXNlV2hlZWw6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy53aGVlbERlbHRhWSA9IDA7XG4gICAgICB0aGlzLmRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNld2hlZWxcIiwgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHRoaXMud2hlZWxEZWx0YVkgPSBlLmRlbHRhWTtcbiAgICAgIH0uYmluZCh0aGlzKSwgZmFsc2UpO1xuICBcbiAgICAgIHRoaXMub24oXCJlbnRlcmZyYW1lXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnBvaW50ZXIud2hlZWxEZWx0YVkgPSB0aGlzLndoZWVsRGVsdGFZO1xuICAgICAgICB0aGlzLndoZWVsRGVsdGFZID0gMDtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvL+OCouODl+ODquOCseODvOOCt+ODp+ODs+WFqOS9k+OBruOCpOODmeODs+ODiOODleODg+OCr1xuICAgIHNldHVwRXZlbnRzOiBmdW5jdGlvbigpIHt9LFxuICBcbiAgICBzZXR1cFNvdW5kOiBmdW5jdGlvbigpIHt9LFxuICAgIFxuICAgIHNldHVwRm9udEF0dHJpYnV0ZTogZnVuY3Rpb24oKSB7XG4gICAgICBwaGluYS5kaXNwbGF5LkxhYmVsLmRlZmF1bHRzLiRleHRlbmQoe1xuICAgICAgICBmb250RmFtaWx5OiBcIk1haW4tUmVndWxhclwiXG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy/oqo3oqLzjg6bjg7zjgrbjg7zjg4fjg7zjgr/mnIDmlrDlj5blvpdcbiAgICB1cGRhdGVVc2VyRGF0YTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGxldCB1c2VyID0gbnVsbDtcbiAgICAgICAgcGhpbmFfYXBwLndlYkFwaS5nZXQoXCJ1c2VyXCIsIHt9LCB7IGlzTW9jazogZmFsc2UgfSlcbiAgICAgICAgICAudGhlbihyZXNwb25zZSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZXNwb25zZSk7XG4gICAgICAgICAgICB1c2VyID0gcmVzcG9uc2UucmVzdWx0O1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLnRoZW4oKCkgPT4gcGhpbmFfYXBwLndlYkFwaS5nZXQoYHVzZXIvJHt1c2VyLnN0YWZmX2NvZGV9L3NhbGVzL3Jlc3VsdGAsIHt9LCB7IGlzTW9jazogZmFsc2UgfSkpXG4gICAgICAgICAgLnRoZW4ocmVzcG9uc2UgPT4gcmVzb2x2ZSh7IHVzZXIsIHNhbGVzOiByZXNwb25zZS5yZXN1bHQgfSkpXG4gICAgICB9KVxuICAgICAgLnRoZW4oZGF0YSA9PiB7XG4gICAgICAgIFVzZXJEYXRhLnJlc3VsdCA9IGRhdGEudXNlcjtcbiAgICAgICAgdGhpcy51c2VyRGF0YSA9IGRhdGEudXNlcjtcbiAgICAgICAgdGhpcy51c2VyU2FsZXMgPSBkYXRhLnNhbGVzO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8v44K144O844OQ44O844GL44KJ55u05YiX44Gn44Ki44K744OD44OI44KS6Kqt44G/6L6844G/XG4gICAgZG93bmxvYWRGcm9tU2VydmVyOiBmdW5jdGlvbiAocmVxdWVzdFVybCkge1xuICAgICAgaWYgKCFyZXF1ZXN0VXJsKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiZG93bmxvYWQgcmVxdWVzdCBlcnJvcjogXCIgKyByZXF1ZXN0VXJsKTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIGNvbnN0IHVybCA9IGVuY29kZVVSSShyZXF1ZXN0VXJsKTtcbiAgICAgICAgY29uc3QgdG1wID0gdXJsLnNwbGl0KFwiL1wiKTtcbiAgICAgICAgY29uc3QgZmlsZW5hbWUgPSB0bXBbdG1wLmxlbmd0aCAtIDFdO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGAke2FwcC5yb290RGlyfXNlcnZlcl9pbWFnZXMvJHtmaWxlbmFtZX1gO1xuXG4gICAgICAgIGNvbnN0IGZpbGVUcmFuc2ZlciA9IG5ldyBGaWxlVHJhbnNmZXIoKTtcbiAgICAgICAgZmlsZVRyYW5zZmVyLmRvd25sb2FkKHVybCwgZmlsZVBhdGgsXG4gICAgICAgICAgZW50cnkgPT4ge1xuICAgICAgICAgICAgLy8gYWxlcnQoJ3N1Y2Nlc3M6ICcgKyBmaWxlUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBhc3NldHMgPSB7XG4gICAgICAgICAgICAgIGltYWdlOiB7fSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBhc3NldHMuaW1hZ2VbcmVxdWVzdFVybF0gPSBmaWxlUGF0aDtcbiAgICAgICAgICAgIHRoaXMuYXNzZXRMb2FkZXIubG9hZChhc3NldHMsICgpID0+IHtcbiAgICAgICAgICAgICAgLy/jg4Djgqbjg7Pjg63jg7zjg4njgZfjgZ/jgqTjg6Hjg7zjgrjjg6rjgrnjg4jjgavov73liqBcbiAgICAgICAgICAgICAgdGhpcy5kb3dubG9hZEltYWdlLnB1c2gocmVxdWVzdFVybCk7XG4gICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZXJyb3IgPT4ge1xuICAgICAgICAgICAgLy8gYWxlcnQoJ2Vycm9yOiAnICsgZXJyb3IuY29kZSk7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuICB9KTtcbiAgXG59KTsiLCIvKlxuICogIEFzc2V0TGlzdC5qc1xuICovXG5cbnBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoXCJBc3NldExpc3RcIiwge1xuICAgIF9zdGF0aWM6IHtcbiAgICAgIGxvYWRlZDogW10sXG4gICAgICBpc0xvYWRlZDogZnVuY3Rpb24oYXNzZXRUeXBlKSB7XG4gICAgICAgIHJldHVybiBBc3NldExpc3QubG9hZGVkW2Fzc2V0VHlwZV0/IHRydWU6IGZhbHNlO1xuICAgICAgfSxcbiAgICAgIGdldDogZnVuY3Rpb24oYXNzZXRUeXBlKSB7XG4gICAgICAgIEFzc2V0TGlzdC5sb2FkZWRbYXNzZXRUeXBlXSA9IHRydWU7XG4gICAgICAgIHN3aXRjaCAoYXNzZXRUeXBlKSB7XG4gICAgICAgICAgY2FzZSBcInByZWxvYWRcIjpcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgICAgICAgXCJibGFja1wiOiBcImFzc2V0cy90ZXh0dXJlcy9jb21tb24vYmxhY2sucG5nXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGxheW91dDoge1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAvLyBmb250OiB7XG4gICAgICAgICAgICAgIC8vICAgXCJNYWluLUJvbGRcIjogXCJhc3NldHMvZm9udHMvU291cmNlSGFuU2Fuc0pQLUJvbGQub3RmXCIsXG4gICAgICAgICAgICAgIC8vICAgXCJNYWluLVJlZ3VsYXJcIjogXCJhc3NldHMvZm9udHMvU291cmNlSGFuU2Fuc0pQLVJlZ3VsYXIub3RmXCIsXG4gICAgICAgICAgICAgIC8vIH0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgY2FzZSBcImNvbW1vblwiOlxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgaW1hZ2U6IHtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgXCJpbnZhbGlkIGFzc2V0VHlwZTogXCIgKyBvcHRpb25zLmFzc2V0VHlwZTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9LFxuICB9KTtcblxufSk7XG4iLCIvKlxuICogIE1haW5TY2VuZS5qc1xuICogIDIwMTgvMTAvMjZcbiAqL1xuXG5waGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwiQmFzZVNjZW5lXCIsIHtcbiAgICBzdXBlckNsYXNzOiAnRGlzcGxheVNjZW5lJyxcblxuICAgIC8v5buD5qOE44Ko44Os44Oh44Oz44OIXG4gICAgZGlzcG9zZUVsZW1lbnRzOiBudWxsLFxuXG4gICAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IChvcHRpb25zIHx8IHt9KS4kc2FmZSh7XG4gICAgICAgIHdpZHRoOiBTQ1JFRU5fV0lEVEgsXG4gICAgICAgIGhlaWdodDogU0NSRUVOX0hFSUdIVCxcbiAgICAgICAgYmFja2dyb3VuZENvbG9yOiAndHJhbnNwYXJlbnQnLFxuICAgICAgfSk7XG4gICAgICB0aGlzLnN1cGVySW5pdChvcHRpb25zKTtcblxuICAgICAgLy/jgrfjg7zjg7Ppm6LohLHmmYJjYW52YXPjg6Hjg6Ljg6rop6PmlL5cbiAgICAgIHRoaXMuZGlzcG9zZUVsZW1lbnRzID0gW107XG4gICAgICB0aGlzLm9uZSgnZGVzdHJveScsICgpID0+IHtcbiAgICAgICAgdGhpcy5kaXNwb3NlRWxlbWVudHMuZm9yRWFjaChlID0+IGUuZGVzdHJveUNhbnZhcygpKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFwcCA9IHBoaW5hX2FwcDtcblxuICAgICAgdGhpcy5vbmUoJ2VudGVyZnJhbWUnLCBlID0+IHtcbiAgICAgICAgdGhpcy5hcHAgPSBlLmFwcDtcbiAgICAgICAgLy/liKXjgrfjg7zjg7Pjgbjjga7np7vooYzmmYLjgavjgq3jg6Pjg7Pjg5DjgrnjgpLnoLTmo4RcbiAgICAgICAgdGhpcy5vbmUoJ2V4aXQnLCAoKSA9PiB7XG4gICAgICAgICAgdGhpcy5kZXN0cm95KCk7XG4gICAgICAgICAgdGhpcy5jYW52YXMuZGVzdHJveSgpO1xuICAgICAgICAgIHRoaXMuZmxhcmUoJ2Rlc3Ryb3knKTtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkV4aXQgc2NlbmUuXCIpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBkZXN0cm95OiBmdW5jdGlvbigpIHt9LFxuXG4gICAgZmFkZUluOiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gKG9wdGlvbnMgfHwge30pLiRzYWZlKHtcbiAgICAgICAgY29sb3I6IFwid2hpdGVcIixcbiAgICAgICAgbWlsbGlzZWNvbmQ6IDUwMCxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBtYXNrID0gUmVjdGFuZ2xlU2hhcGUoe1xuICAgICAgICAgIHdpZHRoOiBTQ1JFRU5fV0lEVEgsXG4gICAgICAgICAgaGVpZ2h0OiBTQ1JFRU5fSEVJR0hULFxuICAgICAgICAgIGZpbGw6IG9wdGlvbnMuY29sb3IsXG4gICAgICAgICAgc3Ryb2tlV2lkdGg6IDAsXG4gICAgICAgIH0pLnNldFBvc2l0aW9uKFNDUkVFTl9XSURUSCAqIDAuNSwgU0NSRUVOX0hFSUdIVCAqIDAuNSkuYWRkQ2hpbGRUbyh0aGlzKTtcbiAgICAgICAgbWFzay50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAuZmFkZU91dChvcHRpb25zLm1pbGxpc2Vjb25kKVxuICAgICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIHRoaXMuYXBwLm9uZSgnZW50ZXJmcmFtZScsICgpID0+IG1hc2suZGVzdHJveUNhbnZhcygpKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBmYWRlT3V0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gKG9wdGlvbnMgfHwge30pLiRzYWZlKHtcbiAgICAgICAgY29sb3I6IFwid2hpdGVcIixcbiAgICAgICAgbWlsbGlzZWNvbmQ6IDUwMCxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBtYXNrID0gUmVjdGFuZ2xlU2hhcGUoe1xuICAgICAgICAgIHdpZHRoOiBTQ1JFRU5fV0lEVEgsXG4gICAgICAgICAgaGVpZ2h0OiBTQ1JFRU5fSEVJR0hULFxuICAgICAgICAgIGZpbGw6IG9wdGlvbnMuY29sb3IsXG4gICAgICAgICAgc3Ryb2tlV2lkdGg6IDAsXG4gICAgICAgIH0pLnNldFBvc2l0aW9uKFNDUkVFTl9XSURUSCAqIDAuNSwgU0NSRUVOX0hFSUdIVCAqIDAuNSkuYWRkQ2hpbGRUbyh0aGlzKTtcbiAgICAgICAgbWFzay5hbHBoYSA9IDA7XG4gICAgICAgIG1hc2sudHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgLmZhZGVJbihvcHRpb25zLm1pbGxpc2Vjb25kKVxuICAgICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgIHRoaXMuYXBwLm9uZSgnZW50ZXJmcmFtZScsICgpID0+IG1hc2suZGVzdHJveUNhbnZhcygpKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvL+OCouOCu+ODg+ODiOOCkuODkOODg+OCr+OCsOODqeOCpuODs+ODieOBp+iqreOBv+i+vOOBv1xuICAgIGRvd25sb2FkQXNzZXQ6IGZ1bmN0aW9uKGFzc2V0cykge1xuICAgICAgaWYgKCFhc3NldHMpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBsb2FkZXIgPSBwaGluYS5leHRlbnNpb24uQXNzZXRMb2FkZXJFeCgpO1xuICAgICAgICBsb2FkZXIubG9hZChhc3NldHMsIHRoaXMuX29uTG9hZEFzc2V0KVxuICAgICAgICAgIC50aGVuKCgpID0+IHJlc29sdmUoKSk7XG5cbiAgICAgICAgY29uc3QgbG9hZExhYmVsID0gTGFiZWwoeyB0ZXh0OiBcIlwiLCBhbGlnbjogXCJyaWdodFwiLCBmb250U2l6ZTogMTIsIGZpbGw6IFwid2hpdGVcIiwgc3Ryb2tlOiBcImJsYWNrXCIsIHN0cm9rZVdpZHRoOiAzIH0pXG4gICAgICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzKVxuICAgICAgICAgICAgLnNldFBvc2l0aW9uKFNDUkVFTl9XSURUSCAqIDAuOTksIFNDUkVFTl9IRUlHSFQgKiAwLjk5KTtcbiAgICAgICAgbG9hZExhYmVsLnRpbWUgPSAxO1xuICAgICAgICBsb2FkTGFiZWwuaXNGaW5pc2ggPSBmYWxzZTtcbiAgICAgICAgbG9hZExhYmVsLm9uKCdlbnRlcmZyYW1lJywgKCkgPT4ge1xuICAgICAgICAgIGxvYWRMYWJlbC50ZXh0ID0gXCJMb2FkaW5nLi4uIFwiICsgTWF0aC5mbG9vcihsb2FkZXIubG9hZHByb2dyZXNzICogMTAwKSArIFwiJVwiO1xuICAgICAgICAgIGlmIChsb2FkZXIuaXNMb2FkY29tcGxldGUpIHtcbiAgICAgICAgICAgIGxvYWRMYWJlbC52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChsb2FkTGFiZWwudGltZSAlIDIwID09IDApIGxvYWRMYWJlbC52aXNpYmxlID0gIWxvYWRMYWJlbC52aXNpYmxlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBsb2FkTGFiZWwudGltZSsrO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBfb25Mb2FkQXNzZXQ6IGZ1bmN0aW9uKGFzc2V0cykge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH0sXG5cbiAgICAvL+OCt+ODvOODs+mbouiEseaZguOBq+egtOajhOOBmeOCi1NoYXBl44KS55m76YyyXG4gICAgZGlzcG9zZTogZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgdGhpcy5kaXNwb3NlRWxlbWVudHMucHVzaChlbGVtZW50KTtcbiAgICB9LFxuICB9KTtcblxufSk7IiwiLypcbiAqICBGaXJzdFNjZW5lRmxvdy5qc1xuICovXG5cbnBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoXCJGaXJzdFNjZW5lRmxvd1wiLCB7XG4gICAgc3VwZXJDbGFzczogXCJNYW5hZ2VyU2NlbmVcIixcblxuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgc3RhcnRMYWJlbCA9IG9wdGlvbnMuc3RhcnRMYWJlbCB8fCBcInRpdGxlXCI7XG4gICAgICB0aGlzLnN1cGVySW5pdCh7XG4gICAgICAgIHN0YXJ0TGFiZWw6IHN0YXJ0TGFiZWwsXG4gICAgICAgIHNjZW5lczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGxhYmVsOiBcInRpdGxlXCIsXG4gICAgICAgICAgICBjbGFzc05hbWU6IFwiVGl0bGVTY2VuZVwiLFxuICAgICAgICAgICAgbmV4dExhYmVsOiBcImhvbWVcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGxhYmVsOiBcImhvbWVcIixcbiAgICAgICAgICAgIGNsYXNzTmFtZTogXCJIb21lU2NlbmVcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGxhYmVsOiBcImVkaXRwaWN0dXJlXCIsXG4gICAgICAgICAgICBjbGFzc05hbWU6IFwiRWRpdFBpY3R1cmVTY2VuZVwiLFxuICAgICAgICAgICAgbmV4dExhYmVsOiBcImhvbWVcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGxhYmVsOiBcInJlYWx0aW1lc2FsZXNcIixcbiAgICAgICAgICAgIGNsYXNzTmFtZTogXCJSZWFsdGltZVNhbGVzU2NlbmVcIixcbiAgICAgICAgICAgIG5leHRMYWJlbDogXCJob21lXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBsYWJlbDogXCJzdGFmZmluZm9ybWF0aW9uXCIsXG4gICAgICAgICAgICBjbGFzc05hbWU6IFwiU3RhZmZJbmZvcm1hdGlvblNjZW5lXCIsXG4gICAgICAgICAgICBuZXh0TGFiZWw6IFwiaG9tZVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgbGFiZWw6IFwicmFua2luZ1wiLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiBcIlJhbmtpbmdTY2VuZVwiLFxuICAgICAgICAgICAgbmV4dExhYmVsOiBcImhvbWVcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGxhYmVsOiBcImRldGFpbGRhdGFcIixcbiAgICAgICAgICAgIGNsYXNzTmFtZTogXCJEZXRhaWxEYXRhU2NlbmVcIixcbiAgICAgICAgICAgIG5leHRMYWJlbDogXCJob21lXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBsYWJlbDogXCJlcnJvclwiLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiBcIkVycm9yTWVzc2FnZVNjZW5lXCIsXG4gICAgICAgICAgICBuZXh0TGFiZWw6IFwiaG9tZVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG59KTsiLCIvL+aWh+Wtl+WIl+OCkuaMh+WumuOBl+OBn+mVt+OBleOBlOOBqOOBq+aUueihjOOCkuWFpeOCjOOCi1xuZnVuY3Rpb24gQ3V0VGV4dChzcmNUZXh0LCBiZXR3ZWVuKSB7XG4gIGJldHdlZW4gPSBiZXR3ZWVuIHx8IDIwO1xuXG4gIGZ1bmN0aW9uIHNwbGl0QnlMZW5ndGgoc3RyLCBsZW5ndGgpIHtcbiAgICBpZiAoIXN0ciB8fCAhbGVuZ3RoIHx8IGxlbmd0aCA8IDEpIHJldHVybiBbXTtcbiAgICB2YXIgcmVnZXhQYXR0ZXJuID0gbmV3IFJlZ0V4cCgnKD86W1xcdUQ4MDAtXFx1REJGRl1bXFx1REMwMC1cXHVERkZGXXxbXlxcdUQ4MDAtXFx1REZGRl0pezEsJyArIGxlbmd0aCArICd9JywnZycpO1xuICAgIHJldHVybiBzdHIubWF0Y2gocmVnZXhQYXR0ZXJuKSB8fCBbXTtcbiAgfVxuXG4gIGxldCBkZXN0VGV4dCA9IFwiXCI7XG4gIGNvbnN0IGxpc3QgPSBzcmNUZXh0LnNwbGl0KCdcXG4nKTtcbiAgbGlzdC5mb3JFYWNoKHRleHQgPT4ge1xuICAgIGNvbnN0IGxpbmUgPSBzcGxpdEJ5TGVuZ3RoKHRleHQsIGJldHdlZW4pO1xuICAgIGxpbmUuZm9yRWFjaCh0ID0+IGRlc3RUZXh0ICs9IHQgKyBcIlxcblwiKTtcbiAgfSk7XG4gIHJldHVybiBkZXN0VGV4dDtcbn1cbiIsIi8qXG4gKiAgcGhpbmEuU2VyaWFsQXNzZXRMb2FkZXIuanNcbiAqICAyMDE5LzAyLzIxXG4gKiAgQGF1dGhlciBtaW5pbW8gIFxuICogIFRoaXMgUHJvZ3JhbSBpcyBNSVQgbGljZW5zZS5cbiAqXG4gKi9cblxucGhpbmEuZXh0ZW5zaW9uID0gcGhpbmEuZXh0ZW5zaW9uIHx8IHt9O1xuXG5waGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgLy/jg5Djg4Pjgq/jgrDjg6njgqbjg7Pjg4njgafjgqLjgrvjg4Pjg4jjgpLnm7TliJfjgavoqq3jgb/ovrzjgb9cbiAgcGhpbmEuZGVmaW5lKFwicGhpbmEuZXh0ZW5zaW9uLlNlcmlhbEFzc2V0TG9hZGVyXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcInBoaW5hLnV0aWwuRXZlbnREaXNwYXRjaGVyXCIsXG5cbiAgICAvL+ODreODvOODieOBmeOCi+OCouOCu+ODg+ODiOOBruODquOCueODiFxuICAgIGxvYWRMaXN0OiBudWxsLFxuXG4gICAgLy/jg63jg7zjg4nkuK3jgqLjgrvjg4Pjg4hcbiAgICBsb2FkaW5nQXNzZXQ6IG51bGwsXG5cbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc3VwZXJJbml0KCk7XG5cbiAgICAgIHRoaXMubG9hZExpc3QgPSBbXTtcbiAgICAgIHRoaXMuX3N1cnZlaWxsYW5jZSgpO1xuICAgIH0sXG5cbiAgICAvL+iqreOBv+i+vOOBv+W+heapn+ODquOCueODiOebo+imllxuICAgIF9zdXJ2ZWlsbGFuY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgc2V0VGltZW91dCh0aGlzLl9zdXJ2ZWlsbGFuY2UuYmluZCh0aGlzKSwgMTAwKTtcbiAgICAgIGlmICh0aGlzLmxvYWRpbmdBc3NldCB8fCB0aGlzLmxvYWRMaXN0Lmxlbmd0aCA9PSAwKSByZXR1cm47XG5cbiAgICAgIHRoaXMubG9hZGluZ0Fzc2V0ID0gdGhpcy5sb2FkTGlzdC5zaGlmdCgpO1xuICAgICAgY29uc3QgYXNzZXRzID0gdGhpcy5sb2FkaW5nQXNzZXQuYXNzZXRzO1xuICAgICAgY29uc3QgY2FsbGJhY2sgPSB0aGlzLmxvYWRpbmdBc3NldC5jYWxsYmFjaztcblxuICAgICAgdmFyIGxvYWRlciA9IHBoaW5hLmFzc2V0LkFzc2V0TG9hZGVyKCk7XG4gICAgICBsb2FkZXIubG9hZChhc3NldHMpO1xuICAgICAgbG9hZGVyLm9uKCdsb2FkJywgKGUpID0+IHtcbiAgICAgICAgdGhpcy5sb2FkaW5nQXNzZXQgPSBudWxsO1xuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICBjYWxsYmFjayhhc3NldHMpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnNvbGUubG9nKFwiKioqKiBTZXJpYWwgbG9hZCBmaW5pc2g6IFwiLiBhc3NldHMpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIGxvYWQ6IGZ1bmN0aW9uKGFzc2V0cywgY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24oKSB7fTtcblxuICAgICAgLy/jg63jg7zjg4nmuIjjgb/jga7jgqLjgrvjg4Pjg4jjgpLpmaTlpJbjgZnjgotcbiAgICAgIGNvbnN0IGxvYWRBc3NldHMgPSB0aGlzLnlldExvYWRlZEFzc2V0cyhhc3NldHMpO1xuICAgICAgaWYgKCFsb2FkQXNzZXRzKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBlbGVtZW50ID0ge1xuICAgICAgICBhc3NldHM6IGxvYWRBc3NldHMsXG4gICAgICAgIGNhbGxiYWNrLFxuICAgICAgfTtcbiAgICAgIHRoaXMubG9hZExpc3QucHVzaChlbGVtZW50KTtcbiAgICAgIGNvbnNvbGUubG9nKFwiKioqKiBTZXJpYWwgbG9hZDogXCIuIGxvYWRBc3NldHMpO1xuICAgIH0sXG5cbiAgICAvL+ODkeODqeODoeODvOOCv+OBruS4reOBp+iqreOBv+i+vOOBv+OCkuOBl+OBpuOBhOOBquOBhOOCouOCu+ODg+ODiOOCkui/lOOBmVxuICAgIHlldExvYWRlZEFzc2V0czogZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgICBpZiAoIXBhcmFtcykgcmV0dXJuIG51bGw7XG5cbiAgICAgIGNvbnN0IHlldCA9IHt9O1xuICAgICAgcGFyYW1zLmZvckluKCh0eXBlLCBhc3NldHMpID0+IHtcbiAgICAgICAgYXNzZXRzLmZvckluKChrZXksIHZhbHVlKSA9PiB7XG4gICAgICAgICAgaWYgKCFwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KHR5cGUsIGtleSkpIHtcbiAgICAgICAgICAgIHlldFt0eXBlXSA9IHlldFt0eXBlXSB8fCB7fTtcbiAgICAgICAgICAgIHlldFt0eXBlXVtrZXldID0gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIChPYmplY3Qua2V5cyh5ZXQpLmxlbmd0aCA+IDApID8geWV0IDogbnVsbDtcbiAgICB9XG4gIH0pO1xuXG59KTtcbiIsIi8qXG4gKiAgcGhpbmEuYXNzZXRsb2FkZXJleC5qc1xuICogIDIwMTYvMTEvMjVcbiAqICBAYXV0aGVyIG1pbmltbyAgXG4gKiAgVGhpcyBQcm9ncmFtIGlzIE1JVCBsaWNlbnNlLlxuICpcbiAqL1xuXG5waGluYS5leHRlbnNpb24gPSBwaGluYS5leHRlbnNpb24gfHwge307XG5cbnBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICAvL+ODkOODg+OCr+OCsOODqeOCpuODs+ODieOBp+OCouOCu+ODg+ODiOiqreOBv+i+vOOBv1xuICBwaGluYS5kZWZpbmUoXCJwaGluYS5leHRlbnNpb24uQXNzZXRMb2FkZXJFeFwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJwaGluYS51dGlsLkV2ZW50RGlzcGF0Y2hlclwiLFxuXG4gICAgLy/pgLLmjZdcbiAgICBsb2FkcHJvZ3Jlc3M6IDAsXG5cbiAgICAvL+iqreOBv+i+vOOBv+e1guS6huODleODqeOCsFxuICAgIGlzTG9hZGNvbXBsZXRlOiBmYWxzZSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB9LFxuXG4gICAgbG9hZDogZnVuY3Rpb24oYXNzZXRzLCBjYWxsYmFjaykge1xuICAgICAgdGhpcy5fb25Mb2FkQXNzZXRzID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24oKSB7fTtcbiAgICAgIFxuICAgICAgY29uc3QgbG9hZEFzc2V0cyA9IHRoaXMueWV0TG9hZGVkQXNzZXRzKGFzc2V0cyk7XG4gICAgICBpZiAoIWxvYWRBc3NldHMpIHtcbiAgICAgICAgdGhpcy5pc0xvYWRjb21wbGV0ZSA9IHRydWU7XG4gICAgICAgIHRoaXMubG9hZHByb2dyZXNzID0gMTtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIHZhciBsb2FkZXIgPSBwaGluYS5hc3NldC5Bc3NldExvYWRlcigpO1xuICAgICAgICBsb2FkZXIubG9hZChsb2FkQXNzZXRzKTtcbiAgICAgICAgbG9hZGVyLm9uKCdsb2FkJywgKGUpID0+IHtcbiAgICAgICAgICB0aGlzLmZsYXJlKCdsb2FkY29tcGxldGUnKTtcbiAgICAgICAgICB0aGlzLmlzTG9hZGNvbXBsZXRlID0gdHJ1ZTtcbiAgICAgICAgICB0aGlzLl9vbkxvYWRBc3NldHMoYXNzZXRzKTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBsb2FkZXIub24oJ3Byb2dyZXNzJywgZSA9PiB7XG4gICAgICAgICAgdGhpcy5sb2FkcHJvZ3Jlc3MgPSBlLnByb2dyZXNzO1xuICAgICAgICAgIHRoaXMuZmxhcmUoJ3Byb2dyZXNzJywgeyBwcm9ncmVzczogZS5wcm9ncmVzcyB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy/jg5Hjg6njg6Hjg7zjgr/jga7kuK3jgafoqq3jgb/ovrzjgb/jgpLjgZfjgabjgYTjgarjgYTjgqLjgrvjg4Pjg4jjgpLov5TjgZlcbiAgICB5ZXRMb2FkZWRBc3NldHM6IGZ1bmN0aW9uKHBhcmFtcykge1xuICAgICAgaWYgKCFwYXJhbXMpIHJldHVybiBudWxsO1xuXG4gICAgICBjb25zdCB5ZXQgPSB7fTtcbiAgICAgIHBhcmFtcy5mb3JJbigodHlwZSwgYXNzZXRzKSA9PiB7XG4gICAgICAgIGFzc2V0cy5mb3JJbigoa2V5LCB2YWx1ZSkgPT4ge1xuICAgICAgICAgIGlmICghcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmdldCh0eXBlLCBrZXkpKSB7XG4gICAgICAgICAgICB5ZXRbdHlwZV0gPSB5ZXRbdHlwZV0gfHwge307XG4gICAgICAgICAgICB5ZXRbdHlwZV1ba2V5XSA9IHZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiAoT2JqZWN0LmtleXMoeWV0KS5sZW5ndGggPiAwKSA/IHlldCA6IG51bGw7XG4gICAgfVxuICB9KTtcblxufSk7IiwicGhpbmEuZGVmaW5lKFwiQnV0dG9uXCIsIHtcbiAgc3VwZXJDbGFzczogXCJBY2Nlc3NvcnlcIixcblxuICBsb2ducHJlc3NUaW1lOiA1MDAsXG4gIGRvTG9uZ3ByZXNzOiBmYWxzZSxcblxuICAvL+mVt+aKvOOBl+OBp+mAo+aJk+ODouODvOODiVxuICBsb25ncHJlc3NCYXJyYWdlOiBmYWxzZSxcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuXG4gICAgdGhpcy5vbihcImF0dGFjaGVkXCIsICgpID0+IHtcbiAgICAgIHRoaXMudGFyZ2V0LmludGVyYWN0aXZlID0gdHJ1ZTtcbiAgICAgIHRoaXMudGFyZ2V0LmNsaWNrU291bmQgPSBCdXR0b24uZGVmYXVsdHMuY2xpY2tTb3VuZDtcblxuICAgICAgLy/jg5zjgr/jg7PmirzjgZfmmYLnlKhcbiAgICAgIHRoaXMudGFyZ2V0LnNjYWxlVHdlZW5lciA9IFR3ZWVuZXIoKS5hdHRhY2hUbyh0aGlzLnRhcmdldCk7XG5cbiAgICAgIC8v6ZW35oq844GX55SoXG4gICAgICB0aGlzLnRhcmdldC50d0xvbmdwcmVzcyA9IFR3ZWVuZXIoKS5hdHRhY2hUbyh0aGlzLnRhcmdldCk7XG5cbiAgICAgIC8v6ZW35oq844GX5Lit54m55q6K5a++5b+c55SoXG4gICAgICB0aGlzLnRhcmdldC50d0xvbmdwcmVzc2luZyA9IFR3ZWVuZXIoKS5hdHRhY2hUbyh0aGlzLnRhcmdldCk7XG5cbiAgICAgIHRoaXMudGFyZ2V0Lm9uKFwicG9pbnRzdGFydFwiLCAoZSkgPT4ge1xuXG4gICAgICAgIC8v44Kk44OZ44Oz44OI6LKr6YCa44Gr44GX44Gm44GK44GPXG4gICAgICAgIGUucGFzcyA9IHRydWU7XG5cbiAgICAgICAgLy/jg5zjgr/jg7Pjga7lkIzmmYLmirzjgZfjgpLliLbpmZBcbiAgICAgICAgaWYgKEJ1dHRvbi5hY3Rpb25UYXJnZXQgIT09IG51bGwpIHJldHVybjtcblxuICAgICAgICAvL+ODquOCueODiOODk+ODpeODvOOBruWtkOS+m+OBoOOBo+OBn+WgtOWQiOOBr3ZpZXdwb3J044Go44Gu44GC44Gf44KK5Yik5a6a44KS44GZ44KLXG4gICAgICAgIGNvbnN0IGxpc3RWaWV3ID0gQnV0dG9uLmZpbmRMaXN0VmlldyhlLnRhcmdldCk7XG4gICAgICAgIGlmIChsaXN0VmlldyAmJiAhbGlzdFZpZXcudmlld3BvcnQuaGl0VGVzdChlLnBvaW50ZXIueCwgZS5wb2ludGVyLnkpKSByZXR1cm47XG5cbiAgICAgICAgaWYgKGxpc3RWaWV3KSB7XG4gICAgICAgICAgLy/jg53jgqTjg7Pjgr/jgYznp7vli5XjgZfjgZ/loLTlkIjjga/plbfmirzjgZfjgq3jg6Pjg7Pjgrvjg6vvvIhsaXN0Vmlld+WGheeJiO+8iVxuICAgICAgICAgIGxpc3RWaWV3LmlubmVyLiR3YXRjaCgneScsICh2MSwgdjIpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLnRhcmdldCAhPT0gQnV0dG9uLmFjdGlvblRhcmdldCkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKE1hdGguYWJzKHYxIC0gdjIpIDwgMTApIHJldHVybjtcblxuICAgICAgICAgICAgQnV0dG9uLmFjdGlvblRhcmdldCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnRhcmdldC50d0xvbmdwcmVzcy5jbGVhcigpO1xuICAgICAgICAgICAgdGhpcy50YXJnZXQuc2NhbGVUd2VlbmVyLmNsZWFyKCkudG8oeyBzY2FsZVg6IDEuMCAqIHRoaXMuc3gsIHNjYWxlWTogMS4wICogdGhpcy5zeSB9LCA1MCk7XG4gICAgICAgICAgICAvLyBpZiAodGhpcy50YXJnZXQudHdMb25ncHJlc3MucGxheWluZyAmJiB2MSAhPSB2Mikge1xuICAgICAgICAgICAgLy8gICBCdXR0b24uYWN0aW9uVGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgICAgIC8vICAgdGhpcy50YXJnZXQudHdMb25ncHJlc3MuY2xlYXIoKTtcbiAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8v44Oc44K/44Oz44Gu5Yem55CG44KS5a6f6KGM44GX44Gm44KC5ZWP6aGM44Gq44GE5aC05ZCI44Gu44G/6LKr6YCa44KS5YGc5q2i44GZ44KLXG4gICAgICAgIGUucGFzcyA9IGZhbHNlO1xuICAgICAgICBCdXR0b24uYWN0aW9uVGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG5cbiAgICAgICAgLy/lj43ou6LjgZfjgabjgYTjgovjg5zjgr/jg7PnlKjjgavkv53mjIHjgZnjgotcbiAgICAgICAgdGhpcy5zeCA9ICh0aGlzLnRhcmdldC5zY2FsZVggPiAwKSA/IDEgOiAtMTtcbiAgICAgICAgdGhpcy5zeSA9ICh0aGlzLnRhcmdldC5zY2FsZVkgPiAwKSA/IDEgOiAtMTtcblxuICAgICAgICB0aGlzLnRhcmdldC5zY2FsZVR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgIC50byh7IHNjYWxlWDogMC44ICogdGhpcy5zeCwgc2NhbGVZOiAwLjggKiB0aGlzLnN5IH0sIDUwKTtcblxuICAgICAgICB0aGlzLmRvTG9uZ3ByZXNzID0gZmFsc2U7XG4gICAgICAgIHRoaXMudGFyZ2V0LnR3TG9uZ3ByZXNzLmNsZWFyKClcbiAgICAgICAgICAud2FpdCh0aGlzLmxvZ25wcmVzc1RpbWUpXG4gICAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmxvbmdwcmVzc0JhcnJhZ2UpIHtcbiAgICAgICAgICAgICAgQnV0dG9uLmFjdGlvblRhcmdldCA9IG51bGw7XG4gICAgICAgICAgICAgIHRoaXMudGFyZ2V0LnNjYWxlVHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgICAgICAgLnRvKHsgc2NhbGVYOiAxLjAgKiB0aGlzLnN4LCBzY2FsZVk6IDEuMCAqIHRoaXMuc3kgfSwgNTApXG4gICAgICAgICAgICAgIHRoaXMudGFyZ2V0LmZsYXJlKFwibG9uZ3ByZXNzXCIpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aGlzLnRhcmdldC5mbGFyZShcImNsaWNrU291bmRcIik7XG4gICAgICAgICAgICAgIHRoaXMudGFyZ2V0LnR3TG9uZ3ByZXNzaW5nLmNsZWFyKClcbiAgICAgICAgICAgICAgICAud2FpdCg1KVxuICAgICAgICAgICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0LmZsYXJlKFwiY2xpY2tlZFwiLCB7IGxvbmdwcmVzczogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0LmZsYXJlKFwibG9uZ3ByZXNzaW5nXCIpO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgLnNldExvb3AodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQub24oXCJwb2ludGVuZFwiLCAoZSkgPT4ge1xuICAgICAgICAvL+OCpOODmeODs+ODiOiyq+mAmuOBq+OBl+OBpuOBiuOBj1xuICAgICAgICBlLnBhc3MgPSB0cnVlO1xuXG4gICAgICAgIC8vXG4gICAgICAgIHRoaXMudGFyZ2V0LnR3TG9uZ3ByZXNzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMudGFyZ2V0LnR3TG9uZ3ByZXNzaW5nLmNsZWFyKCk7XG5cbiAgICAgICAgLy/jgr/jg7zjgrLjg4Pjg4jjgYxudWxs44GLcG9pbnRzdGFydOOBp+S/neaMgeOBl+OBn+OCv+ODvOOCsuODg+ODiOOBqOmBleOBhuWgtOWQiOOBr+OCueODq+ODvOOBmeOCi1xuICAgICAgICBpZiAoQnV0dG9uLmFjdGlvblRhcmdldCA9PT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICBpZiAoQnV0dG9uLmFjdGlvblRhcmdldCAhPT0gdGhpcy50YXJnZXQpIHJldHVybjtcblxuICAgICAgICAvL+ODnOOCv+ODs+OBruWHpueQhuOCkuWun+ihjOOBl+OBpuOCguWVj+mhjOOBquOBhOWgtOWQiOOBruOBv+iyq+mAmuOCkuWBnOatouOBmeOCi1xuICAgICAgICBlLnBhc3MgPSBmYWxzZTtcblxuICAgICAgICAvL+aKvOOBl+OBn+S9jee9ruOBi+OCieOBguOCi+eoi+W6puenu+WLleOBl+OBpuOBhOOCi+WgtOWQiOOBr+OCr+ODquODg+OCr+OCpOODmeODs+ODiOOCkueZuueUn+OBleOBm+OBquOBhFxuICAgICAgICBjb25zdCBpc01vdmUgPSBlLnBvaW50ZXIuc3RhcnRQb3NpdGlvbi5zdWIoZS5wb2ludGVyLnBvc2l0aW9uKS5sZW5ndGgoKSA+IDUwO1xuICAgICAgICBjb25zdCBoaXRUZXN0ID0gdGhpcy50YXJnZXQuaGl0VGVzdChlLnBvaW50ZXIueCwgZS5wb2ludGVyLnkpO1xuICAgICAgICBpZiAoaGl0VGVzdCAmJiAhaXNNb3ZlKSB0aGlzLnRhcmdldC5mbGFyZShcImNsaWNrU291bmRcIik7XG5cbiAgICAgICAgdGhpcy50YXJnZXQuc2NhbGVUd2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAudG8oeyBzY2FsZVg6IDEuMCAqIHRoaXMuc3gsIHNjYWxlWTogMS4wICogdGhpcy5zeSB9LCA1MClcbiAgICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgICBCdXR0b24uYWN0aW9uVGFyZ2V0ID0gbnVsbDtcbiAgICAgICAgICAgIGlmICghaGl0VGVzdCB8fCBpc01vdmUgfHwgdGhpcy5kb0xvbmdwcmVzcykgcmV0dXJuO1xuICAgICAgICAgICAgdGhpcy50YXJnZXQuZmxhcmUoXCJjbGlja2VkXCIsIHsgcG9pbnRlcjogZS5wb2ludGVyIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICAgIC8v44Ki44OL44Oh44O844K344On44Oz44Gu5pyA5Lit44Gr5YmK6Zmk44GV44KM44Gf5aC05ZCI44Gr5YKZ44GI44GmcmVtb3ZlZOOCpOODmeODs+ODiOaZguOBq+ODleODqeOCsOOCkuWFg+OBq+aIu+OBl+OBpuOBiuOBj1xuICAgICAgdGhpcy50YXJnZXQub25lKFwicmVtb3ZlZFwiLCAoKSA9PiB7XG4gICAgICAgIGlmIChCdXR0b24uYWN0aW9uVGFyZ2V0ID09PSB0aGlzLnRhcmdldCkge1xuICAgICAgICAgIEJ1dHRvbi5hY3Rpb25UYXJnZXQgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQub24oXCJjbGlja1NvdW5kXCIsICgpID0+IHtcbiAgICAgICAgLy8gaWYgKCF0aGlzLnRhcmdldC5jbGlja1NvdW5kIHx8IHRoaXMudGFyZ2V0LmNsaWNrU291bmQgPT0gXCJcIikgcmV0dXJuO1xuICAgICAgICAvLyBwaGluYS5hc3NldC5Tb3VuZE1hbmFnZXIucGxheSh0aGlzLnRhcmdldC5jbGlja1NvdW5kKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8v6ZW35oq844GX44Gu5by35Yi244Kt44Oj44Oz44K744OrXG4gIGxvbmdwcmVzc0NhbmNlbDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy50YXJnZXQudHdMb25ncHJlc3MuY2xlYXIoKTtcbiAgICB0aGlzLnRhcmdldC50d0xvbmdwcmVzc2luZy5jbGVhcigpO1xuICB9LFxuXG4gIF9zdGF0aWM6IHtcbiAgICAvL+ODnOOCv+ODs+WQjOaZguaKvOOBl+OCkuWItuW+oeOBmeOCi+OBn+OCgeOBq3N0YXR1c+OBr3N0YXRpY+OBq+OBmeOCi1xuICAgIHN0YXR1czogMCxcbiAgICBhY3Rpb25UYXJnZXQ6IG51bGwsXG4gICAgLy/ln7rmnKzoqK3lrppcbiAgICBkZWZhdWx0czoge1xuICAgICAgY2xpY2tTb3VuZDogXCJzZV9jbGlja1wiLCAvL1RPRE8644Go44KK44GC44GI44Ga54Sh6Z+zXG4gICAgfSxcblxuICAgIC8vTGlzdFZpZXfjgpLopqrjgpLjgZ/jganjgaPjgabmjqLjgZlcbiAgICBmaW5kTGlzdFZpZXc6IGZ1bmN0aW9uKGVsZW1lbnQsIHApIHtcbiAgICAgIC8v44Oq44K544OI44OT44Ol44O844KS5oyB44Gj44Gm44GE44KL5aC05ZCIXG4gICAgICBpZiAoZWxlbWVudC5MaXN0VmlldyAhPSBudWxsKSByZXR1cm4gZWxlbWVudC5MaXN0VmlldztcbiAgICAgIC8v6Kaq44GM44Gq44GR44KM44Gw57WC5LqGXG4gICAgICBpZiAoZWxlbWVudC5wYXJlbnQgPT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gICAgICAvL+imquOCkuOBn+OBqeOCi1xuICAgICAgcmV0dXJuIHRoaXMuZmluZExpc3RWaWV3KGVsZW1lbnQucGFyZW50KTtcbiAgICB9XG5cbiAgfVxuXG59KTtcbiIsInBoaW5hLmRlZmluZShcIkdhdWdlXCIsIHtcbiAgc3VwZXJDbGFzczogXCJSZWN0YW5nbGVDbGlwXCIsXG5cbiAgX21pbjogMCxcbiAgX21heDogMS4wLFxuICBfdmFsdWU6IDEuMCwgLy9taW4gfiBtYXhcblxuICBkaXJlY3Rpb246IFwiaG9yaXpvbnRhbFwiLCAvLyBob3Jpem9udGFsIG9yIHZlcnRpY2FsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB0aGlzLm9uKFwiYXR0YWNoZWRcIiwgKCkgPT4ge1xuICAgICAgdGhpcy5fd2lkdGggPSB0aGlzLndpZHRoO1xuICAgICAgdGhpcy5faGVpZ2h0ID0gdGhpcy53aWR0aDtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJHYXVnZS5taW5cIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLm1pbixcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMubWluID0gdixcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRhcmdldC5hY2Nlc3NvcihcIkdhdWdlLm1heFwiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMubWF4LFxuICAgICAgICBcInNldFwiOiAodikgPT4gdGhpcy5tYXggPSB2LFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiR2F1Z2UudmFsdWVcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLnZhbHVlLFxuICAgICAgICBcInNldFwiOiAodikgPT4gdGhpcy52YWx1ZSA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJHYXVnZS5wcm9ncmVzc1wiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMucHJvZ3Jlc3MsXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLnByb2dyZXNzID0gdixcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIF9yZWZyZXNoOiBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5kaXJlY3Rpb24gIT09IFwidmVydGljYWxcIikge1xuICAgICAgdGhpcy53aWR0aCA9IHRoaXMudGFyZ2V0LndpZHRoICogdGhpcy5wcm9ncmVzcztcbiAgICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy50YXJnZXQuaGVpZ2h0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLndpZHRoID0gdGhpcy50YXJnZXQud2lkdGg7XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMudGFyZ2V0LmhlaWdodCAqIHRoaXMucHJvZ3Jlc3M7XG4gICAgfVxuICB9LFxuXG4gIF9hY2Nlc3Nvcjoge1xuICAgIHByb2dyZXNzOiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCBwID0gKHRoaXMudmFsdWUgLSB0aGlzLm1pbikgLyAodGhpcy5tYXggLSB0aGlzLm1pbik7XG4gICAgICAgIHJldHVybiAoaXNOYU4ocCkpID8gMC4wIDogcDtcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHsgdGhpcy52YWx1ZSA9IHRoaXMubWF4ICogdjsgfVxuICAgIH0sXG5cbiAgICBtYXg6IHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9tYXg7IH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgdGhpcy5fbWF4ID0gdjtcbiAgICAgICAgdGhpcy5fcmVmcmVzaCgpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBtaW46IHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9taW47IH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgdGhpcy5fbWluID0gdjtcbiAgICAgICAgdGhpcy5fcmVmcmVzaCgpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICB2YWx1ZToge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX3ZhbHVlOyB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdjtcbiAgICAgICAgdGhpcy5fcmVmcmVzaCgpO1xuICAgICAgfVxuICAgIH0sXG4gIH1cblxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJHcmF5c2NhbGVcIiwge1xuICBzdXBlckNsYXNzOiBcIkFjY2Vzc29yeVwiLFxuXG4gIGdyYXlUZXh0dXJlTmFtZTogbnVsbCxcblxuICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB0aGlzLm9uKFwiYXR0YWNoZWRcIiwgKCkgPT4ge1xuICAgICAgdGhpcy5ncmF5VGV4dHVyZU5hbWUgPSBvcHRpb25zLmdyYXlUZXh0dXJlTmFtZTtcbiAgICAgIHRoaXMubm9ybWFsID0gdGhpcy50YXJnZXQuaW1hZ2U7XG4gICAgfSk7XG4gIH0sXG5cbiAgdG9HcmF5c2NhbGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGFyZ2V0LmltYWdlID0gdGhpcy5ncmF5VGV4dHVyZU5hbWU7XG4gIH0sXG5cbiAgdG9Ob3JtYWw6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGFyZ2V0LmltYWdlID0gdGhpcy5ub3JtYWw7XG4gIH0sXG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKCgpID0+IHtcblxuICBwaGluYS5kZWZpbmUoXCJMaXN0Vmlld1wiLCB7XG4gICAgc3VwZXJDbGFzczogXCJBY2Nlc3NvcnlcIixcblxuICAgIHNjcm9sbFR5cGU6IG51bGwsXG5cbiAgICBpdGVtczogbnVsbCxcblxuICAgIGdldFZpZXdJZDogbnVsbCwgLy8gaXRlbeOBi+OCieWvvuW/nOOBmeOCi3ZpZXfjga5KU09O44KS6YG45YilIChpdGVtKSA9PiBqc29uXG4gICAgYmluZDogbnVsbCwgLy8gaXRlbeOBruaDheWgseOCknZpZXfjgavlj43mmKAgKHZpZXcsIGl0ZW0sIGxpc3RWaWV3KSA9PiB2b2lkLFxuXG4gICAgdmlld0pTT05zOiBudWxsLFxuXG4gICAgc2Nyb2xsQmFyOiBudWxsLFxuICAgIHNjcm9sbEJhckhhbmRsZTogbnVsbCxcbiAgICB2aWV3cG9ydDogbnVsbCxcbiAgICBpbm5lcjogbnVsbCxcblxuICAgIHNjcm9sbDogMCxcbiAgICBzY3JvbGxMb2NrOiBmYWxzZSxcblxuICAgIHZpZXdIZWlnaHQ6IDEsXG5cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICB0aGlzLnN1cGVySW5pdChvcHRpb25zKTtcblxuICAgICAgb3B0aW9ucyA9ICh7fSkuJHNhZmUob3B0aW9ucywgTGlzdFZpZXcuZGVmYXVsdHMpO1xuXG4gICAgICB0aGlzLml0ZW1zID0gW107XG5cbiAgICAgIHRoaXMuZ2V0Vmlld0lkID0gKGl0ZW0pID0+IG51bGw7XG4gICAgICB0aGlzLmJpbmQgPSAodmlldywgaXRlbSwgbGlzdFZpZXcpID0+IHt9O1xuXG4gICAgICB0aGlzLml0ZW1NYXJnaW5MZWZ0ID0gb3B0aW9ucy5pdGVtTWFyZ2luTGVmdDtcbiAgICAgIHRoaXMuaXRlbU1hcmdpblRvcCA9IG9wdGlvbnMuaXRlbU1hcmdpblRvcDtcblxuICAgICAgdGhpcy5vbihcImF0dGFjaGVkXCIsICgpID0+IHtcbiAgICAgICAgdGhpcy50YXJnZXQub25lKFwicmVhZHlcIiwgKCkgPT4ge1xuICAgICAgICAgIHRoaXMuc2V0dXAob3B0aW9ucylcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGlmICh0aGlzLnRhcmdldC5wYXJlbnQpIHtcbiAgICAgICAgLy8gICB0aGlzLnNldHVwKG9wdGlvbnMpO1xuICAgICAgICAvLyB9IGVsc2Uge1xuICAgICAgICAvLyAgIHRoaXMudGFyZ2V0Lm9uZShcImFkZGVkXCIsICgpID0+IHtcbiAgICAgICAgLy8gICAgIHRoaXMuc2V0dXAob3B0aW9ucyk7XG4gICAgICAgIC8vICAgfSk7XG4gICAgICAgIC8vIH1cbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBzZXR1cDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgY29uc3QgZmluZExheW91dFJvb3QgPSAoZWxlbWVudCkgPT4ge1xuICAgICAgICBpZiAoZWxlbWVudC5sYXlvdXRBc3NldCkge1xuICAgICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQucGFyZW50KSB7XG4gICAgICAgICAgcmV0dXJuIGZpbmRMYXlvdXRSb290KGVsZW1lbnQucGFyZW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgY29uc3QgbGF5b3V0Um9vdCA9IGZpbmRMYXlvdXRSb290KHRoaXMudGFyZ2V0KTtcbiAgICAgIGNvbnN0IGFzc2V0ID0gbGF5b3V0Um9vdC5sYXlvdXRBc3NldDtcblxuICAgICAgdGhpcy5zY3JvbGxUeXBlID0gb3B0aW9ucy5zY3JvbGxUeXBlO1xuXG4gICAgICB0aGlzLnZpZXdwb3J0ID0gdGhpcy5fY3JlYXRlVmlld3BvcnQob3B0aW9ucykuYWRkQ2hpbGRUbyh0aGlzLnRhcmdldCk7XG4gICAgICB0aGlzLmlubmVyID0gdGhpcy5fY3JlYXRlSW5uZXIob3B0aW9ucywgdGhpcy52aWV3cG9ydCkuYWRkQ2hpbGRUbyh0aGlzLnZpZXdwb3J0KTtcbiAgICAgIHRoaXMuZnJvbnQgPSB0aGlzLl9jcmVhdGVGcm9udChvcHRpb25zLCB0aGlzLnZpZXdwb3J0LCB0aGlzLmlubmVyKS5hZGRDaGlsZFRvKHRoaXMudGFyZ2V0KTtcbiAgICAgIHRoaXMuX3NldHVwU2Nyb2xsQmFyKG9wdGlvbnMsIHRoaXMudmlld3BvcnQsIHRoaXMuaW5uZXIpO1xuXG4gICAgICB0aGlzLl9zZXR1cFdoZWVsQ29udHJvbChvcHRpb25zLCB0aGlzLnZpZXdwb3J0LCB0aGlzLmlubmVyLCB0aGlzLmZyb250KTtcbiAgICAgIHRoaXMuX3NldHVwVG91Y2hDb250cm9sKG9wdGlvbnMsIHRoaXMudmlld3BvcnQsIHRoaXMuaW5uZXIsIHRoaXMuZnJvbnQpO1xuXG4gICAgICBjb25zdCBmaW5kQnlJZCA9IChpZCwgZWxlbWVudCkgPT4ge1xuICAgICAgICBpZiAoZWxlbWVudC5pZCA9PT0gaWQpIHtcbiAgICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjaGlsZHJlbiA9IE9iamVjdC5rZXlzKGVsZW1lbnQuY2hpbGRyZW4gfHwge30pLm1hcChrZXkgPT4gZWxlbWVudC5jaGlsZHJlbltrZXldKTtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBoaXQgPSBmaW5kQnlJZChpZCwgY2hpbGRyZW5baV0pO1xuICAgICAgICAgICAgaWYgKGhpdCkgcmV0dXJuIGhpdDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBjb25zdCB2aWV3SWRzID0gb3B0aW9ucy5pdGVtLnNwbGl0KFwiLFwiKS5tYXAoXyA9PiBfLnRyaW0oKSk7XG4gICAgICB0aGlzLnZpZXdKU09OcyA9IHZpZXdJZHNcbiAgICAgICAgLm1hcChpZCA9PiBmaW5kQnlJZChpZCwgYXNzZXQuZGF0YS5yb290KSlcbiAgICAgICAgLnJlZHVjZSgob2JqLCB2aWV3KSA9PiB7XG4gICAgICAgICAgb2JqW3ZpZXcuaWRdID0gdmlldztcbiAgICAgICAgICByZXR1cm4gb2JqO1xuICAgICAgICB9LCB7fSk7XG4gICAgICB0aGlzLmdldFZpZXdJZCA9IChpdGVtKSA9PiB2aWV3SWRzWzBdO1xuXG4gICAgICAvLyDlrp/kvZPljJbjgZXjgozjgZ/jg5Pjg6Xjg7zjgpLkuIDml6bliYrpmaTjgZnjgotcbiAgICAgIHZpZXdJZHMuZm9yRWFjaChpZCA9PiBsYXlvdXRSb290LnJlZltpZF0ucmVtb3ZlKCkpO1xuXG4gICAgICB0aGlzLnNjcm9sbEJhciA9IGxheW91dFJvb3QucmVmW29wdGlvbnMuc2Nyb2xsQmFyXTtcbiAgICAgIHRoaXMuc2Nyb2xsQmFySGFuZGxlID0gbGF5b3V0Um9vdC5yZWZbb3B0aW9ucy5zY3JvbGxCYXJIYW5kbGVdO1xuXG4gICAgfSxcblxuICAgIF9jcmVhdGVWaWV3cG9ydDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgY29uc3Qgdmlld3BvcnQgPSBEaXNwbGF5RWxlbWVudCgpO1xuXG4gICAgICB2aWV3cG9ydC54ID0gb3B0aW9ucy5zY3JvbGxSZWN0Lng7XG4gICAgICB2aWV3cG9ydC55ID0gb3B0aW9ucy5zY3JvbGxSZWN0Lnk7XG4gICAgICB2aWV3cG9ydC53aWR0aCA9IG9wdGlvbnMuc2Nyb2xsUmVjdC53aWR0aDtcbiAgICAgIHZpZXdwb3J0LmhlaWdodCA9IG9wdGlvbnMuc2Nyb2xsUmVjdC5oZWlnaHQ7XG4gICAgICB2aWV3cG9ydC5jbGlwID0gKGNhbnZhcykgPT4ge1xuICAgICAgICBjb25zdCB3ID0gdmlld3BvcnQud2lkdGg7XG4gICAgICAgIGNvbnN0IGggPSB2aWV3cG9ydC5oZWlnaHQ7XG5cbiAgICAgICAgY29uc3QgY3R4ID0gY2FudmFzLmNvbnRleHQ7XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4Lm1vdmVUbyh3ICogLTAuNSwgaCAqIC0wLjUpO1xuICAgICAgICBjdHgubGluZVRvKHcgKiArMC41LCBoICogLTAuNSk7XG4gICAgICAgIGN0eC5saW5lVG8odyAqICswLjUsIGggKiArMC41KTtcbiAgICAgICAgY3R4LmxpbmVUbyh3ICogLTAuNSwgaCAqICswLjUpO1xuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gdmlld3BvcnQ7XG4gICAgfSxcblxuICAgIF9jcmVhdGVJbm5lcjogZnVuY3Rpb24ob3B0aW9ucywgdmlld3BvcnQpIHtcbiAgICAgIGlmIChvcHRpb25zLmlubmVyKSB7XG4gICAgICAgIC8vIFRPRE9cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGlubmVyID0gRGlzcGxheUVsZW1lbnQoKTtcblxuICAgICAgICBpbm5lci54ID0gLXZpZXdwb3J0LndpZHRoICogdmlld3BvcnQub3JpZ2luWDtcbiAgICAgICAgaW5uZXIueSA9IC12aWV3cG9ydC5oZWlnaHQgKiB2aWV3cG9ydC5vcmlnaW5ZO1xuICAgICAgICBpbm5lci5vcmlnaW5YID0gMDtcbiAgICAgICAgaW5uZXIub3JpZ2luWSA9IDA7XG5cbiAgICAgICAgcmV0dXJuIGlubmVyO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBfY3JlYXRlRnJvbnQ6IGZ1bmN0aW9uKG9wdGlvbnMsIHZpZXdwb3J0LCBpbm5lcikge1xuICAgICAgY29uc3QgZnJvbnQgPSBEaXNwbGF5RWxlbWVudCgpO1xuXG4gICAgICBmcm9udC54ID0gb3B0aW9ucy5zY3JvbGxSZWN0Lng7XG4gICAgICBmcm9udC55ID0gb3B0aW9ucy5zY3JvbGxSZWN0Lnk7XG4gICAgICBmcm9udC53aWR0aCA9IG9wdGlvbnMuc2Nyb2xsUmVjdC53aWR0aDtcbiAgICAgIGZyb250LmhlaWdodCA9IG9wdGlvbnMuc2Nyb2xsUmVjdC5oZWlnaHQ7XG4gICAgICBmcm9udC5pbnRlcmFjdGl2ZSA9IHRydWU7XG5cbiAgICAgIHJldHVybiBmcm9udDtcbiAgICB9LFxuXG4gICAgX3NldHVwU2Nyb2xsQmFyOiBmdW5jdGlvbihvcHRpb25zLCB2aWV3cG9ydCwgaW5uZXIpIHtcbiAgICAgIHRoaXMudGFyZ2V0Lm9uKFwiZW50ZXJmcmFtZVwiLCAoKSA9PiB7XG4gICAgICAgIGlmICghdGhpcy5zY3JvbGxCYXIgJiYgIXRoaXMuc2Nyb2xsQmFySGFuZGxlKSByZXR1cm47XG5cbiAgICAgICAgaWYgKHRoaXMuc2Nyb2xsVHlwZSAhPT0gXCJob3Jpem9udGFsXCIpIHtcbiAgICAgICAgICBjb25zdCB0b3AgPSB2aWV3cG9ydC5oZWlnaHQgKiAtdmlld3BvcnQub3JpZ2luWTtcbiAgICAgICAgICBjb25zdCBib3R0b20gPSB2aWV3cG9ydC5oZWlnaHQgKiAoMSAtIHZpZXdwb3J0Lm9yaWdpblkpO1xuICAgICAgICAgIGNvbnN0IHNjcm9sbE1pbiA9IHRvcDtcbiAgICAgICAgICBjb25zdCBzY3JvbGxNYXggPSBib3R0b20gLSBpbm5lci5oZWlnaHQ7XG4gICAgICAgICAgY29uc3Qgc2Nyb2xsVmFsdWUgPSBNYXRoLmNsYW1wKChpbm5lci50b3AgLSBzY3JvbGxNaW4pIC8gKHNjcm9sbE1heCAtIHNjcm9sbE1pbiksIDAsIDEpO1xuXG4gICAgICAgICAgY29uc3QgeU1pbiA9IHRoaXMuc2Nyb2xsQmFyLmhlaWdodCAqIC10aGlzLnNjcm9sbEJhci5vcmlnaW5ZICsgdGhpcy5zY3JvbGxCYXJIYW5kbGUuaGVpZ2h0ICogdGhpcy5zY3JvbGxCYXJIYW5kbGUub3JpZ2luWSArIHRoaXMuc2Nyb2xsQmFyLnk7XG4gICAgICAgICAgY29uc3QgeU1heCA9IHRoaXMuc2Nyb2xsQmFyLmhlaWdodCAqICgxIC0gdGhpcy5zY3JvbGxCYXIub3JpZ2luWSkgLSB0aGlzLnNjcm9sbEJhckhhbmRsZS5oZWlnaHQgKiAoMSAtIHRoaXMuc2Nyb2xsQmFySGFuZGxlLm9yaWdpblkpICsgdGhpcy5zY3JvbGxCYXIueTtcbiAgICAgICAgICBpZiAoaW5uZXIuaGVpZ2h0IDw9IHZpZXdwb3J0LmhlaWdodCkge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxCYXJIYW5kbGUueSA9IHlNaW47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsQmFySGFuZGxlLnkgPSB5TWluICsgKHlNYXggLSB5TWluKSAqIHNjcm9sbFZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBsZWZ0ID0gdmlld3BvcnQud2lkdGggKiAtdmlld3BvcnQub3JpZ2luWTtcbiAgICAgICAgICBjb25zdCByaWdodCA9IHZpZXdwb3J0LmhlaWdodCAqICgxIC0gdmlld3BvcnQub3JpZ2luWSk7XG4gICAgICAgICAgY29uc3Qgc2Nyb2xsTWluID0gbGVmdDtcbiAgICAgICAgICBjb25zdCBzY3JvbGxNYXggPSByaWdodCAtIGlubmVyLmhlaWdodDtcbiAgICAgICAgICBjb25zdCBzY3JvbGxWYWx1ZSA9IE1hdGguY2xhbXAoKGlubmVyLmxlZnQgLSBzY3JvbGxNaW4pIC8gKHNjcm9sbE1heCAtIHNjcm9sbE1pbiksIDAsIDEpO1xuXG4gICAgICAgICAgY29uc3QgeU1pbiA9IHRoaXMuc2Nyb2xsQmFyLmhlaWdodCAqIC10aGlzLnNjcm9sbEJhci5vcmlnaW5ZICsgdGhpcy5zY3JvbGxCYXJIYW5kbGUuaGVpZ2h0ICogdGhpcy5zY3JvbGxCYXJIYW5kbGUub3JpZ2luWSArIHRoaXMuc2Nyb2xsQmFyLnk7XG4gICAgICAgICAgY29uc3QgeU1heCA9IHRoaXMuc2Nyb2xsQmFyLmhlaWdodCAqICgxIC0gdGhpcy5zY3JvbGxCYXIub3JpZ2luWSkgLSB0aGlzLnNjcm9sbEJhckhhbmRsZS5oZWlnaHQgKiAoMSAtIHRoaXMuc2Nyb2xsQmFySGFuZGxlLm9yaWdpblkpICsgdGhpcy5zY3JvbGxCYXIueTtcbiAgICAgICAgICBpZiAoaW5uZXIuaGVpZ2h0IDw9IHZpZXdwb3J0LmhlaWdodCkge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGxCYXJIYW5kbGUueSA9IHlNaW47XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsQmFySGFuZGxlLnkgPSB5TWluICsgKHlNYXggLSB5TWluKSAqIHNjcm9sbFZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSxcblxuICAgIF9zZXR1cFdoZWVsQ29udHJvbDogZnVuY3Rpb24ob3B0aW9ucywgdmlld3BvcnQsIGlubmVyLCBmcm9udCkge1xuICAgICAgaWYgKHRoaXMuc2Nyb2xsVHlwZSAhPT0gXCJob3Jpem9udGFsXCIpIHtcbiAgICAgICAgdGhpcy50YXJnZXQub24oXCJlbnRlcmZyYW1lXCIsIChlKSA9PiB7XG4gICAgICAgICAgaWYgKGlubmVyLmhlaWdodCA8PSB2aWV3cG9ydC5oZWlnaHQpIHJldHVybjtcbiAgICAgICAgICBpZiAodGhpcy5zY3JvbGxMb2NrKSByZXR1cm47XG5cbiAgICAgICAgICBjb25zdCBwID0gZS5hcHAucG9pbnRlcjtcbiAgICAgICAgICBjb25zdCBkZWx0YSA9IHAud2hlZWxEZWx0YVk7XG4gICAgICAgICAgaWYgKGRlbHRhICYmIGZyb250LmhpdFRlc3QocC54LCBwLnkpKSB7XG4gICAgICAgICAgICB0aGlzLnNjcm9sbCArPSBkZWx0YSAvIGlubmVyLmhlaWdodCAqIDAuODtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy50YXJnZXQub24oXCJlbnRlcmZyYW1lXCIsIChlKSA9PiB7XG4gICAgICAgICAgaWYgKGlubmVyLndpZHRoIDw9IHZpZXdwb3J0LndpZHRoKSByZXR1cm47XG4gICAgICAgICAgaWYgKHRoaXMuc2Nyb2xsTG9jaykgcmV0dXJuO1xuXG4gICAgICAgICAgY29uc3QgcCA9IGUuYXBwLnBvaW50ZXI7XG4gICAgICAgICAgY29uc3QgZGVsdGEgPSBwLndoZWVsRGVsdGFZO1xuICAgICAgICAgIGlmIChkZWx0YSAmJiBmcm9udC5oaXRUZXN0KHAueCwgcC55KSkge1xuICAgICAgICAgICAgdGhpcy5zY3JvbGwgKz0gZGVsdGEgLyBpbm5lci53aWR0aCAqIDAuODtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBfc2V0dXBUb3VjaENvbnRyb2w6IGZ1bmN0aW9uKG9wdGlvbnMsIHZpZXdwb3J0LCBpbm5lciwgZnJvbnQpIHtcbiAgICAgIGNvbnN0IHR3ZWVuZXIgPSBUd2VlbmVyKCkuYXR0YWNoVG8oaW5uZXIpO1xuICAgICAgY29uc3QgdmVsb2NpdHkgPSBWZWN0b3IyKDAsIDApO1xuXG4gICAgICBsZXQgZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgIGZyb250Lm9uKCdwb2ludHN0YXJ0JywgKGUpID0+IHtcbiAgICAgICAgZS5wYXNzID0gdHJ1ZTtcblxuICAgICAgICBpZiAoaW5uZXIuaGVpZ2h0IDw9IHZpZXdwb3J0LmhlaWdodCkgcmV0dXJuO1xuXG4gICAgICAgIGRyYWdnaW5nID0gdHJ1ZTtcbiAgICAgICAgdmVsb2NpdHkuc2V0KDAsIDApO1xuICAgICAgICB0d2VlbmVyLnN0b3AoKTtcbiAgICAgIH0pO1xuICAgICAgZnJvbnQub24oJ3BvaW50c3RheScsIChlKSA9PiB7XG4gICAgICAgIGlmICghZHJhZ2dpbmcpIHJldHVybjtcbiAgICAgICAgdmVsb2NpdHkuc2V0KGUucG9pbnRlci5keCwgZS5wb2ludGVyLmR5KTtcblxuICAgICAgICBpZiAodGhpcy5zY3JvbGxUeXBlICE9PSBcImhvcml6b250YWxcIikge1xuICAgICAgICAgIGNvbnN0IHRvcCA9IC12aWV3cG9ydC5oZWlnaHQgKiB2aWV3cG9ydC5vcmlnaW5ZO1xuICAgICAgICAgIGNvbnN0IGJvdHRvbSA9IHZpZXdwb3J0LmhlaWdodCAqICgxIC0gdmlld3BvcnQub3JpZ2luWSk7XG4gICAgICAgICAgbGV0IG92ZXJkaXN0YW5jZSA9IDA7XG4gICAgICAgICAgaWYgKHRvcCA8IGlubmVyLnRvcCkge1xuICAgICAgICAgICAgb3ZlcmRpc3RhbmNlID0gdG9wIC0gaW5uZXIudG9wO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaW5uZXIudG9wIDwgYm90dG9tIC0gaW5uZXIuaGVpZ2h0KSB7XG4gICAgICAgICAgICBvdmVyZGlzdGFuY2UgPSBpbm5lci50b3AgLSAoYm90dG9tIC0gaW5uZXIuaGVpZ2h0KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmVsb2NpdHkubXVsKDEuMCAtIE1hdGguYWJzKG92ZXJkaXN0YW5jZSkgLyAyMDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGxlZnQgPSAtdmlld3BvcnQud2lkdGggKiB2aWV3cG9ydC5vcmlnaW5ZO1xuICAgICAgICAgIGNvbnN0IHJpZ2h0ID0gdmlld3BvcnQud2lkdGggKiAoMSAtIHZpZXdwb3J0Lm9yaWdpblkpO1xuICAgICAgICAgIGxldCBvdmVyZGlzdGFuY2UgPSAwO1xuICAgICAgICAgIGlmIChsZWZ0IDwgaW5uZXIubGVmdCkge1xuICAgICAgICAgICAgb3ZlcmRpc3RhbmNlID0gbGVmdCAtIGlubmVyLmxlZnQ7XG4gICAgICAgICAgfSBlbHNlIGlmIChpbm5lci5sZWZ0IDwgcmlnaHQgLSBpbm5lci53aWR0aCkge1xuICAgICAgICAgICAgb3ZlcmRpc3RhbmNlID0gaW5uZXIubGVmdCAtIChyaWdodCAtIGlubmVyLndpZHRoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmVsb2NpdHkubXVsKDEuMCAtIE1hdGguYWJzKG92ZXJkaXN0YW5jZSkgLyAyMDApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGZyb250Lm9uKCdwb2ludGVuZCcsIChlKSA9PiB7XG4gICAgICAgIGUucGFzcyA9IHRydWU7XG4gICAgICAgIGUudmVsb2NpdHkgPSB2ZWxvY2l0eTtcbiAgICAgICAgZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLm9uKFwidmlld3N0b3BcIiwgKGUpID0+IHtcbiAgICAgICAgdmVsb2NpdHkuc2V0KDAsIDApO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudGFyZ2V0Lm9uKFwiZW50ZXJmcmFtZVwiLCAoZSkgPT4ge1xuICAgICAgICBpZiAodGhpcy5zY3JvbGxUeXBlICE9PSBcImhvcml6b250YWxcIikge1xuICAgICAgICAgIGlmIChpbm5lci5oZWlnaHQgPD0gdmlld3BvcnQuaGVpZ2h0KSByZXR1cm47XG4gICAgICAgICAgaW5uZXIudG9wICs9IHZlbG9jaXR5Lnk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGlubmVyLndpZHRoIDw9IHZpZXdwb3J0LndpZHRoKSByZXR1cm47XG4gICAgICAgICAgaW5uZXIubGVmdCArPSB2ZWxvY2l0eS54O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRyYWdnaW5nKSByZXR1cm47XG5cbiAgICAgICAgaWYgKCF0d2VlbmVyLnBsYXlpbmcpIHtcbiAgICAgICAgICB2ZWxvY2l0eS5tdWwoMC45KTtcbiAgICAgICAgICBpZiAoTWF0aC5hYnModmVsb2NpdHkueCkgPCAwLjEgJiYgTWF0aC5hYnModmVsb2NpdHkueSkgPCAwLjEpIHtcbiAgICAgICAgICAgIHZlbG9jaXR5LnNldCgwLCAwKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAodGhpcy5zY3JvbGxUeXBlICE9PSBcImhvcml6b250YWxcIikge1xuICAgICAgICAgICAgY29uc3QgdG9wID0gLXZpZXdwb3J0LmhlaWdodCAqIHZpZXdwb3J0Lm9yaWdpblk7XG4gICAgICAgICAgICBjb25zdCBib3R0b20gPSB2aWV3cG9ydC5oZWlnaHQgKiAoMSAtIHZpZXdwb3J0Lm9yaWdpblkpO1xuICAgICAgICAgICAgaWYgKHRvcCA8IGlubmVyLnRvcCkge1xuICAgICAgICAgICAgICB2ZWxvY2l0eS5zZXQoMCwgMCk7XG4gICAgICAgICAgICAgIHR3ZWVuZXIuY2xlYXIoKS50byh7IHk6IHRvcCB9LCAxMDAsIFwiZWFzZUluUXVhZFwiKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaW5uZXIudG9wIDwgYm90dG9tIC0gaW5uZXIuaGVpZ2h0KSB7XG4gICAgICAgICAgICAgIHZlbG9jaXR5LnNldCgwLCAwKTtcbiAgICAgICAgICAgICAgdHdlZW5lci5jbGVhcigpLnRvKHsgeTogYm90dG9tIC0gaW5uZXIuaGVpZ2h0IH0sIDEwMCwgXCJlYXNlSW5RdWFkXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdHdlZW5lci5zdG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IGxlZnQgPSAtdmlld3BvcnQuaGVpZ2h0ICogdmlld3BvcnQub3JpZ2luWTtcbiAgICAgICAgICAgIGNvbnN0IHJpZ2h0ID0gdmlld3BvcnQuaGVpZ2h0ICogKDEgLSB2aWV3cG9ydC5vcmlnaW5ZKTtcbiAgICAgICAgICAgIGlmIChsZWZ0IDwgaW5uZXIubGVmdCkge1xuICAgICAgICAgICAgICB2ZWxvY2l0eS5zZXQoMCwgMCk7XG4gICAgICAgICAgICAgIHR3ZWVuZXIuY2xlYXIoKS50byh7IHk6IGxlZnQgfSwgMTAwLCBcImVhc2VJblF1YWRcIik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlubmVyLmxlZnQgPCByaWdodCAtIGlubmVyLmhlaWdodCkge1xuICAgICAgICAgICAgICB2ZWxvY2l0eS5zZXQoMCwgMCk7XG4gICAgICAgICAgICAgIHR3ZWVuZXIuY2xlYXIoKS50byh7IHk6IHJpZ2h0IC0gaW5uZXIuaGVpZ2h0IH0sIDEwMCwgXCJlYXNlSW5RdWFkXCIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdHdlZW5lci5zdG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgY3JlYXRlVmlldzogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgY29uc3Qgdmlld0pTT04gPSB0aGlzLnZpZXdKU09Oc1t0aGlzLmdldFZpZXdJZChpdGVtKV07XG4gICAgICAvLyBjb25zb2xlLmxvZyh2aWV3SlNPTik7XG4gICAgICB0aGlzLmlubmVyLmZyb21KU09OKHtcbiAgICAgICAgY2hpbGRyZW46IFt2aWV3SlNPTl0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHZpZXcgPSB0aGlzLmlubmVyLmNoaWxkcmVuLmxhc3Q7XG4gICAgICByZXR1cm4gdmlldztcbiAgICB9LFxuXG4gICAgYWRkSXRlbTogZnVuY3Rpb24oaXRlbSkge1xuICAgICAgdGhpcy5pdGVtcy5wdXNoKGl0ZW0pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGFkZEl0ZW1zOiBmdW5jdGlvbihpdGVtcykge1xuICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkodGhpcy5pdGVtcywgaXRlbXMpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHJlbW92ZUl0ZW06IGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHRoaXMuaXRlbXMuZXJhc2UoaXRlbSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgY2xlYXJJdGVtOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuaXRlbXMuY2xlYXIoKTtcbiAgICAgIHRoaXMuc2Nyb2xsID0gMDtcbiAgICAgIHRoaXMuZmxhcmUoJ3ZpZXdzdG9wJyk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgaW52YWxpZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmlubmVyLmNoaWxkcmVuLmNsb25lKCkuZm9yRWFjaCgoY2hpbGQpID0+IGNoaWxkLnJlbW92ZSgpKTtcblxuICAgICAgbGV0IHkgPSAwO1xuICAgICAgbGV0IHggPSAwO1xuXG4gICAgICB0aGlzLmlubmVyLmhlaWdodCA9IDE7XG5cbiAgICAgIHRoaXMuaXRlbXMuZm9yRWFjaCgoaXRlbSwgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgdmlldyA9IHRoaXMuY3JlYXRlVmlldyhpdGVtKTtcbiAgICAgICAgdmlldy5fbGlzdFZpZXcgPSB0aGlzO1xuICAgICAgICB2aWV3Ll9pbmRleCA9IGluZGV4O1xuICAgICAgICB0aGlzLmJpbmQodmlldywgaXRlbSwgdGhpcyk7XG4gICAgICAgIHRoaXMudml3ZUhlaWdodCA9IHZpZXcuaGVpZ2h0O1xuXG4gICAgICAgIGlmICh0aGlzLnNjcm9sbFR5cGUgIT09IFwiaG9yaXpvbnRhbFwiKSB7XG4gICAgICAgICAgdmlldy5sZWZ0ID0geCArIHRoaXMuaXRlbU1hcmdpbkxlZnQ7XG4gICAgICAgICAgdmlldy50b3AgPSB5ICsgdGhpcy5pdGVtTWFyZ2luVG9wO1xuXG4gICAgICAgICAgaWYgKCh2aWV3LnJpZ2h0ICsgdmlldy53aWR0aCArIHRoaXMuaXRlbU1hcmdpbkxlZnQpIDwgdGhpcy52aWV3cG9ydC53aWR0aCkge1xuICAgICAgICAgICAgeCA9IHZpZXcucmlnaHQ7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHggPSAwO1xuICAgICAgICAgICAgeSA9IHZpZXcuYm90dG9tO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHRoaXMuaW5uZXIuaGVpZ2h0ID0gTWF0aC5tYXgodGhpcy52aWV3cG9ydC5oZWlnaHQsIHZpZXcudG9wICsgdmlldy5oZWlnaHQgKyB0aGlzLml0ZW1NYXJnaW5Ub3ApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFRPRE9cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8v44GK6Kmm44GX5a6f6KOFXG4gICAgICBpZiAodGhpcy51cGRhdGVGdW5jKSB0aGlzLnRhcmdldC5vZmYoXCJlbnRlcmZyYW1lXCIsIHRoaXMudXBkYXRlRnVuYyk7XG5cbiAgICAgIGlmICghdGhpcy51cGRhdGVGdW5jKSB7XG4gICAgICAgIHRoaXMudXBkYXRlRnVuYyA9ICgpID0+IHtcbiAgICAgICAgICBsZXQgeSA9IDA7XG4gICAgICAgICAgbGV0IHggPSAwO1xuICAgICAgICAgIHRoaXMuaW5uZXIuY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGQsIGkpID0+IHtcbiAgICAgICAgICAgIGlmICh0aGlzLnNjcm9sbFR5cGUgIT09IFwiaG9yaXpvbnRhbFwiKSB7XG4gICAgICAgICAgICAgIGNoaWxkLmxlZnQgPSB4ICsgdGhpcy5pdGVtTWFyZ2luTGVmdDtcbiAgICAgICAgICAgICAgY2hpbGQudG9wID0geSArIHRoaXMuaXRlbU1hcmdpblRvcDtcblxuICAgICAgICAgICAgICBpZiAoKGNoaWxkLnJpZ2h0ICsgY2hpbGQud2lkdGggKyB0aGlzLml0ZW1NYXJnaW5MZWZ0KSA8IHRoaXMudmlld3BvcnQud2lkdGgpIHtcbiAgICAgICAgICAgICAgICB4ID0gY2hpbGQucmlnaHQ7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgeCA9IDA7XG4gICAgICAgICAgICAgICAgeSA9IGNoaWxkLmJvdHRvbTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIHRoaXMuaW5uZXIuaGVpZ2h0ID0gTWF0aC5tYXgodGhpcy52aWV3cG9ydC5oZWlnaHQsIGNoaWxkLnRvcCArIGNoaWxkLmhlaWdodCArIHRoaXMuaXRlbU1hcmdpblRvcCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBUT0RPXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vZW50ZXJmcmFtZeOBp+OBr+OBquOBj+OBpndhdGNo44GnaGVpZ2h044G/44Gm44KC44GE44GE44GL44GqXG4gICAgICB0aGlzLnRhcmdldC5vbihcImVudGVyZnJhbWVcIiwgdGhpcy51cGRhdGVGdW5jKTtcbiAgICB9LFxuXG4gICAgLy8gcmV0dXJuIDAuMO+9njEuMFxuICAgIGdldFNjcm9sbDogZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCB2aWV3cG9ydCA9IHRoaXMudmlld3BvcnQ7XG4gICAgICBjb25zdCBpbm5lciA9IHRoaXMuaW5uZXI7XG5cbiAgICAgIGlmICh0aGlzLnNjcm9sbFR5cGUgIT09IFwiaG9yaXpvbnRhbFwiKSB7XG4gICAgICAgIGNvbnN0IHRvcCA9IHZpZXdwb3J0LmhlaWdodCAqIC12aWV3cG9ydC5vcmlnaW5ZO1xuICAgICAgICBjb25zdCBib3R0b20gPSB2aWV3cG9ydC5oZWlnaHQgKiAoMSAtIHZpZXdwb3J0Lm9yaWdpblkpO1xuICAgICAgICBjb25zdCBtaW4gPSB0b3A7XG4gICAgICAgIGNvbnN0IG1heCA9IGJvdHRvbSAtIGlubmVyLmhlaWdodDtcblxuICAgICAgICByZXR1cm4gKGlubmVyLnRvcCAtIG1pbikgLyAobWF4IC0gbWluKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFRPT0RcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8vIHY6IDAuMO+9njEuMFxuICAgIHNldFNjcm9sbDogZnVuY3Rpb24odikge1xuICAgICAgdiA9IE1hdGguY2xhbXAodiwgMCwgMSk7XG5cbiAgICAgIGNvbnN0IHZpZXdwb3J0ID0gdGhpcy52aWV3cG9ydDtcbiAgICAgIGNvbnN0IGlubmVyID0gdGhpcy5pbm5lcjtcblxuICAgICAgaWYgKHRoaXMuc2Nyb2xsVHlwZSAhPT0gXCJob3Jpem9udGFsXCIpIHtcbiAgICAgICAgaWYgKGlubmVyLmhlaWdodCA8PSB2aWV3cG9ydC5oZWlnaHQpIHJldHVybjtcblxuICAgICAgICBjb25zdCB0b3AgPSB2aWV3cG9ydC5oZWlnaHQgKiAtdmlld3BvcnQub3JpZ2luWTtcbiAgICAgICAgY29uc3QgYm90dG9tID0gdmlld3BvcnQuaGVpZ2h0ICogKDEgLSB2aWV3cG9ydC5vcmlnaW5ZKTtcbiAgICAgICAgY29uc3QgbWluID0gdG9wO1xuICAgICAgICBjb25zdCBtYXggPSBib3R0b20gLSBpbm5lci5oZWlnaHQ7XG5cbiAgICAgICAgaW5uZXIudG9wID0gbWluICsgKG1heCAtIG1pbikgKiB2O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVE9PRFxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy/mjIflrprjgZfjgZ/jgqvjg6njg6Djga7jgqLjgqTjg4bjg6Djga7lhYjpoK3jgavjgrnjgq/jg63jg7zjg6vjgpLnp7vli5VcbiAgICBzZXRTY3JvbGxCeUNvbHVtbjogZnVuY3Rpb24oY29sdW1uKSB7XG4gICAgICBjb2x1bW4gPSBNYXRoLmNsYW1wKGNvbHVtbiwgMCwgdGhpcy5pdGVtcy5sZW5ndGgpO1xuICAgICAgY29uc3Qgc2Nyb2xsVmFsdWUgPSBNYXRoLmNsYW1wKGNvbHVtbiAvIHRoaXMuaXRlbXMubGVuZ3RoLCAwLCAxKTtcbiAgICAgIHRoaXMuc2V0U2Nyb2xsKHNjcm9sbFZhbHVlKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBfYWNjZXNzb3I6IHtcbiAgICAgIGVsZW1lbnRzOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuaW5uZXIuY2hpbGRyZW47XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgc2Nyb2xsOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0U2Nyb2xsKCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odikge1xuICAgICAgICAgIHRoaXMuc2V0U2Nyb2xsKHYpO1xuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuXG4gICAgX3N0YXRpYzoge1xuICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgc2Nyb2xsVHlwZTogXCJ2ZXJ0aWNhbFwiLFxuICAgICAgICBpdGVtTWFyZ2luTGVmdDogMCxcbiAgICAgICAgaXRlbU1hcmdpblRvcDogMCxcbiAgICAgIH0sXG4gICAgfSxcblxuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwiUGllQ2xpcFwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJBY2Nlc3NvcnlcIixcblxuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSAoe30pLiRzYWZlKG9wdGlvbnMsIFBpZUNsaXAuZGVmYXVsdHMpXG4gICAgICB0aGlzLnN1cGVySW5pdChvcHRpb25zKTtcblxuICAgICAgdGhpcy5waXZvdFggPSBvcHRpb25zLnBpdm90WDtcbiAgICAgIHRoaXMucGl2b3RZID0gb3B0aW9ucy5waXZvdFk7XG4gICAgICB0aGlzLmFuZ2xlTWluID0gb3B0aW9ucy5hbmdsZU1pbjtcbiAgICAgIHRoaXMuYW5nbGVNYXggPSBvcHRpb25zLmFuZ2xlTWF4O1xuICAgICAgdGhpcy5yYWRpdXMgPSBvcHRpb25zLnJhZGl1cztcbiAgICAgIHRoaXMuYW50aWNsb2Nrd2lzZSA9IG9wdGlvbnMuYW50aWNsb2Nrd2lzZTtcbiAgICB9LFxuXG4gICAgb25hdHRhY2hlZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnRhcmdldC5jbGlwID0gKGNhbnZhcykgPT4ge1xuICAgICAgICBjb25zdCBhbmdsZU1pbiA9IHRoaXMuYW5nbGVNaW4gKiBNYXRoLkRFR19UT19SQUQ7XG4gICAgICAgIGNvbnN0IGFuZ2xlTWF4ID0gdGhpcy5hbmdsZU1heCAqIE1hdGguREVHX1RPX1JBRDtcbiAgICAgICAgY29uc3QgY3R4ID0gY2FudmFzLmNvbnRleHQ7XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4Lm1vdmVUbyh0aGlzLnBpdm90WCwgdGhpcy5waXZvdFkpO1xuICAgICAgICBjdHgubGluZVRvKHRoaXMucGl2b3RYICsgTWF0aC5jb3MoYW5nbGVNaW4pICogdGhpcy5yYWRpdXMsIHRoaXMucGl2b3RZICsgTWF0aC5zaW4oYW5nbGVNaW4pICogdGhpcy5yYWRpdXMpO1xuICAgICAgICBjdHguYXJjKHRoaXMucGl2b3RYLCB0aGlzLnBpdm90WSwgdGhpcy5yYWRpdXMsIGFuZ2xlTWluLCBhbmdsZU1heCwgdGhpcy5hbnRpY2xvY2t3aXNlKTtcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgICAgfTtcbiAgICB9LFxuXG4gICAgX3N0YXRpYzoge1xuICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgcGl2b3RYOiAzMixcbiAgICAgICAgcGl2b3RZOiAzMixcbiAgICAgICAgYW5nbGVNaW46IDAsXG4gICAgICAgIGFuZ2xlTWF4OiAzNjAsXG4gICAgICAgIHJhZGl1czogNjQsXG4gICAgICAgIGFudGljbG9ja3dpc2U6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9LFxuXG4gIH0pO1xufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJSZWN0YW5nbGVDbGlwXCIsIHtcbiAgc3VwZXJDbGFzczogXCJBY2Nlc3NvcnlcIixcblxuICB4OiAwLFxuICB5OiAwLFxuICB3aWR0aDogMCxcbiAgaGVpZ2h0OiAwLFxuXG4gIF9lbmFibGU6IHRydWUsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB0aGlzLl9pbml0KCk7XG4gIH0sXG5cbiAgX2luaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMub24oXCJhdHRhY2hlZFwiLCAoKSA9PiB7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiUmVjdGFuZ2xlQ2xpcC53aWR0aFwiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMud2lkdGgsXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLndpZHRoID0gdixcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRhcmdldC5hY2Nlc3NvcihcIlJlY3RhbmdsZUNsaXAuaGVpZ2h0XCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy5oZWlnaHQsXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLmhlaWdodCA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJSZWN0YW5nbGVDbGlwLnhcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLngsXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLnggPSB2LFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiUmVjdGFuZ2xlQ2xpcC55XCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy55LFxuICAgICAgICBcInNldFwiOiAodikgPT4gdGhpcy55ID0gdixcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnggPSAwO1xuICAgICAgdGhpcy55ID0gMDtcbiAgICAgIHRoaXMud2lkdGggPSB0aGlzLnRhcmdldC53aWR0aDtcbiAgICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy50YXJnZXQuaGVpZ2h0O1xuXG4gICAgICB0aGlzLnRhcmdldC5jbGlwID0gKGMpID0+IHRoaXMuX2NsaXAoYyk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX2NsaXA6IGZ1bmN0aW9uKGNhbnZhcykge1xuICAgIGNvbnN0IHggPSB0aGlzLnggLSAodGhpcy53aWR0aCAqIHRoaXMudGFyZ2V0Lm9yaWdpblgpO1xuICAgIGNvbnN0IHkgPSB0aGlzLnkgLSAodGhpcy5oZWlnaHQgKiB0aGlzLnRhcmdldC5vcmlnaW5ZKTtcblxuICAgIGNhbnZhcy5iZWdpblBhdGgoKTtcbiAgICBjYW52YXMucmVjdCh4LCB5LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgY2FudmFzLmNsb3NlUGF0aCgpO1xuICB9LFxuXG4gIHNldEVuYWJsZTogZnVuY3Rpb24oZW5hYmxlKSB7XG4gICAgdGhpcy5fZW5hYmxlID0gZW5hYmxlO1xuICAgIGlmICh0aGlzLl9lbmFibGUpIHtcbiAgICAgIHRoaXMudGFyZ2V0LmNsaXAgPSAoYykgPT4gdGhpcy5fY2xpcChjKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy50YXJnZXQuY2xpcCA9IG51bGw7XG4gICAgfVxuICB9LFxuXG4gIF9hY2Nlc3Nvcjoge1xuICAgIGVuYWJsZToge1xuICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHRoaXMuc2V0RW5hYmxlKHYpO1xuICAgICAgfSxcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmFibGU7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG59KTtcbiIsInBoaW5hLmRlZmluZShcIlRvZ2dsZVwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiQWNjZXNzb3J5XCIsXG5cbiAgaW5pdDogZnVuY3Rpb24oaXNPbikge1xuICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgdGhpcy5faW5pdChpc09uKTtcbiAgfSxcblxuICBfaW5pdDogZnVuY3Rpb24oaXNPbikge1xuICAgIHRoaXMuaXNPbiA9IGlzT24gfHwgZmFsc2U7XG4gIH0sXG5cbiAgc2V0U3RhdHVzOiBmdW5jdGlvbihzdGF0dXMpIHtcbiAgICB0aGlzLmlzT24gPSBzdGF0dXM7XG4gICAgdGhpcy50YXJnZXQuZmxhcmUoKHRoaXMuaXNPbikgPyBcInN3aXRjaE9uXCIgOiBcInN3aXRjaE9mZlwiKTtcbiAgfSxcblxuICBzd2l0Y2hPbjogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuaXNPbikgcmV0dXJuO1xuICAgIHRoaXMuc2V0U3RhdHVzKHRydWUpO1xuICB9LFxuXG4gIHN3aXRjaE9mZjogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmlzT24pIHJldHVybjtcbiAgICB0aGlzLnNldFN0YXR1cyhmYWxzZSk7XG4gIH0sXG5cbiAgc3dpdGNoOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlzT24gPSAhdGhpcy5pc09uO1xuICAgIHRoaXMuc2V0U3RhdHVzKHRoaXMuaXNPbik7XG4gIH0sXG5cbiAgX2FjY2Vzc29yOiB7XG4gICAgc3RhdHVzOiB7XG4gICAgICBcImdldFwiOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuaXNPbjsgfSxcbiAgICAgIFwic2V0XCI6IGZ1bmN0aW9uKHYpIHsgcmV0dXJuIHNldFN0YXR1cyh2KTsgfSxcbiAgICB9LFxuICB9LFxuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZSgoKSA9PiB7XG5cbiAgcGhpbmEuZGVmaW5lKFwiRHluYW1pY1Nwcml0ZVwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJwaGluYS5kaXNwbGF5LlNwcml0ZVwiLFxuXG4gICAgaXNMb2FkZWQ6IGZhbHNlLFxuICAgIF9kdW1teTogbnVsbCxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKGltYWdlLCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAvL+aMh+WumuOBleOCjOOBn+OCpOODoeODvOOCuOOBjOaXouOBq+iqreOBv+i+vOOBvuOCjOOBpuOBhOOCi+OBi+ODgeOCp+ODg+OCr1xuICAgICAgaWYgKHR5cGVvZiBpbWFnZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY29uc3QgaW1nID0gcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmdldCgnaW1hZ2UnLCBpbWFnZSk7XG4gICAgICAgIGlmIChpbWcpIHtcbiAgICAgICAgICAvL+OCpOODoeODvOOCuOiqreOBv+i+vOOBv+a4iFxuICAgICAgICAgIHRoaXMuaXNMb2FkZWQgPSB0cnVlO1xuICAgICAgICAgIHRoaXMuc3VwZXJJbml0KGltZywgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy/oq7jjgIXlm7Djgovjga7jgafkuIDml6bliJ3mnJ/ljJbjgaDjgZHjgZfjgabjgYrjgY9cbiAgICAgICAgICB0aGlzLnN1cGVySW5pdChudWxsLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgICB0aGlzLm9uZShcImVudGVyZnJhbWVcIiwgKGUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuYXBwID0gZS5hcHA7XG4gICAgICAgICAgICB0aGlzLmR5bmFtaWNMb2FkKGltYWdlLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy/jgqTjg6Hjg7zjgrjnm7TmuKHjgZdcbiAgICAgICAgdGhpcy5pc0xvYWRlZCA9IHRydWU7XG4gICAgICAgIHRoaXMuc3VwZXJJbml0KGltYWdlLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy/li5XnmoTjgavoqq3jgb/ovrzjgb/jgpLooYzjgYZcbiAgICBkeW5hbWljTG9hZDogZnVuY3Rpb24oaW1hZ2UsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgIHRoaXMuaXNMb2FkZWQgPSBmYWxzZTtcbiAgICAgIC8v44Ot44O844Kr44Or54mIXG4gICAgICBjb25zdCBhc3NldHMgPSB7IGltYWdlOiB7fSB9O1xuICAgICAgYXNzZXRzLmltYWdlW2ltYWdlXSA9IGltYWdlO1xuICAgICAgdGhpcy5hcHAuYXNzZXRMb2FkZXIubG9hZChhc3NldHMsICgpID0+IHtcbiAgICAgICAgdGhpcy5pc0xvYWRlZCA9IHRydWU7XG4gICAgICAgIGNvbnN0IHRleHR1cmUgPSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KFwiaW1hZ2VcIiwgaW1hZ2UpO1xuICAgICAgICB0aGlzLnNldEltYWdlKHRleHR1cmUsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBpZiAodGhpcy5fZHVtbXkpIHtcbiAgICAgICAgICB0aGlzLl9kdW1teS5yZW1vdmUoKTtcbiAgICAgICAgICB0aGlzLl9kdW1teSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvL2NvcmRvdmEtZmlsZS10cmFuc2ZyZeeJiFxuICAgICAgLy8gdGhpcy5hcHAuZG93bmxvYWRGcm9tU2VydmVyKGltYWdlKVxuICAgICAgLy8gICAudGhlbigoKSA9PiB7XG4gICAgICAvLyAgICAgdGhpcy5pc0xvYWRlZCA9IHRydWU7XG4gICAgICAvLyAgICAgY29uc3QgdGV4dHVyZSA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoXCJpbWFnZVwiLCBpbWFnZSk7XG4gICAgICAvLyAgICAgdGhpcy5zZXRJbWFnZSh0ZXh0dXJlLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgIC8vICAgICBpZiAodGhpcy5fZHVtbXkpIHtcbiAgICAgIC8vICAgICAgIHRoaXMuX2R1bW15LnJlbW92ZSgpO1xuICAgICAgLy8gICAgICAgdGhpcy5fZHVtbXkgPSBudWxsO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgfSk7XG4gICAgfSxcblxuICAgIGRyYXc6IGZ1bmN0aW9uKGNhbnZhcykge1xuICAgICAgaWYgKCF0aGlzLmlzTG9hZGVkIHx8ICF0aGlzLmltYWdlKSByZXR1cm47XG5cbiAgICAgIHZhciBpbWFnZSA9IHRoaXMuaW1hZ2UuZG9tRWxlbWVudDtcbiAgICAgIHZhciBzcmNSZWN0ID0gdGhpcy5zcmNSZWN0O1xuICAgICAgY2FudmFzLmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLFxuICAgICAgICBzcmNSZWN0LngsIHNyY1JlY3QueSwgc3JjUmVjdC53aWR0aCwgc3JjUmVjdC5oZWlnaHQsXG4gICAgICAgIC10aGlzLl93aWR0aCAqIHRoaXMub3JpZ2luWCwgLXRoaXMuX2hlaWdodCAqIHRoaXMub3JpZ2luWSwgdGhpcy5fd2lkdGgsIHRoaXMuX2hlaWdodFxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICBzZXRJbWFnZTogZnVuY3Rpb24oaW1hZ2UsIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgIGlmICghdGhpcy5pc0xvYWRlZCB8fCAhaW1hZ2UpIHJldHVybiB0aGlzO1xuXG4gICAgICBpZiAodHlwZW9mIGltYWdlID09PSAnc3RyaW5nJykge1xuICAgICAgICBpbWFnZSA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ2ltYWdlJywgaW1hZ2UpO1xuICAgICAgfVxuICAgICAgdGhpcy5faW1hZ2UgPSBpbWFnZTtcbiAgICAgIHRoaXMud2lkdGggPSB0aGlzLl9pbWFnZS5kb21FbGVtZW50LndpZHRoO1xuICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLl9pbWFnZS5kb21FbGVtZW50LmhlaWdodDtcblxuICAgICAgaWYgKHdpZHRoKSB7IHRoaXMud2lkdGggPSB3aWR0aDsgfVxuICAgICAgaWYgKGhlaWdodCkgeyB0aGlzLmhlaWdodCA9IGhlaWdodDsgfVxuXG4gICAgICB0aGlzLmZyYW1lSW5kZXggPSAwO1xuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc2V0RHVtbXlJbWFnZTogZnVuY3Rpb24oaW1hZ2UsIHdpZHRoLCBoZWlnaHQsIHVwZGF0ZUZ1bmN0aW9uKSB7XG4gICAgICBpZiAodGhpcy5pc0xvYWRlZCkgcmV0dXJuO1xuICAgICAgdGhpcy5fZHVtbXkgPSBTcHJpdGUoaW1hZ2UsIHdpZHRoLCBoZWlnaHQpLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICBpZiAodXBkYXRlRnVuY3Rpb24pIHtcbiAgICAgICAgdGhpcy5fZHVtbXkudXBkYXRlID0gdXBkYXRlRnVuY3Rpb247XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICB9KTtcblxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJHYXVnZVwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiUmVjdGFuZ2xlQ2xpcFwiLFxuXG4gIF9taW46IDAsXG4gIF9tYXg6IDEuMCxcbiAgX3ZhbHVlOiAxLjAsIC8vbWluIH4gbWF4XG5cbiAgZGlyZWN0aW9uOiBcImhvcml6b250YWxcIiwgLy8gaG9yaXpvbnRhbCBvciB2ZXJ0aWNhbFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgdGhpcy5vbihcImF0dGFjaGVkXCIsICgpID0+IHtcbiAgICAgIHRoaXMuX3dpZHRoID0gdGhpcy53aWR0aDtcbiAgICAgIHRoaXMuX2hlaWdodCA9IHRoaXMud2lkdGg7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiR2F1Z2UubWluXCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy5taW4sXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLm1pbiA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJHYXVnZS5tYXhcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLm1heCxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMubWF4ID0gdixcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRhcmdldC5hY2Nlc3NvcihcIkdhdWdlLnZhbHVlXCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy52YWx1ZSxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMudmFsdWUgPSB2LFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiR2F1Z2UucHJvZ3Jlc3NcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLnByb2dyZXNzLFxuICAgICAgICBcInNldFwiOiAodikgPT4gdGhpcy5wcm9ncmVzcyA9IHYsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICBfcmVmcmVzaDogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuZGlyZWN0aW9uICE9PSBcInZlcnRpY2FsXCIpIHtcbiAgICAgIHRoaXMud2lkdGggPSB0aGlzLnRhcmdldC53aWR0aCAqIHRoaXMucHJvZ3Jlc3M7XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMudGFyZ2V0LmhlaWdodDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy53aWR0aCA9IHRoaXMudGFyZ2V0LndpZHRoO1xuICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLnRhcmdldC5oZWlnaHQgKiB0aGlzLnByb2dyZXNzO1xuICAgIH1cbiAgfSxcblxuICBfYWNjZXNzb3I6IHtcbiAgICBwcm9ncmVzczoge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgcCA9ICh0aGlzLnZhbHVlIC0gdGhpcy5taW4pIC8gKHRoaXMubWF4IC0gdGhpcy5taW4pO1xuICAgICAgICByZXR1cm4gKGlzTmFOKHApKSA/IDAuMCA6IHA7XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2KSB7IHRoaXMudmFsdWUgPSB0aGlzLm1heCAqIHY7IH1cbiAgICB9LFxuXG4gICAgbWF4OiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fbWF4OyB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHRoaXMuX21heCA9IHY7XG4gICAgICAgIHRoaXMuX3JlZnJlc2goKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgbWluOiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fbWluOyB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHRoaXMuX21pbiA9IHY7XG4gICAgICAgIHRoaXMuX3JlZnJlc2goKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgdmFsdWU6IHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl92YWx1ZTsgfSxcbiAgICAgIHNldDogZnVuY3Rpb24odikge1xuICAgICAgICB0aGlzLl92YWx1ZSA9IHY7XG4gICAgICAgIHRoaXMuX3JlZnJlc2goKTtcbiAgICAgIH1cbiAgICB9LFxuICB9XG5cbn0pO1xuIiwicGhpbmEuZGVmaW5lKFwiUGF0aENsaXBcIiwge1xuICBzdXBlckNsYXNzOiBcIkFjY2Vzc29yeVwiLFxuXG4gIGlzRW5hYmxlOiB0cnVlLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgdGhpcy5faW5pdCgpO1xuICB9LFxuXG4gIF9pbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm9uKFwiYXR0YWNoZWRcIiwgKCkgPT4ge1xuICAgICAgY29uc3QgeDEgPSAtKHRoaXMudGFyZ2V0LndpZHRoICogdGhpcy50YXJnZXQub3JpZ2luWCk7XG4gICAgICBjb25zdCB5MSA9IC0odGhpcy50YXJnZXQuaGVpZ2h0ICogdGhpcy50YXJnZXQub3JpZ2luWSk7XG4gICAgICBjb25zdCB4MiA9ICAodGhpcy50YXJnZXQud2lkdGggKiAoMSAtIHRoaXMudGFyZ2V0Lm9yaWdpblgpKTtcbiAgICAgIGNvbnN0IHkyID0gICh0aGlzLnRhcmdldC5oZWlnaHQgKiAoMSAtIHRoaXMudGFyZ2V0Lm9yaWdpblkpKTtcblxuICAgICAgdGhpcy5jbGVhclBhdGgoKTtcbiAgICAgIHRoaXMucGF0aC5wdXNoKHt4OiB4MSwgeTogeTEgfSk7XG4gICAgICB0aGlzLnBhdGgucHVzaCh7eDogeDIsIHk6IHkxIH0pO1xuICAgICAgdGhpcy5wYXRoLnB1c2goe3g6IHgyLCB5OiB5MiB9KTtcbiAgICAgIHRoaXMucGF0aC5wdXNoKHt4OiB4MSwgeTogeTIgfSk7XG4gICAgICB0aGlzLnRhcmdldC5jbGlwID0gKGMpID0+IHRoaXMuX2NsaXAoYyk7XG4gICAgfSk7XG4gIH0sXG5cbiAgc2V0RW5hYmxlOiBmdW5jdGlvbihlbmFibGUpIHtcbiAgICB0aGlzLmluRW5hYmxlID0gZW5hYmxlO1xuICAgIGlmICh0aGlzLmlzRW5hYmxlKSB7XG4gICAgICB0aGlzLnRhcmdldC5jbGlwID0gKGMpID0+IHRoaXMuX2NsaXAoYyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudGFyZ2V0LmNsaXAgPSBudWxsO1xuICAgIH1cbiAgfSxcblxuICBjbGVhclBhdGg6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucGF0aCA9IFtdO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGFkZFBhdGg6IGZ1bmN0aW9uKHBhdGgpIHtcbiAgICBpZiAocGF0aCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgICB0aGlzLnBhdGggPSB0aGlzLnBhdGguY29uY2F0KHBhdGgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnBhdGgucHVzaChwYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgb2Zmc2V0UGF0aDogZnVuY3Rpb24ob2Zmc2V0WCwgb2Zmc2V0WSkge1xuICAgIHRoaXMucGF0aC5mb3JFYWNoKHB0ID0+IHtcbiAgICAgIHB0LnggKz0gb2Zmc2V0WDtcbiAgICAgIHB0LnkgKz0gb2Zmc2V0WTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBfY2xpcDogZnVuY3Rpb24oY2FudmFzKSB7XG4gICAgaWYgKHRoaXMucGF0aC5sZW5ndGggPCAzKSByZXR1cm47XG4gICAgY2FudmFzLmJlZ2luUGF0aCgpO1xuICAgIGNhbnZhcy5tb3ZlVG8odGhpcy5wYXRoWzBdLngsIHRoaXMucGF0aFswXS55KTtcbiAgICB0aGlzLnBhdGguZm9yRWFjaChwdCA9PiBjYW52YXMubGluZVRvKHB0LngsIHB0LnkpKTtcbiAgICBjYW52YXMuY2xvc2VQYXRoKCk7XG4gIH0sXG5cbiAgX2FjY2Vzc29yOiB7XG4gICAgZW5hYmxlOiB7XG4gICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgdGhpcy5zZXRFbmFibGUodik7XG4gICAgICB9LFxuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNFbmFibGU7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG59KTtcbiIsInBoaW5hLmRlZmluZShcIlJlY3RhbmdsZUNsaXBcIiwge1xuICBzdXBlckNsYXNzOiBcIkFjY2Vzc29yeVwiLFxuXG4gIHg6IDAsXG4gIHk6IDAsXG4gIHdpZHRoOiAwLFxuICBoZWlnaHQ6IDAsXG5cbiAgX2VuYWJsZTogdHJ1ZSxcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIHRoaXMuX2luaXQoKTtcbiAgfSxcblxuICBfaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5vbihcImF0dGFjaGVkXCIsICgpID0+IHtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJSZWN0YW5nbGVDbGlwLndpZHRoXCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy53aWR0aCxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMud2lkdGggPSB2LFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiUmVjdGFuZ2xlQ2xpcC5oZWlnaHRcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLmhlaWdodCxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMuaGVpZ2h0ID0gdixcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRhcmdldC5hY2Nlc3NvcihcIlJlY3RhbmdsZUNsaXAueFwiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMueCxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMueCA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJSZWN0YW5nbGVDbGlwLnlcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLnksXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLnkgPSB2LFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMueCA9IDA7XG4gICAgICB0aGlzLnkgPSAwO1xuICAgICAgdGhpcy53aWR0aCA9IHRoaXMudGFyZ2V0LndpZHRoO1xuICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLnRhcmdldC5oZWlnaHQ7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmNsaXAgPSAoYykgPT4gdGhpcy5fY2xpcChjKTtcbiAgICB9KTtcbiAgfSxcblxuICBfY2xpcDogZnVuY3Rpb24oY2FudmFzKSB7XG4gICAgY29uc3QgeCA9IHRoaXMueCAtICh0aGlzLnRhcmdldC53aWR0aCAqIHRoaXMudGFyZ2V0Lm9yaWdpblgpO1xuICAgIGNvbnN0IHkgPSB0aGlzLnkgLSAodGhpcy50YXJnZXQuaGVpZ2h0ICogdGhpcy50YXJnZXQub3JpZ2luWSk7XG5cbiAgICBjYW52YXMuYmVnaW5QYXRoKCk7XG4gICAgY2FudmFzLnJlY3QoeCwgeSwgdGhpcy50YXJnZXQud2lkdGgsIHRoaXMudGFyZ2V0LmhlaWdodCk7XG4gICAgY2FudmFzLmNsb3NlUGF0aCgpO1xuICB9LFxuXG4gIHNldEVuYWJsZTogZnVuY3Rpb24oZW5hYmxlKSB7XG4gICAgdGhpcy5fZW5hYmxlID0gZW5hYmxlO1xuICAgIGlmICh0aGlzLl9lbmFibGUpIHtcbiAgICAgIHRoaXMudGFyZ2V0LmNsaXAgPSAoYykgPT4gdGhpcy5fY2xpcChjKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy50YXJnZXQuY2xpcCA9IG51bGw7XG4gICAgfVxuICB9LFxuXG4gIF9hY2Nlc3Nvcjoge1xuICAgIGVuYWJsZToge1xuICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHRoaXMuc2V0RW5hYmxlKHYpO1xuICAgICAgfSxcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmFibGU7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG59KTtcbiIsInBoaW5hLmRlZmluZShcIlJvdW5kUmVjdGFuZ2xlQ2xpcFwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiQWNjZXNzb3J5XCIsXG5cbiAgeDogMCxcbiAgeTogMCxcbiAgd2lkdGg6IDAsXG4gIGhlaWdodDogMCxcblxuICByYWRpdXM6IDUsXG5cbiAgX2VuYWJsZTogdHJ1ZSxcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIHRoaXMuX2luaXQoKTtcbiAgfSxcblxuICBfaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5vbihcImF0dGFjaGVkXCIsICgpID0+IHtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJSb3VuZFJlY3RhbmdsZUNsaXAud2lkdGhcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLndpZHRoLFxuICAgICAgICBcInNldFwiOiAodikgPT4gdGhpcy53aWR0aCA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJSb3VuZFJlY3RhbmdsZUNsaXAuaGVpZ2h0XCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy5oZWlnaHQsXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLmhlaWdodCA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJSb3VuZFJlY3RhbmdsZUNsaXAueFwiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMueCxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMueCA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJSb3VuZFJlY3RhbmdsZUNsaXAueVwiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMueSxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMueSA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJSb3VuZFJlY3RhbmdsZUNsaXAucmFkaXVzXCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy5yYWRpdXMsXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLnJhZGl1cyA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy54ID0gMDtcbiAgICAgIHRoaXMueSA9IDA7XG4gICAgICB0aGlzLndpZHRoID0gdGhpcy50YXJnZXQud2lkdGg7XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMudGFyZ2V0LmhlaWdodDtcblxuICAgICAgdGhpcy50YXJnZXQuY2xpcCA9IChjKSA9PiB0aGlzLl9jbGlwKGMpO1xuICAgIH0pO1xuICB9LFxuXG4gIF9jbGlwOiBmdW5jdGlvbihjYW52YXMpIHtcbiAgICBjb25zdCB3aWR0aCA9IHRoaXMudGFyZ2V0LndpZHRoO1xuICAgIGNvbnN0IGhlaWdodCA9IHRoaXMudGFyZ2V0LmhlaWdodDtcbiAgICBjb25zdCB4ID0gdGhpcy54IC0gKHdpZHRoICogdGhpcy50YXJnZXQub3JpZ2luWCk7XG4gICAgY29uc3QgeSA9IHRoaXMueSAtIChoZWlnaHQgKiB0aGlzLnRhcmdldC5vcmlnaW5ZKTtcbiAgICBjb25zdCByYWRpdXMgPSB0aGlzLnJhZGl1cztcblxuICAgIGNvbnN0IGwgPSB4ICsgcmFkaXVzO1xuICAgIGNvbnN0IHIgPSB4ICsgd2lkdGggLSByYWRpdXM7XG4gICAgY29uc3QgdCA9IHkgKyByYWRpdXM7XG4gICAgY29uc3QgYiA9IHkgKyBoZWlnaHQgLSByYWRpdXM7XG5cbiAgICBjYW52YXMuYmVnaW5QYXRoKCk7XG4gICAgY2FudmFzLmFyYyhsLCB0LCByYWRpdXMsIC1NYXRoLlBJLCAgICAgICAtTWF0aC5QSSAqIDAuNSwgZmFsc2UpOyAgLy8g5bem5LiKXG4gICAgY2FudmFzLmFyYyhyLCB0LCByYWRpdXMsIC1NYXRoLlBJICogMC41LCAgICAgICAgICAgICAgMCwgZmFsc2UpOyAgLy8g5Y+z5LiKXG4gICAgY2FudmFzLmFyYyhyLCBiLCByYWRpdXMsICAgICAgICAgICAgICAwLCAgTWF0aC5QSSAqIDAuNSwgZmFsc2UpOyAgLy8g5Y+z5LiLXG4gICAgY2FudmFzLmFyYyhsLCBiLCByYWRpdXMsICBNYXRoLlBJICogMC41LCAgICAgICAgTWF0aC5QSSwgZmFsc2UpOyAgLy8g5bem5LiLXG4gICAgY2FudmFzLmNsb3NlUGF0aCgpO1xuICB9LFxuXG4gIHNldFJhZGl1czogZnVuY3Rpb24odikge1xuICAgIHRoaXMucmFkaXVzID0gdjtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBzZXRFbmFibGU6IGZ1bmN0aW9uKGVuYWJsZSkge1xuICAgIHRoaXMuX2VuYWJsZSA9IGVuYWJsZTtcbiAgICBpZiAodGhpcy5fZW5hYmxlKSB7XG4gICAgICB0aGlzLnRhcmdldC5jbGlwID0gKGMpID0+IHRoaXMuX2NsaXAoYyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudGFyZ2V0LmNsaXAgPSBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBfYWNjZXNzb3I6IHtcbiAgICBlbmFibGU6IHtcbiAgICAgIHNldDogZnVuY3Rpb24odikge1xuICAgICAgICB0aGlzLnNldEVuYWJsZSh2KTtcbiAgICAgIH0sXG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW5hYmxlO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwicGhpbmEuYXNzZXQuQXRsYXNcIiwge1xuICAgIHN1cGVyQ2xhc3M6IFwicGhpbmEuYXNzZXQuQXNzZXRcIixcblxuICAgIGRhdGE6IG51bGwsXG4gICAgaW1hZ2VzOiBudWxsLFxuXG4gICAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgICAgdGhpcy5pbWFnZXMgPSB7fTtcbiAgICAgIHRoaXMuZnJhbWVDYWNoZSA9IHt9O1xuICAgIH0sXG5cbiAgICBsb2FkOiBmdW5jdGlvbihrZXksIHNyYykge1xuICAgICAgdGhpcy5rZXkgPSBrZXk7XG4gICAgICBpZiAodHlwZW9mKHNyYykgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgdGhpcy5zcmMgPSBbc3JjXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc3JjID0gc3JjO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBoaW5hLnV0aWwuRmxvdyh0aGlzLl9sb2FkLmJpbmQodGhpcykpO1xuICAgIH0sXG5cbiAgICBfbG9hZDogZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICB2YXIgZmxvd3MgPSBzZWxmLnNyYy5tYXAoZnVuY3Rpb24oc3JjKSB7XG4gICAgICAgIHZhciBiYXNlUGF0aCA9IG51bGw7XG4gICAgICAgIGlmIChzcmMuaW5kZXhPZignLycpIDwgMCkge1xuICAgICAgICAgIGJhc2VQYXRoID0gJy4vJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBiYXNlUGF0aCA9IHNyYy5zdWJzdHJpbmcoMCwgc3JjLmxhc3RJbmRleE9mKCcvJykgKyAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZWxmLl9sb2FkSnNvbihzcmMpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2xvYWRJbWFnZShkYXRhLCBiYXNlUGF0aCk7XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgcGhpbmEudXRpbC5GbG93LmFsbChmbG93cylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YUxpc3QpIHtcbiAgICAgICAgICByZXR1cm4gc2VsZi5fbWVyZ2VEYXRhKGRhdGFMaXN0KTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmVzb2x2ZShzZWxmKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIF9sb2FkSnNvbjogZnVuY3Rpb24oc3JjKSB7XG4gICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICByZXR1cm4gcGhpbmEudXRpbC5GbG93KGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgICAgdmFyIHhtbCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgICB4bWwub3BlbignR0VUJywgc3JjKTtcbiAgICAgICAgeG1sLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGlmICh4bWwucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgICAgaWYgKFsyMDAsIDIwMSwgMF0uaW5kZXhPZih4bWwuc3RhdHVzKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgdmFyIGRhdGEgPSBKU09OLnBhcnNlKHhtbC5yZXNwb25zZVRleHQpO1xuICAgICAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgeG1sLnNlbmQobnVsbCk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgX2xvYWRJbWFnZTogZnVuY3Rpb24oZGF0YSwgYmFzZVBhdGgpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHJldHVybiBwaGluYS51dGlsLkZsb3coZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgICB2YXIgaW1hZ2UgPSBwaGluYS5hc3NldC5UZXh0dXJlKCk7XG4gICAgICAgIHNlbGYuaW1hZ2VzW2RhdGEubWV0YS5pbWFnZV0gPSBpbWFnZTtcbiAgICAgICAgaW1hZ2UubG9hZChiYXNlUGF0aCArIGRhdGEubWV0YS5pbWFnZSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBfbWVyZ2VEYXRhOiBmdW5jdGlvbihkYXRhTGlzdCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdGhpcy5kYXRhID0ge1xuICAgICAgICBmcmFtZXM6IFtdLFxuICAgICAgICBtZXRhOiB7XG4gICAgICAgICAgYXBwOiBkYXRhTGlzdFswXS5tZXRhLmFwcGFwcCxcbiAgICAgICAgICB2ZXJzaW9uOiBkYXRhTGlzdFswXS5tZXRhLnZlcnNpb24sXG4gICAgICAgICAgZm9ybWF0OiBkYXRhTGlzdFswXS5tZXRhLmZvcm1hdCxcbiAgICAgICAgICBzY2FsZTogZGF0YUxpc3RbMF0ubWV0YS5zY2FsZSxcbiAgICAgICAgICBzbWFydHVwZGF0ZTogZGF0YUxpc3RbMF0ubWV0YS5zbWFydHVwZGF0ZSxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgICBkYXRhTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgdmFyIGZyYW1lcyA9IGRhdGEuZnJhbWVzO1xuICAgICAgICBpZiAoZnJhbWVzIGluc3RhbmNlb2YgQXJyYXkgPT0gZmFsc2UpIHtcbiAgICAgICAgICBmcmFtZXMgPSBPYmplY3Qua2V5cyhmcmFtZXMpLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHZhciBmcmFtZSA9IGZyYW1lc1trZXldO1xuICAgICAgICAgICAgZnJhbWUuZmlsZW5hbWUgPSBrZXk7XG4gICAgICAgICAgICByZXR1cm4gZnJhbWU7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBmcmFtZXMuZm9yRWFjaChmdW5jdGlvbihmcmFtZSkge1xuICAgICAgICAgIGZyYW1lLmltYWdlID0gZGF0YS5tZXRhLmltYWdlO1xuICAgICAgICAgIGZyYW1lLnNpemUgPSBkYXRhLm1ldGEuc2l6ZTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgc2VsZi5kYXRhLmZyYW1lcyA9IHNlbGYuZGF0YS5mcmFtZXMuY29uY2F0KGZyYW1lcyk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5kYXRhLmZyYW1lcy5zb3J0KGZ1bmN0aW9uKGxocywgcmhzKSB7XG4gICAgICAgIHJldHVybiAobGhzLmZpbGVuYW1lIDw9IHJocy5maWxlbmFtZSkgPyAtMSA6IDE7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgZ2V0RnJhbWVCeU5hbWU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmcmFtZSA9IHRoaXMuZnJhbWVDYWNoZVtuYW1lXTtcbiAgICAgIGlmICghZnJhbWUpIHtcbiAgICAgICAgZnJhbWUgPSB0aGlzLmZyYW1lQ2FjaGVbbmFtZV0gPSB0aGlzLmRhdGEuZnJhbWVzLmZpbmQoZnVuY3Rpb24oZikge1xuICAgICAgICAgIHJldHVybiBmLmZpbGVuYW1lID09PSBuYW1lO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmcmFtZTtcbiAgICB9LFxuXG4gICAgdW5wYWNrQWxsOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgIHZhciBkYXRhID0gc2VsZi5kYXRhO1xuICAgICAgdmFyIGZyYW1lcyA9IGRhdGEuZnJhbWVzO1xuICAgICAgaWYgKGZyYW1lcyBpbnN0YW5jZW9mIEFycmF5ID09IGZhbHNlKSB7XG4gICAgICAgIGZyYW1lcyA9IE9iamVjdC5rZXlzKGZyYW1lcykubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgIHZhciBmcmFtZSA9IGZyYW1lc1trZXldO1xuICAgICAgICAgIGZyYW1lLmZpbGVuYW1lID0ga2V5O1xuICAgICAgICAgIHJldHVybiBmcmFtZTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBmcmFtZXMucmVkdWNlKGZ1bmN0aW9uKHJldCwgZnJhbWUpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHBoaW5hLmdyYXBoaWNzLkNhbnZhcygpO1xuXG4gICAgICAgIHZhciBmID0gZnJhbWUuZnJhbWU7XG4gICAgICAgIHZhciBzID0gZnJhbWUuc3ByaXRlU291cmNlU2l6ZTtcbiAgICAgICAgdmFyIHNyYyA9IGZyYW1lLnNvdXJjZVNpemU7XG4gICAgICAgIHZhciBwID0gZnJhbWUucGl2b3Q7XG5cbiAgICAgICAgdmFyIGltYWdlID0gc2VsZi5pbWFnZXNbZnJhbWUuaW1hZ2VdLmRvbUVsZW1lbnQ7XG5cbiAgICAgICAgY2FudmFzLnNldFNpemUoc3JjLncsIHNyYy5oKTtcbiAgICAgICAgaWYgKCFmcmFtZS5yb3RhdGVkKSB7XG4gICAgICAgICAgY2FudmFzLmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLFxuICAgICAgICAgICAgZi54LCBmLnksIGYudywgZi5oLFxuICAgICAgICAgICAgcy54LCBzLnksIHMudywgcy5oXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjYW52YXMuY29udGV4dC5zYXZlKCk7XG4gICAgICAgICAgY2FudmFzLmNvbnRleHQudHJhbnNsYXRlKHNyYy53ICogcC54LCBzcmMuaCAqIHAueSk7XG4gICAgICAgICAgY2FudmFzLmNvbnRleHQucm90YXRlKE1hdGguUEkgKiAtMC41KTtcbiAgICAgICAgICBjYW52YXMuY29udGV4dC50cmFuc2xhdGUoLXNyYy5oICogcC55LCAtc3JjLncgKiBwLngpO1xuICAgICAgICAgIGNhbnZhcy5jb250ZXh0LmRyYXdJbWFnZShpbWFnZSxcbiAgICAgICAgICAgIGYueCwgZi55LCBmLmgsIGYudyxcbiAgICAgICAgICAgIHMueSwgcy54LCBzLmgsIHMud1xuICAgICAgICAgICk7XG4gICAgICAgICAgY2FudmFzLmNvbnRleHQucmVzdG9yZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0W2ZyYW1lLmZpbGVuYW1lXSA9IGNhbnZhcztcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH0sIHt9KTtcbiAgICB9LFxuXG4gICAgdW5wYWNrOiBmdW5jdGlvbihmcmFtZSkge1xuICAgICAgdmFyIGRhdGEgPSB0aGlzLmRhdGE7XG4gICAgICB2YXIgZnJhbWVzID0gZGF0YS5mcmFtZXM7XG4gICAgICBpZiAoZnJhbWVzIGluc3RhbmNlb2YgQXJyYXkgPT0gZmFsc2UpIHtcbiAgICAgICAgZnJhbWVzID0gT2JqZWN0LmtleXMoZnJhbWVzKS5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgdmFyIGZyYW1lID0gZnJhbWVzW2tleV07XG4gICAgICAgICAgZnJhbWUuZmlsZW5hbWUgPSBrZXk7XG4gICAgICAgICAgcmV0dXJuIGZyYW1lO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgdmFyIGNhbnZhcyA9IHBoaW5hLmdyYXBoaWNzLkNhbnZhcygpO1xuXG4gICAgICB2YXIgZiA9IGZyYW1lLmZyYW1lO1xuICAgICAgdmFyIHMgPSBmcmFtZS5zcHJpdGVTb3VyY2VTaXplO1xuICAgICAgdmFyIHNyYyA9IGZyYW1lLnNvdXJjZVNpemU7XG4gICAgICB2YXIgcCA9IGZyYW1lLnBpdm90O1xuXG4gICAgICB2YXIgaW1hZ2UgPSB0aGlzLmltYWdlc1tmcmFtZS5pbWFnZV0uZG9tRWxlbWVudDtcblxuICAgICAgY2FudmFzLnNldFNpemUoc3JjLncsIHNyYy5oKTtcbiAgICAgIGlmICghZnJhbWUucm90YXRlZCkge1xuICAgICAgICBjYW52YXMuY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsXG4gICAgICAgICAgZi54LCBmLnksIGYudywgZi5oLFxuICAgICAgICAgIHMueCwgcy55LCBzLncsIHMuaFxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2FudmFzLmNvbnRleHQuc2F2ZSgpO1xuICAgICAgICBjYW52YXMuY29udGV4dC50cmFuc2xhdGUoc3JjLncgKiBwLngsIHNyYy5oICogcC55KTtcbiAgICAgICAgY2FudmFzLmNvbnRleHQucm90YXRlKE1hdGguUEkgKiAtMC41KTtcbiAgICAgICAgY2FudmFzLmNvbnRleHQudHJhbnNsYXRlKC1zcmMuaCAqIHAueSwgLXNyYy53ICogcC54KTtcbiAgICAgICAgY2FudmFzLmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLFxuICAgICAgICAgIGYueCwgZi55LCBmLmgsIGYudyxcbiAgICAgICAgICBzLnksIHMueCwgcy5oLCBzLndcbiAgICAgICAgKTtcbiAgICAgICAgY2FudmFzLmNvbnRleHQucmVzdG9yZSgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gY2FudmFzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiDjg5Xjg6zjg7zjg6DjgpLliIfjgorliIbjgZHjgZ/phY3liJfjgpJhdGxhc0ZyYW1lc+OBqOOBl+OBpkFzc2V0TWFuYWdlcuOBq+OBpOOBo+OBk+OCgFxuICAgICAqIOOBmeOBp+OBq+WtmOWcqOOBmeOCjOOBsOOAgSBBc3NldE1hbmFnZXLjgYvjgonlj5blvpfjgZnjgotcbiAgICAgKi8gXG4gICAgZ2V0QXRsYXNGcmFtZXM6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgdmFyIGF0bGFzRnJhbWVzID0gcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmdldCgnYXRsYXNGcmFtZXMnLCBzZWxmLmtleSk7XG4gICAgICBpZiAoYXRsYXNGcmFtZXMpIHtcbiAgICAgICAgcmV0dXJuIGF0bGFzRnJhbWVzO1xuICAgICAgfVxuICAgICAgdmFyIGRhdGEgPSBzZWxmLmRhdGE7XG4gICAgICB2YXIgZnJhbWVzID0gZGF0YS5mcmFtZXM7XG4gICAgICB2YXIgbWV0YSA9IGRhdGEubWV0YTtcbiAgICAgIGlmIChmcmFtZXMgaW5zdGFuY2VvZiBBcnJheSA9PSBmYWxzZSkge1xuICAgICAgICBmcmFtZXMgPSBPYmplY3Qua2V5cyhmcmFtZXMpLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICB2YXIgZnJhbWUgPSBmcmFtZXNba2V5XTtcbiAgICAgICAgICBmcmFtZS5maWxlbmFtZSA9IGtleTtcbiAgICAgICAgICByZXR1cm4gZnJhbWU7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBhdGxhc0ZyYW1lcyA9IGZyYW1lcy5tYXAoZnVuY3Rpb24oZnJhbWUpIHtcbiAgICAgICAgdmFyIGtleSA9IHNlbGYua2V5ICsgXCIvXCIgKyBmcmFtZS5maWxlbmFtZTtcbiAgICAgICAgdmFyIGNhbnZhcyA9IHBoaW5hLmdyYXBoaWNzLkNhbnZhcygpO1xuXG4gICAgICAgIHZhciBmID0gZnJhbWUuZnJhbWU7XG4gICAgICAgIHZhciBzID0gZnJhbWUuc3ByaXRlU291cmNlU2l6ZTtcbiAgICAgICAgdmFyIHNyYyA9IGZyYW1lLnNvdXJjZVNpemU7XG4gICAgICAgIHZhciBwID0gZnJhbWUucGl2b3Q7XG5cbiAgICAgICAgdmFyIGltYWdlID0gc2VsZi5pbWFnZXNbZnJhbWUuaW1hZ2VdLmRvbUVsZW1lbnQ7XG5cbiAgICAgICAgY2FudmFzLnNldFNpemUocy53LCBzLmgpO1xuICAgICAgICBpZiAoIWZyYW1lLnJvdGF0ZWQpIHtcbiAgICAgICAgICBjYW52YXMuY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsXG4gICAgICAgICAgICBmLngsIGYueSwgZi53LCBmLmgsXG4gICAgICAgICAgICAwLCAwLCBzLncsIHMuaFxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY2FudmFzLmNvbnRleHQuc2F2ZSgpO1xuICAgICAgICAgIGNhbnZhcy5jb250ZXh0LnRyYW5zbGF0ZShzLncgKiBwLngsIHMuaCAqIHAueSk7XG4gICAgICAgICAgY2FudmFzLmNvbnRleHQucm90YXRlKE1hdGguUEkgKiAtMC41KTtcbiAgICAgICAgICBjYW52YXMuY29udGV4dC50cmFuc2xhdGUoLXMuaCAqIHAueSwgLXMudyAqIHAueCk7XG4gICAgICAgICAgY2FudmFzLmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLFxuICAgICAgICAgICAgZi54LCBmLnksIGYuaCwgZi53LFxuICAgICAgICAgICAgMCwgMCwgcy5oLCBzLndcbiAgICAgICAgICApO1xuICAgICAgICAgIGNhbnZhcy5jb250ZXh0LnJlc3RvcmUoKTtcbiAgICAgICAgfVxuICAgICAgICBjYW52YXMuZnJhbWUgPSBmcmFtZTtcbiAgICAgICAgY2FudmFzLm1ldGEgPSBtZXRhO1xuICAgICAgICBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuc2V0KCdpbWFnZScsIGtleSwgY2FudmFzKTtcbiAgICAgICAgcmV0dXJuIGNhbnZhcztcbiAgICAgIH0pO1xuXG4gICAgICBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuc2V0KCdhdGxhc0ZyYW1lcycsIHNlbGYua2V5LCBhdGxhc0ZyYW1lcyk7XG4gICAgICByZXR1cm4gYXRsYXNGcmFtZXM7XG4gICAgfSxcblxuICB9KTtcblxuICBwaGluYS5hc3NldC5Bc3NldExvYWRlci5yZWdpc3RlcignYXRsYXMnLCBmdW5jdGlvbihrZXksIHNyYykge1xuICAgIHZhciBhc3NldCA9IHBoaW5hLmFzc2V0LkF0bGFzKCk7XG4gICAgcmV0dXJuIGFzc2V0LmxvYWQoa2V5LCBzcmMpO1xuICB9KTtcblxuICBwaGluYS5kZWZpbmUoXCJwaGluYS5kaXNwbGF5LkF0bGFzU3ByaXRlXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcInBoaW5hLmRpc3BsYXkuRGlzcGxheUVsZW1lbnRcIixcblxuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSAoe30pLiRzYWZlKG9wdGlvbnMsIHBoaW5hLmRpc3BsYXkuQXRsYXNTcHJpdGUuZGVmYXVsdHMpO1xuICAgICAgdGhpcy5zdXBlckluaXQob3B0aW9ucyk7XG4gICAgICB0aGlzLnNyY1JlY3QgPSBwaGluYS5nZW9tLlJlY3QoKTtcbiAgICAgIHRoaXMuZHN0UmVjdCA9IHBoaW5hLmdlb20uUmVjdCgpO1xuICAgICAgdGhpcy5zcmNQaXZvdCA9IHBoaW5hLmdlb20uVmVjdG9yMigpO1xuICAgICAgdGhpcy5yb3RhdGVkID0gZmFsc2U7XG5cbiAgICAgIHRoaXMuYXRsYXMgPSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KFwiYXRsYXNcIiwgb3B0aW9ucy5hdGxhcyk7XG5cbiAgICAgIHRoaXMuc2V0RnJhbWUob3B0aW9ucy5mcmFtZSk7XG5cbiAgICAgIHRoaXMuYWxwaGEgPSBvcHRpb25zLmFscGhhO1xuICAgIH0sXG5cbiAgICBzZXRGcmFtZTogZnVuY3Rpb24oZnJhbWVOYW1lKSB7XG4gICAgICB2YXIgYXRsYXMgPSB0aGlzLmF0bGFzO1xuICAgICAgaWYgKHR5cGVvZiAoZnJhbWVOYW1lKSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICB0aGlzLmZyYW1lID0gYXRsYXMuZ2V0RnJhbWVCeU5hbWUoZnJhbWVOYW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZnJhbWUgPSBhdGxhcy5kYXRhLmZyYW1lcy5hdChmcmFtZU5hbWUpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmltYWdlID0gYXRsYXMuaW1hZ2VzW3RoaXMuZnJhbWUuaW1hZ2VdO1xuXG4gICAgICB2YXIgZiA9IHRoaXMuZnJhbWUuZnJhbWU7XG4gICAgICB2YXIgc3NzID0gdGhpcy5mcmFtZS5zcHJpdGVTb3VyY2VTaXplO1xuICAgICAgdmFyIHAgPSB0aGlzLmZyYW1lLnBpdm90O1xuICAgICAgdGhpcy5zcmNSZWN0LnNldChmLngsIGYueSwgZi53LCBmLmgpO1xuICAgICAgdGhpcy5kc3RSZWN0LnNldChzc3MueCwgc3NzLnksIHNzcy53LCBzc3MuaCk7XG4gICAgICB0aGlzLndpZHRoID0gdGhpcy5mcmFtZS5zb3VyY2VTaXplLnc7XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMuZnJhbWUuc291cmNlU2l6ZS5oO1xuICAgICAgaWYgKGF0bGFzLmRhdGEubWV0YS5zY2FsZSAhPSBcIjFcIikge1xuICAgICAgICB2YXIgcyA9IDEgLyAoK2F0bGFzLmRhdGEubWV0YS5zY2FsZSk7XG4gICAgICAgIHRoaXMuZHN0UmVjdC54ICo9IHM7XG4gICAgICAgIHRoaXMuZHN0UmVjdC55ICo9IHM7XG4gICAgICAgIHRoaXMuZHN0UmVjdC53aWR0aCAqPSBzO1xuICAgICAgICB0aGlzLmRzdFJlY3QuaGVpZ2h0ICo9IHM7XG4gICAgICAgIHRoaXMud2lkdGggKj0gcztcbiAgICAgICAgdGhpcy5oZWlnaHQgKj0gcztcbiAgICAgIH1cbiAgICAgIHRoaXMuc3JjUGl2b3Quc2V0KHAueCwgcC55KTtcbiAgICAgIHRoaXMucm90YXRlZCA9IHRoaXMuZnJhbWUucm90YXRlZDtcblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGRyYXc6IGZ1bmN0aW9uKGNhbnZhcykge1xuICAgICAgdmFyIHNyID0gdGhpcy5zcmNSZWN0O1xuICAgICAgdmFyIGRyID0gdGhpcy5kc3RSZWN0O1xuICAgICAgdmFyIHAgPSB0aGlzLnNyY1Bpdm90O1xuICAgICAgdmFyIGltYWdlID0gdGhpcy5pbWFnZS5kb21FbGVtZW50O1xuXG4gICAgICBpZiAoIXRoaXMucm90YXRlZCkge1xuICAgICAgICBjYW52YXMuY29udGV4dC5kcmF3SW1hZ2UoaW1hZ2UsXG4gICAgICAgICAgc3IueCwgc3IueSwgc3Iud2lkdGgsIHNyLmhlaWdodCwgLXRoaXMuX3dpZHRoICogdGhpcy5vcmlnaW5YICsgZHIueCwgLXRoaXMuX2hlaWdodCAqIHRoaXMub3JpZ2luWSArIGRyLnksIGRyLndpZHRoLCBkci5oZWlnaHRcbiAgICAgICAgKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjdHggPSBjYW52YXMuY29udGV4dDtcbiAgICAgICAgY3R4LnNhdmUoKTtcbiAgICAgICAgY3R4LnJvdGF0ZShNYXRoLlBJICogLTAuNSk7XG4gICAgICAgIGN0eC5kcmF3SW1hZ2UoaW1hZ2UsXG4gICAgICAgICAgc3IueCwgc3IueSwgc3IuaGVpZ2h0LCBzci53aWR0aCxcbiAgICAgICAgICB0aGlzLl9oZWlnaHQgKiAoMSAtIHRoaXMub3JpZ2luWSkgLSBkci5oZWlnaHQgLSBkci55LCAtdGhpcy5fd2lkdGggKiB0aGlzLm9yaWdpblggKyBkci54LCBkci5oZWlnaHQsIGRyLndpZHRoXG4gICAgICAgICk7XG4gICAgICAgIGN0eC5yZXN0b3JlKCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIF9zdGF0aWM6IHtcbiAgICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIGZyYW1lOiAwLFxuICAgICAgICBhbHBoYTogMSxcbiAgICAgIH0sXG4gICAgfSxcblxuICB9KTtcblxuICBwaGluYS5kZWZpbmUoXCJwaGluYS5kaXNwbGF5LkF0bGFzRnJhbWVTcHJpdGVcIiwge1xuICAgIHN1cGVyQ2xhc3M6IFwicGhpbmEuZGlzcGxheS5EaXNwbGF5RWxlbWVudFwiLFxuICAgIF9hdGxhc0luZGV4OiAwLFxuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgICBhdGxhczogb3B0aW9ucyxcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIG9wdGlvbnMgPSAoe30pLiRzYWZlKG9wdGlvbnMsIHBoaW5hLmRpc3BsYXkuQXRsYXNGcmFtZVNwcml0ZS5kZWZhdWx0cyk7XG4gICAgICB0aGlzLmF0bGFzTmFtZSA9IG9wdGlvbnMuYXRsYXM7XG4gICAgICB0aGlzLmF0bGFzID0gcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmdldCgnYXRsYXMnLCB0aGlzLmF0bGFzTmFtZSk7XG4gICAgICB0aGlzLmF0bGFzRnJhbWVzID0gdGhpcy5hdGxhcy5nZXRBdGxhc0ZyYW1lcygpO1xuICAgICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICAgIHRoaXMuZHN0UmVjdCA9IHBoaW5hLmdlb20uUmVjdCgpO1xuICAgICAgdGhpcy5zcmNQaXZvdCA9IHBoaW5hLmdlb20uVmVjdG9yMigpO1xuXG4gICAgICB0aGlzLnNldEltYWdlKHRoaXMuYXRsYXNOYW1lKTtcbiAgICAgIHRoaXMuYXRsYXNJbmRleCA9IG9wdGlvbnMuYXRsYXNJbmRleDtcblxuICAgICAgdGhpcy5hbHBoYSA9IG9wdGlvbnMuYWxwaGE7XG4gICAgfSxcblxuICAgIHNldEltYWdlOiBmdW5jdGlvbihpbWFnZSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgaWYgKHR5cGVvZiBpbWFnZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgdGhpcy5hdGxhc0ZyYW1lcyA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ2F0bGFzJywgaW1hZ2UpLmdldEF0bGFzRnJhbWVzKCk7XG4gICAgICAgIGltYWdlID0gdGhpcy5hdGxhc0ZyYW1lc1t0aGlzLmF0bGFzSW5kZXhdO1xuICAgICAgfVxuICAgICAgdGhpcy5faW1hZ2UgPSBpbWFnZTtcbiAgICAgIHRoaXMud2lkdGggPSB0aGlzLl9pbWFnZS5kb21FbGVtZW50LndpZHRoO1xuICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLl9pbWFnZS5kb21FbGVtZW50LmhlaWdodDtcblxuICAgICAgaWYgKHdpZHRoKSB7IHRoaXMud2lkdGggPSB3aWR0aDsgfVxuICAgICAgaWYgKGhlaWdodCkgeyB0aGlzLmhlaWdodCA9IGhlaWdodDsgfVxuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc2V0RnJhbWU6IGZ1bmN0aW9uKGF0bGFzSW5kZXgpIHtcbiAgICAgIHZhciBpbWFnZSA9IHRoaXMuaW1hZ2UgPSB0aGlzLmF0bGFzRnJhbWVzLmF0KGF0bGFzSW5kZXgpO1xuICAgICAgdGhpcy5mcmFtZSA9IGltYWdlLmZyYW1lO1xuICAgICAgdmFyIGYgPSB0aGlzLmZyYW1lLmZyYW1lO1xuICAgICAgdmFyIHNzID0gdGhpcy5mcmFtZS5zb3VyY2VTaXplO1xuICAgICAgdmFyIHNzcyA9IHRoaXMuZnJhbWUuc3ByaXRlU291cmNlU2l6ZTtcbiAgICAgIHZhciBwID0gdGhpcy5mcmFtZS5waXZvdDtcbiAgICAgIHZhciBkciA9IHRoaXMuZHN0UmVjdDtcbiAgICAgIGRyLnNldChzc3MueCwgc3NzLnksIHNzcy53LCBzc3MuaCk7XG5cbiAgICAgIGRyLnggLT0gc3MudyAqIHRoaXMub3JpZ2luWDtcbiAgICAgIGRyLnkgLT0gc3MuaCAqIHRoaXMub3JpZ2luWTtcbiAgICAgIGlmIChpbWFnZS5tZXRhLnNjYWxlICE9IFwiMVwiKSB7XG4gICAgICAgIHZhciBzID0gMSAvICgraW1hZ2UubWV0YS5zY2FsZSk7XG4gICAgICAgIGRyLnggKj0gcztcbiAgICAgICAgZHIueSAqPSBzO1xuICAgICAgICBkci53aWR0aCAqPSBzO1xuICAgICAgICBkci5oZWlnaHQgKj0gcztcbiAgICAgICAgdGhpcy53aWR0aCAqPSBzO1xuICAgICAgICB0aGlzLmhlaWdodCAqPSBzO1xuICAgICAgfVxuICAgICAgdGhpcy5zcmNQaXZvdC5zZXQocC54LCBwLnkpO1xuXG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgZHJhdzogZnVuY3Rpb24oY2FudmFzKSB7XG4gICAgICB2YXIgZHIgPSB0aGlzLmRzdFJlY3Q7XG4gICAgICAvLyDkuIDml6bkvb/jgaPjgabjgarjgYRcbiAgICAgIC8vIHZhciBwID0gdGhpcy5zcmNQaXZvdDtcbiAgICAgIHZhciBpbWFnZSA9IHRoaXMuaW1hZ2UuZG9tRWxlbWVudDtcblxuICAgICAgY2FudmFzLmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLCAwLCAwLCBpbWFnZS53aWR0aCwgaW1hZ2UuaGVpZ2h0LCBkci54LCBkci55LCBkci53aWR0aCwgZHIuaGVpZ2h0KTtcbiAgICB9LFxuXG4gICAgX2FjY2Vzc29yOiB7XG4gICAgICBpbWFnZToge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5faW1hZ2U7IH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odikge1xuICAgICAgICAgIHRoaXMuc2V0SW1hZ2Uodik7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBhdGxhc0luZGV4OiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX2F0bGFzSW5kZXg7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odikge1xuICAgICAgICAgIHRoaXMuX2F0bGFzSW5kZXggPSB2O1xuICAgICAgICAgIHRoaXMuc2V0RnJhbWUodik7XG4gICAgICAgIH0sXG4gICAgICB9XG4gICAgfSxcblxuICAgIF9zdGF0aWM6IHtcbiAgICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIGF0bGFzSW5kZXg6IDAsXG4gICAgICAgIGFscGhhOiAxLFxuICAgICAgfSxcbiAgICB9LFxuXG4gIH0pO1xuXG59KTsiLCJwaGluYS5uYW1lc3BhY2UoKCkgPT4ge1xuXG4gIGNvbnN0IGdlbmVyYXRlVVVJRCA9ICgpID0+IHtcbiAgICBsZXQgY2hhcnMgPSBcInh4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eFwiLnNwbGl0KFwiXCIpO1xuICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBjaGFycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgc3dpdGNoIChjaGFyc1tpXSkge1xuICAgICAgICBjYXNlIFwieFwiOlxuICAgICAgICAgIGNoYXJzW2ldID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTYpLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcInlcIjpcbiAgICAgICAgICBjaGFyc1tpXSA9IChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiA0KSArIDgpLnRvU3RyaW5nKDE2KTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNoYXJzLmpvaW4oXCJcIik7XG4gIH07XG5cbiAgcGhpbmEuZGVmaW5lKFwicGhpbmEubGF5b3V0LkxheW91dEFzc2V0XCIsIHtcbiAgICBzdXBlckNsYXNzOiBcInBoaW5hLmFzc2V0LkZpbGVcIixcblxuICAgIGlkOiBudWxsLFxuICAgIGF0bGFzOiBudWxsLFxuICAgIHRleHR1cmVJZHM6IG51bGwsXG5cbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgICB0aGlzLmlkID0gZ2VuZXJhdGVVVUlEKCk7XG4gICAgICB0aGlzLnRleHR1cmVJZHMgPSBbXTtcbiAgICB9LFxuXG4gICAgYnVpbGQ6IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3Qgcm9vdCA9IHBoaW5hLmRpc3BsYXkuRGlzcGxheUVsZW1lbnQoKTtcbiAgICAgIHJvb3QucmVmID0ge307XG4gICAgICByb290LmxheW91dEFzc2V0ID0gdGhpcztcblxuICAgICAgcm9vdC5mcm9tSlNPTih0aGlzLmRhdGEucm9vdCk7XG5cbiAgICAgIGNvbnN0IHNjYW5JZHMgPSAoZWxlbWVudCkgPT4ge1xuICAgICAgICBpZiAoZWxlbWVudC5pZCkge1xuICAgICAgICAgIHJvb3QucmVmW2VsZW1lbnQuaWRdID0gZWxlbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlbGVtZW50LmNoaWxkcmVuKSB7XG4gICAgICAgICAgZWxlbWVudC5jaGlsZHJlbi5mb3JJbigoa2V5LCBjaGlsZCkgPT4gc2NhbklkcyhjaGlsZCkpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgc2Nhbklkcyhyb290KTtcblxuICAgICAgY29uc3QgdHJhdmVyc2UgPSAoZWxlbWVudCkgPT4ge1xuICAgICAgICBlbGVtZW50LmZsYXJlKFwicmVhZHlcIik7XG4gICAgICAgIGlmIChlbGVtZW50LmNoaWxkcmVuKSB7XG4gICAgICAgICAgZWxlbWVudC5jaGlsZHJlbi5mb3JFYWNoKChjaGlsZCkgPT4gdHJhdmVyc2UoY2hpbGQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdHJhdmVyc2Uocm9vdCk7XG5cbiAgICAgIC8v55Sf5oiQ44Os44Kk44Ki44Km44OI44GMcmVtb3Zl44GV44KM44Gf5pmC44Gr5YaF5a6544Gu56C05qOE44KS6KGM44GGXG4gICAgICBjb25zdCBkZXN0cm95ID0gKGNoaWxkKSA9PiB7XG4gICAgICAgIGlmICghY2hpbGQpIGNoaWxkID0gcm9vdDtcbiAgICAgICAgY2hpbGQuY2hpbGRyZW4uY2xvbmUoKS5mb3JFYWNoKGMgPT4ge1xuICAgICAgICAgIC8v44Op44OZ44Or44Gn5L+d5oyB44GX44Gm44GE44KLY2FudmFz44KS56C05qOEXG4gICAgICAgICAgaWYgKGMgaW5zdGFuY2VvZiBMYWJlbCkge1xuICAgICAgICAgICAgYy5kZXN0cm95Q2FudmFzKCk7XG4gICAgICAgICAgICBjLnJlbW92ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByb290LmRlc3Ryb3koYyk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIHJvb3QuZGVzdHJveSA9IGRlc3Ryb3k7XG5cbiAgICAgIHJldHVybiByb290O1xuICAgIH0sXG5cbiAgICByZWxlYXNlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudGV4dHVyZUlkcy5mb3JFYWNoKGlkID0+IHtcbiAgICAgICAgY29uc3QgY2FudmFzID0gcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmFzc2V0c1tcImltYWdlXCJdW2lkXVtcImRvbUVsZW1lbnRcIl07XG4gICAgICAgIGNhbnZhcy53aWR0aCA9IDA7XG4gICAgICAgIGNhbnZhcy5oZWlnaHQgPSAwO1xuICAgICAgICBkZWxldGUgcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmFzc2V0c1tcImltYWdlXCJdW2lkXVtcImRvbUVsZW1lbnRcIl07XG4gICAgICAgIGRlbGV0ZSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuYXNzZXRzW1wiaW1hZ2VcIl1baWRdO1xuICAgICAgfSk7XG4gICAgICBkZWxldGUgdGhpcy50ZXh0dXJlSWRzO1xuICAgIH0sXG5cbiAgICBfbG9hZDogZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgcGhpbmEudXRpbC5GbG93KChyZXNvbHZlKSA9PiB0aGlzLnN1cGVyTWV0aG9kKFwiX2xvYWRcIiwgcmVzb2x2ZSkpXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZSh0aGlzLmRhdGEpO1xuICAgICAgICAgIHJldHVybiBwaGluYS51dGlsLkZsb3cucmVzb2x2ZShqc29uKTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRoZW4oKGpzb24pID0+IHRoaXMuX2xvYWRBdGxhcyhqc29uKSlcbiAgICAgICAgLnRoZW4oKGpzb24pID0+IHtcbiAgICAgICAgICB0aGlzLmRhdGEgPSBqc29uO1xuICAgICAgICAgIHJlc29sdmUodGhpcyk7XG4gICAgICAgICAgLy/jgqLjg4jjg6njgrnjga7lj4LnhafliYrpmaRcbiAgICAgICAgICBjb25zdCBhdGxhcyA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoXCJhdGxhc1wiLCB0aGlzLmlkKTtcbiAgICAgICAgICBhdGxhcy5pbWFnZXMuZm9ySW4oKG5hbWUpID0+IHtcbiAgICAgICAgICAgIGF0bGFzLmltYWdlc1tuYW1lXS5kb21FbGVtZW50LndpZHRoID0gMDtcbiAgICAgICAgICAgIGF0bGFzLmltYWdlc1tuYW1lXS5kb21FbGVtZW50LmhlaWdodCA9IDA7XG4gICAgICAgICAgICBkZWxldGUgYXRsYXMuaW1hZ2VzW25hbWVdLnNyYztcbiAgICAgICAgICAgIGRlbGV0ZSBhdGxhcy5pbWFnZXNbbmFtZV0uZG9tRWxlbWVudDtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBkZWxldGUganNvbi5hdGxhc2VzO1xuICAgICAgICAgIGRlbGV0ZSBhdGxhcy5pbWFnZXM7XG4gICAgICAgICAgZGVsZXRlIHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5hc3NldHNbXCJhdGxhc1wiXVt0aGlzLmlkXTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIF9sb2FkQXRsYXM6IGZ1bmN0aW9uKGpzb24pIHtcbiAgICAgIGNvbnN0IGF0bGFzID0gcGhpbmEuYXNzZXQuQXRsYXMoKTtcblxuICAgICAgcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLnNldChcImF0bGFzXCIsIHRoaXMuaWQsIGF0bGFzKTtcblxuICAgICAgcmV0dXJuIHBoaW5hLnV0aWwuRmxvdygocmVzb2x2ZSkgPT4ge1xuICAgICAgICBjb25zdCBmbG93cyA9IGpzb24uYXRsYXNlcy5tYXAoKGF0bGFzRGF0YSkgPT4ge1xuICAgICAgICAgIGNvbnN0IG5hbWUgPSBhdGxhc0RhdGEuYXRsYXMubWV0YS5pbWFnZTtcbiAgICAgICAgICBhdGxhcy5kYXRhID0gYXRsYXNEYXRhLmF0bGFzO1xuICAgICAgICAgIGF0bGFzLmltYWdlc1tuYW1lXSA9IHBoaW5hLmFzc2V0LlRleHR1cmUoKTtcbiAgICAgICAgICByZXR1cm4gYXRsYXMuaW1hZ2VzW25hbWVdLmxvYWQoYXRsYXNEYXRhLnRleHR1cmUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvL+OCouODiOODqeOCueOBjOWtmOWcqOOBl+OBquOBhOWgtOWQiFxuICAgICAgICBpZihmbG93cy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgIHJlc29sdmUoanNvbik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGhpbmEudXRpbC5GbG93LmFsbChmbG93cylcbiAgICAgICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgYXRsYXMuX21lcmdlRGF0YShqc29uLmF0bGFzZXMubWFwKF8gPT4gXy5hdGxhcykpO1xuXG4gICAgICAgICAgICAgIGNvbnN0IHVucGFja2VkVGV4dHVyZXMgPSBhdGxhcy51bnBhY2tBbGwoKTtcbiAgICAgICAgICAgICAgdW5wYWNrZWRUZXh0dXJlcy5mb3JJbigobmFtZSwgdGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgdGV4LmlkID0gZ2VuZXJhdGVVVUlEKCk7XG4gICAgICAgICAgICAgICAgcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLnNldChcImltYWdlXCIsIHRleC5pZCwgdGV4KTtcbiAgICAgICAgICAgICAgICB0aGlzLnRleHR1cmVJZHMucHVzaCh0ZXguaWQpO1xuICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICBjb25zdCBzY2FuID0gKGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5jbGFzc05hbWUgPT09IFwicGhpbmEuZGlzcGxheS5BdGxhc1Nwcml0ZVwiKSB7XG4gICAgICAgICAgICAgICAgICBlbGVtZW50LmFyZ3VtZW50cy5hdGxhcyA9IHRoaXMuaWQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChlbGVtZW50LmNsYXNzTmFtZSA9PT0gXCJwaGluYS5kaXNwbGF5LlNwcml0ZVwiKSB7XG4gICAgICAgICAgICAgICAgICBlbGVtZW50LmFyZ3VtZW50c1swXSA9IHVucGFja2VkVGV4dHVyZXNbZWxlbWVudC5hcmd1bWVudHNbMF1dLmlkO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmKGVsZW1lbnQuYWNjZXNzb3JpZXMpIHtcbiAgICAgICAgICAgICAgICAgIC8v44Kw44Os44O844K544Kx44O844Or55So44Gu55S75YOP44GM6ICD5oWu44GV44KM44Gm44GE44Gq44GL44Gj44Gf44Gf44KB5Y+W44KK5oCl44GO5a++5b+cXG4gICAgICAgICAgICAgICAgICBjb25zdCBncmF5c2NhbGUgPSBlbGVtZW50LmFjY2Vzc29yaWVzLkdyYXlzY2FsZTtcbiAgICAgICAgICAgICAgICAgIGlmKGdyYXlzY2FsZSkge1xuICAgICAgICAgICAgICAgICAgICBncmF5c2NhbGUuYXJndW1lbnRzLmdyYXlUZXh0dXJlTmFtZSA9IHVucGFja2VkVGV4dHVyZXNbZ3JheXNjYWxlLmFyZ3VtZW50cy5ncmF5VGV4dHVyZU5hbWVdLmlkO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICBlbGVtZW50LmNoaWxkcmVuLmZvckluKChrZXksIGNoaWxkKSA9PiBzY2FuKGNoaWxkKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBzY2FuKGpzb24ucm9vdCk7XG5cbiAgICAgICAgICAgICAgcmVzb2x2ZShqc29uKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LFxuXG4gIH0pO1xuXG4gIHBoaW5hLmFzc2V0LkFzc2V0TG9hZGVyLmFzc2V0TG9hZEZ1bmN0aW9uc1tcImxheW91dFwiXSA9IChrZXksIHBhdGgpID0+IHtcbiAgICBjb25zdCBhc3NldCA9IHBoaW5hLmxheW91dC5MYXlvdXRBc3NldCgpO1xuICAgIGNvbnN0IGZsb3cgPSBhc3NldC5sb2FkKHBhdGgpO1xuICAgIHJldHVybiBmbG93O1xuICB9O1xuXG59KTsiLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwiRGlhbG9nXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcIk1vZGFsXCIsXG5cbiAgICBfc3RhdGljOiB7XG4gICAgICBvcGVuQ291bnQ6IDAsXG4gICAgfSxcblxuICAgIC8v6ZaL5aeL5YmN44Gr6Kqt44G/6L6844G/44GM5b+F6KaB44Gq44Ki44K744OD44OI44Oq44K544OIXG4gICAgYXNzZXRMaXN0OiBudWxsLFxuXG4gICAgLy/lu4Pmo4Tjgqjjg6zjg6Hjg7Pjg4hcbiAgICBkaXNwb3NlRWxlbWVudHM6IG51bGwsXG5cbiAgICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc3VwZXJJbml0KCk7XG5cbiAgICAgIHRoaXMuYXBwID0gcGhpbmFfYXBwO1xuXG4gICAgICB0aGlzLmJhY2tncm91bmQgPSBTcHJpdGUoXCJibGFja1wiKVxuICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzKVxuICAgICAgICAuc2V0UG9zaXRpb24oU0NSRUVOX1dJRFRIICogMC41LCBTQ1JFRU5fSEVJR0hUICogMC41KVxuICAgICAgdGhpcy5iYWNrZ3JvdW5kLmFscGhhID0gMDtcblxuICAgICAgdGhpcy5sYXlvdXRCYXNlID0gRGlzcGxheUVsZW1lbnQoeyB3aWR0aDogU0NSRUVOX1dJRFRILCBoZWlnaHQ6IFNDUkVFTl9IRUlHSFQgfSlcbiAgICAgICAgLmFkZENoaWxkVG8odGhpcylcbiAgICAgICAgLnNldFBvc2l0aW9uKFNDUkVFTl9XSURUSCAqIDAuNSwgU0NSRUVOX0hFSUdIVCAqIDAuNSk7XG5cbiAgICAgIHRoaXMuZGlzcG9zZUVsZW1lbnRzID0gW107XG4gICAgICB0aGlzLm9uKCdjbG9zZWQnLCAoKSA9PiB0aGlzLmRpc3Bvc2VFbGVtZW50cy5mb3JFYWNoKGUgPT4gZS5yZW1vdmUoKS5kZXN0cm95Q2FudmFzKCkpKTtcbiAgICB9LFxuXG4gICAgLy/jgrfjg7zjg7Ppm6LohLHmmYLjgavnoLTmo4TjgZnjgotTaGFwZeOCkueZu+mMslxuICAgIGRpc3Bvc2U6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuZGlzcG9zZUVsZW1lbnRzLnB1c2goZWxlbWVudCk7XG4gICAgfSxcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvL+ihqOekulxuICAgIG9wZW46IGZ1bmN0aW9uKHNjZW5lLCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgdGhpcy5wYXJlbnRTY2VuZSA9IHNjZW5lO1xuICAgICAgRGlhbG9nLm9wZW5Db3VudCsrO1xuICAgICAgaWYgKG9wdGlvbnMuaXNOb3RoaW5nQmFja2dyb3VuZCkge1xuICAgICAgICB0aGlzLmJhY2tncm91bmQuaGlkZSgpO1xuICAgICAgfVxuICAgICAgdGhpcy5hZGRDaGlsZFRvKHNjZW5lKTtcbiAgICAgIHRoaXMuZG93bmxvYWRBc3NldCh0aGlzLmFzc2V0TGlzdClcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIHRoaXMuc2V0dXAob3B0aW9ucyk7XG4gICAgICAgICAgdGhpcy5vcGVuQW5pbWF0aW9uKCk7XG4gICAgICAgICAgaWYgKFN0YXR1c0Jhcikge1xuICAgICAgICAgICAgU3RhdHVzQmFyLnNob3coKTtcbiAgICAgICAgICAgIFN0YXR1c0Jhci5vdmVybGF5c1dlYlZpZXcodHJ1ZSk7XG4gICAgICAgICAgICBTdGF0dXNCYXIuc3R5bGVMaWdodENvbnRlbnQoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvL+mdnuihqOekulxuICAgIGNsb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgIERpYWxvZy5vcGVuQ291bnQtLTtcbiAgICAgIHRoaXMuY2xvc2VBbmltYXRpb24oKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy/ooajnpLrjgqLjg4vjg6Hjg7zjgrfjg6fjg7NcbiAgICBvcGVuQW5pbWF0aW9uOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZmxhcmUoXCJvcGVuc3RhcnRcIiwgeyBkaWFsb2c6IHRoaXMgfSk7XG4gICAgICB0aGlzLnBhcmVudFNjZW5lLmZsYXJlKFwiZGlhbG9nb3BlblwiLCB7IGRpYWxvZzogdGhpcyB9KTtcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChbXG4gICAgICAgIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgIHRoaXMuYmFja2dyb3VuZC5hbHBoYSA9IDA7XG4gICAgICAgICAgdGhpcy5iYWNrZ3JvdW5kLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgICAgLmZhZGVJbigyNTApXG4gICAgICAgICAgICAuY2FsbCgoKSA9PiByZXNvbHZlKCkpO1xuICAgICAgICB9KSxcbiAgICAgICAgbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgdGhpcy5sYXlvdXRCYXNlLnNjYWxlWCA9IDAuMDtcbiAgICAgICAgICB0aGlzLmxheW91dEJhc2Uuc2NhbGVZID0gMC4wO1xuICAgICAgICAgIHRoaXMubGF5b3V0QmFzZS50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAgIC50byh7IHNjYWxlWDogMS4wLCBzY2FsZVk6IDEuMCB9LCAyNTAsIFwiZWFzZUluT3V0UXVhZFwiKVxuICAgICAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgICAgICB0aGlzLmZsYXJlKFwib3BlbmVkXCIsIHsgZGlhbG9nOiB0aGlzIH0pO1xuICAgICAgICAgICAgICB0aGlzLnBhcmVudFNjZW5lLmZsYXJlKFwiZGlhbG9nb3BlbmVkXCIsIHsgZGlhbG9nOiB0aGlzIH0pO1xuICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgIF0pO1xuICAgIH0sXG5cbiAgICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgLy/pnZ7ooajnpLrjgqLjg4vjg6Hjg7zjgrfjg6fjg7NcbiAgICBjbG9zZUFuaW1hdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmZsYXJlKFwiY2xvc2VzdGFydFwiLCB7IGRpYWxvZzogdGhpcyB9KTtcbiAgICAgIHRoaXMucGFyZW50U2NlbmUuZmxhcmUoXCJkaWFsb2djbG9zZVwiLCB7IGRpYWxvZzogdGhpcyB9KTtcbiAgICAgIHJldHVybiBQcm9taXNlLmFsbChbXG4gICAgICAgIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgIHRoaXMuYmFja2dyb3VuZC5hbHBoYSA9IDE7XG4gICAgICAgICAgdGhpcy5iYWNrZ3JvdW5kLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgICAgLmZhZGVPdXQoMjUwKVxuICAgICAgICAgICAgLmNhbGwoKCkgPT4gcmVzb2x2ZSgpKTtcbiAgICAgICAgfSksXG4gICAgICAgIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgIHRoaXMubGF5b3V0QmFzZS5zY2FsZVggPSAxLjA7XG4gICAgICAgICAgdGhpcy5sYXlvdXRCYXNlLnNjYWxlWSA9IDEuMDtcbiAgICAgICAgICB0aGlzLmxheW91dEJhc2UudHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgICAudG8oeyBzY2FsZVg6IDAuMCwgc2NhbGVZOiAwLjAgfSwgMjUwLCBcImVhc2VJbk91dFF1YWRcIilcbiAgICAgICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICAgICAgdGhpcy5mbGFyZShcImNsb3NlZFwiLCB7IGRpYWxvZzogdGhpcyB9KTtcbiAgICAgICAgICAgICAgdGhpcy5wYXJlbnRTY2VuZS5mbGFyZShcImRpYWxvZ2Nsb3NlZFwiLCB7IGRpYWxvZzogdGhpcyB9KTtcbiAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICBdKS50aGVuKCgpID0+IHtcbiAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgaWYgKHRoaXMubGF5b3V0KSB7XG4gICAgICAgICAgdGhpcy5sYXlvdXQuZGVzdHJveSgpO1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLmxheW91dDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZsYXJlKFwiZGVzdHJveVwiKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvL+OCouOCu+ODg+ODiOOCkuODkOODg+OCr+OCsOODqeOCpuODs+ODieOBp+iqreOBv+i+vOOBv1xuICAgIGRvd25sb2FkQXNzZXQ6IGZ1bmN0aW9uKGFzc2V0cykge1xuICAgICAgaWYgKCFhc3NldHMpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcblxuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBjb25zdCBsb2FkZXIgPSBwaGluYS5leHRlbnNpb24uQXNzZXRMb2FkZXJFeCgpO1xuICAgICAgICBsb2FkZXIubG9hZChhc3NldHMsIHRoaXMuX29uTG9hZEFzc2V0KVxuICAgICAgICAgIC50aGVuKCgpID0+IHJlc29sdmUoKSk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy9BUEnjgYvjgonjg4fjg7zjgr/lj5blvpdcbiAgICBnZXREYXRhOiBmdW5jdGlvbihhcGlQYXJhbSkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9KTtcbiAgICB9LFxuICB9KTtcblxufSk7XG4iLCIvKipcbiAqIERvbUJ1dHRvblxuICogZWxlbWVudOOBq+OBi+OBtuOBm+OCi+W9ouOBp0RPTeODnOOCv+ODs+OCkuS9nOaIkOOBl+OBvuOBmeOAglxuICogXG4gKiBQYXJhbWF0ZXJcbiAqIGFwcCAgICAgIENhbnZhc0FwcFxuICogZWxlbWVudCAg44GL44G244Gb44KL5a++6LGhZWxlbWVudFxuICogZnVuYyAgICAg44Kv44Oq44OD44Kv44GV44KM44Gf5pmC44Gr5a6f6KGM44GV44KM44KL6Zai5pWwXG4gKi9cblxucGhpbmEubmFtZXNwYWNlKCgpID0+IHtcbiAgcGhpbmEuZGVmaW5lKFwiRG9tQnV0dG9uXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcIkRpc3BsYXlFbGVtZW50XCIsXG5cbiAgICBpbml0OiBmdW5jdGlvbihhcHAsIGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuc3VwZXJJbml0KCk7XG5cbiAgICAgIHRoaXMuYXBwID0gYXBwO1xuXG4gICAgICB0aGlzLmJ0biA9IG51bGw7XG4gICAgICB0aGlzLnNldHVwKGVsZW1lbnQpO1xuICAgIH0sXG5cbiAgICBzZXR1cDogZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgaWYgKHRoaXMuYnRuKSB0aGlzLmJ0bi5yZW1vdmUoKTtcblxuICAgICAgdGhpcy5idG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIpO1xuICAgICAgdGhpcy5idG4uaWQgPSBcImJ0blwiXG4gICAgICB0aGlzLmJ0bi5zdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcbiAgICAgIHRoaXMuYnRuLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgIHRoaXMuYnRuLnN0eWxlLnBhZGRpbmcgPSBcIjBweFwiO1xuICAgICAgdGhpcy5idG4uc3R5bGUuYm9yZGVyV2lkdGggPSBcIjBweFwiO1xuXG4gICAgICB0aGlzLmJ0bi5zdHlsZS5maWx0ZXIgPSAnYWxwaGEob3BhY2l0eT0wKSc7XG4gICAgICB0aGlzLmJ0bi5zdHlsZS5Nb3pPcGFjaXR5ID0gMC4wO1xuICAgICAgdGhpcy5idG4uc3R5bGUub3BhY2l0eSA9IDAuMDtcblxuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmJ0bik7XG5cbiAgICAgIHRoaXMuYnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgIGVsZW1lbnQuZmxhcmUoJ2NsaWNrZWQnKTtcbiAgICAgICAgdGhpcy5mbGFyZSgnY2xpY2tlZCcpO1xuICAgICAgfTtcblxuICAgICAgdGhpcy5vbignZW50ZXJmcmFtZScsICgpID0+IHtcbiAgICAgICAgaWYgKCF0aGlzLmJ0bikgcmV0dXJuO1xuICAgICAgICBjb25zdCBzY2FsZSA9IHBhcnNlSW50KHRoaXMuYXBwLmRvbUVsZW1lbnQuc3R5bGUud2lkdGgpIC8gdGhpcy5hcHAuZG9tRWxlbWVudC53aWR0aDtcbiAgICAgICAgbGV0IHdpZHRoID0gZWxlbWVudC53aWR0aCAqIHNjYWxlO1xuICAgICAgICBsZXQgaGVpZ2h0ID0gZWxlbWVudC5oZWlnaHQgKiBzY2FsZTtcbiAgICAgICAgbGV0IGNhbnZhc0xlZnQgPSBwYXJzZUludCh0aGlzLmFwcC5kb21FbGVtZW50LnN0eWxlLmxlZnQpO1xuICAgICAgICBsZXQgY2FudmFzVG9wID0gcGFyc2VJbnQodGhpcy5hcHAuZG9tRWxlbWVudC5zdHlsZS50b3ApO1xuXG4gICAgICAgIC8v6Ieq6Lqr44Gu44Kw44Ot44O844OQ44Or5bqn5qiZ44Gr5ZCI44KP44Gb44KLXG4gICAgICAgIGNhbnZhc0xlZnQgKz0gZWxlbWVudC5fd29ybGRNYXRyaXgubTAyICogc2NhbGU7XG4gICAgICAgIGNhbnZhc1RvcCArPSBlbGVtZW50Ll93b3JsZE1hdHJpeC5tMTIgKiBzY2FsZTtcbiAgICAgICAgY2FudmFzTGVmdCArPSAtZWxlbWVudC5vcmlnaW5YICogd2lkdGg7XG4gICAgICAgIGNhbnZhc1RvcCArPSAtZWxlbWVudC5vcmlnaW5ZICogaGVpZ2h0O1xuXG4gICAgICAgIHRoaXMuYnRuLnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xuICAgICAgICB0aGlzLmJ0bi5zdHlsZS53aWR0aCA9IGAke3dpZHRofXB4YDtcbiAgICAgICAgdGhpcy5idG4uc3R5bGUuaGVpZ2h0ID0gYCR7aGVpZ2h0fXB4YDtcbiAgICAgICAgdGhpcy5idG4uc3R5bGUubGVmdCA9IGAke2NhbnZhc0xlZnR9cHhgO1xuICAgICAgICB0aGlzLmJ0bi5zdHlsZS50b3AgPSBgJHtjYW52YXNUb3B9cHhgO1xuICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgb25yZW1vdmVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghdGhpcy5idG4pIHJldHVybjtcbiAgICAgIHRoaXMuYnRuLnJlbW92ZSgpO1xuICAgICAgdGhpcy5idG4gPSBudWxsO1xuICAgIH0sXG5cbiAgfSk7XG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZSgoKSA9PiB7XG4gIHBoaW5hLmRlZmluZShcIklucHV0RmllbGRcIiwge1xuICAgIHN1cGVyQ2xhc3M6IFwiRGlzcGxheUVsZW1lbnRcIixcblxuICAgIGRvbUVsZW1lbnQ6IG51bGwsXG5cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICB0aGlzLm9wdGlvbnMgPSAoe30pLiRzYWZlKG9wdGlvbnMsIElucHV0RmllbGQuZGVmYXVsdHMpO1xuICAgICAgdGhpcy5zdXBlckluaXQob3B0aW9ucyk7XG5cbiAgICAgIHRoaXMuZG9tRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcbiAgICAgIHRoaXMuZG9tRWxlbWVudC50eXBlID0gdGhpcy5vcHRpb25zLnR5cGU7XG4gICAgICB0aGlzLmRvbUVsZW1lbnQudmFsdWUgPSB0aGlzLm9wdGlvbnMudGV4dDtcblxuICAgICAgdGhpcy5kb21FbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuICAgICAgdGhpcy5kb21FbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgIHRoaXMuZG9tRWxlbWVudC5zdHlsZS5wYWRkaW5nID0gXCIwcHhcIjtcbiAgICAgIHRoaXMuZG9tRWxlbWVudC5zdHlsZS5ib3JkZXJXaWR0aCA9IFwiMHB4XCI7XG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRoaXMuZG9tRWxlbWVudCk7XG5cbiAgICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwiZm9jdXNcIiwgKCkgPT4ge1xuICAgICAgICB0aGlzLmZsYXJlKFwiZm9jdXNcIik7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy5kb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJmb2N1c291dFwiLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuZmxhcmUoXCJmb2N1c291dFwiKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsICgpID0+IHtcbiAgICAgICAgdGhpcy5mbGFyZShcImNoYW5nZVwiKTtcbiAgICAgIH0pO1xuXG4gICAgICAvL1RPRE86YXBw44Gu5Y+C54Wn5pa55rOV44Gn5LuW44Gr6Imv44GE5pa55rOV44GM44GC44KM44Gw5aSJ5pu044GZ44KLXG4gICAgICB0aGlzLm9uZShcImVudGVyZnJhbWVcIiwgKGUpID0+IHtcbiAgICAgICAgdGhpcy5hcHAgPSBlLmFwcDtcbiAgICAgICAgdGhpcy5zZXR1cCgpO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIHNldHVwOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMub24oXCJlbnRlcmZyYW1lXCIsICgpID0+IHtcbiAgICAgICAgY29uc3Qgc2NhbGUgPSBwYXJzZUludCh0aGlzLmFwcC5kb21FbGVtZW50LnN0eWxlLndpZHRoKSAvIHRoaXMuYXBwLmRvbUVsZW1lbnQud2lkdGggKiB0aGlzLmFwcC5xdWFsaXR5O1xuXG4gICAgICAgIGxldCBmb250U2l6ZSA9ICh0aGlzLm9wdGlvbnMuZm9udFNpemUgKiBzY2FsZSkucm91bmQoKTtcbiAgICAgICAgLy/jgq3jg6Pjg7Pjg5Djgrnjga7lt6bkuIrjgavlkIjjgo/jgZvjgotcbiAgICAgICAgbGV0IHdpZHRoID0gdGhpcy53aWR0aCAqIHNjYWxlO1xuICAgICAgICBsZXQgaGVpZ2h0ID0gdGhpcy5oZWlnaHQgKiBzY2FsZTtcbiAgICAgICAgbGV0IGNhbnZhc0xlZnQgPSBwYXJzZUludCh0aGlzLmFwcC5kb21FbGVtZW50LnN0eWxlLmxlZnQpO1xuICAgICAgICBsZXQgY2FudmFzVG9wID0gcGFyc2VJbnQodGhpcy5hcHAuZG9tRWxlbWVudC5zdHlsZS50b3ApO1xuXG4gICAgICAgIC8v6Ieq6Lqr44Gu44Kw44Ot44O844OQ44Or5bqn5qiZ44Gr5ZCI44KP44Gb44KLXG4gICAgICAgIGNhbnZhc0xlZnQgKz0gdGhpcy5fd29ybGRNYXRyaXgubTAyICogc2NhbGU7XG4gICAgICAgIGNhbnZhc1RvcCArPSB0aGlzLl93b3JsZE1hdHJpeC5tMTIgKiBzY2FsZTtcbiAgICAgICAgLy9vcmlnaW7jga7oqr/mlbRcbiAgICAgICAgY2FudmFzTGVmdCArPSAtdGhpcy5vcmlnaW5YICogd2lkdGg7XG4gICAgICAgIGNhbnZhc1RvcCArPSAtdGhpcy5vcmlnaW5ZICogaGVpZ2h0O1xuXG4gICAgICAgIHRoaXMuZG9tRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LnN0eWxlLndpZHRoID0gYCR7d2lkdGh9cHhgO1xuICAgICAgICB0aGlzLmRvbUVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gYCR7aGVpZ2h0fXB4YDtcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LnN0eWxlLmxlZnQgPSBgJHtjYW52YXNMZWZ0fXB4YDtcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LnN0eWxlLnRvcCA9IGAke2NhbnZhc1RvcH1weGA7XG4gICAgICAgIHRoaXMuZG9tRWxlbWVudC5zdHlsZS5mb250U2l6ZSA9IGAke2ZvbnRTaXplfXB4YDtcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LnN0eWxlLmZvbnRGYW1pbGl5ID0gXCJNYWluLUJvbGRcIjtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBzZXRWaXNpYmxlOiBmdW5jdGlvbihmbGFnKSB7XG4gICAgICB0aGlzLnZpc2libGUgPSBmbGFnO1xuICAgICAgaWYgKHRoaXMuZG9tRWxlbWVudCkge1xuICAgICAgICB0aGlzLmRvbUVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IChmbGFnKSA/IFwiXCIgOiBcIm5vbmVcIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBzaG93OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc2V0VmlzaWJsZSh0cnVlKTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBoaWRlOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuc2V0VmlzaWJsZShmYWxzZSk7XG4gICAgICB0aGlzLmRvbUVsZW1lbnQuYmx1cigpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8v44K944OV44OI44Km44Kn44Ki44Kt44O844Oc44O844OJ6Z2e6KGo56S6XG4gICAgYmx1cjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLmRvbUVsZW1lbnQuYmx1cigpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHJlYWRPbmx5OiBmdW5jdGlvbihmbGFnKSB7XG4gICAgICBpZiAoZmxhZyA9PSB1bmRlZmluZWQpIGZsYWcgPSB0cnVlO1xuICAgICAgaWYgKGZsYWcpIHtcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LnJlYWRPbmx5ID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZG9tRWxlbWVudC5yZWFkT25seSA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGFkZENTUzogZnVuY3Rpb24oY3NzKSB7XG4gICAgICBpZiAoY3NzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgY3NzLmZvckVhY2goKGMpID0+IHtcbiAgICAgICAgICB0aGlzLmRvbUVsZW1lbnQuY2xhc3NMaXN0LmFkZChjKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5kb21FbGVtZW50KSB7XG4gICAgICAgICAgdGhpcy5kb21FbGVtZW50LmNsYXNzTGlzdC5hZGQoY3NzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHJlbW92ZUNTUzogZnVuY3Rpb24oY3NzKSB7XG4gICAgICBpZiAoY3NzIGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICAgICAgY3NzLmZvckVhY2goKGMpID0+IHtcbiAgICAgICAgICB0aGlzLmRvbUVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShjKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAodGhpcy5kb21FbGVtZW50KSB7XG4gICAgICAgICAgdGhpcy5kb21FbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoY3NzKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIG9ucmVtb3ZlZDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5kb21FbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZG9tRWxlbWVudC5yZW1vdmUoKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgLy/ntbXmloflrZfjga7pmaTljrtcbiAgICByZW1vdmVFbW9qaTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmFuZ2VzID0gW1xuICAgICAgICAnXFx1ZDgzY1tcXHVkZjAwLVxcdWRmZmZdJyxcbiAgICAgICAgJ1xcdWQ4M2RbXFx1ZGMwMC1cXHVkZTRmXScsXG4gICAgICAgICdcXHVkODNkW1xcdWRlODAtXFx1ZGVmZl0nLFxuICAgICAgICAnXFx1ZDdjOVtcXHVkZTAwLVxcdWRlZmZdJyxcbiAgICAgICAgJ1tcXHUyNjAwLVxcdTI3QkZdJyxcbiAgICAgIF07XG4gICAgICB2YXIgcmVnID0gbmV3IFJlZ0V4cChyYW5nZXMuam9pbignfCcpLCAnZycpO1xuICAgICAgdGhpcy5kb21FbGVtZW50LnZhbHVlID0gKHRoaXMuZG9tRWxlbWVudC52YWx1ZSkucmVwbGFjZShyZWcsICcnKTtcbiAgICB9LFxuICAgIFxuICAgIF9hY2Nlc3Nvcjoge1xuICAgICAgdGV4dDoge1xuICAgICAgICBcImdldFwiOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gKHRoaXMuZG9tRWxlbWVudCkgPyB0aGlzLmRvbUVsZW1lbnQudmFsdWUgOiBcIlwiO1xuICAgICAgICB9LFxuICAgICAgICBcInNldFwiOiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgaWYgKCF0aGlzLmRvbUVsZW1lbnQpIHJldHVybjtcbiAgICAgICAgICB0aGlzLmRvbUVsZW1lbnQudmFsdWUgPSB2O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIF9zdGF0aWM6IHtcbiAgICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIHdpZHRoOiAyMDAsXG4gICAgICAgIGhlaWdodDogNDAsXG4gICAgICAgIGZvbnRTaXplOiAyMCxcbiAgICAgICAgdGV4dDogXCJcIixcbiAgICAgICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgICB9XG4gICAgfSxcbiAgfSk7XG59KTtcbiIsIi8vXG4vLyDjgq/jg6rjg4Pjgq/jgoTjgr/jg4Pjg4HjgpLjgqTjg7Pjgr/jg7zjgrvjg5fjg4jjgZnjgotcbi8vXG5waGluYS5kZWZpbmUoXCJJbnB1dEludGVyY2VwdFwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiRGlzcGxheUVsZW1lbnRcIixcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuXG4gICAgdGhpcy5vbihcImFkZGVkXCIsICgpID0+IHtcbiAgICAgIC8v6Kaq44Gr5a++44GX44Gm6KaG44GE44GL44G244Gb44KLXG4gICAgICB0aGlzLndpZHRoID0gdGhpcy5wYXJlbnQud2lkdGg7XG4gICAgICB0aGlzLmhlaWdodCA9IHRoaXMucGFyZW50LmhlaWdodDtcbiAgICAgIHRoaXMub3JpZ2luWCA9IHRoaXMucGFyZW50Lm9yaWdpblggfHwgMDtcbiAgICAgIHRoaXMub3JpZ2luWSA9IHRoaXMucGFyZW50Lm9yaWdpblkgfHwgMDtcbiAgICAgIHRoaXMueCA9IDA7XG4gICAgICB0aGlzLnkgPSAwO1xuICAgIH0pO1xuICAgIHRoaXMuZGlzYWJsZSgpO1xuICB9LFxuXG4gIGVuYWJsZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRJbnRlcmFjdGl2ZSh0cnVlKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBkaXNhYmxlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNldEludGVyYWN0aXZlKGZhbHNlKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJNb2RhbFwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiSW5wdXRJbnRlcmNlcHRcIixcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIHRoaXMuZW5hYmxlKCk7XG4gIH0sXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy/ooajnpLrjgqLjg4vjg6Hjg7zjgrfjg6fjg7NcbiAgLy8g44Ki44OL44Oh44O844K344On44Oz44Gr44Gk44GE44Gm44Gv57aZ5om/5YWD44Gn5YaN5a6a576pXG4gIG9wZW5BbmltYXRpb246IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfSxcblxuICAvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8v6Z2e6KGo56S644Ki44OL44Oh44O844K344On44OzXG4gIC8vIOOCouODi+ODoeODvOOCt+ODp+ODs+OBq+OBpOOBhOOBpuOBr+e2meaJv+WFg+OBp+WGjeWumue+qVxuICBjbG9zZUFuaW1hdGlvbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9LFxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy/ooajnpLpcbiAgb3BlbjogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMub3BlbkFuaW1hdGlvbigpO1xuICB9LFxuXG4gIC8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy/pnZ7ooajnpLpcbiAgY2xvc2U6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLmNsb3NlQW5pbWF0aW9uKCk7XG4gIH1cblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoKCkgPT4ge1xuICBwaGluYS5kZWZpbmUoXCJUZXh0QXJlYVwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJEaXNwbGF5RWxlbWVudFwiLFxuXG4gICAgZG9tRWxlbWVudDogbnVsbCxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIHRoaXMub3B0aW9ucyA9ICh7fSkuJHNhZmUob3B0aW9ucywgVGV4dEFyZWEuZGVmYXVsdHMpO1xuICAgICAgdGhpcy5zdXBlckluaXQob3B0aW9ucyk7XG5cbiAgICAgIHRoaXMuZG9tRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJ0ZXh0YXJlYVwiKTtcbiAgICAgIHRoaXMuZG9tRWxlbWVudC50eXBlID0gXCJ0ZXh0XCI7XG4gICAgICB0aGlzLmRvbUVsZW1lbnQudmFsdWUgPSB0aGlzLm9wdGlvbnMudGV4dDtcbiAgICAgIHRoaXMuZG9tRWxlbWVudC5yZXNpemUgPSBcIm5vbmVcIjtcbiAgICAgIGlmIChvcHRpb25zLnJvd3MpIHRoaXMuZG9tRWxlbWVudC5yb3dzID0gb3B0aW9ucy5yb3dzO1xuXG4gICAgICB0aGlzLmRvbUVsZW1lbnQuc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG4gICAgICB0aGlzLmRvbUVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgdGhpcy5kb21FbGVtZW50LnN0eWxlLnBhZGRpbmcgPSBcIjBweFwiO1xuICAgICAgdGhpcy5kb21FbGVtZW50LnN0eWxlLmJvcmRlcldpZHRoID0gXCIwcHhcIjtcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5kb21FbGVtZW50KTtcblxuICAgICAgdGhpcy5kb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJmb2N1c1wiLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuZmxhcmUoXCJmb2N1c1wiKTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImZvY3Vzb3V0XCIsICgpID0+IHtcbiAgICAgICAgdGhpcy5mbGFyZShcImZvY3Vzb3V0XCIpO1xuICAgICAgfSk7XG5cbiAgICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgKCkgPT4ge1xuICAgICAgICB0aGlzLmZsYXJlKFwiY2hhbmdlXCIpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vVE9ETzphcHDjga7lj4Lnhafmlrnms5Xjgafku5bjgavoia/jgYTmlrnms5XjgYzjgYLjgozjgbDlpInmm7TjgZnjgotcbiAgICAgIHRoaXMub25lKFwiZW50ZXJmcmFtZVwiLCAoZSkgPT4ge1xuICAgICAgICB0aGlzLmFwcCA9IGUuYXBwO1xuICAgICAgICB0aGlzLnNldHVwKCk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgc2V0dXA6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5vbihcImVudGVyZnJhbWVcIiwgKCkgPT4ge1xuICAgICAgICBjb25zdCBzY2FsZSA9IHBhcnNlSW50KHRoaXMuYXBwLmRvbUVsZW1lbnQuc3R5bGUud2lkdGgpIC8gdGhpcy5hcHAuZG9tRWxlbWVudC53aWR0aCAqIHRoaXMuYXBwLnF1YWxpdHk7XG5cbiAgICAgICAgbGV0IGZvbnRTaXplID0gKHRoaXMub3B0aW9ucy5mb250U2l6ZSAqIHNjYWxlKS5yb3VuZCgpO1xuICAgICAgICAvL+OCreODo+ODs+ODkOOCueOBruW3puS4iuOBq+WQiOOCj+OBm+OCi1xuICAgICAgICBsZXQgd2lkdGggPSB0aGlzLndpZHRoICogc2NhbGU7XG4gICAgICAgIGxldCBoZWlnaHQgPSB0aGlzLmhlaWdodCAqIHNjYWxlO1xuICAgICAgICBsZXQgY2FudmFzTGVmdCA9IHBhcnNlSW50KHRoaXMuYXBwLmRvbUVsZW1lbnQuc3R5bGUubGVmdCk7XG4gICAgICAgIGxldCBjYW52YXNUb3AgPSBwYXJzZUludCh0aGlzLmFwcC5kb21FbGVtZW50LnN0eWxlLnRvcCk7XG5cbiAgICAgICAgLy/oh6rouqvjga7jgrDjg63jg7zjg5Djg6vluqfmqJnjgavlkIjjgo/jgZvjgotcbiAgICAgICAgY2FudmFzTGVmdCArPSB0aGlzLl93b3JsZE1hdHJpeC5tMDIgKiBzY2FsZTtcbiAgICAgICAgY2FudmFzVG9wICs9IHRoaXMuX3dvcmxkTWF0cml4Lm0xMiAqIHNjYWxlO1xuICAgICAgICAvL29yaWdpbuOBruiqv+aVtFxuICAgICAgICBjYW52YXNMZWZ0ICs9IC10aGlzLm9yaWdpblggKiB3aWR0aDtcbiAgICAgICAgY2FudmFzVG9wICs9IC10aGlzLm9yaWdpblkgKiBoZWlnaHQ7XG5cbiAgICAgICAgdGhpcy5kb21FbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBcIlwiO1xuICAgICAgICB0aGlzLmRvbUVsZW1lbnQuc3R5bGUud2lkdGggPSBgJHt3aWR0aH1weGA7XG4gICAgICAgIHRoaXMuZG9tRWxlbWVudC5zdHlsZS5oZWlnaHQgPSBgJHtoZWlnaHR9cHhgO1xuICAgICAgICB0aGlzLmRvbUVsZW1lbnQuc3R5bGUubGVmdCA9IGAke2NhbnZhc0xlZnR9cHhgO1xuICAgICAgICB0aGlzLmRvbUVsZW1lbnQuc3R5bGUudG9wID0gYCR7Y2FudmFzVG9wfXB4YDtcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LnN0eWxlLmZvbnRTaXplID0gYCR7Zm9udFNpemV9cHhgO1xuICAgICAgICB0aGlzLmRvbUVsZW1lbnQuc3R5bGUuZm9udEZhbWlsaXkgPSBcIk1haW4tQm9sZFwiO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIHNldFZpc2libGU6IGZ1bmN0aW9uKGZsYWcpIHtcbiAgICAgIHRoaXMudmlzaWJsZSA9IGZsYWc7XG4gICAgICBpZiAodGhpcy5kb21FbGVtZW50KSB7XG4gICAgICAgIHRoaXMuZG9tRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gKGZsYWcpID8gXCJcIiA6IFwibm9uZVwiO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIHNob3c6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zZXRWaXNpYmxlKHRydWUpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIGhpZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zZXRWaXNpYmxlKGZhbHNlKTtcbiAgICAgIHRoaXMuZG9tRWxlbWVudC5ibHVyKCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy/jgr3jg5Xjg4jjgqbjgqfjgqLjgq3jg7zjg5zjg7zjg4npnZ7ooajnpLpcbiAgICBibHVyOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuZG9tRWxlbWVudC5ibHVyKCk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgcmVhZE9ubHk6IGZ1bmN0aW9uKGZsYWcpIHtcbiAgICAgIGlmIChmbGFnID09IHVuZGVmaW5lZCkgZmxhZyA9IHRydWU7XG4gICAgICBpZiAoZmxhZykge1xuICAgICAgICB0aGlzLmRvbUVsZW1lbnQucmVhZE9ubHkgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LnJlYWRPbmx5ID0gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgYWRkQ1NTOiBmdW5jdGlvbihjc3MpIHtcbiAgICAgIGlmIChjc3MgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBjc3MuZm9yRWFjaCgoYykgPT4ge1xuICAgICAgICAgIHRoaXMuZG9tRWxlbWVudC5jbGFzc0xpc3QuYWRkKGMpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLmRvbUVsZW1lbnQpIHtcbiAgICAgICAgICB0aGlzLmRvbUVsZW1lbnQuY2xhc3NMaXN0LmFkZChjc3MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgcmVtb3ZlQ1NTOiBmdW5jdGlvbihjc3MpIHtcbiAgICAgIGlmIChjc3MgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgICAgICBjc3MuZm9yRWFjaCgoYykgPT4ge1xuICAgICAgICAgIHRoaXMuZG9tRWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKGMpO1xuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICh0aGlzLmRvbUVsZW1lbnQpIHtcbiAgICAgICAgICB0aGlzLmRvbUVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShjc3MpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgb25yZW1vdmVkOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmRvbUVsZW1lbnQpIHtcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LnJlbW92ZSgpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvL+e1teaWh+Wtl+OBjOOBguOCi+OBi+ODgeOCp+ODg+OCr1xuICAgIGNoZWNrRW1vamk6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHJhbmdlcyA9IFtcbiAgICAgICAgJ1xcdWQ4M2NbXFx1ZGYwMC1cXHVkZmZmXScsXG4gICAgICAgICdcXHVkODNkW1xcdWRjMDAtXFx1ZGU0Zl0nLFxuICAgICAgICAnXFx1ZDgzZFtcXHVkZTgwLVxcdWRlZmZdJyxcbiAgICAgICAgJ1xcdWQ3YzlbXFx1ZGUwMC1cXHVkZWZmXScsXG4gICAgICAgICdbXFx1MjYwMC1cXHUyN0JGXScsXG4gICAgICBdO1xuICAgICAgdmFyIHJlZyA9IG5ldyBSZWdFeHAocmFuZ2VzLmpvaW4oJ3wnKSwgJ2cnKTtcbiAgICAgIHJldHVybiB0aGlzLmRvbUVsZW1lbnQudmFsdWUubWF0Y2gocmVnKTtcbiAgICB9LFxuXG4gICAgLy/ntbXmloflrZfjga7pmaTljrtcbiAgICByZW1vdmVFbW9qaTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcmFuZ2VzID0gW1xuICAgICAgICAnXFx1ZDgzY1tcXHVkZjAwLVxcdWRmZmZdJyxcbiAgICAgICAgJ1xcdWQ4M2RbXFx1ZGMwMC1cXHVkZTRmXScsXG4gICAgICAgICdcXHVkODNkW1xcdWRlODAtXFx1ZGVmZl0nLFxuICAgICAgICAnXFx1ZDdjOVtcXHVkZTAwLVxcdWRlZmZdJyxcbiAgICAgICAgJ1tcXHUyNjAwLVxcdTI3QkZdJyxcbiAgICAgIF07XG4gICAgICB2YXIgcmVnID0gbmV3IFJlZ0V4cChyYW5nZXMuam9pbignfCcpLCAnZycpO1xuICAgICAgdGhpcy5kb21FbGVtZW50LnZhbHVlID0gKHRoaXMuZG9tRWxlbWVudC52YWx1ZSkucmVwbGFjZShyZWcsICcnKTtcbiAgICB9LFxuICAgIFxuICAgIF9hY2Nlc3Nvcjoge1xuICAgICAgdGV4dDoge1xuICAgICAgICBcImdldFwiOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gKHRoaXMuZG9tRWxlbWVudCkgPyB0aGlzLmRvbUVsZW1lbnQudmFsdWUgOiBcIlwiO1xuICAgICAgICB9LFxuICAgICAgICBcInNldFwiOiBmdW5jdGlvbih2KSB7XG4gICAgICAgICAgaWYgKCF0aGlzLmRvbUVsZW1lbnQpIHJldHVybjtcbiAgICAgICAgICB0aGlzLmRvbUVsZW1lbnQudmFsdWUgPSB2O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcblxuICAgIF9zdGF0aWM6IHtcbiAgICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIHdpZHRoOiAyMDAsXG4gICAgICAgIGhlaWdodDogNDAsXG4gICAgICAgIGZvbnRTaXplOiAyMCxcbiAgICAgICAgdGV4dDogXCJcIixcbiAgICAgIH1cbiAgICB9LFxuICB9KTtcbn0pO1xuIiwiLypcbiAqICBBc3NldExvYWRTY2VuZS5qc1xuICovXG5cbnBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoJ0Fzc2V0TG9hZFNjZW5lJywge1xuICAgIHN1cGVyQ2xhc3M6ICdCYXNlU2NlbmUnLFxuXG4gICAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICAgIG9wdGlvbnMgPSAob3B0aW9ucyB8fCB7fSkuJHNhZmUoe1xuICAgICAgICBhc3NldFR5cGU6IFwicHJlbG9hZFwiLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIGxvYWQgYXNzZXRcbiAgICAgIGNvbnN0IGFzc2V0cyA9IEFzc2V0TGlzdC5nZXQob3B0aW9ucy5hc3NldFR5cGUpO1xuICAgICAgaWYgKCFhc3NldHMpIHtcbiAgICAgICAgY29uc29sZS5sb2coXCJVbmFibGUgYXNzZXQgbG9hZDogXCIgKyBvcHRpb25zLmFzc2V0VHlwZSk7XG4gICAgICAgIHRoaXMuZXhpdCgpO1xuICAgICAgfVxuICAgICAgdGhpcy5sb2FkZXIgPSBwaGluYS5hc3NldC5Bc3NldExvYWRlcigpO1xuICAgICAgdGhpcy5sb2FkZXIubG9hZChhc3NldHMpO1xuICAgICAgdGhpcy5sb2FkZXIub24oJ2xvYWQnLCAoKSA9PiB0aGlzLmV4aXQoKSk7XG4gICAgfSxcbiAgfSk7XG5cbn0pO1xuIiwiLypcbiAqICBUaXRsZVNjZW5lLmpzXG4gKi9cblxucGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRlZmluZSgnVGl0bGVTY2VuZScsIHtcbiAgICBzdXBlckNsYXNzOiAnQmFzZVNjZW5lJyxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgfSxcblxuICAgIHNldHVwOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuYmFzZSA9IERpc3BsYXlFbGVtZW50KCkuYWRkQ2hpbGRUbyh0aGlzKS5zZXRQb3NpdGlvbihTQ1JFRU5fT0ZGU0VUX1gsIFNDUkVFTl9PRkZTRVRfWSk7XG5cbiAgICAgIFNwcml0ZShcImJsYWNrXCIpXG4gICAgICAgIC5zZXRQb3NpdGlvbih0aGlzLmdyaWRYLmNlbnRlcigpLCB0aGlzLmdyaWRZLmNlbnRlcigpKVxuICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzLmJhc2UpXG5cbiAgICAgIExhYmVsKHtcbiAgICAgICAgdGV4dDogXCJWZXJzdXNcIixcbiAgICAgIH0pXG4gICAgICAgIC5zZXRQb3NpdGlvbih0aGlzLmdyaWRYLmNlbnRlcigpLCB0aGlzLmdyaWRZLmNlbnRlcigpKVxuICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzLmJhc2UpXG4gIH0sXG5cbiAgICB1cGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgIH0sXG4gIH0pO1xuXG59KTtcbiJdfQ==
