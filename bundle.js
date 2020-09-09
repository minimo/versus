/*
 *  main.js
 */

phina.globalize();

const SCREEN_WIDTH = 576;
const SCREEN_HEIGHT = 324;
const SCREEN_WIDTH_HALF = SCREEN_WIDTH * 0.5;
const SCREEN_HEIGHT_HALF = SCREEN_HEIGHT * 0.5;

const SCREEN_OFFSET_X = 0;
const SCREEN_OFFSET_Y = 0;

const NUM_LAYERS = 7;
const LATER_FOREGROUND = 6;
const LAYER_EFFECT_FORE = 5;
const LAYER_PLAYER = 4;
const LAYER_ENEMY = 3;
const LAYER_EFFECT_BACK = 2;
const LAYER_BACKGROUND = 1;
const LAYER_MAP = 0;

let phina_app;

window.onload = function() {
  phina_app = Application();
  phina_app.replaceScene(FirstSceneFlow({}));
  phina_app.run();
};

//スクロール禁止
// document.addEventListener('touchmove', function(e) {
//  e.preventDefault();
// }, { passive: false });

//Androidブラウザバックボタン制御
// document.addEventListener("backbutton", function(e){
//   e.preventDefault();
// }, false);
phina.namespace(function() {

  phina.define('MainScene', {
    superClass: 'BaseScene',

    init: function(options) {
      this.superInit();
      this.setup();
    },

    setup: function() {
      const back = RectangleShape({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: "black" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(back);

      this.world = World().addChildTo(this);
    },

    update: function() {
    },

  });

});

/*
 *  TitleScene.js
 */

phina.namespace(function() {

  phina.define('TitleScene', {
    superClass: 'BaseScene',

    _static: {
      isAssetLoad: false,
    },

    init: function(options) {
      this.superInit();

      this.unlock = false;
      this.loadcomplete = false;
      this.progress = 0;

      //ロード済みならアセットロードをしない
      if (TitleScene.isAssetLoad) {
        this.setup();
      } else {
        //preload asset
        const assets = AssetList.get("preload")
        this.loader = phina.asset.AssetLoader();
        this.loader.load(assets);
        this.loader.on('load', () => this.setup());
        TitleScene.isAssetLoad = true;
      }
    },

    setup: function() {
      const back = RectangleShape({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, fill: "black" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(back);

      const label = Label({ text: "Versus", fill: "white" })
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);
      this.registDispose(label);

      this.one('nextscene', () => this.exit("main"));
      this.flare('nextscene');
    },

    update: function() {
      const ct = phina_app.controller;
      if (ct.a) {
        this.flare('nextscene');
      }
    },

  });

});

phina.namespace(function() {

  phina.define("Application", {
    superClass: "phina.display.CanvasApp",

    quality: 1.0,
  
    init: function() {
      this.superInit({
        fps: 60,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        fit: true,
      });
  
      //シーンの幅、高さの基本を設定
      phina.display.DisplayScene.defaults.$extend({
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
      });
  
      phina.input.Input.quality = this.quality;
      phina.display.DisplayScene.quality = this.quality;

      //ゲームパッド管理
      this.gamepadManager = phina.input.GamepadManager();
      this.gamepad = this.gamepadManager.get(0);
      this.controller = {};

      this.setupEvents();
      this.setupSound();
      this.setupMouseWheel();

      this.on("changescene", () => {
        //シーンを離れる際、ボタン同時押しフラグを解除する
        Button.actionTarget = null;
      });

      //パッド情報を更新
      this.on('enterframe', function() {
        this.gamepadManager.update();
        this.updateController();
      });
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

    updateController: function() {
      const before = this.controller;
      before.before = null;

      const gp = this.gamepad;
      const kb = this.keyboard;
      const angle1 = gp.getKeyAngle();
      const angle2 = kb.getKeyAngle();
      this.controller = {
          angle: angle1 !== null? angle1: angle2,

          up: gp.getKey("up") || kb.getKey("up"),
          down: gp.getKey("down") || kb.getKey("down"),
          left: gp.getKey("left") || kb.getKey("left"),
          right: gp.getKey("right") || kb.getKey("right"),

          attack: gp.getKey("A") || kb.getKey("X"),
          jump:   gp.getKey("X") || kb.getKey("Z"),
          menu:   gp.getKey("start") || kb.getKey("escape"),

          a: gp.getKey("A") || kb.getKey("Z"),
          b: gp.getKey("B") || kb.getKey("X"),
          x: gp.getKey("X") || kb.getKey("C"),
          y: gp.getKey("Y") || kb.getKey("V"),

          ok: gp.getKey("A") || kb.getKey("Z") || kb.getKey("space") || kb.getKey("return"),
          cancel: gp.getKey("B") || kb.getKey("X") || kb.getKey("escape"),

          start: gp.getKey("start") || kb.getKey("return"),
          select: gp.getKey("select"),

          pause: gp.getKey("start") || kb.getKey("escape"),

          analog1: gp.getStickDirection(0),
          analog2: gp.getStickDirection(1),

          //前フレーム情報
          before: before,
      };
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
                "fighter": "assets/textures/fighter.png",
                "particle": "assets/textures/particle.png",
              },
              // tmx: {
              //   "map1": "assets/map/map2.tmx",
              // },
              // tsx: {
              //   "tile_a": "assets/map/tile_a.tsx",
              // }
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
        this.disposeElements.forEach(e => {
          if (e.destroyCanvas) {
            e.destroyCanvas();
          } else if (e instanceof Canvas) {
            e.setSize(0, 0);
          }
        });
      });

      this.app = phina_app;

      //別シーンへの移行時にキャンバスを破棄
      this.one('exit', () => {
        this.destroy();
        this.canvas.destroy();
        this.flare('destroy');
        console.log("Exit scene.");
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

    //シーン離脱時に破棄するShapeを登録
    registDispose: function(element) {
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
            label: "main",
            className: "MainScene",
          },
        ],
      });
    }
  });

});
phina.namespace(function() {

  phina.define('BaseUnit', {
    superClass: 'DisplayElement',

    _static: {
      defaultOptions: {
        world: null,
      },
    },

    state: null,
    speed: 0,

    sprite: null,

    hp: 100,

    init: function(options) {
      this.superInit(options);
      this.world = options.world || null;
      this.base = DisplayElement().addChildTo(this);

      this.before = null;
    },
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
            this.target.scaleTweener.clear().to({
              scaleX: 1.0 * this.sx,
              scaleY: 1.0 * this.sy
            }, 50);
          });
        }

        //ボタンの処理を実行しても問題ない場合のみ貫通を停止する
        e.pass = false;
        Button.actionTarget = this.target;

        //反転しているボタン用に保持する
        this.sx = (this.target.scaleX > 0) ? 1 : -1;
        this.sy = (this.target.scaleY > 0) ? 1 : -1;

        this.target.scaleTweener.clear()
          .to({
            scaleX: 0.95 * this.sx,
            scaleY: 0.95 * this.sy
          }, 50);

        this.doLongpress = false;
        this.target.twLongpress.clear()
          .wait(this.lognpressTime)
          .call(() => {
            if (!this.longpressBarrage) {
              Button.actionTarget = null;
              this.target.scaleTweener.clear()
                .to({
                  scaleX: 1.0 * this.sx,
                  scaleY: 1.0 * this.sy
                }, 50)
              this.target.flare("longpress")
            } else {
              this.target.flare("clickSound");
              this.target.twLongpressing.clear()
                .wait(5)
                .call(() => this.target.flare("clicked", {
                  longpress: true
                }))
                .call(() => this.target.flare("longpressing"))
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
          .to({
            scaleX: 1.0 * this.sx,
            scaleY: 1.0 * this.sy
          }, 50)
          .call(() => {
            Button.actionTarget = null;
            if (!hitTest || isMove || this.doLongpress) return;
            this.target.flare("clicked", {
              pointer: e.pointer
            });
          });
      });

      //アニメーションの最中に削除された場合に備えてremovedイベント時にフラグを元に戻しておく
      this.target.one("removed", () => {
        if (Button.actionTarget === this.target) {
          Button.actionTarget = null;
        }
      });

      this.target.on("clickSound", () => {
        if (!this.target.clickSound || this.target.clickSound == "") return;
        phina.asset.SoundManager.play(this.target.clickSound);
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
      clickSound: "common/sounds/se/button",
    },

    //親をたどってListViewを探す
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

/**
 * 親スプライトのテクスチャを切り抜いて自分のテクスチャとするスプライト
 * 親スプライトの切り抜かれた部分は、切り抜き範囲の左上のピクセルの色で塗りつぶされる
 * 
 * 親要素の拡縮・回転は考慮しない
 */
phina.define("ClipSprite", {
  superClass: "Accessory",

  init: function() {
    this.superInit();
    this.on("attached", () => {
      this.target.one("added", () => {
        this.setup();
      });
    });
  },

  setup: function() {
    const target = this.target;
    const parent = target.parent;
    if (parent instanceof phina.display.Sprite) {
      const x = parent.width * parent.origin.x + target.x - target.width * target.origin.x;
      const y = parent.height * parent.origin.y + target.y - target.height * target.origin.y;
      const w = target.width;
      const h = target.height;

      const parentTexture = parent.image;
      const canvas = phina.graphics.Canvas().setSize(w, h);
      canvas.context.drawImage(parentTexture.domElement, x, y, w, h, 0, 0, w, h);
      if (parentTexture instanceof phina.graphics.Canvas) {
        // クローンしてそっちを使う
        const parentTextureClone = phina.graphics.Canvas().setSize(parentTexture.width, parentTexture.height);
        parentTextureClone.context.drawImage(parentTexture.domElement, 0, 0);
        parent.image = parentTextureClone;

        const data = parentTextureClone.context.getImageData(x, y, 1, 1).data;
        parentTextureClone.context.clearRect(x, y, w, h);
        if (data[3] > 0) {
          parentTextureClone.context.globalAlpha = 1;
          parentTextureClone.context.fillStyle = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
          parentTextureClone.context.fillRect(x - 1, y - 1, w + 2, h + 2);
        }
      }

      const sprite = phina.display.Sprite(canvas);
      sprite.setOrigin(target.origin.x, target.origin.y);
      target.addChildAt(sprite, 0);
    }
  },
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
      set: function(v) {
        this.value = this.max * v;
      }
    },

    max: {
      get: function() {
        return this._max;
      },
      set: function(v) {
        this._max = v;
        this._refresh();
      }
    },

    min: {
      get: function() {
        return this._min;
      },
      set: function(v) {
        this._min = v;
        this._refresh();
      }
    },

    value: {
      get: function() {
        return this._value;
      },
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

phina.namespace(function() {
  //マウス追従
  phina.define("MouseChaser", {
    superClass: "Accessory",

    init: function() {
      this.superInit();
    },

    onattached: function() {
      let px = 0;
      let py = 0;
      console.log("#MouseChaser", "onattached");
      this.tweener = Tweener().attachTo(this.target);
      this.target.on("enterframe", (e) => {
        const p = e.app.pointer;
        if (py == p.x && py == p.y) return;
        px = p.x;
        py = p.y;
        const x = p.x - SCREEN_WIDTH_HALF;
        const y = p.y - SCREEN_HEIGHT_HALF;
        this.tweener.clear().to({ x, y }, 2000, "easeOutQuad")
      });

    },

    ondetached: function() {
      console.log("#MouseChaser", "ondetached");
      this.tweener.remove();
    }

  });
});

phina.define("MultiRectangleClip", {
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
    this.clipRect = [];

    this.on("attached", () => {
      this.x = 0;
      this.y = 0;
      this.width = this.target.width;
      this.height = this.target.height;

      this.target.clip = (c) => this._clip(c);
    });
  },

  addClipRect: function(rect) {
    const r = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
    this.clipRect.push(r);
    return this;
  },

  clearClipRect: function() {
    this.clipRect = [];
  },

  _clip: function(canvas) {
    canvas.beginPath();
    this.clipRect.forEach(rect => {
      canvas.rect(rect.x, rect.y, rect.width, rect.height)
    });
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
      "get": function() {
        return this.isOn;
      },
      "set": function(v) {
        return setStatus(v);
      },
    },
  },

});

phina.asset.AssetLoader.prototype.load = function(params) {
  const self = this;
  const loadAssets = [];
  const maxConnectionCount = 2;
  let counter = 0;
  let length = 0;

  params.forIn(function(type, assets) {
    length += Object.keys(assets).length;
  });

  if (length == 0) {
    return phina.util.Flow.resolve().then(function() {
      self.flare('load');
    });
  }

  params.forIn(function(type, assets) {
    assets.forIn(function(key, value) {
      loadAssets.push({
        "func": phina.asset.AssetLoader.assetLoadFunctions[type],
        "key": key,
        "value": value,
        "type": type,
      });
    });
  });

  if (self.cache) {
    self.on('progress', function(e) {
      if (e.progress >= 1.0) {
        params.forIn(function(type, assets) {
          assets.forIn(function(key, value) {
            const asset = phina.asset.AssetManager.get(type, key);
            if (asset.loadError) {
              const dummy = phina.asset.AssetManager.get(type, 'dummy');
              if (dummy) {
                if (dummy.loadError) {
                  dummy.loadDummy();
                  dummy.loadError = false;
                }
                phina.asset.AssetManager.set(type, key, dummy);
              } else {
                asset.loadDummy();
              }
            }
          });
        });
      }
    });
  }

  const loadAssetsArray = [];

  while (loadAssets.length > 0) {
    loadAssetsArray.push(loadAssets.splice(0, maxConnectionCount));
  }

  let flow = phina.util.Flow.resolve();

  loadAssetsArray.forEach(function(loadAssets) {
    flow = flow.then(function() {
      const flows = [];
      loadAssets.forEach(function(loadAsset) {
        const f = loadAsset.func(loadAsset.key, loadAsset.value);
        f.then(function(asset) {
          if (self.cache) {
            phina.asset.AssetManager.set(loadAsset.type, loadAsset.key, asset);
          }
          self.flare('progress', {
            key: loadAsset.key,
            asset: asset,
            progress: (++counter / length),
          });
        });
        flows.push(f);
      });
      return phina.util.Flow.all(flows);
    });
  });

  return flow.then(function(args) {
    self.flare('load');
  });
}

phina.namespace(function() {

  phina.app.BaseApp.prototype.$method("replaceScene", function(scene) {
    this.flare('replace');
    this.flare('changescene');

    while (this._scenes.length > 0) {
      const scene = this._scenes.pop();
      scene.flare("destroy");
    }

    this._sceneIndex = 0;

    if (this.currentScene) {
      this.currentScene.app = null;
    }

    this.currentScene = scene;
    this.currentScene.app = this;
    this.currentScene.flare('enter', {
      app: this,
    });

    return this;
  });

  phina.app.BaseApp.prototype.$method("popScene", function() {
    this.flare('pop');
    this.flare('changescene');

    const scene = this._scenes.pop();
    this._sceneIndex--;

    scene.flare('exit', {
      app: this,
    });
    scene.flare('destroy');
    scene.app = null;

    this.flare('poped');

    // 
    this.currentScene.flare('resume', {
      app: this,
      prevScene: scene,
    });

    return scene;
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
        // console.log('#### create canvas ####');
      }
    }

    this.domElement = this.canvas;
    this.context = this.canvas.getContext('2d');
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
  });

  phina.graphics.Canvas.prototype.$method('destroy', function(canvas) {
    if (!this.isCreateCanvas) return;
    // console.log(`#### delete canvas ${this.canvas.width} x ${this.canvas.height} ####`);
    this.setSize(0, 0);
    delete this.canvas;
    delete this.domElement;
  });

});

phina.namespace(() => {

  const qualityScale = phina.geom.Matrix33();

  phina.display.CanvasRenderer.prototype.$method("render", function(scene, quality) {
    this.canvas.clear();
    if (scene.backgroundColor) {
      this.canvas.clearColor(scene.backgroundColor);
    }

    this._context.save();
    this.renderChildren(scene, quality);
    this._context.restore();
  });

  phina.display.CanvasRenderer.prototype.$method("renderChildren", function(obj, quality) {
    // 子供たちも実行
    if (obj.children.length > 0) {
      const tempChildren = obj.children.slice();
      for (let i = 0, len = tempChildren.length; i < len; ++i) {
        this.renderObject(tempChildren[i], quality);
      }
    }
  });

  phina.display.CanvasRenderer.prototype.$method("renderObject", function(obj, quality) {
    if (obj.visible === false && !obj.interactive) return;

    obj._calcWorldMatrix && obj._calcWorldMatrix();

    if (obj.visible === false) return;

    obj._calcWorldAlpha && obj._calcWorldAlpha();

    const context = this.canvas.context;

    context.globalAlpha = obj._worldAlpha;
    context.globalCompositeOperation = obj.blendMode;

    if (obj._worldMatrix) {

      qualityScale.identity();

      qualityScale.m00 = quality || 1.0;
      qualityScale.m11 = quality || 1.0;

      const m = qualityScale.multiply(obj._worldMatrix);
      context.setTransform(m.m00, m.m10, m.m01, m.m11, m.m02, m.m12);

    }

    if (obj.clip) {

      context.save();

      obj.clip(this.canvas);
      context.clip();

      if (obj.draw) obj.draw(this.canvas);

      // 子供たちも実行
      if (obj.renderChildBySelf === false && obj.children.length > 0) {
        const tempChildren = obj.children.slice();
        for (let i = 0, len = tempChildren.length; i < len; ++i) {
          this.renderObject(tempChildren[i], quality);
        }
      }

      context.restore();
    } else {
      if (obj.draw) obj.draw(this.canvas);

      // 子供たちも実行
      if (obj.renderChildBySelf === false && obj.children.length > 0) {
        const tempChildren = obj.children.slice();
        for (let i = 0, len = tempChildren.length; i < len; ++i) {
          this.renderObject(tempChildren[i], quality);
        }
      }

    }
  });

});

phina.namespace(() => {
  //ユーザーエージェントからブラウザタイプの判別を行う
  phina.$method('checkBrowser', function() {
    const result = {};
    const agent = window.navigator.userAgent.toLowerCase();;

    result.isChrome = (agent.indexOf('chrome') !== -1) && (agent.indexOf('edge') === -1) && (agent.indexOf('opr') === -1);
    result.isEdge = (agent.indexOf('edge') !== -1);
    result.isIe11 = (agent.indexOf('trident/7') !== -1);
    result.isFirefox = (agent.indexOf('firefox') !== -1);
    result.isSafari = (agent.indexOf('safari') !== -1) && (agent.indexOf('chrome') === -1);
    result.isElectron = (agent.indexOf('electron') !== -1);

    result.isWindows = (agent.indexOf('windows') !== -1);
    result.isMac = (agent.indexOf('mac os x') !== -1);

    result.isiPad = agent.indexOf('ipad') > -1 || ua.indexOf('macintosh') > -1 && 'ontouchend' in document;
    result.isiOS = agent.indexOf('iphone') > -1 || ua.indexOf('ipad') > -1 || ua.indexOf('macintosh') > -1 && 'ontouchend' in document;

    return result;
  });
});

//==================================================
//  Extension phina.display.DisplayElement
//==================================================
phina.namespace(() => {
  phina.display.DisplayElement.prototype.$method("enable", function() {
    this.show().wakeUp();
    return this;
  });

  phina.display.DisplayElement.prototype.$method("disable", function() {
    this.hide().sleep();
    return this;
  });
});

phina.namespace(() => {
  phina.display.DisplayScene.quality = 1.0;
  phina.display.DisplayScene.prototype.$method("init", function(params) {
    this.superInit();
    const quality = phina.display.DisplayScene.quality;

    params = ({}).$safe(params, phina.display.DisplayScene.defaults);
    this.canvas = phina.graphics.Canvas();
    this.canvas.setSize(params.width * quality, params.height * quality);
    this.renderer = phina.display.CanvasRenderer(this.canvas);
    this.backgroundColor = (params.backgroundColor) ? params.backgroundColor : null;

    this.width = params.width;
    this.height = params.height;
    this.gridX = phina.util.Grid(params.width, 16);
    this.gridY = phina.util.Grid(params.height, 16);

    this.interactive = true;
    this.setInteractive = function(flag) {
      this.interactive = flag;
    };
    this._overFlags = {};
    this._touchFlags = {};
  });

});

phina.namespace(function() {

  // audio要素で音声を再生する。主にIE用
  phina.define("phina.asset.DomAudioSound", {
    superClass: "phina.asset.Asset",

    domElement: null,
    emptySound: false,

    init: function() {
      this.superInit();
    },

    _load: function(resolve) {
      this.domElement = document.createElement("audio");
      if (this.domElement.canPlayType("audio/mpeg")) {
        setTimeout(function readystateCheck() {
          if (this.domElement.readyState < 4) {
            setTimeout(readystateCheck.bind(this), 10);
          } else {
            this.emptySound = false;
            console.log("end load ", this.src);
            resolve(this)
          }
        }.bind(this), 10);
        this.domElement.onerror = function(e) {
          console.error("オーディオのロードに失敗", e);
        };
        this.domElement.src = this.src;
        console.log("begin load ", this.src);
        this.domElement.load();
        this.domElement.autoplay = false;
        this.domElement.addEventListener("ended", function() {
          this.flare("ended");
        }.bind(this));
      } else {
        console.log("mp3は再生できません");
        this.emptySound = true;
        resolve(this);
      }
    },

    play: function() {
      if (this.emptySound) return;
      this.domElement.pause();
      this.domElement.currentTime = 0;
      this.domElement.play();
    },

    stop: function() {
      if (this.emptySound) return;
      this.domElement.pause();
      this.domElement.currentTime = 0;
    },

    pause: function() {
      if (this.emptySound) return;
      this.domElement.pause();
    },

    resume: function() {
      if (this.emptySound) return;
      this.domElement.play();
    },

    setLoop: function(v) {
      if (this.emptySound) return;
      this.domElement.loop = v;
    },

    _accessor: {
      volume: {
        get: function() {
          if (this.emptySound) return 0;
          return this.domElement.volume;
        },
        set: function(v) {
          if (this.emptySound) return;
          this.domElement.volume = v;
        },
      },
      loop: {
        get: function() {
          if (this.emptySound) return false;
          return this.domElement.loop;
        },
        set: function(v) {
          if (this.emptySound) return;
          this.setLoop(v);
        },
      },

    },
  });

  // IE11の場合のみ音声アセットはDomAudioSoundで再生する
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.indexOf('trident/7') !== -1) {
    phina.asset.AssetLoader.register("sound", function(key, path) {
      const asset = phina.asset.DomAudioSound();
      return asset.load(path);
    });
  }

});

phina.namespace(() => {

  phina.app.Element.prototype.$method("findById", function(id) {
    if (this.id === id) {
      return this;
    } else {
      for (let i = 0; i < this.children.length; i++) {
        if (this.children[i].findById(id)) {
          return this.children[i];
        }
      }
      return null;
    }
  });

  //指定された子オブジェクトを最前面に移動する
  phina.app.Element.prototype.$method("moveFront", function(child) {
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i] == child) {
        this.children.splice(i, 1);
        break;
      }
    }
    this.children.push(child);
    return this;
  });

  phina.app.Element.prototype.$method("destroyChild", function() {
    for (let i = 0; i < this.children.length; i++) {
      this.children[i].flare('destroy');
    }
    return this;
  });

});

phina.namespace(() => {

  phina.input.Input.quality = 1.0;

  phina.input.Input.prototype.$method("_move", function(x, y) {
    this._tempPosition.x = x;
    this._tempPosition.y = y;

    // adjust scale
    const elm = this.domElement;
    const rect = elm.getBoundingClientRect();

    const w = elm.width / phina.input.Input.quality;
    const h = elm.height / phina.input.Input.quality;

    if (rect.width) {
      this._tempPosition.x *= w / rect.width;
    }

    if (rect.height) {
      this._tempPosition.y *= h / rect.height;
    }

  });

});

phina.namespace(() => {
  phina.display.Label.prototype.$method("init", function(options) {
    if (typeof arguments[0] !== 'object') {
      options = { text: arguments[0], };
    } else {
      options = arguments[0];
    }

    options = ({}).$safe(options, phina.display.Label.defaults);
    this.superInit(options);

    this.text = (options.text) ? options.text : "";
    this.fontSize = options.fontSize;
    this.fontWeight = options.fontWeight;
    this.fontFamily = options.fontFamily;
    this.align = options.align;
    this.baseline = options.baseline;
    this.lineHeight = options.lineHeight;
  });

});

phina.namespace(() => {
  phina.input.Mouse.prototype.init = function(domElement) {
    this.superInit(domElement);

    this.id = 0;

    const self = this;
    this.domElement.addEventListener('mousedown', function(e) {
      self._start(e.pointX, e.pointY, 1 << e.button);
      e.preventDefault();
      e.stopPropagation();
    });

    this.domElement.addEventListener('mouseup', function(e) {
      self._end(1 << e.button);
      e.preventDefault();
      e.stopPropagation();
    });
    this.domElement.addEventListener('mousemove', function(e) {
      self._move(e.pointX, e.pointY);
      e.preventDefault();
      e.stopPropagation();
    });

    // マウスがキャンバス要素の外に出た場合の対応
    this.domElement.addEventListener('mouseout', function(e) {
      self._end(1);
    });
  }
});

//==================================================
//  Extension phina.app.Object2D
//==================================================

phina.namespace(() => {
  phina.app.Object2D.prototype.$method("setOrigin", function(x, y, reposition) {
    if (!reposition) {
      this.origin.x = x;
      this.origin.y = y;
      return this;
    }

    //変更された基準点に移動させる
    const _originX = this.originX;
    const _originY = this.originY;
    const _addX = (x - _originX) * this.width;
    const _addY = (y - _originY) * this.height;

    this.x += _addX;
    this.y += _addY;
    this.originX = x;
    this.originY = y;

    this.children.forEach(child => {
      child.x -= _addX;
      child.y -= _addY;
    });
    return this;
  });

  phina.app.Object2D.prototype.$method("hitTestElement", function(elm) {
    const rect0 = this.calcGlobalRect();
    const rect1 = elm.calcGlobalRect();
    return (rect0.left < rect1.right) && (rect0.right > rect1.left) &&
      (rect0.top < rect1.bottom) && (rect0.bottom > rect1.top);
  });

  phina.app.Object2D.prototype.$method("includeElement", function(elm) {
    const rect0 = this.calcGlobalRect();
    const rect1 = elm.calcGlobalRect();
    return (rect0.left <= rect1.left) && (rect0.right >= rect1.right) &&
      (rect0.top <= rect1.top) && (rect0.bottom >= rect1.bottom);
  });

  phina.app.Object2D.prototype.$method("calcGlobalRect", function() {
    const left = this._worldMatrix.m02 - this.originX * this.width;
    const top = this._worldMatrix.m12 - this.originY * this.height;
    return Rect(left, top, this.width, this.height);
  });

  phina.app.Object2D.prototype.$method("calcGlobalRect", function() {
    const left = this._worldMatrix.m02 - this.originX * this.width;
    const top = this._worldMatrix.m12 - this.originY * this.height;
    return Rect(left, top, this.width, this.height);
  });

});

phina.namespace(function() {

  phina.display.PlainElement.prototype.$method("destroyCanvas", function() {
    if (!this.canvas) return;
    this.canvas.destroy();
    delete this.canvas;
  });

});

//==================================================
//  Extension phina.display.Shape
//==================================================
phina.display.Shape.prototype.render = function(canvas) {
  if (!canvas) {
    console.log("canvas null");
    return;
  }
  const context = canvas.context;
  // リサイズ
  const size = this.calcCanvasSize();
  canvas.setSize(size.width, size.height);
  // クリアカラー
  canvas.clearColor(this.backgroundColor);
  // 中心に座標を移動
  canvas.transformCenter();

  // 描画前処理
  this.prerender(this.canvas);

  // ストローク描画
  if (this.isStrokable()) {
    context.strokeStyle = this.stroke;
    context.lineWidth = this.strokeWidth;
    context.lineJoin = "round";
    context.shadowBlur = 0;
    this.renderStroke(canvas);
  }

  // 塗りつぶし描画
  if (this.fill) {
    context.fillStyle = this.fill;
    // shadow の on/off
    if (this.shadow) {
      context.shadowColor = this.shadow;
      context.shadowBlur = this.shadowBlur;
      context.shadowOffsetX = this.shadowOffsetX || 0;
      context.shadowOffsetY = this.shadowOffsetY || 0;
    } else {
      context.shadowBlur = 0;
    }
    this.renderFill(canvas);
  }

  // 描画後処理
  this.postrender(this.canvas);

  return this;
};

phina.namespace(function() {

  phina.asset.Sound.prototype.$method("_load", function(resolve) {
    if (/^data:/.test(this.src)) {
      this._loadFromURIScheme(resolve);
    } else {
      this._loadFromFile(resolve);
    }
  });

  phina.asset.Sound.prototype.$method("_loadFromFile", function(resolve) {
    // console.log(this.src);
    const self = this;
    const xml = new XMLHttpRequest();
    xml.open('GET', this.src);
    xml.onreadystatechange = function() {
      if (xml.readyState === 4) {
        if ([200, 201, 0].indexOf(xml.status) !== -1) {
          // 音楽バイナリーデータ
          const data = xml.response;
          // webaudio 用に変換
          // console.log(data)
          self.context.decodeAudioData(data, function(buffer) {
            self.loadFromBuffer(buffer);
            resolve(self);
          }, function() {
            console.warn("音声ファイルのデコードに失敗しました。(" + self.src + ")");
            resolve(self);
            self.flare('decodeerror');
          });
        } else if (xml.status === 404) {
          // not found
          self.loadError = true;
          self.notFound = true;
          resolve(self);
          self.flare('loaderror');
          self.flare('notfound');
        } else {
          // サーバーエラー
          self.loadError = true;
          self.serverError = true;
          resolve(self);
          self.flare('loaderror');
          self.flare('servererror');
        }
        xml.onreadystatechange = null;
      }
    };

    xml.responseType = 'arraybuffer';

    xml.send(null);
  });

  phina.asset.Sound.prototype.$method("play", function(when, offset, duration) {
    when = when ? when + this.context.currentTime : 0;
    offset = offset || 0;

    const source = this.source = this.context.createBufferSource();
    const buffer = source.buffer = this.buffer;
    source.loop = this._loop;
    source.loopStart = this._loopStart;
    source.loopEnd = this._loopEnd;
    source.playbackRate.value = this._playbackRate;

    // connect
    source.connect(this.gainNode);
    this.gainNode.connect(phina.asset.Sound.getMasterGain());
    // play
    if (duration !== undefined) {
      source.start(when, offset, duration);
    } else {
      source.start(when, offset);
    }

    source.onended = function() {
      if (!source) {
        this.flare('ended');
        return;
      }
      source.onended = null;
      source.disconnect();
      source.buffer = null;
      source = null;
      this.flare('ended');
    }.bind(this);

    return this;
  });

  phina.asset.Sound.prototype.$method("stop", function() {
    // stop
    if (this.source) {
      // stop すると source.endedも発火する
      this.source.stop && this.source.stop(0);
      this.flare('stop');
    }

    return this;
  });

});

//==================================================
//  Extension phina.asset.SoundManager
//==================================================
SoundManager.$method("getVolume", function() {
  return !this.isMute() ? this.volume : 0;
});

SoundManager.$method("getVolumeMusic", function() {
  return !this.isMute() ? this.musicVolume : 0;
});

SoundManager.$method("setVolumeMusic", function(volume) {
  this.musicVolume = volume;
  if (!this.isMute() && this.currentMusic) {
    this.currentMusic.volume = volume;
  }
  return this;
});

SoundManager.$method("playMusic", function(name, fadeTime, loop, when, offset, duration) {
  // const res = phina.checkBrowser();
  // if (res.isIe11) return null;

  loop = (loop !== undefined) ? loop : true;

  if (this.currentMusic) {
    this.stopMusic(fadeTime);
  }

  let music = null;
  if (name instanceof phina.asset.Sound || name instanceof phina.asset.DomAudioSound) {
    music = name;
  } else {
    music = phina.asset.AssetManager.get('sound', name);
  }

  if (!music) {
    console.error("Sound not found: ", name);
    return null;
  }

  music.setLoop(loop);
  music.play(when, offset, duration);

  if (fadeTime > 0) {
    const unitTime = fadeTime / count;
    const volume = this.getVolumeMusic();
    const count = 32;
    let counter = 0;

    music.volume = 0;
    const id = setInterval(function() {
      counter += 1;
      const rate = counter / count;
      music.volume = rate * volume;

      if (rate >= 1) {
        clearInterval(id);
        return false;
      }

      return true;
    }, unitTime);
  } else {
    music.volume = this.getVolumeMusic();
  }

  this.currentMusic = music;

  return this.currentMusic;
});

//==================================================
// ボイス用の音量設定、再生メソッド拡張
SoundManager.$method("getVolumeVoice", function() {
  return !this.isMute() ? this.voiceVolume : 0;
});

SoundManager.$method("setVolumeVoice", function(volume) {
  this.voiceVolume = volume;
  return this;
});

SoundManager.$method("playVoice", function(name) {
  const sound = phina.asset.AssetManager.get('sound', name);
  sound.volume = this.getVolumeVoice();
  sound.play();
  return sound;
});

//スプライト機能拡張
phina.namespace(function() {

  phina.display.Sprite.prototype.setFrameTrimming = function(x, y, width, height) {
    this._frameTrimX = x || 0;
    this._frameTrimY = y || 0;
    this._frameTrimWidth = width || this.image.domElement.width - this._frameTrimX;
    this._frameTrimHeight = height || this.image.domElement.height - this._frameTrimY;
    return this;
  }

  phina.display.Sprite.prototype.setFrameIndex = function(index, width, height) {
    const sx = this._frameTrimX || 0;
    const sy = this._frameTrimY || 0;
    const sw = this._frameTrimWidth  || (this.image.domElement.width - sx);
    const sh = this._frameTrimHeight || (this.image.domElement.height - sy);

    const tw  = width || this.width;      // tw
    const th  = height || this.height;    // th
    const row = ~~(sw / tw);
    const col = ~~(sh / th);
    const maxIndex = row * col;
    index = index % maxIndex;

    const x = index % row;
    const y = ~~(index / row);
    this.srcRect.x = sx + x * tw;
    this.srcRect.y = sy + y * th;
    this.srcRect.width  = tw;
    this.srcRect.height = th;

    this._frameIndex = index;

    return this;
  }

});
phina.namespace(function() {
  // 文字列から数値を抽出する
  // レイアウトファイルから作業する場合に利用したくなる
  // hoge_0 hoge_1などから数字だけ抽出
  // 0100_hoge_9999 => ["0100" , "9999"]になる
  // hoge0.0とかはどうすかな？
  // 抽出後にparseIntするかは検討中
  String.prototype.$method("matchInt", function() {
    return this.match(/[0-9]+/g);
  });
});

phina.namespace(function() {

  phina.asset.Texture.prototype.$method("_load", function(resolve) {
    this.domElement = new Image();

    let isLocal = (location.protocol == 'file:');
    if (!(/^data:/.test(this.src))) {
      this.domElement.crossOrigin = 'anonymous'; // クロスオリジン解除
    }

    const self = this;
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

});

phina.namespace(function() {

  phina.accessory.Tweener.prototype.$method("_updateTween", function(app) {
    //※これないとpauseがうごかない
    if (!this.playing) return;

    const tween = this._tween;
    const time = this._getUnitTime(app);

    tween.forward(time);
    this.flare('tween');

    if (tween.time >= tween.duration) {
      delete this._tween;
      this._tween = null;
      this._update = this._updateTask;
    }
  });

  phina.accessory.Tweener.prototype.$method("_updateWait", function(app) {
    //※これないとpauseがうごかない
    if (!this.playing) return;

    const wait = this._wait;
    const time = this._getUnitTime(app);
    wait.time += time;

    if (wait.time >= wait.limit) {
      delete this._wait;
      this._wait = null;
      this._update = this._updateTask;
    }
  });

});

phina.define("Buttonize", {
  init: function() {},
  _static: {
    STATUS: {
      NONE: 0,
      START: 1,
      END: 2,
    },
    status: 0,
    rect: function(element) {
      element.boundingType = "rect";
      this._common(element);
      return element;
    },
    circle: function(element) {
      element.radius = Math.max(element.width, element.height) * 0.5;
      element.boundingType = "circle";
      this._common(element);
      return element;
    },
    _common: function(element) {
      //TODO:エディターできるまでの暫定対応
      element.setOrigin(0.5, 0.5, true);

      element.interactive = true;
      element.clickSound = "se/clickButton";

      //TODO:ボタンの同時押下は実機で調整する
      element.on("pointstart", e => {
        if (this.status != this.STATUS.NONE) return;
        this.status = this.STATUS.START;
        element.tweener.clear()
          .to({
            scaleX: 0.9,
            scaleY: 0.9
          }, 100);
      });

      element.on("pointend", (e) => {
        if (this.status != this.STATUS.START) return;
        const hitTest = element.hitTest(e.pointer.x, e.pointer.y);
        this.status = this.STATUS.END;
        if (hitTest) element.flare("clickSound");

        element.tweener.clear()
          .to({
            scaleX: 1.0,
            scaleY: 1.0
          }, 100)
          .call(() => {
            this.status = this.STATUS.NONE;
            if (!hitTest) return;
            element.flare("clicked", {
              pointer: e.pointer
            });
          });
      });

      //アニメーションの最中に削除された場合に備えてremovedイベント時にフラグを元に戻しておく
      element.one("removed", () => {
        this.status = this.STATUS.NONE;
      });

      element.on("clickSound", function() {
        if (!element.clickSound) return;
        //phina.asset.SoundManager.play(element.clickSound);
      });
    },
  },
});

phina.namespace(function() {

  /**
   * テクスチャ関係のユーティリティ
   */
  phina.define("TextureUtil", {

    _static: {

      /**
       * RGB各要素に実数を積算する
       */
      multiplyColor: function(texture, red, green, blue) {
        if (typeof(texture) === "string") {
          texture = AssetManager.get("image", texture);
        }

        const width = texture.domElement.width;
        const height = texture.domElement.height;

        const result = Canvas().setSize(width, height);
        const context = result.context;

        context.drawImage(texture.domElement, 0, 0);
        const imageData = context.getImageData(0, 0, width, height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i + 0] = Math.floor(imageData.data[i + 0] * red);
          imageData.data[i + 1] = Math.floor(imageData.data[i + 1] * green);
          imageData.data[i + 2] = Math.floor(imageData.data[i + 2] * blue);
        }
        context.putImageData(imageData, 0, 0);

        return result;
      },

      /**
       * 色相・彩度・明度を操作する
       */
      editByHsl: function(texture, h, s, l) {
        if (typeof(texture) === "string") {
          texture = AssetManager.get("image", texture);
        }

        const width = texture.domElement.width;
        const height = texture.domElement.height;

        const result = Canvas().setSize(width, height);
        const context = result.context;

        context.drawImage(texture.domElement, 0, 0);
        const imageData = context.getImageData(0, 0, width, height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i + 0];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];

          const hsl = phina.util.Color.RGBtoHSL(r, g, b);
          const newRgb = phina.util.Color.HSLtoRGB(hsl[0] + h, Math.clamp(hsl[1] + s, 0, 100), Math.clamp(hsl[2] + l, 0, 100));

          imageData.data[i + 0] = newRgb[0];
          imageData.data[i + 1] = newRgb[1];
          imageData.data[i + 2] = newRgb[2];
        }
        context.putImageData(imageData, 0, 0);

        return result;
      },

    },

    init: function() {},
  });

});

/*
 *  phina.tiledmap.js
 *  2016/9/10
 *  @auther minimo  
 *  This Program is MIT license.
 * 
 *  2019/9/18
 *  version 2.0
 */

phina.namespace(function() {

  phina.define("phina.asset.TiledMap", {
    superClass: "phina.asset.XMLLoader",

    image: null,

    tilesets: null,
    layers: null,

    init: function() {
        this.superInit();
    },

    _load: function(resolve) {
      //パス抜き出し
      this.path = "";
      const last = this.src.lastIndexOf("/");
      if (last > 0) {
        this.path = this.src.substring(0, last + 1);
      }

      //終了関数保存
      this._resolve = resolve;

      // load
      const xml = new XMLHttpRequest();
      xml.open('GET', this.src);
      xml.onreadystatechange = () => {
        if (xml.readyState === 4) {
          if ([200, 201, 0].indexOf(xml.status) !== -1) {
            const data = (new DOMParser()).parseFromString(xml.responseText, "text/xml");
            this.dataType = "xml";
            this.data = data;
            this._parse(data)
              .then(() => this._resolve(this));
          }
        }
      };
      xml.send(null);
    },

    //マップイメージ取得
    getImage: function(layerName) {
      if (layerName === undefined) {
        return this.image;
      } else {
        return this._generateImage(layerName);
      }
    },

    //指定マップレイヤーを配列として取得
    getMapData: function(layerName) {
      //レイヤー検索
      for(let i = 0; i < this.layers.length; i++) {
        if (this.layers[i].name == layerName) {
          //コピーを返す
          return this.layers[i].data.concat();
        }
      }
      return null;
    },

    //オブジェクトグループを取得（指定が無い場合、全レイヤーを配列にして返す）
    getObjectGroup: function(groupName) {
      groupName = groupName || null;
      const ls = [];
      const len = this.layers.length;
      for (let i = 0; i < len; i++) {
        if (this.layers[i].type == "objectgroup") {
          if (groupName == null || groupName == this.layers[i].name) {
            //レイヤー情報をクローンする
            const obj = this._cloneObjectLayer(this.layers[i]);
            if (groupName !== null) return obj;
            ls.push(obj);
          }
        }
      }
      return ls;
    },

    //オブジェクトレイヤーをクローンして返す
    _cloneObjectLayer: function(srcLayer) {
      const result = {}.$safe(srcLayer);
      result.objects = [];
      //レイヤー内オブジェクトのコピー
      srcLayer.objects.forEach(obj => {
        const resObj = {
          properties: {}.$safe(obj.properties),
        }.$extend(obj);
        if (obj.ellipse) resObj.ellipse = obj.ellipse;
        if (obj.gid) resObj.gid = obj.gid;
        if (obj.polygon) resObj.polygon = obj.polygon.clone();
        if (obj.polyline) resObj.polyline = obj.polyline.clone();
        result.objects.push(resObj);
      });
      return result;
    },

    _parse: function(data) {
      return new Promise(resolve => {
        //タイル属性情報取得
        const map = data.getElementsByTagName('map')[0];
        const attr = this._attrToJSON(map);
        this.$extend(attr);
        this.properties = this._propertiesToJSON(map);

        //タイルセット取得
        this.tilesets = this._parseTilesets(data);
        this.tilesets.sort((a, b) => a.firstgid - b.firstgid);

        //レイヤー取得
        this.layers = this._parseLayers(data);

        //イメージデータ読み込み
        this._checkImage()
          .then(() => {
            //マップイメージ生成
            this.image = this._generateImage();
            resolve();
          });
      })
    },

    //タイルセットのパース
    _parseTilesets: function(xml) {
      const each = Array.prototype.forEach;
      const data = [];
      const tilesets = xml.getElementsByTagName('tileset');
      each.call(tilesets, async tileset => {
        const t = {};
        const attr = this._attrToJSON(tileset);
        if (attr.source) {
          t.isOldFormat = false;
          t.source = this.path + attr.source;
        } else {
          //旧データ形式（未対応）
          t.isOldFormat = true;
          t.data = tileset;
        }
        t.firstgid = attr.firstgid;
        data.push(t);
      });
      return data;
    },

    //レイヤー情報のパース
    _parseLayers: function(xml) {
      const each = Array.prototype.forEach;
      const data = [];

      const map = xml.getElementsByTagName("map")[0];
      const layers = [];
      each.call(map.childNodes, elm => {
        if (elm.tagName == "layer" || elm.tagName == "objectgroup" || elm.tagName == "imagelayer") {
          layers.push(elm);
        }
      });

      layers.each(layer => {
        switch (layer.tagName) {
          case "layer":
            {
              //通常レイヤー
              const d = layer.getElementsByTagName('data')[0];
              const encoding = d.getAttribute("encoding");
              const l = {
                  type: "layer",
                  name: layer.getAttribute("name"),
              };

              if (encoding == "csv") {
                  l.data = this._parseCSV(d.textContent);
              } else if (encoding == "base64") {
                  l.data = this._parseBase64(d.textContent);
              }

              const attr = this._attrToJSON(layer);
              l.$extend(attr);
              l.properties = this._propertiesToJSON(layer);

              data.push(l);
            }
            break;

          //オブジェクトレイヤー
          case "objectgroup":
            {
              const l = {
                type: "objectgroup",
                objects: [],
                name: layer.getAttribute("name"),
                x: parseFloat(layer.getAttribute("offsetx")) || 0,
                y: parseFloat(layer.getAttribute("offsety")) || 0,
                alpha: layer.getAttribute("opacity") || 1,
                color: layer.getAttribute("color") || null,
                draworder: layer.getAttribute("draworder") || null,
              };
              each.call(layer.childNodes, elm => {
                if (elm.nodeType == 3) return;
                const d = this._attrToJSON(elm);
                d.properties = this._propertiesToJSON(elm);
                //子要素の解析
                if (elm.childNodes.length) {
                  elm.childNodes.forEach(e => {
                    if (e.nodeType == 3) return;
                    //楕円
                    if (e.nodeName == 'ellipse') {
                      d.ellipse = true;
                    }
                    //多角形
                    if (e.nodeName == 'polygon') {
                      d.polygon = [];
                      const attr = this._attrToJSON_str(e);
                      const pl = attr.points.split(" ");
                      pl.forEach(function(str) {
                        const pts = str.split(",");
                        d.polygon.push({x: parseFloat(pts[0]), y: parseFloat(pts[1])});
                      });
                    }
                    //線分
                    if (e.nodeName == 'polyline') {
                      d.polyline = [];
                      const attr = this._attrToJSON_str(e);
                      const pl = attr.points.split(" ");
                      pl.forEach(str => {
                        const pts = str.split(",");
                        d.polyline.push({x: parseFloat(pts[0]), y: parseFloat(pts[1])});
                      });
                    }
                  });
                }
                l.objects.push(d);
              });
              l.properties = this._propertiesToJSON(layer);

              data.push(l);
            }
            break;

          //イメージレイヤー
          case "imagelayer":
            {
              const l = {
                type: "imagelayer",
                name: layer.getAttribute("name"),
                x: parseFloat(layer.getAttribute("offsetx")) || 0,
                y: parseFloat(layer.getAttribute("offsety")) || 0,
                alpha: layer.getAttribute("opacity") || 1,
                visible: (layer.getAttribute("visible") === undefined || layer.getAttribute("visible") != 0),
              };
              const imageElm = layer.getElementsByTagName("image")[0];
              l.image = {source: imageElm.getAttribute("source")};

              data.push(l);
            }
            break;
          //グループ
          case "group":
            break;
        }
      });
      return data;
    },

    //アセットに無いイメージデータを読み込み
    _checkImage: function() {
      const imageSource = [];
      const loadImage = [];

      //一覧作成
      this.tilesets.forEach(tileset => {
        const obj = {
          isTileset: true,
          image: tileset.source,
        };
        imageSource.push(obj);
      });
      this.layers.forEach(layer => {
        if (layer.image) {
          const obj = {
            isTileset: false,
            image: layer.image.source,
          };
          imageSource.push(obj);
        }
      });

      //アセットにあるか確認
      imageSource.forEach(e => {
        if (e.isTileset) {
          const tsx = phina.asset.AssetManager.get('tsx', e.image);
          if (!tsx) {
            //アセットになかったのでロードリストに追加
            loadImage.push(e);
          }
        } else {
          const image = phina.asset.AssetManager.get('image', e.image);
          if (!image) {
            //アセットになかったのでロードリストに追加
            loadImage.push(e);
          }
        }
      });

      //一括ロード
      //ロードリスト作成
      if (loadImage.length) {
        const assets = { image: [], tsx: [] };
        loadImage.forEach(e => {
          if (e.isTileset) {
            assets.tsx[e.image] = e.image;
          } else {
            //アセットのパスをマップと同じにする
            assets.image[e.image] = this.path + e.image;
          }
        });
        return new Promise(resolve => {
          const loader = phina.asset.AssetLoader();
          loader.load(assets);
          loader.on('load', () => {
            this.tilesets.forEach(e => {
              e.tsx = phina.asset.AssetManager.get('tsx', e.source);
            });
            resolve();
          });
        });
      } else {
        return Promise.resolve();
      }
    },

    //マップイメージ作成
    _generateImage: function(layerName) {
      let numLayer = 0;
      for (let i = 0; i < this.layers.length; i++) {
        if (this.layers[i].type == "layer" || this.layers[i].type == "imagelayer") numLayer++;
      }
      if (numLayer == 0) return null;

      const width = this.width * this.tilewidth;
      const height = this.height * this.tileheight;
      const canvas = phina.graphics.Canvas().setSize(width, height);

      for (let i = 0; i < this.layers.length; i++) {
        //マップレイヤー
        if (this.layers[i].type == "layer" && this.layers[i].visible != "0") {
          if (layerName === undefined || layerName === this.layers[i].name) {
            const layer = this.layers[i];
            const mapdata = layer.data;
            const width = layer.width;
            const height = layer.height;
            const opacity = layer.opacity || 1.0;
            let count = 0;
            for (let y = 0; y < height; y++) {
              for (let x = 0; x < width; x++) {
                const index = mapdata[count];
                if (index !== 0) {
                  //マップチップを配置
                  this._setMapChip(canvas, index, x * this.tilewidth, y * this.tileheight, opacity);
                }
                count++;
              }
            }
          }
        }
        //オブジェクトグループ
        if (this.layers[i].type == "objectgroup" && this.layers[i].visible != "0") {
          if (layerName === undefined || layerName === this.layers[i].name) {
            const layer = this.layers[i];
            const opacity = layer.opacity || 1.0;
            layer.objects.forEach(function(e) {
              if (e.gid) {
                this._setMapChip(canvas, e.gid, e.x, e.y, opacity);
              }
            }.bind(this));
          }
        }
        //イメージレイヤー
        if (this.layers[i].type == "imagelayer" && this.layers[i].visible != "0") {
          if (layerName === undefined || layerName === this.layers[i].name) {
            const image = phina.asset.AssetManager.get('image', this.layers[i].image.source);
            canvas.context.drawImage(image.domElement, this.layers[i].x, this.layers[i].y);
          }
        }
      }

      const texture = phina.asset.Texture();
      texture.domElement = canvas.domElement;
      return texture;
    },

    //キャンバスの指定した座標にマップチップのイメージをコピーする
    _setMapChip: function(canvas, index, x, y, opacity) {
      //対象タイルセットの判別
      let tileset;
      for (let i = 0; i < this.tilesets.length; i++) {
        const tsx1 = this.tilesets[i];
        const tsx2 = this.tilesets[i + 1];
        if (!tsx2) {
          tileset = tsx1;
          i = this.tilesets.length;
        } else if (tsx1.firstgid <= index && index < tsx2.firstgid) {
          tileset = tsx1;
          i = this.tilesets.length;
        }
      }
      //タイルセットからマップチップを取得
      const tsx = tileset.tsx;
      const chip = tsx.chips[index - tileset.firstgid];
      const image = phina.asset.AssetManager.get('image', chip.image);
      canvas.context.drawImage(
        image.domElement,
        chip.x + tsx.margin, chip.y + tsx.margin,
        tsx.tilewidth, tsx.tileheight,
        x, y,
        tsx.tilewidth, tsx.tileheight);
    },

  });

  //ローダーに追加
  phina.asset.AssetLoader.assetLoadFunctions.tmx = function(key, path) {
    const tmx = phina.asset.TiledMap();
    return tmx.load(path);
  };

});
/*
 *  phina.Tileset.js
 *  2019/9/12
 *  @auther minimo  
 *  This Program is MIT license.
 *
 */

phina.namespace(function() {

  phina.define("phina.asset.TileSet", {
    superClass: "phina.asset.XMLLoader",

    image: null,
    tilewidth: 0,
    tileheight: 0,
    tilecount: 0,
    columns: 0,

    init: function(xml) {
        this.superInit();
        if (xml) {
          this.loadFromXML(xml);
        }
    },

    _load: function(resolve) {
      //パス抜き出し
      this.path = "";
      const last = this.src.lastIndexOf("/");
      if (last > 0) {
        this.path = this.src.substring(0, last + 1);
      }

      //終了関数保存
      this._resolve = resolve;

      // load
      const xml = new XMLHttpRequest();
      xml.open('GET', this.src);
      xml.onreadystatechange = () => {
        if (xml.readyState === 4) {
          if ([200, 201, 0].indexOf(xml.status) !== -1) {
            const data = (new DOMParser()).parseFromString(xml.responseText, "text/xml");
            this.dataType = "xml";
            this.data = data;
            this._parse(data)
              .then(() => this._resolve(this));
          }
        }
      };
      xml.send(null);
    },

    loadFromXML: function(xml) {
      return this._parse(xml);
    },

    _parse: function(data) {
      return new Promise(resolve => {
        //タイルセット取得
        const tileset = data.getElementsByTagName('tileset')[0];
        const props = this._propertiesToJSON(tileset);

        //タイルセット属性情報取得
        const attr = this._attrToJSON(tileset);
        attr.$safe({
          tilewidth: 32,
          tileheight: 32,
          spacing: 0,
          margin: 0,
        });
        this.$extend(attr);
        this.chips = [];

        //ソース画像設定取得
        this.imageName = tileset.getElementsByTagName('image')[0].getAttribute('source');
  
        //透過色設定取得
        const trans = tileset.getElementsByTagName('image')[0].getAttribute('trans');
        if (trans) {
          this.transR = parseInt(trans.substring(0, 2), 16);
          this.transG = parseInt(trans.substring(2, 4), 16);
          this.transB = parseInt(trans.substring(4, 6), 16);
        }
  
        //マップチップリスト作成
        for (let r = 0; r < this.tilecount; r++) {
          const chip = {
            image: this.imageName,
            x: (r  % this.columns) * (this.tilewidth + this.spacing) + this.margin,
            y: Math.floor(r / this.columns) * (this.tileheight + this.spacing) + this.margin,
          };
          this.chips[r] = chip;
        }

        //イメージデータ読み込み
        this._loadImage()
          .then(() => resolve());
      });
    },

    //アセットに無いイメージデータを読み込み
    _loadImage: function() {
      return new Promise(resolve => {
        const imageSource = {
          imageName: this.imageName,
          imageUrl: this.path + this.imageName,
          transR: this.transR,
          transG: this.transG,
          transB: this.transB,
        };
        
        let loadImage = null;
        const image = phina.asset.AssetManager.get('image', imageSource.image);
        if (image) {
          this.image = image;
        } else {
          loadImage = imageSource;
        }

        //ロードリスト作成
        const assets = { image: [] };
        assets.image[imageSource.imageName] = imageSource.imageUrl;

        if (loadImage) {
          const loader = phina.asset.AssetLoader();
          loader.load(assets);
          loader.on('load', e => {
            //透過色設定反映
            this.image = phina.asset.AssetManager.get('image', imageSource.imageUrl);
            if (imageSource.transR !== undefined) {
              const r = imageSource.transR;
              const g = imageSource.transG;
              const b = imageSource.transB;
              this.image.filter((pixel, index, x, y, bitmap) => {
                const data = bitmap.data;
                if (pixel[0] == r && pixel[1] == g && pixel[2] == b) {
                    data[index+3] = 0;
                }
              });
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    },
  });

  //ローダーに追加
  phina.asset.AssetLoader.assetLoadFunctions.tsx = function(key, path) {
    const tsx = phina.asset.TileSet();
    return tsx.load(path);
  };

});
//
// 汎用関数群
//
phina.define("Util", {
  _static: {

    //指定されたオブジェクトをルートとして目的のidを走査する
    findById: function(id, obj) {
      if (obj.id === id) return obj;
      const children = Object.keys(obj.children || {}).map(key => obj.children[key]);
      for (let i = 0; i < children.length; i++) {
        const hit = this.findById(id, children[i]);
        if (hit) return hit;
      }
      return null;
    },

    //TODO:ここじゃない感があるのですが、一旦実装
    //指定されたAとBのassetsの連想配列を新規のオブジェクトにマージする
    mergeAssets: function(assetsA, assetsB) {
      const result = {};
      assetsA.forIn((typeKey, typeValue) => {
        if (!result.$has(typeKey)) result[typeKey] = {};
        typeValue.forIn((assetKey, assetPath) => {
          result[typeKey][assetKey] = assetPath;
        });
      });
      assetsB.forIn((typeKey, typeValue) => {
        if (!result.$has(typeKey)) result[typeKey] = {};
        typeValue.forIn((assetKey, assetPath) => {
          result[typeKey][assetKey] = assetPath;
        });
      });
      return result;
    },

    //現在時間から指定時間までどのくらいかかるかを返却する
    //
    // output : { 
    //   totalDate:0 , 
    //   totalHour:0 , 
    //   totalMinutes:0 , 
    //   totalSeconds:0 ,
    //   date:0 , 
    //   hour:0 , 
    //   minutes:0 , 
    //   seconds:0 
    // }
    //

    calcRemainingTime: function(finish) {
      const now = new Date();
      const result = {
        "totalDate": 0,
        "totalHour": 0,
        "totalMinutes": 0,
        "totalSeconds": 0,
        "date": 0,
        "hour": 0,
        "minutes": 0,
        "seconds": 0,
      }

      finish = (finish instanceof Date) ? finish : new Date(finish);
      let diff = finish - now;
      if (diff === 0) return result;

      const sign = (diff < 0) ? -1 : 1;

      //TODO:この辺りもう少し綺麗に書けないか検討
      //単位別 1未満は0
      result["totalDate"] = parseInt(diff / 1000 / 60 / 60 / 24);
      result["totalHour"] = parseInt(diff / 1000 / 60 / 60);
      result["totalMinutes"] = parseInt(diff / 1000 / 60);
      result["totalSeconds"] = parseInt(diff / 1000);

      diff -= result["totalDate"] * 86400000;
      result["hour"] = parseInt(diff / 1000 / 60 / 60);

      diff -= result["hour"] * 3600000;
      result["minutes"] = parseInt(diff / 1000 / 60);

      diff -= result["minutes"] * 60000;
      result["seconds"] = parseInt(diff / 1000);

      return result;

    },

    //レイアウトエディターではSprite全てAtalsSpriteになってしまうため、
    //Spriteに差し替えられるようにする

    //AtlasSprite自身に単発のImageをセットできるようにする？
    //あとでなにかしら対策しないとだめだが３月納品では一旦これで
    replaceAtlasSpriteToSprite: function(parent, atlasSprite, sprite) {
      const index = parent.getChildIndex(atlasSprite);
      sprite.setOrigin(atlasSprite.originX, atlasSprite.originY);
      sprite.setPosition(atlasSprite.x, atlasSprite.y);
      parent.addChildAt(sprite, index);
      atlasSprite.remove();
      return sprite;
    },
  }
});

/*
 *  phina.xmlloader.js
 *  2019/9/12
 *  @auther minimo  
 *  This Program is MIT license.
 *
 */

phina.namespace(function() {

  phina.define("phina.asset.XMLLoader", {
    superClass: "phina.asset.Asset",

    init: function() {
        this.superInit();
    },

    _load: function(resolve) {
      resolve();
    },

    //XMLプロパティをJSONに変換
    _propertiesToJSON: function(elm) {
      const properties = elm.getElementsByTagName("properties")[0];
      const obj = {};
      if (properties === undefined) return obj;

      for (let k = 0; k < properties.childNodes.length; k++) {
        const p = properties.childNodes[k];
        if (p.tagName === "property") {
          //propertyにtype指定があったら変換
          const type = p.getAttribute('type');
          const value = p.getAttribute('value');
          if (!value) value = p.textContent;
          if (type == "int") {
            obj[p.getAttribute('name')] = parseInt(value, 10);
          } else if (type == "float") {
            obj[p.getAttribute('name')] = parseFloat(value);
          } else if (type == "bool" ) {
            if (value == "true") obj[p.getAttribute('name')] = true;
            else obj[p.getAttribute('name')] = false;
          } else {
            obj[p.getAttribute('name')] = value;
          }
        }
      }
      return obj;
    },

    //XML属性をJSONに変換
    _attrToJSON: function(source) {
      const obj = {};
      for (let i = 0; i < source.attributes.length; i++) {
        let val = source.attributes[i].value;
        val = isNaN(parseFloat(val))? val: parseFloat(val);
        obj[source.attributes[i].name] = val;
      }
      return obj;
    },

    //XML属性をJSONに変換（Stringで返す）
    _attrToJSON_str: function(source) {
      const obj = {};
      for (let i = 0; i < source.attributes.length; i++) {
        const val = source.attributes[i].value;
        obj[source.attributes[i].name] = val;
      }
      return obj;
    },

    //CSVパース
    _parseCSV: function(data) {
      const dataList = data.split(',');
      const layer = [];

      dataList.each(elm => {
        const num = parseInt(elm, 10);
        layer.push(num);
      });

      return layer;
    },

    /**
     * BASE64パース
     * http://thekannon-server.appspot.com/herpity-derpity.appspot.com/pastebin.com/75Kks0WH
     * @private
     */
    _parseBase64: function(data) {
      const dataList = atob(data.trim());
      const rst = [];

      dataList = dataList.split('').map(e => e.charCodeAt(0));

      for (let i = 0, len = dataList.length / 4; i < len; ++i) {
        const n = dataList[i*4];
        rst[i] = parseInt(n, 10);
      }

      return rst;
    },
  });

});
phina.define("AfterBanner", {
  superClass: 'phina.accessory.Accessory',

  init: function(target) {
    this.superInit(target);

    this.isDisable = false;
    this.layer = null;
    this.offset = Vector2(0, 0);
    this.velocity = Vector2(0, 0);
    this.before = null;
  },

  setLayer: function(layer) {
    this.layer = layer;
    return this;
  },

  enable: function() {
    this.isDisable = false;
    return this;
  },

  disable: function() {
    this.isDisable = true;
    return this;
  },

  setOffset: function (x, y) {
    if (x instanceof Vector2) {
      this.offset.set(x.x, x.y);
      return this;
    }
    this.offset.set(x, y);
    return this;
  },

  setVelocity: function(x, y) {
    if (x instanceof Vector2) {
      this.velocity = x.clone().mul(-1);
      return this;
    }
    this.velocity.x = x;
    this.velocity.x = y;
    return this;
  },

  update: function() {
    if (this.isDisable) {
      this.before = null;
      return;
    }
    const target = this.target;
    const options = { scale: 0.3 };
    const pos = target.position.clone().add(this.offset);
    if (this.before) {
      const dis = target.position.distance(this.before);
      const numSplit = Math.max(Math.floor(dis / 3), 6);
      const unitSplit = (1 / numSplit);
      numSplit.times(i => {
        const per = unitSplit * i;
        const pPos = Vector2(pos.x * per + this.before.x * (1 - per), pos.y * per + this.before.y * (1 - per))
        ParticleSprite(options)
          .setPosition(pPos.x, pPos.y)
          .addChildTo(this.layer);
      });
      this.before.set(pos.x, pos.y);
    } else {
      this.before = Vector2(pos.x, pos.y);
    }
  },
});

phina.define("Particle", {
  superClass: 'phina.display.CircleShape',

  _static: {
    defaultColor: {
      start: 10, // color angle の開始値
      end: 30,   // color angle の終了値
    },
    defaulScale: 1,     // 初期スケール
    scaleDecay: 0.03,  // スケールダウンのスピード
  },
  init: function(options) {
    this.options = (options || {}).$safe({ stroke: false, radius: 24, scale: 1.0 });
    this.superInit(this.options);

    this.blendMode = 'lighter';

    const color = this.options.color || Particle.defaultColor;
    const grad = this.canvas.context.createRadialGradient(0, 0, 0, 0, 0, this.radius);
    grad.addColorStop(0, 'hsla({0}, 75%, 50%, 1.0)'.format(Math.randint(color.start, color.end)));
    grad.addColorStop(1, 'hsla({0}, 75%, 50%, 0.0)'.format(Math.randint(color.start, color.end)));

    this.fill = grad;

    this.beginPosition = Vector2();
    this.velocity = this.options.velocity || Vector2(0, 0);
    this.one("enterframe", () => this.reset());
  },

  reset: function(x, y) {
    x = x || this.x;
    y = y || this.y;
    this.beginPosition.set(x, y);
    this.position.set(this.beginPosition.x, this.beginPosition.y);
    this.scaleX = this.scaleY = this.options.scale || Math.randfloat(Particle.defaulScale * 0.8, Particle.defaulScale * 1.2);
  },

  update: function() {
    this.position.add(this.velocity);
    this.velocity.x *= 0.99;
    this.velocity.y *= 0.99;
    this.scaleX -= Particle.scaleDecay;
    this.scaleY -= Particle.scaleDecay;

    if (this.scaleX < 0) this.remove();
  },

  setVelocity: function(x, y) {
    if (x instanceof Vector2) {
      this.velocity = x;
      return this;
    }
    this.velocity.x = x;
    this.velocity.x = y;
    return this;
  },

});

phina.define("ParticleSprite", {
  superClass: 'phina.display.Sprite',

  _static: {
    defaultScale: 1.0,    // 初期スケール
    scaleDecay: 0.01,  // スケールダウンのスピード
  },
  init: function(options) {
    this.superInit("particle", 16, 16);

    this.blendMode = 'lighter';

    this.beginPosition = Vector2();
    this.velocity = options.velocity || Vector2(0, 0);
    this.scaleX = this.scaleY = options.scale || ParticleSprite.defaultScale;
    this.scaleDecay = options.scaleDecay || ParticleSprite.scaleDecay;
  },

  update: function() {
    this.position.add(this.velocity);
    this.velocity.x *= 0.99;
    this.velocity.y *= 0.99;
    this.scaleX -= this.scaleDecay;
    this.scaleY -= this.scaleDecay;

    if (this.scaleX < 0) this.remove();
  },

  setVelocity: function(x, y) {
    if (x instanceof Vector2) {
      this.velocity = x.clone();
      return this;
    }
    this.velocity.x = x;
    this.velocity.x = y;
    return this;
  },

});

phina.define("Bullet", {
  superClass: 'phina.display.DisplayElement',

  init: function(options) {
    this.superInit(options);
  },

});


phina.namespace(function() {

  phina.define('EnemyyFighter', {
    superClass: 'BaseUnit',

    init: function(options) {
      options = options || {};
      this.superInit(options.$safe({ width: 32, height: 32 }));

      this.sprite = Sprite("fighter", 32, 32)
        .setFrameIndex(0)
        .addChildTo(this.base);

      this.player = options.player;
      this.velocity = Vector2(0, 0);
      this.angle = 0;
      this.speed = 10;
      this.time = 0;

      this.afterBanner = AfterBanner()
        .setLayer(this.world.mapLayer[LAYER_EFFECT_BACK])
        .attachTo(this);
    },

    update: function() {
      const toPlayer = Vector2(this.player.x - this.x ,this.player.y - this.y)
      if (toPlayer.length() > 30) {
        //自分から見たプレイヤーの方角
        const r = Math.atan2(toPlayer.y, toPlayer.x);
        let d = (r.toDegree() + 90);
        if (d < 0) d += 360;
        if (d > 360) d -= 360;
        this.angle = Math.floor(d / 22.5);
        this.sprite.setFrameIndex(this.angle);
        this.velocity.add(Vector2(Math.cos(r) * this.speed, Math.sin(r) * this.speed));
        this.velocity.normalize();
        this.velocity.mul(this.speed);
      }

      this.position.add(this.velocity);

      this.time++;
    },
  });
});

phina.define("Laser", {
  superClass: 'phina.display.DisplayElement',

  _static: {
    defaultOptions: {
      length: 500,
    },
  },

  init: function(options) {
    this.options = (options || {}).$safe(Laser.defaultOptions);
    this.superInit(options);
    this.sprite = RectangleShape({ width: 8, height: this.options.length }).addChildTo(this);
  },

});


const offset = [
  [ {x: -3, y:  0}, {x:  3, y:  0}, ], //  0 上

  [ {x: -3, y:  2}, {x:  3, y: -2}, ], //  1
  [ {x: -3, y:  2}, {x:  2, y:  0}, ], //  2
  [ {x: -3, y:  3}, {x:  0, y: -1}, ], //  3

  [ {x:  0, y:  0}, {x:  0, y:  0}, ], //  4 左

  [ {x: -3, y:  0}, {x:  3, y:  0}, ], //  5
  [ {x: -1, y: -2}, {x:  2, y:  2}, ], //  6
  [ {x: -3, y: -2}, {x:  3, y:  0}, ], //  7

  [ {x:  3, y:  0}, {x: -3, y:  0}, ], //  8 下

  [ {x:  3, y: -2}, {x: -3, y:  0}, ], //  9
  [ {x:  1, y: -2}, {x: -2, y:  2}, ], // 10
  [ {x:  3, y:  0}, {x: -3, y:  0}, ], // 11

  [ {x:  0, y:  0}, {x:  0, y:  0}, ], // 12 右

  [ {x: -3, y:  3}, {x:  0, y: -1}, ], // 13
  [ {x:  3, y:  2}, {x: -2, y:  0}, ], // 14
  [ {x:  3, y:  2}, {x: -3, y: -2}, ], // 15
];

phina.namespace(function() {

  phina.define('Player', {
    superClass: 'BaseUnit',

    init: function(options) {
      this.superInit(options.$safe({ width: 32, height: 32 }));

      this.sprite = Sprite("fighter", 32, 32)
        .setFrameIndex(4)
        .addChildTo(this.base);
    },

    update: function() {
    },

  });
});

phina.namespace(function() {

  phina.define('World', {
    superClass: 'DisplayElement',

    init: function(options) {
      this.superInit();
      this.setup();

      this.time = 0;
    },

    setup: function() {
      this.mapBase = DisplayElement()
        .setPosition(SCREEN_WIDTH_HALF, SCREEN_HEIGHT_HALF)
        .addChildTo(this);

      //レイヤー構築
      this.mapLayer = [];
      (NUM_LAYERS).times(i => {
        const layer = DisplayElement().addChildTo(this.mapBase);
        this.mapLayer[i] = layer;
      });

      this.player = Player({ world: this })
        .setPosition(-SCREEN_WIDTH_HALF + 64, 0)
        .addChildTo(this.mapLayer[LAYER_PLAYER]);

      this.setupMap();
    },

    update: function() {
      this.controlPlayer();
      this.time++;
    },

    setupMap: function() {
      for (let i = 0; i < 100; i++) {
        RectangleShape({
          width: Math.randint(50, 100),
          height: Math.randint(50, 100),
          fill: 'blue',
          stroke: '#aaa',
          strokeWidth: 4,
          cornerRadius: 0,
          x: Math.randint(-1000, 1000),
          y: Math.randint(-1000, 1000),
        }).addChildTo(this.mapLayer[LAYER_BACKGROUND]);
      }
    },

    controlPlayer: function() {
      const player = this.player;
      const ct = phina_app.controller;
      if (ct.up) {
        player.speed -= 0.2;
        if (player.speed < -4) player.speed = -4;
      } else if (ct.down) {
        player.speed += 0.2;
        if (player.speed > 4) player.speed = 4;
      } else {
        player.speed *= 0.98;
      }
      player.y += player.speed;
    },
  });

});

//
// シーンエフェクトの基礎クラス
//
phina.define("SceneEffectBase", {
  superClass: "InputIntercept",

  init: function() {
    this.superInit();
    this.enable();
  },

});

//
// シーンエフェクト：複数の円でフェードインアウト
//
phina.define("SceneEffectCircleFade", {
  superClass: "SceneEffectBase",

  init: function(options) {
    this.options = ({}).$safe(options, SceneEffectCircleFade.defaults);

    this.superInit();
  },

  _createCircle: function() {
    const num = 5;
    const width = SCREEN_WIDTH / num;
    return Array.range((SCREEN_HEIGHT / width) + 1).map(y => {
      return Array.range(num + 1).map(x => {
        return this.addChild(CircleShape({
          x: x * width,
          y: y * width,
          fill: this.options.color,
          stroke: null,
          radius: width * 0.5,
        }));
      });
    });
  },

  begin: function() {
    const circles = this._createCircle();
    const tasks = [];
    circles.forEach((xLine, y) => {
      xLine.forEach((circle, x) => {
        circle.scaleX = 0;
        circle.scaleY = 0;
        tasks.push(new Promise(resolve => {
          circle.tweener.clear()
            .to({
              scaleX: 1.5,
              scaleY: 1.5
            }, 500, "easeOutQuad")
            .call(() => {
              circle.remove();
              circle.destroyCanvas();
              this.children.clear();
              this.disable();
              resolve()
            });
        }));
      });
    });
    return Promise.all(tasks);
  },

  finish: function() {
    this.children.clear();

    const circles = this._createCircle();
    const tasks = [];
    circles.forEach(xLine => {
      xLine.forEach(circle => {
        circle.scaleX = 1.5;
        circle.scaleY = 1.5;
        tasks.push(new Promise(resolve => {
          circle.tweener.clear()
            .to({
              scaleX: 0,
              scaleY: 0
            }, 500, "easeOutQuad")
            .call(() => {
              circle.remove();
              circle.destroyCanvas();
              this.children.clear();
              this.disable();
              resolve();
            });
        }));
      });
    });
    return Promise.all(tasks);
  },

  _static: {
    defaults: {
      color: "white",
    }
  }

});

//
// シーンエフェクト：フェードインアウト
//
phina.define("SceneEffectFade", {
  superClass: "SceneEffectBase",

  init: function(options) {
    this.options = ({}).$safe(options, {
      color: "black",
      time: 500,
    });

    this.superInit();
    this.fromJSON({
      children: {
        fade: {
          className: "RectangleShape",
          arguments: {
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            fill: this.options.color,
            stroke: null,
            padding: 0,
          },
          x: SCREEN_WIDTH * 0.5,
          y: SCREEN_HEIGHT * 0.5,
        },
      }
    });
  },

  stay: function() {
    const fade = this.fade;
    fade.alpha = 1.0;
    return Promise.resolve();
  },

  begin: function() {
    return new Promise(resolve => {
      const fade = this.fade;
      fade.alpha = 1.0;
      fade.tweener.clear()
        .fadeOut(this.options.time)
        .call(() => {
          //1Frame描画されてしまってちらつくのでenterframeで削除
          this.one("enterframe", () => {
            this.fade.remove();
            this.fade.destroyCanvas();
            this.remove()
          });
          resolve();
        });
    });
  },

  finish: function() {
    return new Promise(resolve => {
      const fade = this.fade;
      fade.alpha = 0.0;
      fade.tweener.clear()
        .fadeIn(this.options.time)
        .call(() => {
          this.flare("finish");
          //1Frame描画されてしまってちらつくのでenterframeで削除
          this.one("enterframe", () => {
            this.fade.remove();
            this.fade.destroyCanvas();
            this.remove()
          });
          resolve();
        });
    });
  },

  _static: {
    defaults: {
      color: "black",
    }
  }

});

//
// シーンエフェクト：なにもしない
//
phina.define("SceneEffectNone", {
  superClass: "SceneEffectBase",

  init: function() {
    this.superInit();
  },

  begin: function() {
    return new Promise(resolve => {
      this.one("enterframe", () => this.remove());
      resolve();
    });
  },

  finish: function() {
    return new Promise(resolve => {
      this.one("enterframe", () => this.remove());
      resolve();
    });
  }

});

//
// シーンエフェクト：タイルフェード
//
phina.define("SceneEffectTileFade", {
  superClass: "SceneEffectBase",

  tiles: null,
  num: 15,
  speed: 50,

  init: function(options) {
    this.superInit();
    this.options = ({}).$safe(options, {
      color: "black",
      width: 768,
      height: 1024,
    });

    this.tiles = this._createTiles();
  },

  _createTiles: function() {
    const width = Math.floor(this.options.width / this.num);

    return Array.range((this.options.height / width) + 1).map(y => {
      return Array.range(this.num + 1).map(x => {
        return this.addChild(RectangleShape({
          width: width + 2,
          height: width + 2,
          x: x * width,
          y: y * width,
          fill: this.options.color,
          stroke: null,
          strokeWidth: 0,
        }));
      });
    });
  },

  stay: function() {
    this.tiles.forEach((xline, y) => {
      xline.forEach((tile, x) => {
        tile.scaleX = 1.0;
        tile.scaleY = 1.0;
      });
    });
    return Promise.resolve();
  },

  begin: function() {
    const tasks = [];
    this.tiles.forEach((xline, y) => {
      const w = Math.randfloat(0, 1) * this.speed;
      xline.forEach((tile, x) => {
        tile.scaleX = 1.0;
        tile.scaleY = 1.0;
        tasks.push(new Promise(resolve => {
          tile.tweener.clear()
            .wait(x * this.speed + w)
            .to({
              scaleX: 0,
              scaleY: 0
            }, 500, "easeOutQuad")
            .call(() => {
              tile.remove();
              tile.destroyCanvas();
              resolve()
            });
        }));
      });
    });
    return Promise.all(tasks)
  },

  finish: function() {
    const tasks = [];
    this.tiles.forEach((xline, y) => {
      const w = Math.randfloat(0, 1) * this.speed;
      xline.forEach((tile, x) => {
        tile.scaleX = 0.0;
        tile.scaleY = 0.0;
        tasks.push(new Promise(resolve => {
          tile.tweener.clear()
            .wait((xline.length - x) * this.speed + w)
            .to({
              scaleX: 1,
              scaleY: 1
            }, 500, "easeOutQuad")
            .call(() => {
              tile.remove();
              tile.destroyCanvas();
              resolve()
            });
        }));
      });
    });
    return Promise.all(tasks)
  },

  _static: {
    defaults: {
      color: "black",
    }
  }

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
  },

  disable: function() {
    this.setInteractive(false);
  },

});

phina.namespace(function() {

  let dummyTexture = null;

  phina.define("SpriteLabel", {
    superClass: "DisplayElement",

    _text: null,
    table: null,
    fixWidth: 0,

    sprites: null,

    init: function(options) {
      if (!dummyTexture) {
        dummyTexture = Canvas().setSize(1, 1);
      }

      this.superInit(options);
      this.table = options.table;
      this.fixWidth = options.fixWidth || 0;

      this.sprites = [];

      this.setText("");
    },

    setText: function(text) {
      this._text = text;

      const chars = this.text.split("");

      if (this.sprites.length < chars.length) {
        Array.range(0, this.sprites.length - chars.length).forEach(() => {
          this.sprites.push(Sprite(dummyTexture));
        });
      } else {
        Array.range(0, chars.length - this.sprites.length).forEach(() => {
          this.sprites.last.remove();
          this.sprites.length -= 1;
        });
      }

      this._text.split("").map((c, i) => {
        this.sprites[i]
          .setImage(this.table[c])
          .setOrigin(this.originX, this.originY)
          .addChildTo(this);
      });

      const totalWidth = this.sprites.reduce((w, s) => w + (this.fixWidth || s.width), 0);
      const totalHeight = this.sprites.map(_ => _.height).sort().last;

      let x = totalWidth * -this.originX;
      this.sprites.forEach((s) => {
        const width = this.fixWidth || s.width;
        s.x = x + width * s.originX;
        x += width;
      });

      return this;
    },

    _accessor: {
      text: {
        get: function() {
          return this._text;
        },
        set: function(v) {
          this.setText(v);
        },
      },
    },

  });

});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCIwMjBfc2NlbmUvbWFpbnNjZW5lLmpzIiwiMDIwX3NjZW5lL3RpdGxlc2NlbmUuanMiLCIwMTBfYXBwbGljYXRpb24vQXBwbGljYXRpb24uanMiLCIwMTBfYXBwbGljYXRpb24vQXNzZXRMaXN0LmpzIiwiMDEwX2FwcGxpY2F0aW9uL0Jhc2VTY2VuZS5qcyIsIjAxMF9hcHBsaWNhdGlvbi9GaXJzdFNjZW5lRmxvdy5qcyIsIjAzMF9iYXNlL0Jhc2VVbml0LmpzIiwiMDAwX2NvbW1vbi9hY2Nlc3NvcnkvQnV0dG9uLmpzIiwiMDAwX2NvbW1vbi9hY2Nlc3NvcnkvQ2xpcFNwcml0ZS5qcyIsIjAwMF9jb21tb24vYWNjZXNzb3J5L0dhdWdlLmpzIiwiMDAwX2NvbW1vbi9hY2Nlc3NvcnkvR3JheXNjYWxlLmpzIiwiMDAwX2NvbW1vbi9hY2Nlc3NvcnkvTW91c2VDaGFzZXIuanMiLCIwMDBfY29tbW9uL2FjY2Vzc29yeS9NdWx0aVJlY3RhbmdsZUNsaXAuanMiLCIwMDBfY29tbW9uL2FjY2Vzc29yeS9QaWVDbGlwLmpzIiwiMDAwX2NvbW1vbi9hY2Nlc3NvcnkvUmVjdGFuZ2xlQ2xpcC5qcyIsIjAwMF9jb21tb24vYWNjZXNzb3J5L1RvZ2dsZS5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9Bc3NldExvYWRlci5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9CYXNlQXBwLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL0NhbnZhcy5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9DYW52YXNSZW5kZXJlci5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9DaGVja0Jyb3dzZXIuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvRGlzcGxheUVsZW1lbnQuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvRGlzcGxheVNjZW5lLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL0RvbUF1ZGlvU291bmQuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvRWxlbWVudC5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9JbnB1dC5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9MYWJlbC5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9Nb3VzZS5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9PYmplY3QyRC5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9QbGFpbkVsZW1lbnQuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvU2hhcGUuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvU291bmQuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvU291bmRNYW5hZ2VyLmpzIiwiMDAwX2NvbW1vbi9leHRlbnNpb25zL1Nwcml0ZS5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9TdHJpbmcuanMiLCIwMDBfY29tbW9uL2V4dGVuc2lvbnMvVGV4dHVyZS5qcyIsIjAwMF9jb21tb24vZXh0ZW5zaW9ucy9Ud2VlbmVyLmpzIiwiMDAwX2NvbW1vbi91dGlsL0J1dHRvbml6ZS5qcyIsIjAwMF9jb21tb24vdXRpbC9UZXh0dXJlVXRpbC5qcyIsIjAwMF9jb21tb24vdXRpbC9UaWxlZG1hcC5qcyIsIjAwMF9jb21tb24vdXRpbC9UaWxlc2V0LmpzIiwiMDAwX2NvbW1vbi91dGlsL1V0aWwuanMiLCIwMDBfY29tbW9uL3V0aWwveG1sbG9hZGVyLmpzIiwiMDQwX2VsZW1lbnQvY29tbW9uL0FmdGVyQmFubmVyLmpzIiwiMDQwX2VsZW1lbnQvY29tbW9uL1BhcnRpY2xlLmpzIiwiMDQwX2VsZW1lbnQvY29tbW9uL1BhcnRpY2xlU3ByaXRlLmpzIiwiMDQwX2VsZW1lbnQvcGxheWVyL0J1bGxldC5qcyIsIjA0MF9lbGVtZW50L3BsYXllci9FbmVteUZpZ2h0ZXIuanMiLCIwNDBfZWxlbWVudC9wbGF5ZXIvTGFzZXIuanMiLCIwNDBfZWxlbWVudC9wbGF5ZXIvUGxheWVyLmpzIiwiMDQwX2VsZW1lbnQvd29ybGQvV29ybGQuanMiLCIwMDBfY29tbW9uL2VsZW1lbnRzL3NjZW5lRWZmZWN0cy9TY2VuZUVmZmVjdEJhc2UuanMiLCIwMDBfY29tbW9uL2VsZW1lbnRzL3NjZW5lRWZmZWN0cy9TY2VuZUVmZmVjdENpcmNsZUZhZGUuanMiLCIwMDBfY29tbW9uL2VsZW1lbnRzL3NjZW5lRWZmZWN0cy9TY2VuZUVmZmVjdEZhZGUuanMiLCIwMDBfY29tbW9uL2VsZW1lbnRzL3NjZW5lRWZmZWN0cy9TY2VuZUVmZmVjdE5vbmUuanMiLCIwMDBfY29tbW9uL2VsZW1lbnRzL3NjZW5lRWZmZWN0cy9TY2VuZUVmZmVjdFRpbGVGYWRlLmpzIiwiMDAwX2NvbW1vbi9lbGVtZW50cy91aS9JbnB1dEludGVyY2VwdC5qcyIsIjAwMF9jb21tb24vZWxlbWVudHMvdWkvU3ByaXRlTGFiZWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN4R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogIG1haW4uanNcbiAqL1xuXG5waGluYS5nbG9iYWxpemUoKTtcblxuY29uc3QgU0NSRUVOX1dJRFRIID0gNTc2O1xuY29uc3QgU0NSRUVOX0hFSUdIVCA9IDMyNDtcbmNvbnN0IFNDUkVFTl9XSURUSF9IQUxGID0gU0NSRUVOX1dJRFRIICogMC41O1xuY29uc3QgU0NSRUVOX0hFSUdIVF9IQUxGID0gU0NSRUVOX0hFSUdIVCAqIDAuNTtcblxuY29uc3QgU0NSRUVOX09GRlNFVF9YID0gMDtcbmNvbnN0IFNDUkVFTl9PRkZTRVRfWSA9IDA7XG5cbmNvbnN0IE5VTV9MQVlFUlMgPSA3O1xuY29uc3QgTEFURVJfRk9SRUdST1VORCA9IDY7XG5jb25zdCBMQVlFUl9FRkZFQ1RfRk9SRSA9IDU7XG5jb25zdCBMQVlFUl9QTEFZRVIgPSA0O1xuY29uc3QgTEFZRVJfRU5FTVkgPSAzO1xuY29uc3QgTEFZRVJfRUZGRUNUX0JBQ0sgPSAyO1xuY29uc3QgTEFZRVJfQkFDS0dST1VORCA9IDE7XG5jb25zdCBMQVlFUl9NQVAgPSAwO1xuXG5sZXQgcGhpbmFfYXBwO1xuXG53aW5kb3cub25sb2FkID0gZnVuY3Rpb24oKSB7XG4gIHBoaW5hX2FwcCA9IEFwcGxpY2F0aW9uKCk7XG4gIHBoaW5hX2FwcC5yZXBsYWNlU2NlbmUoRmlyc3RTY2VuZUZsb3coe30pKTtcbiAgcGhpbmFfYXBwLnJ1bigpO1xufTtcblxuLy/jgrnjgq/jg63jg7zjg6vnpoHmraJcbi8vIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIGZ1bmN0aW9uKGUpIHtcbi8vICBlLnByZXZlbnREZWZhdWx0KCk7XG4vLyB9LCB7IHBhc3NpdmU6IGZhbHNlIH0pO1xuXG4vL0FuZHJvaWTjg5bjg6njgqbjgrbjg5Djg4Pjgq/jg5zjgr/jg7PliLblvqFcbi8vIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJiYWNrYnV0dG9uXCIsIGZ1bmN0aW9uKGUpe1xuLy8gICBlLnByZXZlbnREZWZhdWx0KCk7XG4vLyB9LCBmYWxzZSk7IiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRlZmluZSgnTWFpblNjZW5lJywge1xuICAgIHN1cGVyQ2xhc3M6ICdCYXNlU2NlbmUnLFxuXG4gICAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICAgIHRoaXMuc2V0dXAoKTtcbiAgICB9LFxuXG4gICAgc2V0dXA6IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgYmFjayA9IFJlY3RhbmdsZVNoYXBlKHsgd2lkdGg6IFNDUkVFTl9XSURUSCwgaGVpZ2h0OiBTQ1JFRU5fSEVJR0hULCBmaWxsOiBcImJsYWNrXCIgfSlcbiAgICAgICAgLnNldFBvc2l0aW9uKFNDUkVFTl9XSURUSF9IQUxGLCBTQ1JFRU5fSEVJR0hUX0hBTEYpXG4gICAgICAgIC5hZGRDaGlsZFRvKHRoaXMpO1xuICAgICAgdGhpcy5yZWdpc3REaXNwb3NlKGJhY2spO1xuXG4gICAgICB0aGlzLndvcmxkID0gV29ybGQoKS5hZGRDaGlsZFRvKHRoaXMpO1xuICAgIH0sXG5cbiAgICB1cGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgIH0sXG5cbiAgfSk7XG5cbn0pO1xuIiwiLypcbiAqICBUaXRsZVNjZW5lLmpzXG4gKi9cblxucGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRlZmluZSgnVGl0bGVTY2VuZScsIHtcbiAgICBzdXBlckNsYXNzOiAnQmFzZVNjZW5lJyxcblxuICAgIF9zdGF0aWM6IHtcbiAgICAgIGlzQXNzZXRMb2FkOiBmYWxzZSxcbiAgICB9LFxuXG4gICAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgdGhpcy5zdXBlckluaXQoKTtcblxuICAgICAgdGhpcy51bmxvY2sgPSBmYWxzZTtcbiAgICAgIHRoaXMubG9hZGNvbXBsZXRlID0gZmFsc2U7XG4gICAgICB0aGlzLnByb2dyZXNzID0gMDtcblxuICAgICAgLy/jg63jg7zjg4nmuIjjgb/jgarjgonjgqLjgrvjg4Pjg4jjg63jg7zjg4njgpLjgZfjgarjgYRcbiAgICAgIGlmIChUaXRsZVNjZW5lLmlzQXNzZXRMb2FkKSB7XG4gICAgICAgIHRoaXMuc2V0dXAoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vcHJlbG9hZCBhc3NldFxuICAgICAgICBjb25zdCBhc3NldHMgPSBBc3NldExpc3QuZ2V0KFwicHJlbG9hZFwiKVxuICAgICAgICB0aGlzLmxvYWRlciA9IHBoaW5hLmFzc2V0LkFzc2V0TG9hZGVyKCk7XG4gICAgICAgIHRoaXMubG9hZGVyLmxvYWQoYXNzZXRzKTtcbiAgICAgICAgdGhpcy5sb2FkZXIub24oJ2xvYWQnLCAoKSA9PiB0aGlzLnNldHVwKCkpO1xuICAgICAgICBUaXRsZVNjZW5lLmlzQXNzZXRMb2FkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgc2V0dXA6IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgYmFjayA9IFJlY3RhbmdsZVNoYXBlKHsgd2lkdGg6IFNDUkVFTl9XSURUSCwgaGVpZ2h0OiBTQ1JFRU5fSEVJR0hULCBmaWxsOiBcImJsYWNrXCIgfSlcbiAgICAgICAgLnNldFBvc2l0aW9uKFNDUkVFTl9XSURUSF9IQUxGLCBTQ1JFRU5fSEVJR0hUX0hBTEYpXG4gICAgICAgIC5hZGRDaGlsZFRvKHRoaXMpO1xuICAgICAgdGhpcy5yZWdpc3REaXNwb3NlKGJhY2spO1xuXG4gICAgICBjb25zdCBsYWJlbCA9IExhYmVsKHsgdGV4dDogXCJWZXJzdXNcIiwgZmlsbDogXCJ3aGl0ZVwiIH0pXG4gICAgICAgIC5zZXRQb3NpdGlvbihTQ1JFRU5fV0lEVEhfSEFMRiwgU0NSRUVOX0hFSUdIVF9IQUxGKVxuICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzKTtcbiAgICAgIHRoaXMucmVnaXN0RGlzcG9zZShsYWJlbCk7XG5cbiAgICAgIHRoaXMub25lKCduZXh0c2NlbmUnLCAoKSA9PiB0aGlzLmV4aXQoXCJtYWluXCIpKTtcbiAgICAgIHRoaXMuZmxhcmUoJ25leHRzY2VuZScpO1xuICAgIH0sXG5cbiAgICB1cGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgY3QgPSBwaGluYV9hcHAuY29udHJvbGxlcjtcbiAgICAgIGlmIChjdC5hKSB7XG4gICAgICAgIHRoaXMuZmxhcmUoJ25leHRzY2VuZScpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRlZmluZShcIkFwcGxpY2F0aW9uXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcInBoaW5hLmRpc3BsYXkuQ2FudmFzQXBwXCIsXG5cbiAgICBxdWFsaXR5OiAxLjAsXG4gIFxuICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zdXBlckluaXQoe1xuICAgICAgICBmcHM6IDYwLFxuICAgICAgICB3aWR0aDogU0NSRUVOX1dJRFRILFxuICAgICAgICBoZWlnaHQ6IFNDUkVFTl9IRUlHSFQsXG4gICAgICAgIGZpdDogdHJ1ZSxcbiAgICAgIH0pO1xuICBcbiAgICAgIC8v44K344O844Oz44Gu5bmF44CB6auY44GV44Gu5Z+65pys44KS6Kit5a6aXG4gICAgICBwaGluYS5kaXNwbGF5LkRpc3BsYXlTY2VuZS5kZWZhdWx0cy4kZXh0ZW5kKHtcbiAgICAgICAgd2lkdGg6IFNDUkVFTl9XSURUSCxcbiAgICAgICAgaGVpZ2h0OiBTQ1JFRU5fSEVJR0hULFxuICAgICAgfSk7XG4gIFxuICAgICAgcGhpbmEuaW5wdXQuSW5wdXQucXVhbGl0eSA9IHRoaXMucXVhbGl0eTtcbiAgICAgIHBoaW5hLmRpc3BsYXkuRGlzcGxheVNjZW5lLnF1YWxpdHkgPSB0aGlzLnF1YWxpdHk7XG5cbiAgICAgIC8v44Ky44O844Og44OR44OD44OJ566h55CGXG4gICAgICB0aGlzLmdhbWVwYWRNYW5hZ2VyID0gcGhpbmEuaW5wdXQuR2FtZXBhZE1hbmFnZXIoKTtcbiAgICAgIHRoaXMuZ2FtZXBhZCA9IHRoaXMuZ2FtZXBhZE1hbmFnZXIuZ2V0KDApO1xuICAgICAgdGhpcy5jb250cm9sbGVyID0ge307XG5cbiAgICAgIHRoaXMuc2V0dXBFdmVudHMoKTtcbiAgICAgIHRoaXMuc2V0dXBTb3VuZCgpO1xuICAgICAgdGhpcy5zZXR1cE1vdXNlV2hlZWwoKTtcblxuICAgICAgdGhpcy5vbihcImNoYW5nZXNjZW5lXCIsICgpID0+IHtcbiAgICAgICAgLy/jgrfjg7zjg7PjgpLpm6LjgozjgovpmpvjgIHjg5zjgr/jg7PlkIzmmYLmirzjgZfjg5Xjg6njgrDjgpLop6PpmaTjgZnjgotcbiAgICAgICAgQnV0dG9uLmFjdGlvblRhcmdldCA9IG51bGw7XG4gICAgICB9KTtcblxuICAgICAgLy/jg5Hjg4Pjg4nmg4XloLHjgpLmm7TmlrBcbiAgICAgIHRoaXMub24oJ2VudGVyZnJhbWUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5nYW1lcGFkTWFuYWdlci51cGRhdGUoKTtcbiAgICAgICAgdGhpcy51cGRhdGVDb250cm9sbGVyKCk7XG4gICAgICB9KTtcbiAgICB9LFxuICBcbiAgICAvL+ODnuOCpuOCueOBruODm+ODvOODq+OCpOODmeODs+ODiOmWoumAo1xuICAgIHNldHVwTW91c2VXaGVlbDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLndoZWVsRGVsdGFZID0gMDtcbiAgICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2V3aGVlbFwiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgdGhpcy53aGVlbERlbHRhWSA9IGUuZGVsdGFZO1xuICAgICAgfS5iaW5kKHRoaXMpLCBmYWxzZSk7XG4gIFxuICAgICAgdGhpcy5vbihcImVudGVyZnJhbWVcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMucG9pbnRlci53aGVlbERlbHRhWSA9IHRoaXMud2hlZWxEZWx0YVk7XG4gICAgICAgIHRoaXMud2hlZWxEZWx0YVkgPSAwO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8v44Ki44OX44Oq44Kx44O844K344On44Oz5YWo5L2T44Gu44Kk44OZ44Oz44OI44OV44OD44KvXG4gICAgc2V0dXBFdmVudHM6IGZ1bmN0aW9uKCkge30sXG4gIFxuICAgIHNldHVwU291bmQ6IGZ1bmN0aW9uKCkge30sXG5cbiAgICB1cGRhdGVDb250cm9sbGVyOiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0IGJlZm9yZSA9IHRoaXMuY29udHJvbGxlcjtcbiAgICAgIGJlZm9yZS5iZWZvcmUgPSBudWxsO1xuXG4gICAgICBjb25zdCBncCA9IHRoaXMuZ2FtZXBhZDtcbiAgICAgIGNvbnN0IGtiID0gdGhpcy5rZXlib2FyZDtcbiAgICAgIGNvbnN0IGFuZ2xlMSA9IGdwLmdldEtleUFuZ2xlKCk7XG4gICAgICBjb25zdCBhbmdsZTIgPSBrYi5nZXRLZXlBbmdsZSgpO1xuICAgICAgdGhpcy5jb250cm9sbGVyID0ge1xuICAgICAgICAgIGFuZ2xlOiBhbmdsZTEgIT09IG51bGw/IGFuZ2xlMTogYW5nbGUyLFxuXG4gICAgICAgICAgdXA6IGdwLmdldEtleShcInVwXCIpIHx8IGtiLmdldEtleShcInVwXCIpLFxuICAgICAgICAgIGRvd246IGdwLmdldEtleShcImRvd25cIikgfHwga2IuZ2V0S2V5KFwiZG93blwiKSxcbiAgICAgICAgICBsZWZ0OiBncC5nZXRLZXkoXCJsZWZ0XCIpIHx8IGtiLmdldEtleShcImxlZnRcIiksXG4gICAgICAgICAgcmlnaHQ6IGdwLmdldEtleShcInJpZ2h0XCIpIHx8IGtiLmdldEtleShcInJpZ2h0XCIpLFxuXG4gICAgICAgICAgYXR0YWNrOiBncC5nZXRLZXkoXCJBXCIpIHx8IGtiLmdldEtleShcIlhcIiksXG4gICAgICAgICAganVtcDogICBncC5nZXRLZXkoXCJYXCIpIHx8IGtiLmdldEtleShcIlpcIiksXG4gICAgICAgICAgbWVudTogICBncC5nZXRLZXkoXCJzdGFydFwiKSB8fCBrYi5nZXRLZXkoXCJlc2NhcGVcIiksXG5cbiAgICAgICAgICBhOiBncC5nZXRLZXkoXCJBXCIpIHx8IGtiLmdldEtleShcIlpcIiksXG4gICAgICAgICAgYjogZ3AuZ2V0S2V5KFwiQlwiKSB8fCBrYi5nZXRLZXkoXCJYXCIpLFxuICAgICAgICAgIHg6IGdwLmdldEtleShcIlhcIikgfHwga2IuZ2V0S2V5KFwiQ1wiKSxcbiAgICAgICAgICB5OiBncC5nZXRLZXkoXCJZXCIpIHx8IGtiLmdldEtleShcIlZcIiksXG5cbiAgICAgICAgICBvazogZ3AuZ2V0S2V5KFwiQVwiKSB8fCBrYi5nZXRLZXkoXCJaXCIpIHx8IGtiLmdldEtleShcInNwYWNlXCIpIHx8IGtiLmdldEtleShcInJldHVyblwiKSxcbiAgICAgICAgICBjYW5jZWw6IGdwLmdldEtleShcIkJcIikgfHwga2IuZ2V0S2V5KFwiWFwiKSB8fCBrYi5nZXRLZXkoXCJlc2NhcGVcIiksXG5cbiAgICAgICAgICBzdGFydDogZ3AuZ2V0S2V5KFwic3RhcnRcIikgfHwga2IuZ2V0S2V5KFwicmV0dXJuXCIpLFxuICAgICAgICAgIHNlbGVjdDogZ3AuZ2V0S2V5KFwic2VsZWN0XCIpLFxuXG4gICAgICAgICAgcGF1c2U6IGdwLmdldEtleShcInN0YXJ0XCIpIHx8IGtiLmdldEtleShcImVzY2FwZVwiKSxcblxuICAgICAgICAgIGFuYWxvZzE6IGdwLmdldFN0aWNrRGlyZWN0aW9uKDApLFxuICAgICAgICAgIGFuYWxvZzI6IGdwLmdldFN0aWNrRGlyZWN0aW9uKDEpLFxuXG4gICAgICAgICAgLy/liY3jg5Xjg6zjg7zjg6Dmg4XloLFcbiAgICAgICAgICBiZWZvcmU6IGJlZm9yZSxcbiAgICAgIH07XG4gIH0sXG59KTtcbiAgXG59KTsiLCIvKlxuICogIEFzc2V0TGlzdC5qc1xuICovXG5cbnBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoXCJBc3NldExpc3RcIiwge1xuICAgIF9zdGF0aWM6IHtcbiAgICAgIGxvYWRlZDogW10sXG4gICAgICBpc0xvYWRlZDogZnVuY3Rpb24oYXNzZXRUeXBlKSB7XG4gICAgICAgIHJldHVybiBBc3NldExpc3QubG9hZGVkW2Fzc2V0VHlwZV0/IHRydWU6IGZhbHNlO1xuICAgICAgfSxcbiAgICAgIGdldDogZnVuY3Rpb24oYXNzZXRUeXBlKSB7XG4gICAgICAgIEFzc2V0TGlzdC5sb2FkZWRbYXNzZXRUeXBlXSA9IHRydWU7XG4gICAgICAgIHN3aXRjaCAoYXNzZXRUeXBlKSB7XG4gICAgICAgICAgY2FzZSBcInByZWxvYWRcIjpcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgICAgICAgXCJmaWdodGVyXCI6IFwiYXNzZXRzL3RleHR1cmVzL2ZpZ2h0ZXIucG5nXCIsXG4gICAgICAgICAgICAgICAgXCJwYXJ0aWNsZVwiOiBcImFzc2V0cy90ZXh0dXJlcy9wYXJ0aWNsZS5wbmdcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgLy8gdG14OiB7XG4gICAgICAgICAgICAgIC8vICAgXCJtYXAxXCI6IFwiYXNzZXRzL21hcC9tYXAyLnRteFwiLFxuICAgICAgICAgICAgICAvLyB9LFxuICAgICAgICAgICAgICAvLyB0c3g6IHtcbiAgICAgICAgICAgICAgLy8gICBcInRpbGVfYVwiOiBcImFzc2V0cy9tYXAvdGlsZV9hLnRzeFwiLFxuICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgIGNhc2UgXCJjb21tb25cIjpcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIGltYWdlOiB7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93IFwiaW52YWxpZCBhc3NldFR5cGU6IFwiICsgb3B0aW9ucy5hc3NldFR5cGU7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSxcbiAgfSk7XG5cbn0pO1xuIiwiLypcbiAqICBNYWluU2NlbmUuanNcbiAqICAyMDE4LzEwLzI2XG4gKi9cblxucGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRlZmluZShcIkJhc2VTY2VuZVwiLCB7XG4gICAgc3VwZXJDbGFzczogJ0Rpc3BsYXlTY2VuZScsXG5cbiAgICAvL+W7g+ajhOOCqOODrOODoeODs+ODiFxuICAgIGRpc3Bvc2VFbGVtZW50czogbnVsbCxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSAob3B0aW9ucyB8fCB7fSkuJHNhZmUoe1xuICAgICAgICB3aWR0aDogU0NSRUVOX1dJRFRILFxuICAgICAgICBoZWlnaHQ6IFNDUkVFTl9IRUlHSFQsXG4gICAgICAgIGJhY2tncm91bmRDb2xvcjogJ3RyYW5zcGFyZW50JyxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5zdXBlckluaXQob3B0aW9ucyk7XG5cbiAgICAgIC8v44K344O844Oz6Zui6ISx5pmCY2FudmFz44Oh44Oi44Oq6Kej5pS+XG4gICAgICB0aGlzLmRpc3Bvc2VFbGVtZW50cyA9IFtdO1xuICAgICAgdGhpcy5vbmUoJ2Rlc3Ryb3knLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuZGlzcG9zZUVsZW1lbnRzLmZvckVhY2goZSA9PiB7XG4gICAgICAgICAgaWYgKGUuZGVzdHJveUNhbnZhcykge1xuICAgICAgICAgICAgZS5kZXN0cm95Q2FudmFzKCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChlIGluc3RhbmNlb2YgQ2FudmFzKSB7XG4gICAgICAgICAgICBlLnNldFNpemUoMCwgMCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLmFwcCA9IHBoaW5hX2FwcDtcblxuICAgICAgLy/liKXjgrfjg7zjg7Pjgbjjga7np7vooYzmmYLjgavjgq3jg6Pjg7Pjg5DjgrnjgpLnoLTmo4RcbiAgICAgIHRoaXMub25lKCdleGl0JywgKCkgPT4ge1xuICAgICAgICB0aGlzLmRlc3Ryb3koKTtcbiAgICAgICAgdGhpcy5jYW52YXMuZGVzdHJveSgpO1xuICAgICAgICB0aGlzLmZsYXJlKCdkZXN0cm95Jyk7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiRXhpdCBzY2VuZS5cIik7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7fSxcblxuICAgIGZhZGVJbjogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IChvcHRpb25zIHx8IHt9KS4kc2FmZSh7XG4gICAgICAgIGNvbG9yOiBcIndoaXRlXCIsXG4gICAgICAgIG1pbGxpc2Vjb25kOiA1MDAsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3QgbWFzayA9IFJlY3RhbmdsZVNoYXBlKHtcbiAgICAgICAgICB3aWR0aDogU0NSRUVOX1dJRFRILFxuICAgICAgICAgIGhlaWdodDogU0NSRUVOX0hFSUdIVCxcbiAgICAgICAgICBmaWxsOiBvcHRpb25zLmNvbG9yLFxuICAgICAgICAgIHN0cm9rZVdpZHRoOiAwLFxuICAgICAgICB9KS5zZXRQb3NpdGlvbihTQ1JFRU5fV0lEVEggKiAwLjUsIFNDUkVFTl9IRUlHSFQgKiAwLjUpLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICAgIG1hc2sudHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgLmZhZGVPdXQob3B0aW9ucy5taWxsaXNlY29uZClcbiAgICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB0aGlzLmFwcC5vbmUoJ2VudGVyZnJhbWUnLCAoKSA9PiBtYXNrLmRlc3Ryb3lDYW52YXMoKSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgZmFkZU91dDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IChvcHRpb25zIHx8IHt9KS4kc2FmZSh7XG4gICAgICAgIGNvbG9yOiBcIndoaXRlXCIsXG4gICAgICAgIG1pbGxpc2Vjb25kOiA1MDAsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3QgbWFzayA9IFJlY3RhbmdsZVNoYXBlKHtcbiAgICAgICAgICB3aWR0aDogU0NSRUVOX1dJRFRILFxuICAgICAgICAgIGhlaWdodDogU0NSRUVOX0hFSUdIVCxcbiAgICAgICAgICBmaWxsOiBvcHRpb25zLmNvbG9yLFxuICAgICAgICAgIHN0cm9rZVdpZHRoOiAwLFxuICAgICAgICB9KS5zZXRQb3NpdGlvbihTQ1JFRU5fV0lEVEggKiAwLjUsIFNDUkVFTl9IRUlHSFQgKiAwLjUpLmFkZENoaWxkVG8odGhpcyk7XG4gICAgICAgIG1hc2suYWxwaGEgPSAwO1xuICAgICAgICBtYXNrLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgIC5mYWRlSW4ob3B0aW9ucy5taWxsaXNlY29uZClcbiAgICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB0aGlzLmFwcC5vbmUoJ2VudGVyZnJhbWUnLCAoKSA9PiBtYXNrLmRlc3Ryb3lDYW52YXMoKSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy/jgrfjg7zjg7Ppm6LohLHmmYLjgavnoLTmo4TjgZnjgotTaGFwZeOCkueZu+mMslxuICAgIHJlZ2lzdERpc3Bvc2U6IGZ1bmN0aW9uKGVsZW1lbnQpIHtcbiAgICAgIHRoaXMuZGlzcG9zZUVsZW1lbnRzLnB1c2goZWxlbWVudCk7XG4gICAgfSxcbiAgfSk7XG5cbn0pOyIsIi8qXG4gKiAgRmlyc3RTY2VuZUZsb3cuanNcbiAqL1xuXG5waGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwiRmlyc3RTY2VuZUZsb3dcIiwge1xuICAgIHN1cGVyQ2xhc3M6IFwiTWFuYWdlclNjZW5lXCIsXG5cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgIHN0YXJ0TGFiZWwgPSBvcHRpb25zLnN0YXJ0TGFiZWwgfHwgXCJ0aXRsZVwiO1xuICAgICAgdGhpcy5zdXBlckluaXQoe1xuICAgICAgICBzdGFydExhYmVsOiBzdGFydExhYmVsLFxuICAgICAgICBzY2VuZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBsYWJlbDogXCJ0aXRsZVwiLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiBcIlRpdGxlU2NlbmVcIixcbiAgICAgICAgICAgIG5leHRMYWJlbDogXCJob21lXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBsYWJlbDogXCJtYWluXCIsXG4gICAgICAgICAgICBjbGFzc05hbWU6IFwiTWFpblNjZW5lXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbn0pOyIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kZWZpbmUoJ0Jhc2VVbml0Jywge1xuICAgIHN1cGVyQ2xhc3M6ICdEaXNwbGF5RWxlbWVudCcsXG5cbiAgICBfc3RhdGljOiB7XG4gICAgICBkZWZhdWx0T3B0aW9uczoge1xuICAgICAgICB3b3JsZDogbnVsbCxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgIHN0YXRlOiBudWxsLFxuICAgIHNwZWVkOiAwLFxuXG4gICAgc3ByaXRlOiBudWxsLFxuXG4gICAgaHA6IDEwMCxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIHRoaXMuc3VwZXJJbml0KG9wdGlvbnMpO1xuICAgICAgdGhpcy53b3JsZCA9IG9wdGlvbnMud29ybGQgfHwgbnVsbDtcbiAgICAgIHRoaXMuYmFzZSA9IERpc3BsYXlFbGVtZW50KCkuYWRkQ2hpbGRUbyh0aGlzKTtcblxuICAgICAgdGhpcy5iZWZvcmUgPSBudWxsO1xuICAgIH0sXG4gIH0pO1xuXG59KTtcbiIsInBoaW5hLmRlZmluZShcIkJ1dHRvblwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiQWNjZXNzb3J5XCIsXG5cbiAgbG9nbnByZXNzVGltZTogNTAwLFxuICBkb0xvbmdwcmVzczogZmFsc2UsXG5cbiAgLy/plbfmirzjgZfjgafpgKPmiZPjg6Ljg7zjg4lcbiAgbG9uZ3ByZXNzQmFycmFnZTogZmFsc2UsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcblxuICAgIHRoaXMub24oXCJhdHRhY2hlZFwiLCAoKSA9PiB7XG4gICAgICB0aGlzLnRhcmdldC5pbnRlcmFjdGl2ZSA9IHRydWU7XG4gICAgICB0aGlzLnRhcmdldC5jbGlja1NvdW5kID0gQnV0dG9uLmRlZmF1bHRzLmNsaWNrU291bmQ7XG5cbiAgICAgIC8v44Oc44K/44Oz5oq844GX5pmC55SoXG4gICAgICB0aGlzLnRhcmdldC5zY2FsZVR3ZWVuZXIgPSBUd2VlbmVyKCkuYXR0YWNoVG8odGhpcy50YXJnZXQpO1xuXG4gICAgICAvL+mVt+aKvOOBl+eUqFxuICAgICAgdGhpcy50YXJnZXQudHdMb25ncHJlc3MgPSBUd2VlbmVyKCkuYXR0YWNoVG8odGhpcy50YXJnZXQpO1xuXG4gICAgICAvL+mVt+aKvOOBl+S4reeJueauiuWvvuW/nOeUqFxuICAgICAgdGhpcy50YXJnZXQudHdMb25ncHJlc3NpbmcgPSBUd2VlbmVyKCkuYXR0YWNoVG8odGhpcy50YXJnZXQpO1xuXG4gICAgICB0aGlzLnRhcmdldC5vbihcInBvaW50c3RhcnRcIiwgKGUpID0+IHtcblxuICAgICAgICAvL+OCpOODmeODs+ODiOiyq+mAmuOBq+OBl+OBpuOBiuOBj1xuICAgICAgICBlLnBhc3MgPSB0cnVlO1xuXG4gICAgICAgIC8v44Oc44K/44Oz44Gu5ZCM5pmC5oq844GX44KS5Yi26ZmQXG4gICAgICAgIGlmIChCdXR0b24uYWN0aW9uVGFyZ2V0ICE9PSBudWxsKSByZXR1cm47XG5cbiAgICAgICAgLy/jg6rjgrnjg4jjg5Pjg6Xjg7zjga7lrZDkvpvjgaDjgaPjgZ/loLTlkIjjga92aWV3cG9ydOOBqOOBruOBguOBn+OCiuWIpOWumuOCkuOBmeOCi1xuICAgICAgICBjb25zdCBsaXN0VmlldyA9IEJ1dHRvbi5maW5kTGlzdFZpZXcoZS50YXJnZXQpO1xuICAgICAgICBpZiAobGlzdFZpZXcgJiYgIWxpc3RWaWV3LnZpZXdwb3J0LmhpdFRlc3QoZS5wb2ludGVyLngsIGUucG9pbnRlci55KSkgcmV0dXJuO1xuXG4gICAgICAgIGlmIChsaXN0Vmlldykge1xuICAgICAgICAgIC8v44Od44Kk44Oz44K/44GM56e75YuV44GX44Gf5aC05ZCI44Gv6ZW35oq844GX44Kt44Oj44Oz44K744Or77yIbGlzdFZpZXflhoXniYjvvIlcbiAgICAgICAgICBsaXN0Vmlldy5pbm5lci4kd2F0Y2goJ3knLCAodjEsIHYyKSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy50YXJnZXQgIT09IEJ1dHRvbi5hY3Rpb25UYXJnZXQpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyh2MSAtIHYyKSA8IDEwKSByZXR1cm47XG5cbiAgICAgICAgICAgIEJ1dHRvbi5hY3Rpb25UYXJnZXQgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy50YXJnZXQudHdMb25ncHJlc3MuY2xlYXIoKTtcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0LnNjYWxlVHdlZW5lci5jbGVhcigpLnRvKHtcbiAgICAgICAgICAgICAgc2NhbGVYOiAxLjAgKiB0aGlzLnN4LFxuICAgICAgICAgICAgICBzY2FsZVk6IDEuMCAqIHRoaXMuc3lcbiAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8v44Oc44K/44Oz44Gu5Yem55CG44KS5a6f6KGM44GX44Gm44KC5ZWP6aGM44Gq44GE5aC05ZCI44Gu44G/6LKr6YCa44KS5YGc5q2i44GZ44KLXG4gICAgICAgIGUucGFzcyA9IGZhbHNlO1xuICAgICAgICBCdXR0b24uYWN0aW9uVGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG5cbiAgICAgICAgLy/lj43ou6LjgZfjgabjgYTjgovjg5zjgr/jg7PnlKjjgavkv53mjIHjgZnjgotcbiAgICAgICAgdGhpcy5zeCA9ICh0aGlzLnRhcmdldC5zY2FsZVggPiAwKSA/IDEgOiAtMTtcbiAgICAgICAgdGhpcy5zeSA9ICh0aGlzLnRhcmdldC5zY2FsZVkgPiAwKSA/IDEgOiAtMTtcblxuICAgICAgICB0aGlzLnRhcmdldC5zY2FsZVR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgIC50byh7XG4gICAgICAgICAgICBzY2FsZVg6IDAuOTUgKiB0aGlzLnN4LFxuICAgICAgICAgICAgc2NhbGVZOiAwLjk1ICogdGhpcy5zeVxuICAgICAgICAgIH0sIDUwKTtcblxuICAgICAgICB0aGlzLmRvTG9uZ3ByZXNzID0gZmFsc2U7XG4gICAgICAgIHRoaXMudGFyZ2V0LnR3TG9uZ3ByZXNzLmNsZWFyKClcbiAgICAgICAgICAud2FpdCh0aGlzLmxvZ25wcmVzc1RpbWUpXG4gICAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aGlzLmxvbmdwcmVzc0JhcnJhZ2UpIHtcbiAgICAgICAgICAgICAgQnV0dG9uLmFjdGlvblRhcmdldCA9IG51bGw7XG4gICAgICAgICAgICAgIHRoaXMudGFyZ2V0LnNjYWxlVHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgICAgICAgLnRvKHtcbiAgICAgICAgICAgICAgICAgIHNjYWxlWDogMS4wICogdGhpcy5zeCxcbiAgICAgICAgICAgICAgICAgIHNjYWxlWTogMS4wICogdGhpcy5zeVxuICAgICAgICAgICAgICAgIH0sIDUwKVxuICAgICAgICAgICAgICB0aGlzLnRhcmdldC5mbGFyZShcImxvbmdwcmVzc1wiKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy50YXJnZXQuZmxhcmUoXCJjbGlja1NvdW5kXCIpO1xuICAgICAgICAgICAgICB0aGlzLnRhcmdldC50d0xvbmdwcmVzc2luZy5jbGVhcigpXG4gICAgICAgICAgICAgICAgLndhaXQoNSlcbiAgICAgICAgICAgICAgICAuY2FsbCgoKSA9PiB0aGlzLnRhcmdldC5mbGFyZShcImNsaWNrZWRcIiwge1xuICAgICAgICAgICAgICAgICAgbG9uZ3ByZXNzOiB0cnVlXG4gICAgICAgICAgICAgICAgfSkpXG4gICAgICAgICAgICAgICAgLmNhbGwoKCkgPT4gdGhpcy50YXJnZXQuZmxhcmUoXCJsb25ncHJlc3NpbmdcIikpXG4gICAgICAgICAgICAgICAgLnNldExvb3AodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQub24oXCJwb2ludGVuZFwiLCAoZSkgPT4ge1xuICAgICAgICAvL+OCpOODmeODs+ODiOiyq+mAmuOBq+OBl+OBpuOBiuOBj1xuICAgICAgICBlLnBhc3MgPSB0cnVlO1xuXG4gICAgICAgIC8vXG4gICAgICAgIHRoaXMudGFyZ2V0LnR3TG9uZ3ByZXNzLmNsZWFyKCk7XG4gICAgICAgIHRoaXMudGFyZ2V0LnR3TG9uZ3ByZXNzaW5nLmNsZWFyKCk7XG5cbiAgICAgICAgLy/jgr/jg7zjgrLjg4Pjg4jjgYxudWxs44GLcG9pbnRzdGFydOOBp+S/neaMgeOBl+OBn+OCv+ODvOOCsuODg+ODiOOBqOmBleOBhuWgtOWQiOOBr+OCueODq+ODvOOBmeOCi1xuICAgICAgICBpZiAoQnV0dG9uLmFjdGlvblRhcmdldCA9PT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICBpZiAoQnV0dG9uLmFjdGlvblRhcmdldCAhPT0gdGhpcy50YXJnZXQpIHJldHVybjtcblxuICAgICAgICAvL+ODnOOCv+ODs+OBruWHpueQhuOCkuWun+ihjOOBl+OBpuOCguWVj+mhjOOBquOBhOWgtOWQiOOBruOBv+iyq+mAmuOCkuWBnOatouOBmeOCi1xuICAgICAgICBlLnBhc3MgPSBmYWxzZTtcblxuICAgICAgICAvL+aKvOOBl+OBn+S9jee9ruOBi+OCieOBguOCi+eoi+W6puenu+WLleOBl+OBpuOBhOOCi+WgtOWQiOOBr+OCr+ODquODg+OCr+OCpOODmeODs+ODiOOCkueZuueUn+OBleOBm+OBquOBhFxuICAgICAgICBjb25zdCBpc01vdmUgPSBlLnBvaW50ZXIuc3RhcnRQb3NpdGlvbi5zdWIoZS5wb2ludGVyLnBvc2l0aW9uKS5sZW5ndGgoKSA+IDUwO1xuICAgICAgICBjb25zdCBoaXRUZXN0ID0gdGhpcy50YXJnZXQuaGl0VGVzdChlLnBvaW50ZXIueCwgZS5wb2ludGVyLnkpO1xuICAgICAgICBpZiAoaGl0VGVzdCAmJiAhaXNNb3ZlKSB0aGlzLnRhcmdldC5mbGFyZShcImNsaWNrU291bmRcIik7XG5cbiAgICAgICAgdGhpcy50YXJnZXQuc2NhbGVUd2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAudG8oe1xuICAgICAgICAgICAgc2NhbGVYOiAxLjAgKiB0aGlzLnN4LFxuICAgICAgICAgICAgc2NhbGVZOiAxLjAgKiB0aGlzLnN5XG4gICAgICAgICAgfSwgNTApXG4gICAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgICAgQnV0dG9uLmFjdGlvblRhcmdldCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoIWhpdFRlc3QgfHwgaXNNb3ZlIHx8IHRoaXMuZG9Mb25ncHJlc3MpIHJldHVybjtcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0LmZsYXJlKFwiY2xpY2tlZFwiLCB7XG4gICAgICAgICAgICAgIHBvaW50ZXI6IGUucG9pbnRlclxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgLy/jgqLjg4vjg6Hjg7zjgrfjg6fjg7Pjga7mnIDkuK3jgavliYrpmaTjgZXjgozjgZ/loLTlkIjjgavlgpnjgYjjgaZyZW1vdmVk44Kk44OZ44Oz44OI5pmC44Gr44OV44Op44Kw44KS5YWD44Gr5oi744GX44Gm44GK44GPXG4gICAgICB0aGlzLnRhcmdldC5vbmUoXCJyZW1vdmVkXCIsICgpID0+IHtcbiAgICAgICAgaWYgKEJ1dHRvbi5hY3Rpb25UYXJnZXQgPT09IHRoaXMudGFyZ2V0KSB7XG4gICAgICAgICAgQnV0dG9uLmFjdGlvblRhcmdldCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRhcmdldC5vbihcImNsaWNrU291bmRcIiwgKCkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMudGFyZ2V0LmNsaWNrU291bmQgfHwgdGhpcy50YXJnZXQuY2xpY2tTb3VuZCA9PSBcIlwiKSByZXR1cm47XG4gICAgICAgIHBoaW5hLmFzc2V0LlNvdW5kTWFuYWdlci5wbGF5KHRoaXMudGFyZ2V0LmNsaWNrU291bmQpO1xuICAgICAgfSk7XG5cbiAgICB9KTtcbiAgfSxcblxuICAvL+mVt+aKvOOBl+OBruW8t+WItuOCreODo+ODs+OCu+ODq1xuICBsb25ncHJlc3NDYW5jZWw6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGFyZ2V0LnR3TG9uZ3ByZXNzLmNsZWFyKCk7XG4gICAgdGhpcy50YXJnZXQudHdMb25ncHJlc3NpbmcuY2xlYXIoKTtcbiAgfSxcblxuICBfc3RhdGljOiB7XG4gICAgLy/jg5zjgr/jg7PlkIzmmYLmirzjgZfjgpLliLblvqHjgZnjgovjgZ/jgoHjgatzdGF0dXPjga9zdGF0aWPjgavjgZnjgotcbiAgICBzdGF0dXM6IDAsXG4gICAgYWN0aW9uVGFyZ2V0OiBudWxsLFxuICAgIC8v5Z+65pys6Kit5a6aXG4gICAgZGVmYXVsdHM6IHtcbiAgICAgIGNsaWNrU291bmQ6IFwiY29tbW9uL3NvdW5kcy9zZS9idXR0b25cIixcbiAgICB9LFxuXG4gICAgLy/opqrjgpLjgZ/jganjgaPjgaZMaXN0Vmlld+OCkuaOouOBmVxuICAgIGZpbmRMaXN0VmlldzogZnVuY3Rpb24oZWxlbWVudCwgcCkge1xuICAgICAgLy/jg6rjgrnjg4jjg5Pjg6Xjg7zjgpLmjIHjgaPjgabjgYTjgovloLTlkIhcbiAgICAgIGlmIChlbGVtZW50Lkxpc3RWaWV3ICE9IG51bGwpIHJldHVybiBlbGVtZW50Lkxpc3RWaWV3O1xuICAgICAgLy/opqrjgYzjgarjgZHjgozjgbDntYLkuoZcbiAgICAgIGlmIChlbGVtZW50LnBhcmVudCA9PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgICAgIC8v6Kaq44KS44Gf44Gp44KLXG4gICAgICByZXR1cm4gdGhpcy5maW5kTGlzdFZpZXcoZWxlbWVudC5wYXJlbnQpO1xuICAgIH1cblxuICB9XG5cbn0pO1xuIiwiLyoqXHJcbiAqIOimquOCueODl+ODqeOCpOODiOOBruODhuOCr+OCueODgeODo+OCkuWIh+OCiuaKnOOBhOOBpuiHquWIhuOBruODhuOCr+OCueODgeODo+OBqOOBmeOCi+OCueODl+ODqeOCpOODiFxyXG4gKiDopqrjgrnjg5fjg6njgqTjg4jjga7liIfjgormipzjgYvjgozjgZ/pg6jliIbjga/jgIHliIfjgormipzjgY3nr4Tlm7Ljga7lt6bkuIrjga7jg5Tjgq/jgrvjg6vjga7oibLjgafloZfjgorjgaTjgbbjgZXjgozjgotcclxuICogXHJcbiAqIOimquimgee0oOOBruaLoee4ruODu+Wbnui7ouOBr+iAg+aFruOBl+OBquOBhFxyXG4gKi9cclxucGhpbmEuZGVmaW5lKFwiQ2xpcFNwcml0ZVwiLCB7XHJcbiAgc3VwZXJDbGFzczogXCJBY2Nlc3NvcnlcIixcclxuXHJcbiAgaW5pdDogZnVuY3Rpb24oKSB7XHJcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xyXG4gICAgdGhpcy5vbihcImF0dGFjaGVkXCIsICgpID0+IHtcclxuICAgICAgdGhpcy50YXJnZXQub25lKFwiYWRkZWRcIiwgKCkgPT4ge1xyXG4gICAgICAgIHRoaXMuc2V0dXAoKTtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9LFxyXG5cclxuICBzZXR1cDogZnVuY3Rpb24oKSB7XHJcbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLnRhcmdldDtcclxuICAgIGNvbnN0IHBhcmVudCA9IHRhcmdldC5wYXJlbnQ7XHJcbiAgICBpZiAocGFyZW50IGluc3RhbmNlb2YgcGhpbmEuZGlzcGxheS5TcHJpdGUpIHtcclxuICAgICAgY29uc3QgeCA9IHBhcmVudC53aWR0aCAqIHBhcmVudC5vcmlnaW4ueCArIHRhcmdldC54IC0gdGFyZ2V0LndpZHRoICogdGFyZ2V0Lm9yaWdpbi54O1xyXG4gICAgICBjb25zdCB5ID0gcGFyZW50LmhlaWdodCAqIHBhcmVudC5vcmlnaW4ueSArIHRhcmdldC55IC0gdGFyZ2V0LmhlaWdodCAqIHRhcmdldC5vcmlnaW4ueTtcclxuICAgICAgY29uc3QgdyA9IHRhcmdldC53aWR0aDtcclxuICAgICAgY29uc3QgaCA9IHRhcmdldC5oZWlnaHQ7XHJcblxyXG4gICAgICBjb25zdCBwYXJlbnRUZXh0dXJlID0gcGFyZW50LmltYWdlO1xyXG4gICAgICBjb25zdCBjYW52YXMgPSBwaGluYS5ncmFwaGljcy5DYW52YXMoKS5zZXRTaXplKHcsIGgpO1xyXG4gICAgICBjYW52YXMuY29udGV4dC5kcmF3SW1hZ2UocGFyZW50VGV4dHVyZS5kb21FbGVtZW50LCB4LCB5LCB3LCBoLCAwLCAwLCB3LCBoKTtcclxuICAgICAgaWYgKHBhcmVudFRleHR1cmUgaW5zdGFuY2VvZiBwaGluYS5ncmFwaGljcy5DYW52YXMpIHtcclxuICAgICAgICAvLyDjgq/jg63jg7zjg7PjgZfjgabjgZ3jgaPjgaHjgpLkvb/jgYZcclxuICAgICAgICBjb25zdCBwYXJlbnRUZXh0dXJlQ2xvbmUgPSBwaGluYS5ncmFwaGljcy5DYW52YXMoKS5zZXRTaXplKHBhcmVudFRleHR1cmUud2lkdGgsIHBhcmVudFRleHR1cmUuaGVpZ2h0KTtcclxuICAgICAgICBwYXJlbnRUZXh0dXJlQ2xvbmUuY29udGV4dC5kcmF3SW1hZ2UocGFyZW50VGV4dHVyZS5kb21FbGVtZW50LCAwLCAwKTtcclxuICAgICAgICBwYXJlbnQuaW1hZ2UgPSBwYXJlbnRUZXh0dXJlQ2xvbmU7XHJcblxyXG4gICAgICAgIGNvbnN0IGRhdGEgPSBwYXJlbnRUZXh0dXJlQ2xvbmUuY29udGV4dC5nZXRJbWFnZURhdGEoeCwgeSwgMSwgMSkuZGF0YTtcclxuICAgICAgICBwYXJlbnRUZXh0dXJlQ2xvbmUuY29udGV4dC5jbGVhclJlY3QoeCwgeSwgdywgaCk7XHJcbiAgICAgICAgaWYgKGRhdGFbM10gPiAwKSB7XHJcbiAgICAgICAgICBwYXJlbnRUZXh0dXJlQ2xvbmUuY29udGV4dC5nbG9iYWxBbHBoYSA9IDE7XHJcbiAgICAgICAgICBwYXJlbnRUZXh0dXJlQ2xvbmUuY29udGV4dC5maWxsU3R5bGUgPSBgcmdiYSgke2RhdGFbMF19LCAke2RhdGFbMV19LCAke2RhdGFbMl19LCAke2RhdGFbM10gLyAyNTV9KWA7XHJcbiAgICAgICAgICBwYXJlbnRUZXh0dXJlQ2xvbmUuY29udGV4dC5maWxsUmVjdCh4IC0gMSwgeSAtIDEsIHcgKyAyLCBoICsgMik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBzcHJpdGUgPSBwaGluYS5kaXNwbGF5LlNwcml0ZShjYW52YXMpO1xyXG4gICAgICBzcHJpdGUuc2V0T3JpZ2luKHRhcmdldC5vcmlnaW4ueCwgdGFyZ2V0Lm9yaWdpbi55KTtcclxuICAgICAgdGFyZ2V0LmFkZENoaWxkQXQoc3ByaXRlLCAwKTtcclxuICAgIH1cclxuICB9LFxyXG59KTtcclxuIiwicGhpbmEuZGVmaW5lKFwiR2F1Z2VcIiwge1xuICBzdXBlckNsYXNzOiBcIlJlY3RhbmdsZUNsaXBcIixcblxuICBfbWluOiAwLFxuICBfbWF4OiAxLjAsXG4gIF92YWx1ZTogMS4wLCAvL21pbiB+IG1heFxuXG4gIGRpcmVjdGlvbjogXCJob3Jpem9udGFsXCIsIC8vIGhvcml6b250YWwgb3IgdmVydGljYWxcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIHRoaXMub24oXCJhdHRhY2hlZFwiLCAoKSA9PiB7XG4gICAgICB0aGlzLl93aWR0aCA9IHRoaXMud2lkdGg7XG4gICAgICB0aGlzLl9oZWlnaHQgPSB0aGlzLndpZHRoO1xuXG4gICAgICB0aGlzLnRhcmdldC5hY2Nlc3NvcihcIkdhdWdlLm1pblwiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMubWluLFxuICAgICAgICBcInNldFwiOiAodikgPT4gdGhpcy5taW4gPSB2LFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiR2F1Z2UubWF4XCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy5tYXgsXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLm1heCA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJHYXVnZS52YWx1ZVwiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMudmFsdWUsXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLnZhbHVlID0gdixcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRhcmdldC5hY2Nlc3NvcihcIkdhdWdlLnByb2dyZXNzXCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy5wcm9ncmVzcyxcbiAgICAgICAgXCJzZXRcIjogKHYpID0+IHRoaXMucHJvZ3Jlc3MgPSB2LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX3JlZnJlc2g6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmRpcmVjdGlvbiAhPT0gXCJ2ZXJ0aWNhbFwiKSB7XG4gICAgICB0aGlzLndpZHRoID0gdGhpcy50YXJnZXQud2lkdGggKiB0aGlzLnByb2dyZXNzO1xuICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLnRhcmdldC5oZWlnaHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMud2lkdGggPSB0aGlzLnRhcmdldC53aWR0aDtcbiAgICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy50YXJnZXQuaGVpZ2h0ICogdGhpcy5wcm9ncmVzcztcbiAgICB9XG4gIH0sXG5cbiAgX2FjY2Vzc29yOiB7XG4gICAgcHJvZ3Jlc3M6IHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IHAgPSAodGhpcy52YWx1ZSAtIHRoaXMubWluKSAvICh0aGlzLm1heCAtIHRoaXMubWluKTtcbiAgICAgICAgcmV0dXJuIChpc05hTihwKSkgPyAwLjAgOiBwO1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24odikge1xuICAgICAgICB0aGlzLnZhbHVlID0gdGhpcy5tYXggKiB2O1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBtYXg6IHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9tYXg7XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHRoaXMuX21heCA9IHY7XG4gICAgICAgIHRoaXMuX3JlZnJlc2goKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgbWluOiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbWluO1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24odikge1xuICAgICAgICB0aGlzLl9taW4gPSB2O1xuICAgICAgICB0aGlzLl9yZWZyZXNoKCk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIHZhbHVlOiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fdmFsdWU7XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gdjtcbiAgICAgICAgdGhpcy5fcmVmcmVzaCgpO1xuICAgICAgfVxuICAgIH0sXG4gIH1cblxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJHcmF5c2NhbGVcIiwge1xuICBzdXBlckNsYXNzOiBcIkFjY2Vzc29yeVwiLFxuXG4gIGdyYXlUZXh0dXJlTmFtZTogbnVsbCxcblxuICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB0aGlzLm9uKFwiYXR0YWNoZWRcIiwgKCkgPT4ge1xuICAgICAgdGhpcy5ncmF5VGV4dHVyZU5hbWUgPSBvcHRpb25zLmdyYXlUZXh0dXJlTmFtZTtcbiAgICAgIHRoaXMubm9ybWFsID0gdGhpcy50YXJnZXQuaW1hZ2U7XG4gICAgfSk7XG4gIH0sXG5cbiAgdG9HcmF5c2NhbGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGFyZ2V0LmltYWdlID0gdGhpcy5ncmF5VGV4dHVyZU5hbWU7XG4gIH0sXG5cbiAgdG9Ob3JtYWw6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGFyZ2V0LmltYWdlID0gdGhpcy5ub3JtYWw7XG4gIH0sXG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuICAvL+ODnuOCpuOCuei/veW+k1xuICBwaGluYS5kZWZpbmUoXCJNb3VzZUNoYXNlclwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJBY2Nlc3NvcnlcIixcblxuICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB9LFxuXG4gICAgb25hdHRhY2hlZDogZnVuY3Rpb24oKSB7XG4gICAgICBsZXQgcHggPSAwO1xuICAgICAgbGV0IHB5ID0gMDtcbiAgICAgIGNvbnNvbGUubG9nKFwiI01vdXNlQ2hhc2VyXCIsIFwib25hdHRhY2hlZFwiKTtcbiAgICAgIHRoaXMudHdlZW5lciA9IFR3ZWVuZXIoKS5hdHRhY2hUbyh0aGlzLnRhcmdldCk7XG4gICAgICB0aGlzLnRhcmdldC5vbihcImVudGVyZnJhbWVcIiwgKGUpID0+IHtcbiAgICAgICAgY29uc3QgcCA9IGUuYXBwLnBvaW50ZXI7XG4gICAgICAgIGlmIChweSA9PSBwLnggJiYgcHkgPT0gcC55KSByZXR1cm47XG4gICAgICAgIHB4ID0gcC54O1xuICAgICAgICBweSA9IHAueTtcbiAgICAgICAgY29uc3QgeCA9IHAueCAtIFNDUkVFTl9XSURUSF9IQUxGO1xuICAgICAgICBjb25zdCB5ID0gcC55IC0gU0NSRUVOX0hFSUdIVF9IQUxGO1xuICAgICAgICB0aGlzLnR3ZWVuZXIuY2xlYXIoKS50byh7IHgsIHkgfSwgMjAwMCwgXCJlYXNlT3V0UXVhZFwiKVxuICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgb25kZXRhY2hlZDogZnVuY3Rpb24oKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIiNNb3VzZUNoYXNlclwiLCBcIm9uZGV0YWNoZWRcIik7XG4gICAgICB0aGlzLnR3ZWVuZXIucmVtb3ZlKCk7XG4gICAgfVxuXG4gIH0pO1xufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJNdWx0aVJlY3RhbmdsZUNsaXBcIiwge1xuICBzdXBlckNsYXNzOiBcIkFjY2Vzc29yeVwiLFxuXG4gIHg6IDAsXG4gIHk6IDAsXG4gIHdpZHRoOiAwLFxuICBoZWlnaHQ6IDAsXG5cbiAgX2VuYWJsZTogdHJ1ZSxcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIHRoaXMuX2luaXQoKTtcbiAgfSxcblxuICBfaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jbGlwUmVjdCA9IFtdO1xuXG4gICAgdGhpcy5vbihcImF0dGFjaGVkXCIsICgpID0+IHtcbiAgICAgIHRoaXMueCA9IDA7XG4gICAgICB0aGlzLnkgPSAwO1xuICAgICAgdGhpcy53aWR0aCA9IHRoaXMudGFyZ2V0LndpZHRoO1xuICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLnRhcmdldC5oZWlnaHQ7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmNsaXAgPSAoYykgPT4gdGhpcy5fY2xpcChjKTtcbiAgICB9KTtcbiAgfSxcblxuICBhZGRDbGlwUmVjdDogZnVuY3Rpb24ocmVjdCkge1xuICAgIGNvbnN0IHIgPSB7XG4gICAgICB4OiByZWN0LngsXG4gICAgICB5OiByZWN0LnksXG4gICAgICB3aWR0aDogcmVjdC53aWR0aCxcbiAgICAgIGhlaWdodDogcmVjdC5oZWlnaHQsXG4gICAgfTtcbiAgICB0aGlzLmNsaXBSZWN0LnB1c2gocik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgY2xlYXJDbGlwUmVjdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jbGlwUmVjdCA9IFtdO1xuICB9LFxuXG4gIF9jbGlwOiBmdW5jdGlvbihjYW52YXMpIHtcbiAgICBjYW52YXMuYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5jbGlwUmVjdC5mb3JFYWNoKHJlY3QgPT4ge1xuICAgICAgY2FudmFzLnJlY3QocmVjdC54LCByZWN0LnksIHJlY3Qud2lkdGgsIHJlY3QuaGVpZ2h0KVxuICAgIH0pO1xuICAgIGNhbnZhcy5jbG9zZVBhdGgoKTtcbiAgfSxcblxuICBzZXRFbmFibGU6IGZ1bmN0aW9uKGVuYWJsZSkge1xuICAgIHRoaXMuX2VuYWJsZSA9IGVuYWJsZTtcbiAgICBpZiAodGhpcy5fZW5hYmxlKSB7XG4gICAgICB0aGlzLnRhcmdldC5jbGlwID0gKGMpID0+IHRoaXMuX2NsaXAoYyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMudGFyZ2V0LmNsaXAgPSBudWxsO1xuICAgIH1cbiAgfSxcblxuICBfYWNjZXNzb3I6IHtcbiAgICBlbmFibGU6IHtcbiAgICAgIHNldDogZnVuY3Rpb24odikge1xuICAgICAgICB0aGlzLnNldEVuYWJsZSh2KTtcbiAgICAgIH0sXG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fZW5hYmxlO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwiUGllQ2xpcFwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJBY2Nlc3NvcnlcIixcblxuICAgIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSAoe30pLiRzYWZlKG9wdGlvbnMsIFBpZUNsaXAuZGVmYXVsdHMpXG4gICAgICB0aGlzLnN1cGVySW5pdChvcHRpb25zKTtcblxuICAgICAgdGhpcy5waXZvdFggPSBvcHRpb25zLnBpdm90WDtcbiAgICAgIHRoaXMucGl2b3RZID0gb3B0aW9ucy5waXZvdFk7XG4gICAgICB0aGlzLmFuZ2xlTWluID0gb3B0aW9ucy5hbmdsZU1pbjtcbiAgICAgIHRoaXMuYW5nbGVNYXggPSBvcHRpb25zLmFuZ2xlTWF4O1xuICAgICAgdGhpcy5yYWRpdXMgPSBvcHRpb25zLnJhZGl1cztcbiAgICAgIHRoaXMuYW50aWNsb2Nrd2lzZSA9IG9wdGlvbnMuYW50aWNsb2Nrd2lzZTtcbiAgICB9LFxuXG4gICAgb25hdHRhY2hlZDogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnRhcmdldC5jbGlwID0gKGNhbnZhcykgPT4ge1xuICAgICAgICBjb25zdCBhbmdsZU1pbiA9IHRoaXMuYW5nbGVNaW4gKiBNYXRoLkRFR19UT19SQUQ7XG4gICAgICAgIGNvbnN0IGFuZ2xlTWF4ID0gdGhpcy5hbmdsZU1heCAqIE1hdGguREVHX1RPX1JBRDtcbiAgICAgICAgY29uc3QgY3R4ID0gY2FudmFzLmNvbnRleHQ7XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4Lm1vdmVUbyh0aGlzLnBpdm90WCwgdGhpcy5waXZvdFkpO1xuICAgICAgICBjdHgubGluZVRvKHRoaXMucGl2b3RYICsgTWF0aC5jb3MoYW5nbGVNaW4pICogdGhpcy5yYWRpdXMsIHRoaXMucGl2b3RZICsgTWF0aC5zaW4oYW5nbGVNaW4pICogdGhpcy5yYWRpdXMpO1xuICAgICAgICBjdHguYXJjKHRoaXMucGl2b3RYLCB0aGlzLnBpdm90WSwgdGhpcy5yYWRpdXMsIGFuZ2xlTWluLCBhbmdsZU1heCwgdGhpcy5hbnRpY2xvY2t3aXNlKTtcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgICAgfTtcbiAgICB9LFxuXG4gICAgX3N0YXRpYzoge1xuICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgcGl2b3RYOiAzMixcbiAgICAgICAgcGl2b3RZOiAzMixcbiAgICAgICAgYW5nbGVNaW46IDAsXG4gICAgICAgIGFuZ2xlTWF4OiAzNjAsXG4gICAgICAgIHJhZGl1czogNjQsXG4gICAgICAgIGFudGljbG9ja3dpc2U6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9LFxuXG4gIH0pO1xufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJSZWN0YW5nbGVDbGlwXCIsIHtcbiAgc3VwZXJDbGFzczogXCJBY2Nlc3NvcnlcIixcblxuICB4OiAwLFxuICB5OiAwLFxuICB3aWR0aDogMCxcbiAgaGVpZ2h0OiAwLFxuXG4gIF9lbmFibGU6IHRydWUsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB0aGlzLl9pbml0KCk7XG4gIH0sXG5cbiAgX2luaXQ6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMub24oXCJhdHRhY2hlZFwiLCAoKSA9PiB7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiUmVjdGFuZ2xlQ2xpcC53aWR0aFwiLCB7XG4gICAgICAgIFwiZ2V0XCI6ICgpID0+IHRoaXMud2lkdGgsXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLndpZHRoID0gdixcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnRhcmdldC5hY2Nlc3NvcihcIlJlY3RhbmdsZUNsaXAuaGVpZ2h0XCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy5oZWlnaHQsXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLmhlaWdodCA9IHYsXG4gICAgICB9KTtcblxuICAgICAgdGhpcy50YXJnZXQuYWNjZXNzb3IoXCJSZWN0YW5nbGVDbGlwLnhcIiwge1xuICAgICAgICBcImdldFwiOiAoKSA9PiB0aGlzLngsXG4gICAgICAgIFwic2V0XCI6ICh2KSA9PiB0aGlzLnggPSB2LFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMudGFyZ2V0LmFjY2Vzc29yKFwiUmVjdGFuZ2xlQ2xpcC55XCIsIHtcbiAgICAgICAgXCJnZXRcIjogKCkgPT4gdGhpcy55LFxuICAgICAgICBcInNldFwiOiAodikgPT4gdGhpcy55ID0gdixcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnggPSAwO1xuICAgICAgdGhpcy55ID0gMDtcbiAgICAgIHRoaXMud2lkdGggPSB0aGlzLnRhcmdldC53aWR0aDtcbiAgICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy50YXJnZXQuaGVpZ2h0O1xuXG4gICAgICB0aGlzLnRhcmdldC5jbGlwID0gKGMpID0+IHRoaXMuX2NsaXAoYyk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX2NsaXA6IGZ1bmN0aW9uKGNhbnZhcykge1xuICAgIGNvbnN0IHggPSB0aGlzLnggLSAodGhpcy53aWR0aCAqIHRoaXMudGFyZ2V0Lm9yaWdpblgpO1xuICAgIGNvbnN0IHkgPSB0aGlzLnkgLSAodGhpcy5oZWlnaHQgKiB0aGlzLnRhcmdldC5vcmlnaW5ZKTtcblxuICAgIGNhbnZhcy5iZWdpblBhdGgoKTtcbiAgICBjYW52YXMucmVjdCh4LCB5LCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gICAgY2FudmFzLmNsb3NlUGF0aCgpO1xuICB9LFxuXG4gIHNldEVuYWJsZTogZnVuY3Rpb24oZW5hYmxlKSB7XG4gICAgdGhpcy5fZW5hYmxlID0gZW5hYmxlO1xuICAgIGlmICh0aGlzLl9lbmFibGUpIHtcbiAgICAgIHRoaXMudGFyZ2V0LmNsaXAgPSAoYykgPT4gdGhpcy5fY2xpcChjKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy50YXJnZXQuY2xpcCA9IG51bGw7XG4gICAgfVxuICB9LFxuXG4gIF9hY2Nlc3Nvcjoge1xuICAgIGVuYWJsZToge1xuICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHRoaXMuc2V0RW5hYmxlKHYpO1xuICAgICAgfSxcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9lbmFibGU7XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG59KTtcbiIsInBoaW5hLmRlZmluZShcIlRvZ2dsZVwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiQWNjZXNzb3J5XCIsXG5cbiAgaW5pdDogZnVuY3Rpb24oaXNPbikge1xuICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgdGhpcy5faW5pdChpc09uKTtcbiAgfSxcblxuICBfaW5pdDogZnVuY3Rpb24oaXNPbikge1xuICAgIHRoaXMuaXNPbiA9IGlzT24gfHwgZmFsc2U7XG4gIH0sXG5cbiAgc2V0U3RhdHVzOiBmdW5jdGlvbihzdGF0dXMpIHtcbiAgICB0aGlzLmlzT24gPSBzdGF0dXM7XG4gICAgdGhpcy50YXJnZXQuZmxhcmUoKHRoaXMuaXNPbikgPyBcInN3aXRjaE9uXCIgOiBcInN3aXRjaE9mZlwiKTtcbiAgfSxcblxuICBzd2l0Y2hPbjogZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuaXNPbikgcmV0dXJuO1xuICAgIHRoaXMuc2V0U3RhdHVzKHRydWUpO1xuICB9LFxuXG4gIHN3aXRjaE9mZjogZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmlzT24pIHJldHVybjtcbiAgICB0aGlzLnNldFN0YXR1cyhmYWxzZSk7XG4gIH0sXG5cbiAgc3dpdGNoOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlzT24gPSAhdGhpcy5pc09uO1xuICAgIHRoaXMuc2V0U3RhdHVzKHRoaXMuaXNPbik7XG4gIH0sXG5cbiAgX2FjY2Vzc29yOiB7XG4gICAgc3RhdHVzOiB7XG4gICAgICBcImdldFwiOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNPbjtcbiAgICAgIH0sXG4gICAgICBcInNldFwiOiBmdW5jdGlvbih2KSB7XG4gICAgICAgIHJldHVybiBzZXRTdGF0dXModik7XG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG5cbn0pO1xuIiwicGhpbmEuYXNzZXQuQXNzZXRMb2FkZXIucHJvdG90eXBlLmxvYWQgPSBmdW5jdGlvbihwYXJhbXMpIHtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gIGNvbnN0IGxvYWRBc3NldHMgPSBbXTtcbiAgY29uc3QgbWF4Q29ubmVjdGlvbkNvdW50ID0gMjtcbiAgbGV0IGNvdW50ZXIgPSAwO1xuICBsZXQgbGVuZ3RoID0gMDtcblxuICBwYXJhbXMuZm9ySW4oZnVuY3Rpb24odHlwZSwgYXNzZXRzKSB7XG4gICAgbGVuZ3RoICs9IE9iamVjdC5rZXlzKGFzc2V0cykubGVuZ3RoO1xuICB9KTtcblxuICBpZiAobGVuZ3RoID09IDApIHtcbiAgICByZXR1cm4gcGhpbmEudXRpbC5GbG93LnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgc2VsZi5mbGFyZSgnbG9hZCcpO1xuICAgIH0pO1xuICB9XG5cbiAgcGFyYW1zLmZvckluKGZ1bmN0aW9uKHR5cGUsIGFzc2V0cykge1xuICAgIGFzc2V0cy5mb3JJbihmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICBsb2FkQXNzZXRzLnB1c2goe1xuICAgICAgICBcImZ1bmNcIjogcGhpbmEuYXNzZXQuQXNzZXRMb2FkZXIuYXNzZXRMb2FkRnVuY3Rpb25zW3R5cGVdLFxuICAgICAgICBcImtleVwiOiBrZXksXG4gICAgICAgIFwidmFsdWVcIjogdmFsdWUsXG4gICAgICAgIFwidHlwZVwiOiB0eXBlLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGlmIChzZWxmLmNhY2hlKSB7XG4gICAgc2VsZi5vbigncHJvZ3Jlc3MnLCBmdW5jdGlvbihlKSB7XG4gICAgICBpZiAoZS5wcm9ncmVzcyA+PSAxLjApIHtcbiAgICAgICAgcGFyYW1zLmZvckluKGZ1bmN0aW9uKHR5cGUsIGFzc2V0cykge1xuICAgICAgICAgIGFzc2V0cy5mb3JJbihmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICAgICAgICBjb25zdCBhc3NldCA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQodHlwZSwga2V5KTtcbiAgICAgICAgICAgIGlmIChhc3NldC5sb2FkRXJyb3IpIHtcbiAgICAgICAgICAgICAgY29uc3QgZHVtbXkgPSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KHR5cGUsICdkdW1teScpO1xuICAgICAgICAgICAgICBpZiAoZHVtbXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoZHVtbXkubG9hZEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICBkdW1teS5sb2FkRHVtbXkoKTtcbiAgICAgICAgICAgICAgICAgIGR1bW15LmxvYWRFcnJvciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuc2V0KHR5cGUsIGtleSwgZHVtbXkpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFzc2V0LmxvYWREdW1teSgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgbG9hZEFzc2V0c0FycmF5ID0gW107XG5cbiAgd2hpbGUgKGxvYWRBc3NldHMubGVuZ3RoID4gMCkge1xuICAgIGxvYWRBc3NldHNBcnJheS5wdXNoKGxvYWRBc3NldHMuc3BsaWNlKDAsIG1heENvbm5lY3Rpb25Db3VudCkpO1xuICB9XG5cbiAgbGV0IGZsb3cgPSBwaGluYS51dGlsLkZsb3cucmVzb2x2ZSgpO1xuXG4gIGxvYWRBc3NldHNBcnJheS5mb3JFYWNoKGZ1bmN0aW9uKGxvYWRBc3NldHMpIHtcbiAgICBmbG93ID0gZmxvdy50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgZmxvd3MgPSBbXTtcbiAgICAgIGxvYWRBc3NldHMuZm9yRWFjaChmdW5jdGlvbihsb2FkQXNzZXQpIHtcbiAgICAgICAgY29uc3QgZiA9IGxvYWRBc3NldC5mdW5jKGxvYWRBc3NldC5rZXksIGxvYWRBc3NldC52YWx1ZSk7XG4gICAgICAgIGYudGhlbihmdW5jdGlvbihhc3NldCkge1xuICAgICAgICAgIGlmIChzZWxmLmNhY2hlKSB7XG4gICAgICAgICAgICBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuc2V0KGxvYWRBc3NldC50eXBlLCBsb2FkQXNzZXQua2V5LCBhc3NldCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNlbGYuZmxhcmUoJ3Byb2dyZXNzJywge1xuICAgICAgICAgICAga2V5OiBsb2FkQXNzZXQua2V5LFxuICAgICAgICAgICAgYXNzZXQ6IGFzc2V0LFxuICAgICAgICAgICAgcHJvZ3Jlc3M6ICgrK2NvdW50ZXIgLyBsZW5ndGgpLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgZmxvd3MucHVzaChmKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHBoaW5hLnV0aWwuRmxvdy5hbGwoZmxvd3MpO1xuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gZmxvdy50aGVuKGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICBzZWxmLmZsYXJlKCdsb2FkJyk7XG4gIH0pO1xufVxuIiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmFwcC5CYXNlQXBwLnByb3RvdHlwZS4kbWV0aG9kKFwicmVwbGFjZVNjZW5lXCIsIGZ1bmN0aW9uKHNjZW5lKSB7XG4gICAgdGhpcy5mbGFyZSgncmVwbGFjZScpO1xuICAgIHRoaXMuZmxhcmUoJ2NoYW5nZXNjZW5lJyk7XG5cbiAgICB3aGlsZSAodGhpcy5fc2NlbmVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IHNjZW5lID0gdGhpcy5fc2NlbmVzLnBvcCgpO1xuICAgICAgc2NlbmUuZmxhcmUoXCJkZXN0cm95XCIpO1xuICAgIH1cblxuICAgIHRoaXMuX3NjZW5lSW5kZXggPSAwO1xuXG4gICAgaWYgKHRoaXMuY3VycmVudFNjZW5lKSB7XG4gICAgICB0aGlzLmN1cnJlbnRTY2VuZS5hcHAgPSBudWxsO1xuICAgIH1cblxuICAgIHRoaXMuY3VycmVudFNjZW5lID0gc2NlbmU7XG4gICAgdGhpcy5jdXJyZW50U2NlbmUuYXBwID0gdGhpcztcbiAgICB0aGlzLmN1cnJlbnRTY2VuZS5mbGFyZSgnZW50ZXInLCB7XG4gICAgICBhcHA6IHRoaXMsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSk7XG5cbiAgcGhpbmEuYXBwLkJhc2VBcHAucHJvdG90eXBlLiRtZXRob2QoXCJwb3BTY2VuZVwiLCBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmZsYXJlKCdwb3AnKTtcbiAgICB0aGlzLmZsYXJlKCdjaGFuZ2VzY2VuZScpO1xuXG4gICAgY29uc3Qgc2NlbmUgPSB0aGlzLl9zY2VuZXMucG9wKCk7XG4gICAgdGhpcy5fc2NlbmVJbmRleC0tO1xuXG4gICAgc2NlbmUuZmxhcmUoJ2V4aXQnLCB7XG4gICAgICBhcHA6IHRoaXMsXG4gICAgfSk7XG4gICAgc2NlbmUuZmxhcmUoJ2Rlc3Ryb3knKTtcbiAgICBzY2VuZS5hcHAgPSBudWxsO1xuXG4gICAgdGhpcy5mbGFyZSgncG9wZWQnKTtcblxuICAgIC8vIFxuICAgIHRoaXMuY3VycmVudFNjZW5lLmZsYXJlKCdyZXN1bWUnLCB7XG4gICAgICBhcHA6IHRoaXMsXG4gICAgICBwcmV2U2NlbmU6IHNjZW5lLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHNjZW5lO1xuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZ3JhcGhpY3MuQ2FudmFzLnByb3RvdHlwZS4kbWV0aG9kKFwiaW5pdFwiLCBmdW5jdGlvbihjYW52YXMpIHtcbiAgICB0aGlzLmlzQ3JlYXRlQ2FudmFzID0gZmFsc2U7XG4gICAgaWYgKHR5cGVvZiBjYW52YXMgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0aGlzLmNhbnZhcyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoY2FudmFzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKGNhbnZhcykge1xuICAgICAgICB0aGlzLmNhbnZhcyA9IGNhbnZhcztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gICAgICAgIHRoaXMuaXNDcmVhdGVDYW52YXMgPSB0cnVlO1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnIyMjIyBjcmVhdGUgY2FudmFzICMjIyMnKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmRvbUVsZW1lbnQgPSB0aGlzLmNhbnZhcztcbiAgICB0aGlzLmNvbnRleHQgPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgIHRoaXMuY29udGV4dC5saW5lQ2FwID0gJ3JvdW5kJztcbiAgICB0aGlzLmNvbnRleHQubGluZUpvaW4gPSAncm91bmQnO1xuICB9KTtcblxuICBwaGluYS5ncmFwaGljcy5DYW52YXMucHJvdG90eXBlLiRtZXRob2QoJ2Rlc3Ryb3knLCBmdW5jdGlvbihjYW52YXMpIHtcbiAgICBpZiAoIXRoaXMuaXNDcmVhdGVDYW52YXMpIHJldHVybjtcbiAgICAvLyBjb25zb2xlLmxvZyhgIyMjIyBkZWxldGUgY2FudmFzICR7dGhpcy5jYW52YXMud2lkdGh9IHggJHt0aGlzLmNhbnZhcy5oZWlnaHR9ICMjIyNgKTtcbiAgICB0aGlzLnNldFNpemUoMCwgMCk7XG4gICAgZGVsZXRlIHRoaXMuY2FudmFzO1xuICAgIGRlbGV0ZSB0aGlzLmRvbUVsZW1lbnQ7XG4gIH0pO1xuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZSgoKSA9PiB7XG5cbiAgY29uc3QgcXVhbGl0eVNjYWxlID0gcGhpbmEuZ2VvbS5NYXRyaXgzMygpO1xuXG4gIHBoaW5hLmRpc3BsYXkuQ2FudmFzUmVuZGVyZXIucHJvdG90eXBlLiRtZXRob2QoXCJyZW5kZXJcIiwgZnVuY3Rpb24oc2NlbmUsIHF1YWxpdHkpIHtcbiAgICB0aGlzLmNhbnZhcy5jbGVhcigpO1xuICAgIGlmIChzY2VuZS5iYWNrZ3JvdW5kQ29sb3IpIHtcbiAgICAgIHRoaXMuY2FudmFzLmNsZWFyQ29sb3Ioc2NlbmUuYmFja2dyb3VuZENvbG9yKTtcbiAgICB9XG5cbiAgICB0aGlzLl9jb250ZXh0LnNhdmUoKTtcbiAgICB0aGlzLnJlbmRlckNoaWxkcmVuKHNjZW5lLCBxdWFsaXR5KTtcbiAgICB0aGlzLl9jb250ZXh0LnJlc3RvcmUoKTtcbiAgfSk7XG5cbiAgcGhpbmEuZGlzcGxheS5DYW52YXNSZW5kZXJlci5wcm90b3R5cGUuJG1ldGhvZChcInJlbmRlckNoaWxkcmVuXCIsIGZ1bmN0aW9uKG9iaiwgcXVhbGl0eSkge1xuICAgIC8vIOWtkOS+m+OBn+OBoeOCguWun+ihjFxuICAgIGlmIChvYmouY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgdGVtcENoaWxkcmVuID0gb2JqLmNoaWxkcmVuLnNsaWNlKCk7XG4gICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gdGVtcENoaWxkcmVuLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgIHRoaXMucmVuZGVyT2JqZWN0KHRlbXBDaGlsZHJlbltpXSwgcXVhbGl0eSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBwaGluYS5kaXNwbGF5LkNhbnZhc1JlbmRlcmVyLnByb3RvdHlwZS4kbWV0aG9kKFwicmVuZGVyT2JqZWN0XCIsIGZ1bmN0aW9uKG9iaiwgcXVhbGl0eSkge1xuICAgIGlmIChvYmoudmlzaWJsZSA9PT0gZmFsc2UgJiYgIW9iai5pbnRlcmFjdGl2ZSkgcmV0dXJuO1xuXG4gICAgb2JqLl9jYWxjV29ybGRNYXRyaXggJiYgb2JqLl9jYWxjV29ybGRNYXRyaXgoKTtcblxuICAgIGlmIChvYmoudmlzaWJsZSA9PT0gZmFsc2UpIHJldHVybjtcblxuICAgIG9iai5fY2FsY1dvcmxkQWxwaGEgJiYgb2JqLl9jYWxjV29ybGRBbHBoYSgpO1xuXG4gICAgY29uc3QgY29udGV4dCA9IHRoaXMuY2FudmFzLmNvbnRleHQ7XG5cbiAgICBjb250ZXh0Lmdsb2JhbEFscGhhID0gb2JqLl93b3JsZEFscGhhO1xuICAgIGNvbnRleHQuZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gb2JqLmJsZW5kTW9kZTtcblxuICAgIGlmIChvYmouX3dvcmxkTWF0cml4KSB7XG5cbiAgICAgIHF1YWxpdHlTY2FsZS5pZGVudGl0eSgpO1xuXG4gICAgICBxdWFsaXR5U2NhbGUubTAwID0gcXVhbGl0eSB8fCAxLjA7XG4gICAgICBxdWFsaXR5U2NhbGUubTExID0gcXVhbGl0eSB8fCAxLjA7XG5cbiAgICAgIGNvbnN0IG0gPSBxdWFsaXR5U2NhbGUubXVsdGlwbHkob2JqLl93b3JsZE1hdHJpeCk7XG4gICAgICBjb250ZXh0LnNldFRyYW5zZm9ybShtLm0wMCwgbS5tMTAsIG0ubTAxLCBtLm0xMSwgbS5tMDIsIG0ubTEyKTtcblxuICAgIH1cblxuICAgIGlmIChvYmouY2xpcCkge1xuXG4gICAgICBjb250ZXh0LnNhdmUoKTtcblxuICAgICAgb2JqLmNsaXAodGhpcy5jYW52YXMpO1xuICAgICAgY29udGV4dC5jbGlwKCk7XG5cbiAgICAgIGlmIChvYmouZHJhdykgb2JqLmRyYXcodGhpcy5jYW52YXMpO1xuXG4gICAgICAvLyDlrZDkvpvjgZ/jgaHjgoLlrp/ooYxcbiAgICAgIGlmIChvYmoucmVuZGVyQ2hpbGRCeVNlbGYgPT09IGZhbHNlICYmIG9iai5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IHRlbXBDaGlsZHJlbiA9IG9iai5jaGlsZHJlbi5zbGljZSgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMCwgbGVuID0gdGVtcENoaWxkcmVuLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgdGhpcy5yZW5kZXJPYmplY3QodGVtcENoaWxkcmVuW2ldLCBxdWFsaXR5KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb250ZXh0LnJlc3RvcmUoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9iai5kcmF3KSBvYmouZHJhdyh0aGlzLmNhbnZhcyk7XG5cbiAgICAgIC8vIOWtkOS+m+OBn+OBoeOCguWun+ihjFxuICAgICAgaWYgKG9iai5yZW5kZXJDaGlsZEJ5U2VsZiA9PT0gZmFsc2UgJiYgb2JqLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgdGVtcENoaWxkcmVuID0gb2JqLmNoaWxkcmVuLnNsaWNlKCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSB0ZW1wQ2hpbGRyZW4ubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICB0aGlzLnJlbmRlck9iamVjdCh0ZW1wQ2hpbGRyZW5baV0sIHF1YWxpdHkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICB9XG4gIH0pO1xuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZSgoKSA9PiB7XG4gIC8v44Om44O844K244O844Ko44O844K444Kn44Oz44OI44GL44KJ44OW44Op44Km44K244K/44Kk44OX44Gu5Yik5Yil44KS6KGM44GGXG4gIHBoaW5hLiRtZXRob2QoJ2NoZWNrQnJvd3NlcicsIGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IHJlc3VsdCA9IHt9O1xuICAgIGNvbnN0IGFnZW50ID0gd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKTs7XG5cbiAgICByZXN1bHQuaXNDaHJvbWUgPSAoYWdlbnQuaW5kZXhPZignY2hyb21lJykgIT09IC0xKSAmJiAoYWdlbnQuaW5kZXhPZignZWRnZScpID09PSAtMSkgJiYgKGFnZW50LmluZGV4T2YoJ29wcicpID09PSAtMSk7XG4gICAgcmVzdWx0LmlzRWRnZSA9IChhZ2VudC5pbmRleE9mKCdlZGdlJykgIT09IC0xKTtcbiAgICByZXN1bHQuaXNJZTExID0gKGFnZW50LmluZGV4T2YoJ3RyaWRlbnQvNycpICE9PSAtMSk7XG4gICAgcmVzdWx0LmlzRmlyZWZveCA9IChhZ2VudC5pbmRleE9mKCdmaXJlZm94JykgIT09IC0xKTtcbiAgICByZXN1bHQuaXNTYWZhcmkgPSAoYWdlbnQuaW5kZXhPZignc2FmYXJpJykgIT09IC0xKSAmJiAoYWdlbnQuaW5kZXhPZignY2hyb21lJykgPT09IC0xKTtcbiAgICByZXN1bHQuaXNFbGVjdHJvbiA9IChhZ2VudC5pbmRleE9mKCdlbGVjdHJvbicpICE9PSAtMSk7XG5cbiAgICByZXN1bHQuaXNXaW5kb3dzID0gKGFnZW50LmluZGV4T2YoJ3dpbmRvd3MnKSAhPT0gLTEpO1xuICAgIHJlc3VsdC5pc01hYyA9IChhZ2VudC5pbmRleE9mKCdtYWMgb3MgeCcpICE9PSAtMSk7XG5cbiAgICByZXN1bHQuaXNpUGFkID0gYWdlbnQuaW5kZXhPZignaXBhZCcpID4gLTEgfHwgdWEuaW5kZXhPZignbWFjaW50b3NoJykgPiAtMSAmJiAnb250b3VjaGVuZCcgaW4gZG9jdW1lbnQ7XG4gICAgcmVzdWx0LmlzaU9TID0gYWdlbnQuaW5kZXhPZignaXBob25lJykgPiAtMSB8fCB1YS5pbmRleE9mKCdpcGFkJykgPiAtMSB8fCB1YS5pbmRleE9mKCdtYWNpbnRvc2gnKSA+IC0xICYmICdvbnRvdWNoZW5kJyBpbiBkb2N1bWVudDtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0pO1xufSk7XG4iLCIvLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyAgRXh0ZW5zaW9uIHBoaW5hLmRpc3BsYXkuRGlzcGxheUVsZW1lbnRcbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbnBoaW5hLm5hbWVzcGFjZSgoKSA9PiB7XG4gIHBoaW5hLmRpc3BsYXkuRGlzcGxheUVsZW1lbnQucHJvdG90eXBlLiRtZXRob2QoXCJlbmFibGVcIiwgZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zaG93KCkud2FrZVVwKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0pO1xuXG4gIHBoaW5hLmRpc3BsYXkuRGlzcGxheUVsZW1lbnQucHJvdG90eXBlLiRtZXRob2QoXCJkaXNhYmxlXCIsIGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaGlkZSgpLnNsZWVwKCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0pO1xufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoKCkgPT4ge1xuICBwaGluYS5kaXNwbGF5LkRpc3BsYXlTY2VuZS5xdWFsaXR5ID0gMS4wO1xuICBwaGluYS5kaXNwbGF5LkRpc3BsYXlTY2VuZS5wcm90b3R5cGUuJG1ldGhvZChcImluaXRcIiwgZnVuY3Rpb24ocGFyYW1zKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICBjb25zdCBxdWFsaXR5ID0gcGhpbmEuZGlzcGxheS5EaXNwbGF5U2NlbmUucXVhbGl0eTtcblxuICAgIHBhcmFtcyA9ICh7fSkuJHNhZmUocGFyYW1zLCBwaGluYS5kaXNwbGF5LkRpc3BsYXlTY2VuZS5kZWZhdWx0cyk7XG4gICAgdGhpcy5jYW52YXMgPSBwaGluYS5ncmFwaGljcy5DYW52YXMoKTtcbiAgICB0aGlzLmNhbnZhcy5zZXRTaXplKHBhcmFtcy53aWR0aCAqIHF1YWxpdHksIHBhcmFtcy5oZWlnaHQgKiBxdWFsaXR5KTtcbiAgICB0aGlzLnJlbmRlcmVyID0gcGhpbmEuZGlzcGxheS5DYW52YXNSZW5kZXJlcih0aGlzLmNhbnZhcyk7XG4gICAgdGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSAocGFyYW1zLmJhY2tncm91bmRDb2xvcikgPyBwYXJhbXMuYmFja2dyb3VuZENvbG9yIDogbnVsbDtcblxuICAgIHRoaXMud2lkdGggPSBwYXJhbXMud2lkdGg7XG4gICAgdGhpcy5oZWlnaHQgPSBwYXJhbXMuaGVpZ2h0O1xuICAgIHRoaXMuZ3JpZFggPSBwaGluYS51dGlsLkdyaWQocGFyYW1zLndpZHRoLCAxNik7XG4gICAgdGhpcy5ncmlkWSA9IHBoaW5hLnV0aWwuR3JpZChwYXJhbXMuaGVpZ2h0LCAxNik7XG5cbiAgICB0aGlzLmludGVyYWN0aXZlID0gdHJ1ZTtcbiAgICB0aGlzLnNldEludGVyYWN0aXZlID0gZnVuY3Rpb24oZmxhZykge1xuICAgICAgdGhpcy5pbnRlcmFjdGl2ZSA9IGZsYWc7XG4gICAgfTtcbiAgICB0aGlzLl9vdmVyRmxhZ3MgPSB7fTtcbiAgICB0aGlzLl90b3VjaEZsYWdzID0ge307XG4gIH0pO1xuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcclxuXHJcbiAgLy8gYXVkaW/opoHntKDjgafpn7Plo7DjgpLlho3nlJ/jgZnjgovjgILkuLvjgatJReeUqFxyXG4gIHBoaW5hLmRlZmluZShcInBoaW5hLmFzc2V0LkRvbUF1ZGlvU291bmRcIiwge1xyXG4gICAgc3VwZXJDbGFzczogXCJwaGluYS5hc3NldC5Bc3NldFwiLFxyXG5cclxuICAgIGRvbUVsZW1lbnQ6IG51bGwsXHJcbiAgICBlbXB0eVNvdW5kOiBmYWxzZSxcclxuXHJcbiAgICBpbml0OiBmdW5jdGlvbigpIHtcclxuICAgICAgdGhpcy5zdXBlckluaXQoKTtcclxuICAgIH0sXHJcblxyXG4gICAgX2xvYWQ6IGZ1bmN0aW9uKHJlc29sdmUpIHtcclxuICAgICAgdGhpcy5kb21FbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImF1ZGlvXCIpO1xyXG4gICAgICBpZiAodGhpcy5kb21FbGVtZW50LmNhblBsYXlUeXBlKFwiYXVkaW8vbXBlZ1wiKSkge1xyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gcmVhZHlzdGF0ZUNoZWNrKCkge1xyXG4gICAgICAgICAgaWYgKHRoaXMuZG9tRWxlbWVudC5yZWFkeVN0YXRlIDwgNCkge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHJlYWR5c3RhdGVDaGVjay5iaW5kKHRoaXMpLCAxMCk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmVtcHR5U291bmQgPSBmYWxzZTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJlbmQgbG9hZCBcIiwgdGhpcy5zcmMpO1xyXG4gICAgICAgICAgICByZXNvbHZlKHRoaXMpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfS5iaW5kKHRoaXMpLCAxMCk7XHJcbiAgICAgICAgdGhpcy5kb21FbGVtZW50Lm9uZXJyb3IgPSBmdW5jdGlvbihlKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKFwi44Kq44O844OH44Kj44Kq44Gu44Ot44O844OJ44Gr5aSx5pWXXCIsIGUpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LnNyYyA9IHRoaXMuc3JjO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiYmVnaW4gbG9hZCBcIiwgdGhpcy5zcmMpO1xyXG4gICAgICAgIHRoaXMuZG9tRWxlbWVudC5sb2FkKCk7XHJcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LmF1dG9wbGF5ID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5kb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJlbmRlZFwiLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIHRoaXMuZmxhcmUoXCJlbmRlZFwiKTtcclxuICAgICAgICB9LmJpbmQodGhpcykpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwibXAz44Gv5YaN55Sf44Gn44GN44G+44Gb44KTXCIpO1xyXG4gICAgICAgIHRoaXMuZW1wdHlTb3VuZCA9IHRydWU7XHJcbiAgICAgICAgcmVzb2x2ZSh0aGlzKTtcclxuICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBwbGF5OiBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKHRoaXMuZW1wdHlTb3VuZCkgcmV0dXJuO1xyXG4gICAgICB0aGlzLmRvbUVsZW1lbnQucGF1c2UoKTtcclxuICAgICAgdGhpcy5kb21FbGVtZW50LmN1cnJlbnRUaW1lID0gMDtcclxuICAgICAgdGhpcy5kb21FbGVtZW50LnBsYXkoKTtcclxuICAgIH0sXHJcblxyXG4gICAgc3RvcDogZnVuY3Rpb24oKSB7XHJcbiAgICAgIGlmICh0aGlzLmVtcHR5U291bmQpIHJldHVybjtcclxuICAgICAgdGhpcy5kb21FbGVtZW50LnBhdXNlKCk7XHJcbiAgICAgIHRoaXMuZG9tRWxlbWVudC5jdXJyZW50VGltZSA9IDA7XHJcbiAgICB9LFxyXG5cclxuICAgIHBhdXNlOiBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKHRoaXMuZW1wdHlTb3VuZCkgcmV0dXJuO1xyXG4gICAgICB0aGlzLmRvbUVsZW1lbnQucGF1c2UoKTtcclxuICAgIH0sXHJcblxyXG4gICAgcmVzdW1lOiBmdW5jdGlvbigpIHtcclxuICAgICAgaWYgKHRoaXMuZW1wdHlTb3VuZCkgcmV0dXJuO1xyXG4gICAgICB0aGlzLmRvbUVsZW1lbnQucGxheSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBzZXRMb29wOiBmdW5jdGlvbih2KSB7XHJcbiAgICAgIGlmICh0aGlzLmVtcHR5U291bmQpIHJldHVybjtcclxuICAgICAgdGhpcy5kb21FbGVtZW50Lmxvb3AgPSB2O1xyXG4gICAgfSxcclxuXHJcbiAgICBfYWNjZXNzb3I6IHtcclxuICAgICAgdm9sdW1lOiB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGlmICh0aGlzLmVtcHR5U291bmQpIHJldHVybiAwO1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuZG9tRWxlbWVudC52b2x1bWU7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcclxuICAgICAgICAgIGlmICh0aGlzLmVtcHR5U291bmQpIHJldHVybjtcclxuICAgICAgICAgIHRoaXMuZG9tRWxlbWVudC52b2x1bWUgPSB2O1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGxvb3A6IHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgaWYgKHRoaXMuZW1wdHlTb3VuZCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuZG9tRWxlbWVudC5sb29wO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2KSB7XHJcbiAgICAgICAgICBpZiAodGhpcy5lbXB0eVNvdW5kKSByZXR1cm47XHJcbiAgICAgICAgICB0aGlzLnNldExvb3Aodik7XHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuXHJcbiAgICB9LFxyXG4gIH0pO1xyXG5cclxuICAvLyBJRTEx44Gu5aC05ZCI44Gu44G/6Z+z5aOw44Ki44K744OD44OI44GvRG9tQXVkaW9Tb3VuZOOBp+WGjeeUn+OBmeOCi1xyXG4gIGNvbnN0IHVhID0gd2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKTtcclxuICBpZiAodWEuaW5kZXhPZigndHJpZGVudC83JykgIT09IC0xKSB7XHJcbiAgICBwaGluYS5hc3NldC5Bc3NldExvYWRlci5yZWdpc3RlcihcInNvdW5kXCIsIGZ1bmN0aW9uKGtleSwgcGF0aCkge1xyXG4gICAgICBjb25zdCBhc3NldCA9IHBoaW5hLmFzc2V0LkRvbUF1ZGlvU291bmQoKTtcclxuICAgICAgcmV0dXJuIGFzc2V0LmxvYWQocGF0aCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG59KTtcclxuIiwicGhpbmEubmFtZXNwYWNlKCgpID0+IHtcblxuICBwaGluYS5hcHAuRWxlbWVudC5wcm90b3R5cGUuJG1ldGhvZChcImZpbmRCeUlkXCIsIGZ1bmN0aW9uKGlkKSB7XG4gICAgaWYgKHRoaXMuaWQgPT09IGlkKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0aGlzLmNoaWxkcmVuW2ldLmZpbmRCeUlkKGlkKSkge1xuICAgICAgICAgIHJldHVybiB0aGlzLmNoaWxkcmVuW2ldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH0pO1xuXG4gIC8v5oyH5a6a44GV44KM44Gf5a2Q44Kq44OW44K444Kn44Kv44OI44KS5pyA5YmN6Z2i44Gr56e75YuV44GZ44KLXG4gIHBoaW5hLmFwcC5FbGVtZW50LnByb3RvdHlwZS4kbWV0aG9kKFwibW92ZUZyb250XCIsIGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodGhpcy5jaGlsZHJlbltpXSA9PSBjaGlsZCkge1xuICAgICAgICB0aGlzLmNoaWxkcmVuLnNwbGljZShpLCAxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuY2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0pO1xuXG4gIHBoaW5hLmFwcC5FbGVtZW50LnByb3RvdHlwZS4kbWV0aG9kKFwiZGVzdHJveUNoaWxkXCIsIGZ1bmN0aW9uKCkge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgdGhpcy5jaGlsZHJlbltpXS5mbGFyZSgnZGVzdHJveScpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKCgpID0+IHtcblxuICBwaGluYS5pbnB1dC5JbnB1dC5xdWFsaXR5ID0gMS4wO1xuXG4gIHBoaW5hLmlucHV0LklucHV0LnByb3RvdHlwZS4kbWV0aG9kKFwiX21vdmVcIiwgZnVuY3Rpb24oeCwgeSkge1xuICAgIHRoaXMuX3RlbXBQb3NpdGlvbi54ID0geDtcbiAgICB0aGlzLl90ZW1wUG9zaXRpb24ueSA9IHk7XG5cbiAgICAvLyBhZGp1c3Qgc2NhbGVcbiAgICBjb25zdCBlbG0gPSB0aGlzLmRvbUVsZW1lbnQ7XG4gICAgY29uc3QgcmVjdCA9IGVsbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcblxuICAgIGNvbnN0IHcgPSBlbG0ud2lkdGggLyBwaGluYS5pbnB1dC5JbnB1dC5xdWFsaXR5O1xuICAgIGNvbnN0IGggPSBlbG0uaGVpZ2h0IC8gcGhpbmEuaW5wdXQuSW5wdXQucXVhbGl0eTtcblxuICAgIGlmIChyZWN0LndpZHRoKSB7XG4gICAgICB0aGlzLl90ZW1wUG9zaXRpb24ueCAqPSB3IC8gcmVjdC53aWR0aDtcbiAgICB9XG5cbiAgICBpZiAocmVjdC5oZWlnaHQpIHtcbiAgICAgIHRoaXMuX3RlbXBQb3NpdGlvbi55ICo9IGggLyByZWN0LmhlaWdodDtcbiAgICB9XG5cbiAgfSk7XG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKCgpID0+IHtcbiAgcGhpbmEuZGlzcGxheS5MYWJlbC5wcm90b3R5cGUuJG1ldGhvZChcImluaXRcIiwgZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIGlmICh0eXBlb2YgYXJndW1lbnRzWzBdICE9PSAnb2JqZWN0Jykge1xuICAgICAgb3B0aW9ucyA9IHsgdGV4dDogYXJndW1lbnRzWzBdLCB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBvcHRpb25zID0gYXJndW1lbnRzWzBdO1xuICAgIH1cblxuICAgIG9wdGlvbnMgPSAoe30pLiRzYWZlKG9wdGlvbnMsIHBoaW5hLmRpc3BsYXkuTGFiZWwuZGVmYXVsdHMpO1xuICAgIHRoaXMuc3VwZXJJbml0KG9wdGlvbnMpO1xuXG4gICAgdGhpcy50ZXh0ID0gKG9wdGlvbnMudGV4dCkgPyBvcHRpb25zLnRleHQgOiBcIlwiO1xuICAgIHRoaXMuZm9udFNpemUgPSBvcHRpb25zLmZvbnRTaXplO1xuICAgIHRoaXMuZm9udFdlaWdodCA9IG9wdGlvbnMuZm9udFdlaWdodDtcbiAgICB0aGlzLmZvbnRGYW1pbHkgPSBvcHRpb25zLmZvbnRGYW1pbHk7XG4gICAgdGhpcy5hbGlnbiA9IG9wdGlvbnMuYWxpZ247XG4gICAgdGhpcy5iYXNlbGluZSA9IG9wdGlvbnMuYmFzZWxpbmU7XG4gICAgdGhpcy5saW5lSGVpZ2h0ID0gb3B0aW9ucy5saW5lSGVpZ2h0O1xuICB9KTtcblxufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoKCkgPT4ge1xuICBwaGluYS5pbnB1dC5Nb3VzZS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uKGRvbUVsZW1lbnQpIHtcbiAgICB0aGlzLnN1cGVySW5pdChkb21FbGVtZW50KTtcblxuICAgIHRoaXMuaWQgPSAwO1xuXG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5kb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgIHNlbGYuX3N0YXJ0KGUucG9pbnRYLCBlLnBvaW50WSwgMSA8PCBlLmJ1dHRvbik7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5kb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNldXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICBzZWxmLl9lbmQoMSA8PCBlLmJ1dHRvbik7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH0pO1xuICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBmdW5jdGlvbihlKSB7XG4gICAgICBzZWxmLl9tb3ZlKGUucG9pbnRYLCBlLnBvaW50WSk7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH0pO1xuXG4gICAgLy8g44Oe44Km44K544GM44Kt44Oj44Oz44OQ44K56KaB57Sg44Gu5aSW44Gr5Ye644Gf5aC05ZCI44Gu5a++5b+cXG4gICAgdGhpcy5kb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3V0JywgZnVuY3Rpb24oZSkge1xuICAgICAgc2VsZi5fZW5kKDEpO1xuICAgIH0pO1xuICB9XG59KTtcbiIsIi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vICBFeHRlbnNpb24gcGhpbmEuYXBwLk9iamVjdDJEXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbnBoaW5hLm5hbWVzcGFjZSgoKSA9PiB7XG4gIHBoaW5hLmFwcC5PYmplY3QyRC5wcm90b3R5cGUuJG1ldGhvZChcInNldE9yaWdpblwiLCBmdW5jdGlvbih4LCB5LCByZXBvc2l0aW9uKSB7XG4gICAgaWYgKCFyZXBvc2l0aW9uKSB7XG4gICAgICB0aGlzLm9yaWdpbi54ID0geDtcbiAgICAgIHRoaXMub3JpZ2luLnkgPSB5O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy/lpInmm7TjgZXjgozjgZ/ln7rmupbngrnjgavnp7vli5XjgZXjgZvjgotcbiAgICBjb25zdCBfb3JpZ2luWCA9IHRoaXMub3JpZ2luWDtcbiAgICBjb25zdCBfb3JpZ2luWSA9IHRoaXMub3JpZ2luWTtcbiAgICBjb25zdCBfYWRkWCA9ICh4IC0gX29yaWdpblgpICogdGhpcy53aWR0aDtcbiAgICBjb25zdCBfYWRkWSA9ICh5IC0gX29yaWdpblkpICogdGhpcy5oZWlnaHQ7XG5cbiAgICB0aGlzLnggKz0gX2FkZFg7XG4gICAgdGhpcy55ICs9IF9hZGRZO1xuICAgIHRoaXMub3JpZ2luWCA9IHg7XG4gICAgdGhpcy5vcmlnaW5ZID0geTtcblxuICAgIHRoaXMuY2hpbGRyZW4uZm9yRWFjaChjaGlsZCA9PiB7XG4gICAgICBjaGlsZC54IC09IF9hZGRYO1xuICAgICAgY2hpbGQueSAtPSBfYWRkWTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSk7XG5cbiAgcGhpbmEuYXBwLk9iamVjdDJELnByb3RvdHlwZS4kbWV0aG9kKFwiaGl0VGVzdEVsZW1lbnRcIiwgZnVuY3Rpb24oZWxtKSB7XG4gICAgY29uc3QgcmVjdDAgPSB0aGlzLmNhbGNHbG9iYWxSZWN0KCk7XG4gICAgY29uc3QgcmVjdDEgPSBlbG0uY2FsY0dsb2JhbFJlY3QoKTtcbiAgICByZXR1cm4gKHJlY3QwLmxlZnQgPCByZWN0MS5yaWdodCkgJiYgKHJlY3QwLnJpZ2h0ID4gcmVjdDEubGVmdCkgJiZcbiAgICAgIChyZWN0MC50b3AgPCByZWN0MS5ib3R0b20pICYmIChyZWN0MC5ib3R0b20gPiByZWN0MS50b3ApO1xuICB9KTtcblxuICBwaGluYS5hcHAuT2JqZWN0MkQucHJvdG90eXBlLiRtZXRob2QoXCJpbmNsdWRlRWxlbWVudFwiLCBmdW5jdGlvbihlbG0pIHtcbiAgICBjb25zdCByZWN0MCA9IHRoaXMuY2FsY0dsb2JhbFJlY3QoKTtcbiAgICBjb25zdCByZWN0MSA9IGVsbS5jYWxjR2xvYmFsUmVjdCgpO1xuICAgIHJldHVybiAocmVjdDAubGVmdCA8PSByZWN0MS5sZWZ0KSAmJiAocmVjdDAucmlnaHQgPj0gcmVjdDEucmlnaHQpICYmXG4gICAgICAocmVjdDAudG9wIDw9IHJlY3QxLnRvcCkgJiYgKHJlY3QwLmJvdHRvbSA+PSByZWN0MS5ib3R0b20pO1xuICB9KTtcblxuICBwaGluYS5hcHAuT2JqZWN0MkQucHJvdG90eXBlLiRtZXRob2QoXCJjYWxjR2xvYmFsUmVjdFwiLCBmdW5jdGlvbigpIHtcbiAgICBjb25zdCBsZWZ0ID0gdGhpcy5fd29ybGRNYXRyaXgubTAyIC0gdGhpcy5vcmlnaW5YICogdGhpcy53aWR0aDtcbiAgICBjb25zdCB0b3AgPSB0aGlzLl93b3JsZE1hdHJpeC5tMTIgLSB0aGlzLm9yaWdpblkgKiB0aGlzLmhlaWdodDtcbiAgICByZXR1cm4gUmVjdChsZWZ0LCB0b3AsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KTtcbiAgfSk7XG5cbiAgcGhpbmEuYXBwLk9iamVjdDJELnByb3RvdHlwZS4kbWV0aG9kKFwiY2FsY0dsb2JhbFJlY3RcIiwgZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgbGVmdCA9IHRoaXMuX3dvcmxkTWF0cml4Lm0wMiAtIHRoaXMub3JpZ2luWCAqIHRoaXMud2lkdGg7XG4gICAgY29uc3QgdG9wID0gdGhpcy5fd29ybGRNYXRyaXgubTEyIC0gdGhpcy5vcmlnaW5ZICogdGhpcy5oZWlnaHQ7XG4gICAgcmV0dXJuIFJlY3QobGVmdCwgdG9wLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCk7XG4gIH0pO1xuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5kaXNwbGF5LlBsYWluRWxlbWVudC5wcm90b3R5cGUuJG1ldGhvZChcImRlc3Ryb3lDYW52YXNcIiwgZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmNhbnZhcykgcmV0dXJuO1xuICAgIHRoaXMuY2FudmFzLmRlc3Ryb3koKTtcbiAgICBkZWxldGUgdGhpcy5jYW52YXM7XG4gIH0pO1xuXG59KTtcbiIsIi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vICBFeHRlbnNpb24gcGhpbmEuZGlzcGxheS5TaGFwZVxuLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxucGhpbmEuZGlzcGxheS5TaGFwZS5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oY2FudmFzKSB7XG4gIGlmICghY2FudmFzKSB7XG4gICAgY29uc29sZS5sb2coXCJjYW52YXMgbnVsbFwiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY29udGV4dCA9IGNhbnZhcy5jb250ZXh0O1xuICAvLyDjg6rjgrXjgqTjgrpcbiAgY29uc3Qgc2l6ZSA9IHRoaXMuY2FsY0NhbnZhc1NpemUoKTtcbiAgY2FudmFzLnNldFNpemUoc2l6ZS53aWR0aCwgc2l6ZS5oZWlnaHQpO1xuICAvLyDjgq/jg6rjgqLjgqvjg6njg7xcbiAgY2FudmFzLmNsZWFyQ29sb3IodGhpcy5iYWNrZ3JvdW5kQ29sb3IpO1xuICAvLyDkuK3lv4PjgavluqfmqJnjgpLnp7vli5VcbiAgY2FudmFzLnRyYW5zZm9ybUNlbnRlcigpO1xuXG4gIC8vIOaPj+eUu+WJjeWHpueQhlxuICB0aGlzLnByZXJlbmRlcih0aGlzLmNhbnZhcyk7XG5cbiAgLy8g44K544OI44Ot44O844Kv5o+P55S7XG4gIGlmICh0aGlzLmlzU3Ryb2thYmxlKCkpIHtcbiAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gdGhpcy5zdHJva2U7XG4gICAgY29udGV4dC5saW5lV2lkdGggPSB0aGlzLnN0cm9rZVdpZHRoO1xuICAgIGNvbnRleHQubGluZUpvaW4gPSBcInJvdW5kXCI7XG4gICAgY29udGV4dC5zaGFkb3dCbHVyID0gMDtcbiAgICB0aGlzLnJlbmRlclN0cm9rZShjYW52YXMpO1xuICB9XG5cbiAgLy8g5aGX44KK44Gk44G244GX5o+P55S7XG4gIGlmICh0aGlzLmZpbGwpIHtcbiAgICBjb250ZXh0LmZpbGxTdHlsZSA9IHRoaXMuZmlsbDtcbiAgICAvLyBzaGFkb3cg44GuIG9uL29mZlxuICAgIGlmICh0aGlzLnNoYWRvdykge1xuICAgICAgY29udGV4dC5zaGFkb3dDb2xvciA9IHRoaXMuc2hhZG93O1xuICAgICAgY29udGV4dC5zaGFkb3dCbHVyID0gdGhpcy5zaGFkb3dCbHVyO1xuICAgICAgY29udGV4dC5zaGFkb3dPZmZzZXRYID0gdGhpcy5zaGFkb3dPZmZzZXRYIHx8IDA7XG4gICAgICBjb250ZXh0LnNoYWRvd09mZnNldFkgPSB0aGlzLnNoYWRvd09mZnNldFkgfHwgMDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29udGV4dC5zaGFkb3dCbHVyID0gMDtcbiAgICB9XG4gICAgdGhpcy5yZW5kZXJGaWxsKGNhbnZhcyk7XG4gIH1cblxuICAvLyDmj4/nlLvlvozlh6bnkIZcbiAgdGhpcy5wb3N0cmVuZGVyKHRoaXMuY2FudmFzKTtcblxuICByZXR1cm4gdGhpcztcbn07XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuYXNzZXQuU291bmQucHJvdG90eXBlLiRtZXRob2QoXCJfbG9hZFwiLCBmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgaWYgKC9eZGF0YTovLnRlc3QodGhpcy5zcmMpKSB7XG4gICAgICB0aGlzLl9sb2FkRnJvbVVSSVNjaGVtZShyZXNvbHZlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbG9hZEZyb21GaWxlKHJlc29sdmUpO1xuICAgIH1cbiAgfSk7XG5cbiAgcGhpbmEuYXNzZXQuU291bmQucHJvdG90eXBlLiRtZXRob2QoXCJfbG9hZEZyb21GaWxlXCIsIGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzLnNyYyk7XG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgY29uc3QgeG1sID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgeG1sLm9wZW4oJ0dFVCcsIHRoaXMuc3JjKTtcbiAgICB4bWwub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoeG1sLnJlYWR5U3RhdGUgPT09IDQpIHtcbiAgICAgICAgaWYgKFsyMDAsIDIwMSwgMF0uaW5kZXhPZih4bWwuc3RhdHVzKSAhPT0gLTEpIHtcbiAgICAgICAgICAvLyDpn7Pmpb3jg5DjgqTjg4rjg6rjg7zjg4fjg7zjgr9cbiAgICAgICAgICBjb25zdCBkYXRhID0geG1sLnJlc3BvbnNlO1xuICAgICAgICAgIC8vIHdlYmF1ZGlvIOeUqOOBq+WkieaPm1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGRhdGEpXG4gICAgICAgICAgc2VsZi5jb250ZXh0LmRlY29kZUF1ZGlvRGF0YShkYXRhLCBmdW5jdGlvbihidWZmZXIpIHtcbiAgICAgICAgICAgIHNlbGYubG9hZEZyb21CdWZmZXIoYnVmZmVyKTtcbiAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XG4gICAgICAgICAgfSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oXCLpn7Plo7Djg5XjgqHjgqTjg6vjga7jg4fjgrPjg7zjg4njgavlpLHmlZfjgZfjgb7jgZfjgZ/jgIIoXCIgKyBzZWxmLnNyYyArIFwiKVwiKTtcbiAgICAgICAgICAgIHJlc29sdmUoc2VsZik7XG4gICAgICAgICAgICBzZWxmLmZsYXJlKCdkZWNvZGVlcnJvcicpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHhtbC5zdGF0dXMgPT09IDQwNCkge1xuICAgICAgICAgIC8vIG5vdCBmb3VuZFxuICAgICAgICAgIHNlbGYubG9hZEVycm9yID0gdHJ1ZTtcbiAgICAgICAgICBzZWxmLm5vdEZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICByZXNvbHZlKHNlbGYpO1xuICAgICAgICAgIHNlbGYuZmxhcmUoJ2xvYWRlcnJvcicpO1xuICAgICAgICAgIHNlbGYuZmxhcmUoJ25vdGZvdW5kJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8g44K144O844OQ44O844Ko44Op44O8XG4gICAgICAgICAgc2VsZi5sb2FkRXJyb3IgPSB0cnVlO1xuICAgICAgICAgIHNlbGYuc2VydmVyRXJyb3IgPSB0cnVlO1xuICAgICAgICAgIHJlc29sdmUoc2VsZik7XG4gICAgICAgICAgc2VsZi5mbGFyZSgnbG9hZGVycm9yJyk7XG4gICAgICAgICAgc2VsZi5mbGFyZSgnc2VydmVyZXJyb3InKTtcbiAgICAgICAgfVxuICAgICAgICB4bWwub25yZWFkeXN0YXRlY2hhbmdlID0gbnVsbDtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgeG1sLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG5cbiAgICB4bWwuc2VuZChudWxsKTtcbiAgfSk7XG5cbiAgcGhpbmEuYXNzZXQuU291bmQucHJvdG90eXBlLiRtZXRob2QoXCJwbGF5XCIsIGZ1bmN0aW9uKHdoZW4sIG9mZnNldCwgZHVyYXRpb24pIHtcbiAgICB3aGVuID0gd2hlbiA/IHdoZW4gKyB0aGlzLmNvbnRleHQuY3VycmVudFRpbWUgOiAwO1xuICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuXG4gICAgY29uc3Qgc291cmNlID0gdGhpcy5zb3VyY2UgPSB0aGlzLmNvbnRleHQuY3JlYXRlQnVmZmVyU291cmNlKCk7XG4gICAgY29uc3QgYnVmZmVyID0gc291cmNlLmJ1ZmZlciA9IHRoaXMuYnVmZmVyO1xuICAgIHNvdXJjZS5sb29wID0gdGhpcy5fbG9vcDtcbiAgICBzb3VyY2UubG9vcFN0YXJ0ID0gdGhpcy5fbG9vcFN0YXJ0O1xuICAgIHNvdXJjZS5sb29wRW5kID0gdGhpcy5fbG9vcEVuZDtcbiAgICBzb3VyY2UucGxheWJhY2tSYXRlLnZhbHVlID0gdGhpcy5fcGxheWJhY2tSYXRlO1xuXG4gICAgLy8gY29ubmVjdFxuICAgIHNvdXJjZS5jb25uZWN0KHRoaXMuZ2Fpbk5vZGUpO1xuICAgIHRoaXMuZ2Fpbk5vZGUuY29ubmVjdChwaGluYS5hc3NldC5Tb3VuZC5nZXRNYXN0ZXJHYWluKCkpO1xuICAgIC8vIHBsYXlcbiAgICBpZiAoZHVyYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgc291cmNlLnN0YXJ0KHdoZW4sIG9mZnNldCwgZHVyYXRpb24pO1xuICAgIH0gZWxzZSB7XG4gICAgICBzb3VyY2Uuc3RhcnQod2hlbiwgb2Zmc2V0KTtcbiAgICB9XG5cbiAgICBzb3VyY2Uub25lbmRlZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCFzb3VyY2UpIHtcbiAgICAgICAgdGhpcy5mbGFyZSgnZW5kZWQnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgc291cmNlLm9uZW5kZWQgPSBudWxsO1xuICAgICAgc291cmNlLmRpc2Nvbm5lY3QoKTtcbiAgICAgIHNvdXJjZS5idWZmZXIgPSBudWxsO1xuICAgICAgc291cmNlID0gbnVsbDtcbiAgICAgIHRoaXMuZmxhcmUoJ2VuZGVkJyk7XG4gICAgfS5iaW5kKHRoaXMpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH0pO1xuXG4gIHBoaW5hLmFzc2V0LlNvdW5kLnByb3RvdHlwZS4kbWV0aG9kKFwic3RvcFwiLCBmdW5jdGlvbigpIHtcbiAgICAvLyBzdG9wXG4gICAgaWYgKHRoaXMuc291cmNlKSB7XG4gICAgICAvLyBzdG9wIOOBmeOCi+OBqCBzb3VyY2UuZW5kZWTjgoLnmbrngavjgZnjgotcbiAgICAgIHRoaXMuc291cmNlLnN0b3AgJiYgdGhpcy5zb3VyY2Uuc3RvcCgwKTtcbiAgICAgIHRoaXMuZmxhcmUoJ3N0b3AnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfSk7XG5cbn0pO1xuIiwiLy89PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gIEV4dGVuc2lvbiBwaGluYS5hc3NldC5Tb3VuZE1hbmFnZXJcbi8vPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblNvdW5kTWFuYWdlci4kbWV0aG9kKFwiZ2V0Vm9sdW1lXCIsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gIXRoaXMuaXNNdXRlKCkgPyB0aGlzLnZvbHVtZSA6IDA7XG59KTtcblxuU291bmRNYW5hZ2VyLiRtZXRob2QoXCJnZXRWb2x1bWVNdXNpY1wiLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICF0aGlzLmlzTXV0ZSgpID8gdGhpcy5tdXNpY1ZvbHVtZSA6IDA7XG59KTtcblxuU291bmRNYW5hZ2VyLiRtZXRob2QoXCJzZXRWb2x1bWVNdXNpY1wiLCBmdW5jdGlvbih2b2x1bWUpIHtcbiAgdGhpcy5tdXNpY1ZvbHVtZSA9IHZvbHVtZTtcbiAgaWYgKCF0aGlzLmlzTXV0ZSgpICYmIHRoaXMuY3VycmVudE11c2ljKSB7XG4gICAgdGhpcy5jdXJyZW50TXVzaWMudm9sdW1lID0gdm9sdW1lO1xuICB9XG4gIHJldHVybiB0aGlzO1xufSk7XG5cblNvdW5kTWFuYWdlci4kbWV0aG9kKFwicGxheU11c2ljXCIsIGZ1bmN0aW9uKG5hbWUsIGZhZGVUaW1lLCBsb29wLCB3aGVuLCBvZmZzZXQsIGR1cmF0aW9uKSB7XG4gIC8vIGNvbnN0IHJlcyA9IHBoaW5hLmNoZWNrQnJvd3NlcigpO1xuICAvLyBpZiAocmVzLmlzSWUxMSkgcmV0dXJuIG51bGw7XG5cbiAgbG9vcCA9IChsb29wICE9PSB1bmRlZmluZWQpID8gbG9vcCA6IHRydWU7XG5cbiAgaWYgKHRoaXMuY3VycmVudE11c2ljKSB7XG4gICAgdGhpcy5zdG9wTXVzaWMoZmFkZVRpbWUpO1xuICB9XG5cbiAgbGV0IG11c2ljID0gbnVsbDtcbiAgaWYgKG5hbWUgaW5zdGFuY2VvZiBwaGluYS5hc3NldC5Tb3VuZCB8fCBuYW1lIGluc3RhbmNlb2YgcGhpbmEuYXNzZXQuRG9tQXVkaW9Tb3VuZCkge1xuICAgIG11c2ljID0gbmFtZTtcbiAgfSBlbHNlIHtcbiAgICBtdXNpYyA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ3NvdW5kJywgbmFtZSk7XG4gIH1cblxuICBpZiAoIW11c2ljKSB7XG4gICAgY29uc29sZS5lcnJvcihcIlNvdW5kIG5vdCBmb3VuZDogXCIsIG5hbWUpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgbXVzaWMuc2V0TG9vcChsb29wKTtcbiAgbXVzaWMucGxheSh3aGVuLCBvZmZzZXQsIGR1cmF0aW9uKTtcblxuICBpZiAoZmFkZVRpbWUgPiAwKSB7XG4gICAgY29uc3QgdW5pdFRpbWUgPSBmYWRlVGltZSAvIGNvdW50O1xuICAgIGNvbnN0IHZvbHVtZSA9IHRoaXMuZ2V0Vm9sdW1lTXVzaWMoKTtcbiAgICBjb25zdCBjb3VudCA9IDMyO1xuICAgIGxldCBjb3VudGVyID0gMDtcblxuICAgIG11c2ljLnZvbHVtZSA9IDA7XG4gICAgY29uc3QgaWQgPSBzZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgICAgIGNvdW50ZXIgKz0gMTtcbiAgICAgIGNvbnN0IHJhdGUgPSBjb3VudGVyIC8gY291bnQ7XG4gICAgICBtdXNpYy52b2x1bWUgPSByYXRlICogdm9sdW1lO1xuXG4gICAgICBpZiAocmF0ZSA+PSAxKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaWQpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sIHVuaXRUaW1lKTtcbiAgfSBlbHNlIHtcbiAgICBtdXNpYy52b2x1bWUgPSB0aGlzLmdldFZvbHVtZU11c2ljKCk7XG4gIH1cblxuICB0aGlzLmN1cnJlbnRNdXNpYyA9IG11c2ljO1xuXG4gIHJldHVybiB0aGlzLmN1cnJlbnRNdXNpYztcbn0pO1xuXG4vLz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyDjg5zjgqTjgrnnlKjjga7pn7Pph4/oqK3lrprjgIHlho3nlJ/jg6Hjgr3jg4Pjg4nmi6HlvLVcblNvdW5kTWFuYWdlci4kbWV0aG9kKFwiZ2V0Vm9sdW1lVm9pY2VcIiwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiAhdGhpcy5pc011dGUoKSA/IHRoaXMudm9pY2VWb2x1bWUgOiAwO1xufSk7XG5cblNvdW5kTWFuYWdlci4kbWV0aG9kKFwic2V0Vm9sdW1lVm9pY2VcIiwgZnVuY3Rpb24odm9sdW1lKSB7XG4gIHRoaXMudm9pY2VWb2x1bWUgPSB2b2x1bWU7XG4gIHJldHVybiB0aGlzO1xufSk7XG5cblNvdW5kTWFuYWdlci4kbWV0aG9kKFwicGxheVZvaWNlXCIsIGZ1bmN0aW9uKG5hbWUpIHtcbiAgY29uc3Qgc291bmQgPSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KCdzb3VuZCcsIG5hbWUpO1xuICBzb3VuZC52b2x1bWUgPSB0aGlzLmdldFZvbHVtZVZvaWNlKCk7XG4gIHNvdW5kLnBsYXkoKTtcbiAgcmV0dXJuIHNvdW5kO1xufSk7XG4iLCIvL+OCueODl+ODqeOCpOODiOapn+iDveaLoeW8tVxucGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRpc3BsYXkuU3ByaXRlLnByb3RvdHlwZS5zZXRGcmFtZVRyaW1taW5nID0gZnVuY3Rpb24oeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgIHRoaXMuX2ZyYW1lVHJpbVggPSB4IHx8IDA7XG4gICAgdGhpcy5fZnJhbWVUcmltWSA9IHkgfHwgMDtcbiAgICB0aGlzLl9mcmFtZVRyaW1XaWR0aCA9IHdpZHRoIHx8IHRoaXMuaW1hZ2UuZG9tRWxlbWVudC53aWR0aCAtIHRoaXMuX2ZyYW1lVHJpbVg7XG4gICAgdGhpcy5fZnJhbWVUcmltSGVpZ2h0ID0gaGVpZ2h0IHx8IHRoaXMuaW1hZ2UuZG9tRWxlbWVudC5oZWlnaHQgLSB0aGlzLl9mcmFtZVRyaW1ZO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgcGhpbmEuZGlzcGxheS5TcHJpdGUucHJvdG90eXBlLnNldEZyYW1lSW5kZXggPSBmdW5jdGlvbihpbmRleCwgd2lkdGgsIGhlaWdodCkge1xuICAgIGNvbnN0IHN4ID0gdGhpcy5fZnJhbWVUcmltWCB8fCAwO1xuICAgIGNvbnN0IHN5ID0gdGhpcy5fZnJhbWVUcmltWSB8fCAwO1xuICAgIGNvbnN0IHN3ID0gdGhpcy5fZnJhbWVUcmltV2lkdGggIHx8ICh0aGlzLmltYWdlLmRvbUVsZW1lbnQud2lkdGggLSBzeCk7XG4gICAgY29uc3Qgc2ggPSB0aGlzLl9mcmFtZVRyaW1IZWlnaHQgfHwgKHRoaXMuaW1hZ2UuZG9tRWxlbWVudC5oZWlnaHQgLSBzeSk7XG5cbiAgICBjb25zdCB0dyAgPSB3aWR0aCB8fCB0aGlzLndpZHRoOyAgICAgIC8vIHR3XG4gICAgY29uc3QgdGggID0gaGVpZ2h0IHx8IHRoaXMuaGVpZ2h0OyAgICAvLyB0aFxuICAgIGNvbnN0IHJvdyA9IH5+KHN3IC8gdHcpO1xuICAgIGNvbnN0IGNvbCA9IH5+KHNoIC8gdGgpO1xuICAgIGNvbnN0IG1heEluZGV4ID0gcm93ICogY29sO1xuICAgIGluZGV4ID0gaW5kZXggJSBtYXhJbmRleDtcblxuICAgIGNvbnN0IHggPSBpbmRleCAlIHJvdztcbiAgICBjb25zdCB5ID0gfn4oaW5kZXggLyByb3cpO1xuICAgIHRoaXMuc3JjUmVjdC54ID0gc3ggKyB4ICogdHc7XG4gICAgdGhpcy5zcmNSZWN0LnkgPSBzeSArIHkgKiB0aDtcbiAgICB0aGlzLnNyY1JlY3Qud2lkdGggID0gdHc7XG4gICAgdGhpcy5zcmNSZWN0LmhlaWdodCA9IHRoO1xuXG4gICAgdGhpcy5fZnJhbWVJbmRleCA9IGluZGV4O1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxufSk7IiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuICAvLyDmloflrZfliJfjgYvjgonmlbDlgKTjgpLmir3lh7rjgZnjgotcbiAgLy8g44Os44Kk44Ki44Km44OI44OV44Kh44Kk44Or44GL44KJ5L2c5qWt44GZ44KL5aC05ZCI44Gr5Yip55So44GX44Gf44GP44Gq44KLXG4gIC8vIGhvZ2VfMCBob2dlXzHjgarjganjgYvjgonmlbDlrZfjgaDjgZHmir3lh7pcbiAgLy8gMDEwMF9ob2dlXzk5OTkgPT4gW1wiMDEwMFwiICwgXCI5OTk5XCJd44Gr44Gq44KLXG4gIC8vIGhvZ2UwLjDjgajjgYvjga/jganjgYbjgZnjgYvjgarvvJ9cbiAgLy8g5oq95Ye65b6M44GrcGFyc2VJbnTjgZnjgovjgYvjga/mpJzoqI7kuK1cbiAgU3RyaW5nLnByb3RvdHlwZS4kbWV0aG9kKFwibWF0Y2hJbnRcIiwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubWF0Y2goL1swLTldKy9nKTtcbiAgfSk7XG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5hc3NldC5UZXh0dXJlLnByb3RvdHlwZS4kbWV0aG9kKFwiX2xvYWRcIiwgZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgIHRoaXMuZG9tRWxlbWVudCA9IG5ldyBJbWFnZSgpO1xuXG4gICAgbGV0IGlzTG9jYWwgPSAobG9jYXRpb24ucHJvdG9jb2wgPT0gJ2ZpbGU6Jyk7XG4gICAgaWYgKCEoL15kYXRhOi8udGVzdCh0aGlzLnNyYykpKSB7XG4gICAgICB0aGlzLmRvbUVsZW1lbnQuY3Jvc3NPcmlnaW4gPSAnYW5vbnltb3VzJzsgLy8g44Kv44Ot44K544Kq44Oq44K444Oz6Kej6ZmkXG4gICAgfVxuXG4gICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5kb21FbGVtZW50Lm9ubG9hZCA9IGZ1bmN0aW9uKGUpIHtcbiAgICAgIHNlbGYubG9hZGVkID0gdHJ1ZTtcbiAgICAgIGUudGFyZ2V0Lm9ubG9hZCA9IG51bGw7XG4gICAgICBlLnRhcmdldC5vbmVycm9yID0gbnVsbDtcbiAgICAgIHJlc29sdmUoc2VsZik7XG4gICAgfTtcblxuICAgIHRoaXMuZG9tRWxlbWVudC5vbmVycm9yID0gZnVuY3Rpb24oZSkge1xuICAgICAgZS50YXJnZXQub25sb2FkID0gbnVsbDtcbiAgICAgIGUudGFyZ2V0Lm9uZXJyb3IgPSBudWxsO1xuICAgICAgY29uc29sZS5lcnJvcihcInBoaW5hLmFzc2V0LlRleHR1cmUgX2xvYWQgb25FcnJvciBcIiwgdGhpcy5zcmMpO1xuICAgIH07XG5cbiAgICB0aGlzLmRvbUVsZW1lbnQuc3JjID0gdGhpcy5zcmM7XG4gIH0pO1xuXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICBwaGluYS5hY2Nlc3NvcnkuVHdlZW5lci5wcm90b3R5cGUuJG1ldGhvZChcIl91cGRhdGVUd2VlblwiLCBmdW5jdGlvbihhcHApIHtcbiAgICAvL+KAu+OBk+OCjOOBquOBhOOBqHBhdXNl44GM44GG44GU44GL44Gq44GEXG4gICAgaWYgKCF0aGlzLnBsYXlpbmcpIHJldHVybjtcblxuICAgIGNvbnN0IHR3ZWVuID0gdGhpcy5fdHdlZW47XG4gICAgY29uc3QgdGltZSA9IHRoaXMuX2dldFVuaXRUaW1lKGFwcCk7XG5cbiAgICB0d2Vlbi5mb3J3YXJkKHRpbWUpO1xuICAgIHRoaXMuZmxhcmUoJ3R3ZWVuJyk7XG5cbiAgICBpZiAodHdlZW4udGltZSA+PSB0d2Vlbi5kdXJhdGlvbikge1xuICAgICAgZGVsZXRlIHRoaXMuX3R3ZWVuO1xuICAgICAgdGhpcy5fdHdlZW4gPSBudWxsO1xuICAgICAgdGhpcy5fdXBkYXRlID0gdGhpcy5fdXBkYXRlVGFzaztcbiAgICB9XG4gIH0pO1xuXG4gIHBoaW5hLmFjY2Vzc29yeS5Ud2VlbmVyLnByb3RvdHlwZS4kbWV0aG9kKFwiX3VwZGF0ZVdhaXRcIiwgZnVuY3Rpb24oYXBwKSB7XG4gICAgLy/igLvjgZPjgozjgarjgYTjgahwYXVzZeOBjOOBhuOBlOOBi+OBquOBhFxuICAgIGlmICghdGhpcy5wbGF5aW5nKSByZXR1cm47XG5cbiAgICBjb25zdCB3YWl0ID0gdGhpcy5fd2FpdDtcbiAgICBjb25zdCB0aW1lID0gdGhpcy5fZ2V0VW5pdFRpbWUoYXBwKTtcbiAgICB3YWl0LnRpbWUgKz0gdGltZTtcblxuICAgIGlmICh3YWl0LnRpbWUgPj0gd2FpdC5saW1pdCkge1xuICAgICAgZGVsZXRlIHRoaXMuX3dhaXQ7XG4gICAgICB0aGlzLl93YWl0ID0gbnVsbDtcbiAgICAgIHRoaXMuX3VwZGF0ZSA9IHRoaXMuX3VwZGF0ZVRhc2s7XG4gICAgfVxuICB9KTtcblxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJCdXR0b25pemVcIiwge1xuICBpbml0OiBmdW5jdGlvbigpIHt9LFxuICBfc3RhdGljOiB7XG4gICAgU1RBVFVTOiB7XG4gICAgICBOT05FOiAwLFxuICAgICAgU1RBUlQ6IDEsXG4gICAgICBFTkQ6IDIsXG4gICAgfSxcbiAgICBzdGF0dXM6IDAsXG4gICAgcmVjdDogZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgZWxlbWVudC5ib3VuZGluZ1R5cGUgPSBcInJlY3RcIjtcbiAgICAgIHRoaXMuX2NvbW1vbihlbGVtZW50KTtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH0sXG4gICAgY2lyY2xlOiBmdW5jdGlvbihlbGVtZW50KSB7XG4gICAgICBlbGVtZW50LnJhZGl1cyA9IE1hdGgubWF4KGVsZW1lbnQud2lkdGgsIGVsZW1lbnQuaGVpZ2h0KSAqIDAuNTtcbiAgICAgIGVsZW1lbnQuYm91bmRpbmdUeXBlID0gXCJjaXJjbGVcIjtcbiAgICAgIHRoaXMuX2NvbW1vbihlbGVtZW50KTtcbiAgICAgIHJldHVybiBlbGVtZW50O1xuICAgIH0sXG4gICAgX2NvbW1vbjogZnVuY3Rpb24oZWxlbWVudCkge1xuICAgICAgLy9UT0RPOuOCqOODh+OCo+OCv+ODvOOBp+OBjeOCi+OBvuOBp+OBruaaq+WumuWvvuW/nFxuICAgICAgZWxlbWVudC5zZXRPcmlnaW4oMC41LCAwLjUsIHRydWUpO1xuXG4gICAgICBlbGVtZW50LmludGVyYWN0aXZlID0gdHJ1ZTtcbiAgICAgIGVsZW1lbnQuY2xpY2tTb3VuZCA9IFwic2UvY2xpY2tCdXR0b25cIjtcblxuICAgICAgLy9UT0RPOuODnOOCv+ODs+OBruWQjOaZguaKvOS4i+OBr+Wun+apn+OBp+iqv+aVtOOBmeOCi1xuICAgICAgZWxlbWVudC5vbihcInBvaW50c3RhcnRcIiwgZSA9PiB7XG4gICAgICAgIGlmICh0aGlzLnN0YXR1cyAhPSB0aGlzLlNUQVRVUy5OT05FKSByZXR1cm47XG4gICAgICAgIHRoaXMuc3RhdHVzID0gdGhpcy5TVEFUVVMuU1RBUlQ7XG4gICAgICAgIGVsZW1lbnQudHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgLnRvKHtcbiAgICAgICAgICAgIHNjYWxlWDogMC45LFxuICAgICAgICAgICAgc2NhbGVZOiAwLjlcbiAgICAgICAgICB9LCAxMDApO1xuICAgICAgfSk7XG5cbiAgICAgIGVsZW1lbnQub24oXCJwb2ludGVuZFwiLCAoZSkgPT4ge1xuICAgICAgICBpZiAodGhpcy5zdGF0dXMgIT0gdGhpcy5TVEFUVVMuU1RBUlQpIHJldHVybjtcbiAgICAgICAgY29uc3QgaGl0VGVzdCA9IGVsZW1lbnQuaGl0VGVzdChlLnBvaW50ZXIueCwgZS5wb2ludGVyLnkpO1xuICAgICAgICB0aGlzLnN0YXR1cyA9IHRoaXMuU1RBVFVTLkVORDtcbiAgICAgICAgaWYgKGhpdFRlc3QpIGVsZW1lbnQuZmxhcmUoXCJjbGlja1NvdW5kXCIpO1xuXG4gICAgICAgIGVsZW1lbnQudHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgLnRvKHtcbiAgICAgICAgICAgIHNjYWxlWDogMS4wLFxuICAgICAgICAgICAgc2NhbGVZOiAxLjBcbiAgICAgICAgICB9LCAxMDApXG4gICAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5zdGF0dXMgPSB0aGlzLlNUQVRVUy5OT05FO1xuICAgICAgICAgICAgaWYgKCFoaXRUZXN0KSByZXR1cm47XG4gICAgICAgICAgICBlbGVtZW50LmZsYXJlKFwiY2xpY2tlZFwiLCB7XG4gICAgICAgICAgICAgIHBvaW50ZXI6IGUucG9pbnRlclxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgLy/jgqLjg4vjg6Hjg7zjgrfjg6fjg7Pjga7mnIDkuK3jgavliYrpmaTjgZXjgozjgZ/loLTlkIjjgavlgpnjgYjjgaZyZW1vdmVk44Kk44OZ44Oz44OI5pmC44Gr44OV44Op44Kw44KS5YWD44Gr5oi744GX44Gm44GK44GPXG4gICAgICBlbGVtZW50Lm9uZShcInJlbW92ZWRcIiwgKCkgPT4ge1xuICAgICAgICB0aGlzLnN0YXR1cyA9IHRoaXMuU1RBVFVTLk5PTkU7XG4gICAgICB9KTtcblxuICAgICAgZWxlbWVudC5vbihcImNsaWNrU291bmRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICghZWxlbWVudC5jbGlja1NvdW5kKSByZXR1cm47XG4gICAgICAgIC8vcGhpbmEuYXNzZXQuU291bmRNYW5hZ2VyLnBsYXkoZWxlbWVudC5jbGlja1NvdW5kKTtcbiAgICAgIH0pO1xuICAgIH0sXG4gIH0sXG59KTtcbiIsInBoaW5hLm5hbWVzcGFjZShmdW5jdGlvbigpIHtcblxuICAvKipcbiAgICog44OG44Kv44K544OB44Oj6Zai5L+C44Gu44Om44O844OG44Kj44Oq44OG44KjXG4gICAqL1xuICBwaGluYS5kZWZpbmUoXCJUZXh0dXJlVXRpbFwiLCB7XG5cbiAgICBfc3RhdGljOiB7XG5cbiAgICAgIC8qKlxuICAgICAgICogUkdC5ZCE6KaB57Sg44Gr5a6f5pWw44KS56mN566X44GZ44KLXG4gICAgICAgKi9cbiAgICAgIG11bHRpcGx5Q29sb3I6IGZ1bmN0aW9uKHRleHR1cmUsIHJlZCwgZ3JlZW4sIGJsdWUpIHtcbiAgICAgICAgaWYgKHR5cGVvZih0ZXh0dXJlKSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIHRleHR1cmUgPSBBc3NldE1hbmFnZXIuZ2V0KFwiaW1hZ2VcIiwgdGV4dHVyZSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB3aWR0aCA9IHRleHR1cmUuZG9tRWxlbWVudC53aWR0aDtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGV4dHVyZS5kb21FbGVtZW50LmhlaWdodDtcblxuICAgICAgICBjb25zdCByZXN1bHQgPSBDYW52YXMoKS5zZXRTaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gcmVzdWx0LmNvbnRleHQ7XG5cbiAgICAgICAgY29udGV4dC5kcmF3SW1hZ2UodGV4dHVyZS5kb21FbGVtZW50LCAwLCAwKTtcbiAgICAgICAgY29uc3QgaW1hZ2VEYXRhID0gY29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW1hZ2VEYXRhLmRhdGEubGVuZ3RoOyBpICs9IDQpIHtcbiAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpICsgMF0gPSBNYXRoLmZsb29yKGltYWdlRGF0YS5kYXRhW2kgKyAwXSAqIHJlZCk7XG4gICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaSArIDFdID0gTWF0aC5mbG9vcihpbWFnZURhdGEuZGF0YVtpICsgMV0gKiBncmVlbik7XG4gICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaSArIDJdID0gTWF0aC5mbG9vcihpbWFnZURhdGEuZGF0YVtpICsgMl0gKiBibHVlKTtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgICAqIOiJsuebuOODu+W9qeW6puODu+aYjuW6puOCkuaTjeS9nOOBmeOCi1xuICAgICAgICovXG4gICAgICBlZGl0QnlIc2w6IGZ1bmN0aW9uKHRleHR1cmUsIGgsIHMsIGwpIHtcbiAgICAgICAgaWYgKHR5cGVvZih0ZXh0dXJlKSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgIHRleHR1cmUgPSBBc3NldE1hbmFnZXIuZ2V0KFwiaW1hZ2VcIiwgdGV4dHVyZSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB3aWR0aCA9IHRleHR1cmUuZG9tRWxlbWVudC53aWR0aDtcbiAgICAgICAgY29uc3QgaGVpZ2h0ID0gdGV4dHVyZS5kb21FbGVtZW50LmhlaWdodDtcblxuICAgICAgICBjb25zdCByZXN1bHQgPSBDYW52YXMoKS5zZXRTaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICBjb25zdCBjb250ZXh0ID0gcmVzdWx0LmNvbnRleHQ7XG5cbiAgICAgICAgY29udGV4dC5kcmF3SW1hZ2UodGV4dHVyZS5kb21FbGVtZW50LCAwLCAwKTtcbiAgICAgICAgY29uc3QgaW1hZ2VEYXRhID0gY29udGV4dC5nZXRJbWFnZURhdGEoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaW1hZ2VEYXRhLmRhdGEubGVuZ3RoOyBpICs9IDQpIHtcbiAgICAgICAgICBjb25zdCByID0gaW1hZ2VEYXRhLmRhdGFbaSArIDBdO1xuICAgICAgICAgIGNvbnN0IGcgPSBpbWFnZURhdGEuZGF0YVtpICsgMV07XG4gICAgICAgICAgY29uc3QgYiA9IGltYWdlRGF0YS5kYXRhW2kgKyAyXTtcblxuICAgICAgICAgIGNvbnN0IGhzbCA9IHBoaW5hLnV0aWwuQ29sb3IuUkdCdG9IU0wociwgZywgYik7XG4gICAgICAgICAgY29uc3QgbmV3UmdiID0gcGhpbmEudXRpbC5Db2xvci5IU0x0b1JHQihoc2xbMF0gKyBoLCBNYXRoLmNsYW1wKGhzbFsxXSArIHMsIDAsIDEwMCksIE1hdGguY2xhbXAoaHNsWzJdICsgbCwgMCwgMTAwKSk7XG5cbiAgICAgICAgICBpbWFnZURhdGEuZGF0YVtpICsgMF0gPSBuZXdSZ2JbMF07XG4gICAgICAgICAgaW1hZ2VEYXRhLmRhdGFbaSArIDFdID0gbmV3UmdiWzFdO1xuICAgICAgICAgIGltYWdlRGF0YS5kYXRhW2kgKyAyXSA9IG5ld1JnYlsyXTtcbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0LnB1dEltYWdlRGF0YShpbWFnZURhdGEsIDAsIDApO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9LFxuXG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKCkge30sXG4gIH0pO1xuXG59KTtcbiIsIi8qXG4gKiAgcGhpbmEudGlsZWRtYXAuanNcbiAqICAyMDE2LzkvMTBcbiAqICBAYXV0aGVyIG1pbmltbyAgXG4gKiAgVGhpcyBQcm9ncmFtIGlzIE1JVCBsaWNlbnNlLlxuICogXG4gKiAgMjAxOS85LzE4XG4gKiAgdmVyc2lvbiAyLjBcbiAqL1xuXG5waGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwicGhpbmEuYXNzZXQuVGlsZWRNYXBcIiwge1xuICAgIHN1cGVyQ2xhc3M6IFwicGhpbmEuYXNzZXQuWE1MTG9hZGVyXCIsXG5cbiAgICBpbWFnZTogbnVsbCxcblxuICAgIHRpbGVzZXRzOiBudWxsLFxuICAgIGxheWVyczogbnVsbCxcblxuICAgIGluaXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnN1cGVySW5pdCgpO1xuICAgIH0sXG5cbiAgICBfbG9hZDogZnVuY3Rpb24ocmVzb2x2ZSkge1xuICAgICAgLy/jg5HjgrnmipzjgY3lh7rjgZdcbiAgICAgIHRoaXMucGF0aCA9IFwiXCI7XG4gICAgICBjb25zdCBsYXN0ID0gdGhpcy5zcmMubGFzdEluZGV4T2YoXCIvXCIpO1xuICAgICAgaWYgKGxhc3QgPiAwKSB7XG4gICAgICAgIHRoaXMucGF0aCA9IHRoaXMuc3JjLnN1YnN0cmluZygwLCBsYXN0ICsgMSk7XG4gICAgICB9XG5cbiAgICAgIC8v57WC5LqG6Zai5pWw5L+d5a2YXG4gICAgICB0aGlzLl9yZXNvbHZlID0gcmVzb2x2ZTtcblxuICAgICAgLy8gbG9hZFxuICAgICAgY29uc3QgeG1sID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICB4bWwub3BlbignR0VUJywgdGhpcy5zcmMpO1xuICAgICAgeG1sLm9ucmVhZHlzdGF0ZWNoYW5nZSA9ICgpID0+IHtcbiAgICAgICAgaWYgKHhtbC5yZWFkeVN0YXRlID09PSA0KSB7XG4gICAgICAgICAgaWYgKFsyMDAsIDIwMSwgMF0uaW5kZXhPZih4bWwuc3RhdHVzKSAhPT0gLTEpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSAobmV3IERPTVBhcnNlcigpKS5wYXJzZUZyb21TdHJpbmcoeG1sLnJlc3BvbnNlVGV4dCwgXCJ0ZXh0L3htbFwiKTtcbiAgICAgICAgICAgIHRoaXMuZGF0YVR5cGUgPSBcInhtbFwiO1xuICAgICAgICAgICAgdGhpcy5kYXRhID0gZGF0YTtcbiAgICAgICAgICAgIHRoaXMuX3BhcnNlKGRhdGEpXG4gICAgICAgICAgICAgIC50aGVuKCgpID0+IHRoaXMuX3Jlc29sdmUodGhpcykpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHhtbC5zZW5kKG51bGwpO1xuICAgIH0sXG5cbiAgICAvL+ODnuODg+ODl+OCpOODoeODvOOCuOWPluW+l1xuICAgIGdldEltYWdlOiBmdW5jdGlvbihsYXllck5hbWUpIHtcbiAgICAgIGlmIChsYXllck5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pbWFnZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9nZW5lcmF0ZUltYWdlKGxheWVyTmFtZSk7XG4gICAgICB9XG4gICAgfSxcblxuICAgIC8v5oyH5a6a44Oe44OD44OX44Os44Kk44Ok44O844KS6YWN5YiX44Go44GX44Gm5Y+W5b6XXG4gICAgZ2V0TWFwRGF0YTogZnVuY3Rpb24obGF5ZXJOYW1lKSB7XG4gICAgICAvL+ODrOOCpOODpOODvOaknOe0olxuICAgICAgZm9yKGxldCBpID0gMDsgaSA8IHRoaXMubGF5ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0aGlzLmxheWVyc1tpXS5uYW1lID09IGxheWVyTmFtZSkge1xuICAgICAgICAgIC8v44Kz44OU44O844KS6L+U44GZXG4gICAgICAgICAgcmV0dXJuIHRoaXMubGF5ZXJzW2ldLmRhdGEuY29uY2F0KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG5cbiAgICAvL+OCquODluOCuOOCp+OCr+ODiOOCsOODq+ODvOODl+OCkuWPluW+l++8iOaMh+WumuOBjOeEoeOBhOWgtOWQiOOAgeWFqOODrOOCpOODpOODvOOCkumFjeWIl+OBq+OBl+OBpui/lOOBme+8iVxuICAgIGdldE9iamVjdEdyb3VwOiBmdW5jdGlvbihncm91cE5hbWUpIHtcbiAgICAgIGdyb3VwTmFtZSA9IGdyb3VwTmFtZSB8fCBudWxsO1xuICAgICAgY29uc3QgbHMgPSBbXTtcbiAgICAgIGNvbnN0IGxlbiA9IHRoaXMubGF5ZXJzLmxlbmd0aDtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKHRoaXMubGF5ZXJzW2ldLnR5cGUgPT0gXCJvYmplY3Rncm91cFwiKSB7XG4gICAgICAgICAgaWYgKGdyb3VwTmFtZSA9PSBudWxsIHx8IGdyb3VwTmFtZSA9PSB0aGlzLmxheWVyc1tpXS5uYW1lKSB7XG4gICAgICAgICAgICAvL+ODrOOCpOODpOODvOaDheWgseOCkuOCr+ODreODvOODs+OBmeOCi1xuICAgICAgICAgICAgY29uc3Qgb2JqID0gdGhpcy5fY2xvbmVPYmplY3RMYXllcih0aGlzLmxheWVyc1tpXSk7XG4gICAgICAgICAgICBpZiAoZ3JvdXBOYW1lICE9PSBudWxsKSByZXR1cm4gb2JqO1xuICAgICAgICAgICAgbHMucHVzaChvYmopO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGxzO1xuICAgIH0sXG5cbiAgICAvL+OCquODluOCuOOCp+OCr+ODiOODrOOCpOODpOODvOOCkuOCr+ODreODvOODs+OBl+OBpui/lOOBmVxuICAgIF9jbG9uZU9iamVjdExheWVyOiBmdW5jdGlvbihzcmNMYXllcikge1xuICAgICAgY29uc3QgcmVzdWx0ID0ge30uJHNhZmUoc3JjTGF5ZXIpO1xuICAgICAgcmVzdWx0Lm9iamVjdHMgPSBbXTtcbiAgICAgIC8v44Os44Kk44Ok44O85YaF44Kq44OW44K444Kn44Kv44OI44Gu44Kz44OU44O8XG4gICAgICBzcmNMYXllci5vYmplY3RzLmZvckVhY2gob2JqID0+IHtcbiAgICAgICAgY29uc3QgcmVzT2JqID0ge1xuICAgICAgICAgIHByb3BlcnRpZXM6IHt9LiRzYWZlKG9iai5wcm9wZXJ0aWVzKSxcbiAgICAgICAgfS4kZXh0ZW5kKG9iaik7XG4gICAgICAgIGlmIChvYmouZWxsaXBzZSkgcmVzT2JqLmVsbGlwc2UgPSBvYmouZWxsaXBzZTtcbiAgICAgICAgaWYgKG9iai5naWQpIHJlc09iai5naWQgPSBvYmouZ2lkO1xuICAgICAgICBpZiAob2JqLnBvbHlnb24pIHJlc09iai5wb2x5Z29uID0gb2JqLnBvbHlnb24uY2xvbmUoKTtcbiAgICAgICAgaWYgKG9iai5wb2x5bGluZSkgcmVzT2JqLnBvbHlsaW5lID0gb2JqLnBvbHlsaW5lLmNsb25lKCk7XG4gICAgICAgIHJlc3VsdC5vYmplY3RzLnB1c2gocmVzT2JqKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgX3BhcnNlOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgIC8v44K/44Kk44Or5bGe5oCn5oOF5aCx5Y+W5b6XXG4gICAgICAgIGNvbnN0IG1hcCA9IGRhdGEuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ21hcCcpWzBdO1xuICAgICAgICBjb25zdCBhdHRyID0gdGhpcy5fYXR0clRvSlNPTihtYXApO1xuICAgICAgICB0aGlzLiRleHRlbmQoYXR0cik7XG4gICAgICAgIHRoaXMucHJvcGVydGllcyA9IHRoaXMuX3Byb3BlcnRpZXNUb0pTT04obWFwKTtcblxuICAgICAgICAvL+OCv+OCpOODq+OCu+ODg+ODiOWPluW+l1xuICAgICAgICB0aGlzLnRpbGVzZXRzID0gdGhpcy5fcGFyc2VUaWxlc2V0cyhkYXRhKTtcbiAgICAgICAgdGhpcy50aWxlc2V0cy5zb3J0KChhLCBiKSA9PiBhLmZpcnN0Z2lkIC0gYi5maXJzdGdpZCk7XG5cbiAgICAgICAgLy/jg6zjgqTjg6Tjg7zlj5blvpdcbiAgICAgICAgdGhpcy5sYXllcnMgPSB0aGlzLl9wYXJzZUxheWVycyhkYXRhKTtcblxuICAgICAgICAvL+OCpOODoeODvOOCuOODh+ODvOOCv+iqreOBv+i+vOOBv1xuICAgICAgICB0aGlzLl9jaGVja0ltYWdlKClcbiAgICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAvL+ODnuODg+ODl+OCpOODoeODvOOCuOeUn+aIkFxuICAgICAgICAgICAgdGhpcy5pbWFnZSA9IHRoaXMuX2dlbmVyYXRlSW1hZ2UoKTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgfSxcblxuICAgIC8v44K/44Kk44Or44K744OD44OI44Gu44OR44O844K5XG4gICAgX3BhcnNlVGlsZXNldHM6IGZ1bmN0aW9uKHhtbCkge1xuICAgICAgY29uc3QgZWFjaCA9IEFycmF5LnByb3RvdHlwZS5mb3JFYWNoO1xuICAgICAgY29uc3QgZGF0YSA9IFtdO1xuICAgICAgY29uc3QgdGlsZXNldHMgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3RpbGVzZXQnKTtcbiAgICAgIGVhY2guY2FsbCh0aWxlc2V0cywgYXN5bmMgdGlsZXNldCA9PiB7XG4gICAgICAgIGNvbnN0IHQgPSB7fTtcbiAgICAgICAgY29uc3QgYXR0ciA9IHRoaXMuX2F0dHJUb0pTT04odGlsZXNldCk7XG4gICAgICAgIGlmIChhdHRyLnNvdXJjZSkge1xuICAgICAgICAgIHQuaXNPbGRGb3JtYXQgPSBmYWxzZTtcbiAgICAgICAgICB0LnNvdXJjZSA9IHRoaXMucGF0aCArIGF0dHIuc291cmNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8v5pen44OH44O844K/5b2i5byP77yI5pyq5a++5b+c77yJXG4gICAgICAgICAgdC5pc09sZEZvcm1hdCA9IHRydWU7XG4gICAgICAgICAgdC5kYXRhID0gdGlsZXNldDtcbiAgICAgICAgfVxuICAgICAgICB0LmZpcnN0Z2lkID0gYXR0ci5maXJzdGdpZDtcbiAgICAgICAgZGF0YS5wdXNoKHQpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuXG4gICAgLy/jg6zjgqTjg6Tjg7zmg4XloLHjga7jg5Hjg7zjgrlcbiAgICBfcGFyc2VMYXllcnM6IGZ1bmN0aW9uKHhtbCkge1xuICAgICAgY29uc3QgZWFjaCA9IEFycmF5LnByb3RvdHlwZS5mb3JFYWNoO1xuICAgICAgY29uc3QgZGF0YSA9IFtdO1xuXG4gICAgICBjb25zdCBtYXAgPSB4bWwuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJtYXBcIilbMF07XG4gICAgICBjb25zdCBsYXllcnMgPSBbXTtcbiAgICAgIGVhY2guY2FsbChtYXAuY2hpbGROb2RlcywgZWxtID0+IHtcbiAgICAgICAgaWYgKGVsbS50YWdOYW1lID09IFwibGF5ZXJcIiB8fCBlbG0udGFnTmFtZSA9PSBcIm9iamVjdGdyb3VwXCIgfHwgZWxtLnRhZ05hbWUgPT0gXCJpbWFnZWxheWVyXCIpIHtcbiAgICAgICAgICBsYXllcnMucHVzaChlbG0pO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgbGF5ZXJzLmVhY2gobGF5ZXIgPT4ge1xuICAgICAgICBzd2l0Y2ggKGxheWVyLnRhZ05hbWUpIHtcbiAgICAgICAgICBjYXNlIFwibGF5ZXJcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgLy/pgJrluLjjg6zjgqTjg6Tjg7xcbiAgICAgICAgICAgICAgY29uc3QgZCA9IGxheWVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKCdkYXRhJylbMF07XG4gICAgICAgICAgICAgIGNvbnN0IGVuY29kaW5nID0gZC5nZXRBdHRyaWJ1dGUoXCJlbmNvZGluZ1wiKTtcbiAgICAgICAgICAgICAgY29uc3QgbCA9IHtcbiAgICAgICAgICAgICAgICAgIHR5cGU6IFwibGF5ZXJcIixcbiAgICAgICAgICAgICAgICAgIG5hbWU6IGxheWVyLmdldEF0dHJpYnV0ZShcIm5hbWVcIiksXG4gICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgaWYgKGVuY29kaW5nID09IFwiY3N2XCIpIHtcbiAgICAgICAgICAgICAgICAgIGwuZGF0YSA9IHRoaXMuX3BhcnNlQ1NWKGQudGV4dENvbnRlbnQpO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVuY29kaW5nID09IFwiYmFzZTY0XCIpIHtcbiAgICAgICAgICAgICAgICAgIGwuZGF0YSA9IHRoaXMuX3BhcnNlQmFzZTY0KGQudGV4dENvbnRlbnQpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY29uc3QgYXR0ciA9IHRoaXMuX2F0dHJUb0pTT04obGF5ZXIpO1xuICAgICAgICAgICAgICBsLiRleHRlbmQoYXR0cik7XG4gICAgICAgICAgICAgIGwucHJvcGVydGllcyA9IHRoaXMuX3Byb3BlcnRpZXNUb0pTT04obGF5ZXIpO1xuXG4gICAgICAgICAgICAgIGRhdGEucHVzaChsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgLy/jgqrjg5bjgrjjgqfjgq/jg4jjg6zjgqTjg6Tjg7xcbiAgICAgICAgICBjYXNlIFwib2JqZWN0Z3JvdXBcIjpcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgY29uc3QgbCA9IHtcbiAgICAgICAgICAgICAgICB0eXBlOiBcIm9iamVjdGdyb3VwXCIsXG4gICAgICAgICAgICAgICAgb2JqZWN0czogW10sXG4gICAgICAgICAgICAgICAgbmFtZTogbGF5ZXIuZ2V0QXR0cmlidXRlKFwibmFtZVwiKSxcbiAgICAgICAgICAgICAgICB4OiBwYXJzZUZsb2F0KGxheWVyLmdldEF0dHJpYnV0ZShcIm9mZnNldHhcIikpIHx8IDAsXG4gICAgICAgICAgICAgICAgeTogcGFyc2VGbG9hdChsYXllci5nZXRBdHRyaWJ1dGUoXCJvZmZzZXR5XCIpKSB8fCAwLFxuICAgICAgICAgICAgICAgIGFscGhhOiBsYXllci5nZXRBdHRyaWJ1dGUoXCJvcGFjaXR5XCIpIHx8IDEsXG4gICAgICAgICAgICAgICAgY29sb3I6IGxheWVyLmdldEF0dHJpYnV0ZShcImNvbG9yXCIpIHx8IG51bGwsXG4gICAgICAgICAgICAgICAgZHJhd29yZGVyOiBsYXllci5nZXRBdHRyaWJ1dGUoXCJkcmF3b3JkZXJcIikgfHwgbnVsbCxcbiAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgZWFjaC5jYWxsKGxheWVyLmNoaWxkTm9kZXMsIGVsbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVsbS5ub2RlVHlwZSA9PSAzKSByZXR1cm47XG4gICAgICAgICAgICAgICAgY29uc3QgZCA9IHRoaXMuX2F0dHJUb0pTT04oZWxtKTtcbiAgICAgICAgICAgICAgICBkLnByb3BlcnRpZXMgPSB0aGlzLl9wcm9wZXJ0aWVzVG9KU09OKGVsbSk7XG4gICAgICAgICAgICAgICAgLy/lrZDopoHntKDjga7op6PmnpBcbiAgICAgICAgICAgICAgICBpZiAoZWxtLmNoaWxkTm9kZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICBlbG0uY2hpbGROb2Rlcy5mb3JFYWNoKGUgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZS5ub2RlVHlwZSA9PSAzKSByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIC8v5qWV5YaGXG4gICAgICAgICAgICAgICAgICAgIGlmIChlLm5vZGVOYW1lID09ICdlbGxpcHNlJykge1xuICAgICAgICAgICAgICAgICAgICAgIGQuZWxsaXBzZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy/lpJrop5LlvaJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUubm9kZU5hbWUgPT0gJ3BvbHlnb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZC5wb2x5Z29uID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXR0ciA9IHRoaXMuX2F0dHJUb0pTT05fc3RyKGUpO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHBsID0gYXR0ci5wb2ludHMuc3BsaXQoXCIgXCIpO1xuICAgICAgICAgICAgICAgICAgICAgIHBsLmZvckVhY2goZnVuY3Rpb24oc3RyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwdHMgPSBzdHIuc3BsaXQoXCIsXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZC5wb2x5Z29uLnB1c2goe3g6IHBhcnNlRmxvYXQocHRzWzBdKSwgeTogcGFyc2VGbG9hdChwdHNbMV0pfSk7XG4gICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy/nt5rliIZcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUubm9kZU5hbWUgPT0gJ3BvbHlsaW5lJykge1xuICAgICAgICAgICAgICAgICAgICAgIGQucG9seWxpbmUgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdHRyID0gdGhpcy5fYXR0clRvSlNPTl9zdHIoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGwgPSBhdHRyLnBvaW50cy5zcGxpdChcIiBcIik7XG4gICAgICAgICAgICAgICAgICAgICAgcGwuZm9yRWFjaChzdHIgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHRzID0gc3RyLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGQucG9seWxpbmUucHVzaCh7eDogcGFyc2VGbG9hdChwdHNbMF0pLCB5OiBwYXJzZUZsb2F0KHB0c1sxXSl9KTtcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGwub2JqZWN0cy5wdXNoKGQpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgbC5wcm9wZXJ0aWVzID0gdGhpcy5fcHJvcGVydGllc1RvSlNPTihsYXllcik7XG5cbiAgICAgICAgICAgICAgZGF0YS5wdXNoKGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAvL+OCpOODoeODvOOCuOODrOOCpOODpOODvFxuICAgICAgICAgIGNhc2UgXCJpbWFnZWxheWVyXCI6XG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGNvbnN0IGwgPSB7XG4gICAgICAgICAgICAgICAgdHlwZTogXCJpbWFnZWxheWVyXCIsXG4gICAgICAgICAgICAgICAgbmFtZTogbGF5ZXIuZ2V0QXR0cmlidXRlKFwibmFtZVwiKSxcbiAgICAgICAgICAgICAgICB4OiBwYXJzZUZsb2F0KGxheWVyLmdldEF0dHJpYnV0ZShcIm9mZnNldHhcIikpIHx8IDAsXG4gICAgICAgICAgICAgICAgeTogcGFyc2VGbG9hdChsYXllci5nZXRBdHRyaWJ1dGUoXCJvZmZzZXR5XCIpKSB8fCAwLFxuICAgICAgICAgICAgICAgIGFscGhhOiBsYXllci5nZXRBdHRyaWJ1dGUoXCJvcGFjaXR5XCIpIHx8IDEsXG4gICAgICAgICAgICAgICAgdmlzaWJsZTogKGxheWVyLmdldEF0dHJpYnV0ZShcInZpc2libGVcIikgPT09IHVuZGVmaW5lZCB8fCBsYXllci5nZXRBdHRyaWJ1dGUoXCJ2aXNpYmxlXCIpICE9IDApLFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICBjb25zdCBpbWFnZUVsbSA9IGxheWVyLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiaW1hZ2VcIilbMF07XG4gICAgICAgICAgICAgIGwuaW1hZ2UgPSB7c291cmNlOiBpbWFnZUVsbS5nZXRBdHRyaWJ1dGUoXCJzb3VyY2VcIil9O1xuXG4gICAgICAgICAgICAgIGRhdGEucHVzaChsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIC8v44Kw44Or44O844OXXG4gICAgICAgICAgY2FzZSBcImdyb3VwXCI6XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICByZXR1cm4gZGF0YTtcbiAgICB9LFxuXG4gICAgLy/jgqLjgrvjg4Pjg4jjgavnhKHjgYTjgqTjg6Hjg7zjgrjjg4fjg7zjgr/jgpLoqq3jgb/ovrzjgb9cbiAgICBfY2hlY2tJbWFnZTogZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCBpbWFnZVNvdXJjZSA9IFtdO1xuICAgICAgY29uc3QgbG9hZEltYWdlID0gW107XG5cbiAgICAgIC8v5LiA6Kan5L2c5oiQXG4gICAgICB0aGlzLnRpbGVzZXRzLmZvckVhY2godGlsZXNldCA9PiB7XG4gICAgICAgIGNvbnN0IG9iaiA9IHtcbiAgICAgICAgICBpc1RpbGVzZXQ6IHRydWUsXG4gICAgICAgICAgaW1hZ2U6IHRpbGVzZXQuc291cmNlLFxuICAgICAgICB9O1xuICAgICAgICBpbWFnZVNvdXJjZS5wdXNoKG9iaik7XG4gICAgICB9KTtcbiAgICAgIHRoaXMubGF5ZXJzLmZvckVhY2gobGF5ZXIgPT4ge1xuICAgICAgICBpZiAobGF5ZXIuaW1hZ2UpIHtcbiAgICAgICAgICBjb25zdCBvYmogPSB7XG4gICAgICAgICAgICBpc1RpbGVzZXQ6IGZhbHNlLFxuICAgICAgICAgICAgaW1hZ2U6IGxheWVyLmltYWdlLnNvdXJjZSxcbiAgICAgICAgICB9O1xuICAgICAgICAgIGltYWdlU291cmNlLnB1c2gob2JqKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8v44Ki44K744OD44OI44Gr44GC44KL44GL56K66KqNXG4gICAgICBpbWFnZVNvdXJjZS5mb3JFYWNoKGUgPT4ge1xuICAgICAgICBpZiAoZS5pc1RpbGVzZXQpIHtcbiAgICAgICAgICBjb25zdCB0c3ggPSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KCd0c3gnLCBlLmltYWdlKTtcbiAgICAgICAgICBpZiAoIXRzeCkge1xuICAgICAgICAgICAgLy/jgqLjgrvjg4Pjg4jjgavjgarjgYvjgaPjgZ/jga7jgafjg63jg7zjg4njg6rjgrnjg4jjgavov73liqBcbiAgICAgICAgICAgIGxvYWRJbWFnZS5wdXNoKGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBpbWFnZSA9IHBoaW5hLmFzc2V0LkFzc2V0TWFuYWdlci5nZXQoJ2ltYWdlJywgZS5pbWFnZSk7XG4gICAgICAgICAgaWYgKCFpbWFnZSkge1xuICAgICAgICAgICAgLy/jgqLjgrvjg4Pjg4jjgavjgarjgYvjgaPjgZ/jga7jgafjg63jg7zjg4njg6rjgrnjg4jjgavov73liqBcbiAgICAgICAgICAgIGxvYWRJbWFnZS5wdXNoKGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8v5LiA5ous44Ot44O844OJXG4gICAgICAvL+ODreODvOODieODquOCueODiOS9nOaIkFxuICAgICAgaWYgKGxvYWRJbWFnZS5sZW5ndGgpIHtcbiAgICAgICAgY29uc3QgYXNzZXRzID0geyBpbWFnZTogW10sIHRzeDogW10gfTtcbiAgICAgICAgbG9hZEltYWdlLmZvckVhY2goZSA9PiB7XG4gICAgICAgICAgaWYgKGUuaXNUaWxlc2V0KSB7XG4gICAgICAgICAgICBhc3NldHMudHN4W2UuaW1hZ2VdID0gZS5pbWFnZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy/jgqLjgrvjg4Pjg4jjga7jg5HjgrnjgpLjg57jg4Pjg5fjgajlkIzjgZjjgavjgZnjgotcbiAgICAgICAgICAgIGFzc2V0cy5pbWFnZVtlLmltYWdlXSA9IHRoaXMucGF0aCArIGUuaW1hZ2U7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgIGNvbnN0IGxvYWRlciA9IHBoaW5hLmFzc2V0LkFzc2V0TG9hZGVyKCk7XG4gICAgICAgICAgbG9hZGVyLmxvYWQoYXNzZXRzKTtcbiAgICAgICAgICBsb2FkZXIub24oJ2xvYWQnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnRpbGVzZXRzLmZvckVhY2goZSA9PiB7XG4gICAgICAgICAgICAgIGUudHN4ID0gcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmdldCgndHN4JywgZS5zb3VyY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvL+ODnuODg+ODl+OCpOODoeODvOOCuOS9nOaIkFxuICAgIF9nZW5lcmF0ZUltYWdlOiBmdW5jdGlvbihsYXllck5hbWUpIHtcbiAgICAgIGxldCBudW1MYXllciA9IDA7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubGF5ZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmICh0aGlzLmxheWVyc1tpXS50eXBlID09IFwibGF5ZXJcIiB8fCB0aGlzLmxheWVyc1tpXS50eXBlID09IFwiaW1hZ2VsYXllclwiKSBudW1MYXllcisrO1xuICAgICAgfVxuICAgICAgaWYgKG51bUxheWVyID09IDApIHJldHVybiBudWxsO1xuXG4gICAgICBjb25zdCB3aWR0aCA9IHRoaXMud2lkdGggKiB0aGlzLnRpbGV3aWR0aDtcbiAgICAgIGNvbnN0IGhlaWdodCA9IHRoaXMuaGVpZ2h0ICogdGhpcy50aWxlaGVpZ2h0O1xuICAgICAgY29uc3QgY2FudmFzID0gcGhpbmEuZ3JhcGhpY3MuQ2FudmFzKCkuc2V0U2l6ZSh3aWR0aCwgaGVpZ2h0KTtcblxuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxheWVycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAvL+ODnuODg+ODl+ODrOOCpOODpOODvFxuICAgICAgICBpZiAodGhpcy5sYXllcnNbaV0udHlwZSA9PSBcImxheWVyXCIgJiYgdGhpcy5sYXllcnNbaV0udmlzaWJsZSAhPSBcIjBcIikge1xuICAgICAgICAgIGlmIChsYXllck5hbWUgPT09IHVuZGVmaW5lZCB8fCBsYXllck5hbWUgPT09IHRoaXMubGF5ZXJzW2ldLm5hbWUpIHtcbiAgICAgICAgICAgIGNvbnN0IGxheWVyID0gdGhpcy5sYXllcnNbaV07XG4gICAgICAgICAgICBjb25zdCBtYXBkYXRhID0gbGF5ZXIuZGF0YTtcbiAgICAgICAgICAgIGNvbnN0IHdpZHRoID0gbGF5ZXIud2lkdGg7XG4gICAgICAgICAgICBjb25zdCBoZWlnaHQgPSBsYXllci5oZWlnaHQ7XG4gICAgICAgICAgICBjb25zdCBvcGFjaXR5ID0gbGF5ZXIub3BhY2l0eSB8fCAxLjA7XG4gICAgICAgICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgICAgICAgZm9yIChsZXQgeSA9IDA7IHkgPCBoZWlnaHQ7IHkrKykge1xuICAgICAgICAgICAgICBmb3IgKGxldCB4ID0gMDsgeCA8IHdpZHRoOyB4KyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbmRleCA9IG1hcGRhdGFbY291bnRdO1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgLy/jg57jg4Pjg5fjg4Hjg4Pjg5fjgpLphY3nva5cbiAgICAgICAgICAgICAgICAgIHRoaXMuX3NldE1hcENoaXAoY2FudmFzLCBpbmRleCwgeCAqIHRoaXMudGlsZXdpZHRoLCB5ICogdGhpcy50aWxlaGVpZ2h0LCBvcGFjaXR5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY291bnQrKztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvL+OCquODluOCuOOCp+OCr+ODiOOCsOODq+ODvOODl1xuICAgICAgICBpZiAodGhpcy5sYXllcnNbaV0udHlwZSA9PSBcIm9iamVjdGdyb3VwXCIgJiYgdGhpcy5sYXllcnNbaV0udmlzaWJsZSAhPSBcIjBcIikge1xuICAgICAgICAgIGlmIChsYXllck5hbWUgPT09IHVuZGVmaW5lZCB8fCBsYXllck5hbWUgPT09IHRoaXMubGF5ZXJzW2ldLm5hbWUpIHtcbiAgICAgICAgICAgIGNvbnN0IGxheWVyID0gdGhpcy5sYXllcnNbaV07XG4gICAgICAgICAgICBjb25zdCBvcGFjaXR5ID0gbGF5ZXIub3BhY2l0eSB8fCAxLjA7XG4gICAgICAgICAgICBsYXllci5vYmplY3RzLmZvckVhY2goZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICBpZiAoZS5naWQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9zZXRNYXBDaGlwKGNhbnZhcywgZS5naWQsIGUueCwgZS55LCBvcGFjaXR5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy/jgqTjg6Hjg7zjgrjjg6zjgqTjg6Tjg7xcbiAgICAgICAgaWYgKHRoaXMubGF5ZXJzW2ldLnR5cGUgPT0gXCJpbWFnZWxheWVyXCIgJiYgdGhpcy5sYXllcnNbaV0udmlzaWJsZSAhPSBcIjBcIikge1xuICAgICAgICAgIGlmIChsYXllck5hbWUgPT09IHVuZGVmaW5lZCB8fCBsYXllck5hbWUgPT09IHRoaXMubGF5ZXJzW2ldLm5hbWUpIHtcbiAgICAgICAgICAgIGNvbnN0IGltYWdlID0gcGhpbmEuYXNzZXQuQXNzZXRNYW5hZ2VyLmdldCgnaW1hZ2UnLCB0aGlzLmxheWVyc1tpXS5pbWFnZS5zb3VyY2UpO1xuICAgICAgICAgICAgY2FudmFzLmNvbnRleHQuZHJhd0ltYWdlKGltYWdlLmRvbUVsZW1lbnQsIHRoaXMubGF5ZXJzW2ldLngsIHRoaXMubGF5ZXJzW2ldLnkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCB0ZXh0dXJlID0gcGhpbmEuYXNzZXQuVGV4dHVyZSgpO1xuICAgICAgdGV4dHVyZS5kb21FbGVtZW50ID0gY2FudmFzLmRvbUVsZW1lbnQ7XG4gICAgICByZXR1cm4gdGV4dHVyZTtcbiAgICB9LFxuXG4gICAgLy/jgq3jg6Pjg7Pjg5Djgrnjga7mjIflrprjgZfjgZ/luqfmqJnjgavjg57jg4Pjg5fjg4Hjg4Pjg5fjga7jgqTjg6Hjg7zjgrjjgpLjgrPjg5Tjg7zjgZnjgotcbiAgICBfc2V0TWFwQ2hpcDogZnVuY3Rpb24oY2FudmFzLCBpbmRleCwgeCwgeSwgb3BhY2l0eSkge1xuICAgICAgLy/lr77osaHjgr/jgqTjg6vjgrvjg4Pjg4jjga7liKTliKVcbiAgICAgIGxldCB0aWxlc2V0O1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRpbGVzZXRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHRzeDEgPSB0aGlzLnRpbGVzZXRzW2ldO1xuICAgICAgICBjb25zdCB0c3gyID0gdGhpcy50aWxlc2V0c1tpICsgMV07XG4gICAgICAgIGlmICghdHN4Mikge1xuICAgICAgICAgIHRpbGVzZXQgPSB0c3gxO1xuICAgICAgICAgIGkgPSB0aGlzLnRpbGVzZXRzLmxlbmd0aDtcbiAgICAgICAgfSBlbHNlIGlmICh0c3gxLmZpcnN0Z2lkIDw9IGluZGV4ICYmIGluZGV4IDwgdHN4Mi5maXJzdGdpZCkge1xuICAgICAgICAgIHRpbGVzZXQgPSB0c3gxO1xuICAgICAgICAgIGkgPSB0aGlzLnRpbGVzZXRzLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy/jgr/jgqTjg6vjgrvjg4Pjg4jjgYvjgonjg57jg4Pjg5fjg4Hjg4Pjg5fjgpLlj5blvpdcbiAgICAgIGNvbnN0IHRzeCA9IHRpbGVzZXQudHN4O1xuICAgICAgY29uc3QgY2hpcCA9IHRzeC5jaGlwc1tpbmRleCAtIHRpbGVzZXQuZmlyc3RnaWRdO1xuICAgICAgY29uc3QgaW1hZ2UgPSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KCdpbWFnZScsIGNoaXAuaW1hZ2UpO1xuICAgICAgY2FudmFzLmNvbnRleHQuZHJhd0ltYWdlKFxuICAgICAgICBpbWFnZS5kb21FbGVtZW50LFxuICAgICAgICBjaGlwLnggKyB0c3gubWFyZ2luLCBjaGlwLnkgKyB0c3gubWFyZ2luLFxuICAgICAgICB0c3gudGlsZXdpZHRoLCB0c3gudGlsZWhlaWdodCxcbiAgICAgICAgeCwgeSxcbiAgICAgICAgdHN4LnRpbGV3aWR0aCwgdHN4LnRpbGVoZWlnaHQpO1xuICAgIH0sXG5cbiAgfSk7XG5cbiAgLy/jg63jg7zjg4Djg7zjgavov73liqBcbiAgcGhpbmEuYXNzZXQuQXNzZXRMb2FkZXIuYXNzZXRMb2FkRnVuY3Rpb25zLnRteCA9IGZ1bmN0aW9uKGtleSwgcGF0aCkge1xuICAgIGNvbnN0IHRteCA9IHBoaW5hLmFzc2V0LlRpbGVkTWFwKCk7XG4gICAgcmV0dXJuIHRteC5sb2FkKHBhdGgpO1xuICB9O1xuXG59KTsiLCIvKlxuICogIHBoaW5hLlRpbGVzZXQuanNcbiAqICAyMDE5LzkvMTJcbiAqICBAYXV0aGVyIG1pbmltbyAgXG4gKiAgVGhpcyBQcm9ncmFtIGlzIE1JVCBsaWNlbnNlLlxuICpcbiAqL1xuXG5waGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKFwicGhpbmEuYXNzZXQuVGlsZVNldFwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJwaGluYS5hc3NldC5YTUxMb2FkZXJcIixcblxuICAgIGltYWdlOiBudWxsLFxuICAgIHRpbGV3aWR0aDogMCxcbiAgICB0aWxlaGVpZ2h0OiAwLFxuICAgIHRpbGVjb3VudDogMCxcbiAgICBjb2x1bW5zOiAwLFxuXG4gICAgaW5pdDogZnVuY3Rpb24oeG1sKSB7XG4gICAgICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgICAgIGlmICh4bWwpIHtcbiAgICAgICAgICB0aGlzLmxvYWRGcm9tWE1MKHhtbCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgX2xvYWQ6IGZ1bmN0aW9uKHJlc29sdmUpIHtcbiAgICAgIC8v44OR44K55oqc44GN5Ye644GXXG4gICAgICB0aGlzLnBhdGggPSBcIlwiO1xuICAgICAgY29uc3QgbGFzdCA9IHRoaXMuc3JjLmxhc3RJbmRleE9mKFwiL1wiKTtcbiAgICAgIGlmIChsYXN0ID4gMCkge1xuICAgICAgICB0aGlzLnBhdGggPSB0aGlzLnNyYy5zdWJzdHJpbmcoMCwgbGFzdCArIDEpO1xuICAgICAgfVxuXG4gICAgICAvL+e1guS6humWouaVsOS/neWtmFxuICAgICAgdGhpcy5fcmVzb2x2ZSA9IHJlc29sdmU7XG5cbiAgICAgIC8vIGxvYWRcbiAgICAgIGNvbnN0IHhtbCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgeG1sLm9wZW4oJ0dFVCcsIHRoaXMuc3JjKTtcbiAgICAgIHhtbC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSAoKSA9PiB7XG4gICAgICAgIGlmICh4bWwucmVhZHlTdGF0ZSA9PT0gNCkge1xuICAgICAgICAgIGlmIChbMjAwLCAyMDEsIDBdLmluZGV4T2YoeG1sLnN0YXR1cykgIT09IC0xKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gKG5ldyBET01QYXJzZXIoKSkucGFyc2VGcm9tU3RyaW5nKHhtbC5yZXNwb25zZVRleHQsIFwidGV4dC94bWxcIik7XG4gICAgICAgICAgICB0aGlzLmRhdGFUeXBlID0gXCJ4bWxcIjtcbiAgICAgICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgICAgICAgICB0aGlzLl9wYXJzZShkYXRhKVxuICAgICAgICAgICAgICAudGhlbigoKSA9PiB0aGlzLl9yZXNvbHZlKHRoaXMpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICB4bWwuc2VuZChudWxsKTtcbiAgICB9LFxuXG4gICAgbG9hZEZyb21YTUw6IGZ1bmN0aW9uKHhtbCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3BhcnNlKHhtbCk7XG4gICAgfSxcblxuICAgIF9wYXJzZTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAvL+OCv+OCpOODq+OCu+ODg+ODiOWPluW+l1xuICAgICAgICBjb25zdCB0aWxlc2V0ID0gZGF0YS5nZXRFbGVtZW50c0J5VGFnTmFtZSgndGlsZXNldCcpWzBdO1xuICAgICAgICBjb25zdCBwcm9wcyA9IHRoaXMuX3Byb3BlcnRpZXNUb0pTT04odGlsZXNldCk7XG5cbiAgICAgICAgLy/jgr/jgqTjg6vjgrvjg4Pjg4jlsZ7mgKfmg4XloLHlj5blvpdcbiAgICAgICAgY29uc3QgYXR0ciA9IHRoaXMuX2F0dHJUb0pTT04odGlsZXNldCk7XG4gICAgICAgIGF0dHIuJHNhZmUoe1xuICAgICAgICAgIHRpbGV3aWR0aDogMzIsXG4gICAgICAgICAgdGlsZWhlaWdodDogMzIsXG4gICAgICAgICAgc3BhY2luZzogMCxcbiAgICAgICAgICBtYXJnaW46IDAsXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLiRleHRlbmQoYXR0cik7XG4gICAgICAgIHRoaXMuY2hpcHMgPSBbXTtcblxuICAgICAgICAvL+OCveODvOOCueeUu+WDj+ioreWumuWPluW+l1xuICAgICAgICB0aGlzLmltYWdlTmFtZSA9IHRpbGVzZXQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2ltYWdlJylbMF0uZ2V0QXR0cmlidXRlKCdzb3VyY2UnKTtcbiAgXG4gICAgICAgIC8v6YCP6YGO6Imy6Kit5a6a5Y+W5b6XXG4gICAgICAgIGNvbnN0IHRyYW5zID0gdGlsZXNldC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnaW1hZ2UnKVswXS5nZXRBdHRyaWJ1dGUoJ3RyYW5zJyk7XG4gICAgICAgIGlmICh0cmFucykge1xuICAgICAgICAgIHRoaXMudHJhbnNSID0gcGFyc2VJbnQodHJhbnMuc3Vic3RyaW5nKDAsIDIpLCAxNik7XG4gICAgICAgICAgdGhpcy50cmFuc0cgPSBwYXJzZUludCh0cmFucy5zdWJzdHJpbmcoMiwgNCksIDE2KTtcbiAgICAgICAgICB0aGlzLnRyYW5zQiA9IHBhcnNlSW50KHRyYW5zLnN1YnN0cmluZyg0LCA2KSwgMTYpO1xuICAgICAgICB9XG4gIFxuICAgICAgICAvL+ODnuODg+ODl+ODgeODg+ODl+ODquOCueODiOS9nOaIkFxuICAgICAgICBmb3IgKGxldCByID0gMDsgciA8IHRoaXMudGlsZWNvdW50OyByKyspIHtcbiAgICAgICAgICBjb25zdCBjaGlwID0ge1xuICAgICAgICAgICAgaW1hZ2U6IHRoaXMuaW1hZ2VOYW1lLFxuICAgICAgICAgICAgeDogKHIgICUgdGhpcy5jb2x1bW5zKSAqICh0aGlzLnRpbGV3aWR0aCArIHRoaXMuc3BhY2luZykgKyB0aGlzLm1hcmdpbixcbiAgICAgICAgICAgIHk6IE1hdGguZmxvb3IociAvIHRoaXMuY29sdW1ucykgKiAodGhpcy50aWxlaGVpZ2h0ICsgdGhpcy5zcGFjaW5nKSArIHRoaXMubWFyZ2luLFxuICAgICAgICAgIH07XG4gICAgICAgICAgdGhpcy5jaGlwc1tyXSA9IGNoaXA7XG4gICAgICAgIH1cblxuICAgICAgICAvL+OCpOODoeODvOOCuOODh+ODvOOCv+iqreOBv+i+vOOBv1xuICAgICAgICB0aGlzLl9sb2FkSW1hZ2UoKVxuICAgICAgICAgIC50aGVuKCgpID0+IHJlc29sdmUoKSk7XG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy/jgqLjgrvjg4Pjg4jjgavnhKHjgYTjgqTjg6Hjg7zjgrjjg4fjg7zjgr/jgpLoqq3jgb/ovrzjgb9cbiAgICBfbG9hZEltYWdlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgY29uc3QgaW1hZ2VTb3VyY2UgPSB7XG4gICAgICAgICAgaW1hZ2VOYW1lOiB0aGlzLmltYWdlTmFtZSxcbiAgICAgICAgICBpbWFnZVVybDogdGhpcy5wYXRoICsgdGhpcy5pbWFnZU5hbWUsXG4gICAgICAgICAgdHJhbnNSOiB0aGlzLnRyYW5zUixcbiAgICAgICAgICB0cmFuc0c6IHRoaXMudHJhbnNHLFxuICAgICAgICAgIHRyYW5zQjogdGhpcy50cmFuc0IsXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBsZXQgbG9hZEltYWdlID0gbnVsbDtcbiAgICAgICAgY29uc3QgaW1hZ2UgPSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KCdpbWFnZScsIGltYWdlU291cmNlLmltYWdlKTtcbiAgICAgICAgaWYgKGltYWdlKSB7XG4gICAgICAgICAgdGhpcy5pbWFnZSA9IGltYWdlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvYWRJbWFnZSA9IGltYWdlU291cmNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy/jg63jg7zjg4njg6rjgrnjg4jkvZzmiJBcbiAgICAgICAgY29uc3QgYXNzZXRzID0geyBpbWFnZTogW10gfTtcbiAgICAgICAgYXNzZXRzLmltYWdlW2ltYWdlU291cmNlLmltYWdlTmFtZV0gPSBpbWFnZVNvdXJjZS5pbWFnZVVybDtcblxuICAgICAgICBpZiAobG9hZEltYWdlKSB7XG4gICAgICAgICAgY29uc3QgbG9hZGVyID0gcGhpbmEuYXNzZXQuQXNzZXRMb2FkZXIoKTtcbiAgICAgICAgICBsb2FkZXIubG9hZChhc3NldHMpO1xuICAgICAgICAgIGxvYWRlci5vbignbG9hZCcsIGUgPT4ge1xuICAgICAgICAgICAgLy/pgI/pgY7oibLoqK3lrprlj43mmKBcbiAgICAgICAgICAgIHRoaXMuaW1hZ2UgPSBwaGluYS5hc3NldC5Bc3NldE1hbmFnZXIuZ2V0KCdpbWFnZScsIGltYWdlU291cmNlLmltYWdlVXJsKTtcbiAgICAgICAgICAgIGlmIChpbWFnZVNvdXJjZS50cmFuc1IgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBjb25zdCByID0gaW1hZ2VTb3VyY2UudHJhbnNSO1xuICAgICAgICAgICAgICBjb25zdCBnID0gaW1hZ2VTb3VyY2UudHJhbnNHO1xuICAgICAgICAgICAgICBjb25zdCBiID0gaW1hZ2VTb3VyY2UudHJhbnNCO1xuICAgICAgICAgICAgICB0aGlzLmltYWdlLmZpbHRlcigocGl4ZWwsIGluZGV4LCB4LCB5LCBiaXRtYXApID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gYml0bWFwLmRhdGE7XG4gICAgICAgICAgICAgICAgaWYgKHBpeGVsWzBdID09IHIgJiYgcGl4ZWxbMV0gPT0gZyAmJiBwaXhlbFsyXSA9PSBiKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGFbaW5kZXgrM10gPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9LFxuICB9KTtcblxuICAvL+ODreODvOODgOODvOOBq+i/veWKoFxuICBwaGluYS5hc3NldC5Bc3NldExvYWRlci5hc3NldExvYWRGdW5jdGlvbnMudHN4ID0gZnVuY3Rpb24oa2V5LCBwYXRoKSB7XG4gICAgY29uc3QgdHN4ID0gcGhpbmEuYXNzZXQuVGlsZVNldCgpO1xuICAgIHJldHVybiB0c3gubG9hZChwYXRoKTtcbiAgfTtcblxufSk7IiwiLy9cbi8vIOaxjueUqOmWouaVsOe+pFxuLy9cbnBoaW5hLmRlZmluZShcIlV0aWxcIiwge1xuICBfc3RhdGljOiB7XG5cbiAgICAvL+aMh+WumuOBleOCjOOBn+OCquODluOCuOOCp+OCr+ODiOOCkuODq+ODvOODiOOBqOOBl+OBpuebrueahOOBrmlk44KS6LWw5p+744GZ44KLXG4gICAgZmluZEJ5SWQ6IGZ1bmN0aW9uKGlkLCBvYmopIHtcbiAgICAgIGlmIChvYmouaWQgPT09IGlkKSByZXR1cm4gb2JqO1xuICAgICAgY29uc3QgY2hpbGRyZW4gPSBPYmplY3Qua2V5cyhvYmouY2hpbGRyZW4gfHwge30pLm1hcChrZXkgPT4gb2JqLmNoaWxkcmVuW2tleV0pO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBoaXQgPSB0aGlzLmZpbmRCeUlkKGlkLCBjaGlsZHJlbltpXSk7XG4gICAgICAgIGlmIChoaXQpIHJldHVybiBoaXQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuXG4gICAgLy9UT0RPOuOBk+OBk+OBmOOCg+OBquOBhOaEn+OBjOOBguOCi+OBruOBp+OBmeOBjOOAgeS4gOaXpuWun+ijhVxuICAgIC8v5oyH5a6a44GV44KM44GfQeOBqELjga5hc3NldHPjga7pgKPmg7PphY3liJfjgpLmlrDopo/jga7jgqrjg5bjgrjjgqfjgq/jg4jjgavjg57jg7zjgrjjgZnjgotcbiAgICBtZXJnZUFzc2V0czogZnVuY3Rpb24oYXNzZXRzQSwgYXNzZXRzQikge1xuICAgICAgY29uc3QgcmVzdWx0ID0ge307XG4gICAgICBhc3NldHNBLmZvckluKCh0eXBlS2V5LCB0eXBlVmFsdWUpID0+IHtcbiAgICAgICAgaWYgKCFyZXN1bHQuJGhhcyh0eXBlS2V5KSkgcmVzdWx0W3R5cGVLZXldID0ge307XG4gICAgICAgIHR5cGVWYWx1ZS5mb3JJbigoYXNzZXRLZXksIGFzc2V0UGF0aCkgPT4ge1xuICAgICAgICAgIHJlc3VsdFt0eXBlS2V5XVthc3NldEtleV0gPSBhc3NldFBhdGg7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICBhc3NldHNCLmZvckluKCh0eXBlS2V5LCB0eXBlVmFsdWUpID0+IHtcbiAgICAgICAgaWYgKCFyZXN1bHQuJGhhcyh0eXBlS2V5KSkgcmVzdWx0W3R5cGVLZXldID0ge307XG4gICAgICAgIHR5cGVWYWx1ZS5mb3JJbigoYXNzZXRLZXksIGFzc2V0UGF0aCkgPT4ge1xuICAgICAgICAgIHJlc3VsdFt0eXBlS2V5XVthc3NldEtleV0gPSBhc3NldFBhdGg7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvL+ePvuWcqOaZgumWk+OBi+OCieaMh+WumuaZgumWk+OBvuOBp+OBqeOBruOBj+OCieOBhOOBi+OBi+OCi+OBi+OCkui/lOWNtOOBmeOCi1xuICAgIC8vXG4gICAgLy8gb3V0cHV0IDogeyBcbiAgICAvLyAgIHRvdGFsRGF0ZTowICwgXG4gICAgLy8gICB0b3RhbEhvdXI6MCAsIFxuICAgIC8vICAgdG90YWxNaW51dGVzOjAgLCBcbiAgICAvLyAgIHRvdGFsU2Vjb25kczowICxcbiAgICAvLyAgIGRhdGU6MCAsIFxuICAgIC8vICAgaG91cjowICwgXG4gICAgLy8gICBtaW51dGVzOjAgLCBcbiAgICAvLyAgIHNlY29uZHM6MCBcbiAgICAvLyB9XG4gICAgLy9cblxuICAgIGNhbGNSZW1haW5pbmdUaW1lOiBmdW5jdGlvbihmaW5pc2gpIHtcbiAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gICAgICBjb25zdCByZXN1bHQgPSB7XG4gICAgICAgIFwidG90YWxEYXRlXCI6IDAsXG4gICAgICAgIFwidG90YWxIb3VyXCI6IDAsXG4gICAgICAgIFwidG90YWxNaW51dGVzXCI6IDAsXG4gICAgICAgIFwidG90YWxTZWNvbmRzXCI6IDAsXG4gICAgICAgIFwiZGF0ZVwiOiAwLFxuICAgICAgICBcImhvdXJcIjogMCxcbiAgICAgICAgXCJtaW51dGVzXCI6IDAsXG4gICAgICAgIFwic2Vjb25kc1wiOiAwLFxuICAgICAgfVxuXG4gICAgICBmaW5pc2ggPSAoZmluaXNoIGluc3RhbmNlb2YgRGF0ZSkgPyBmaW5pc2ggOiBuZXcgRGF0ZShmaW5pc2gpO1xuICAgICAgbGV0IGRpZmYgPSBmaW5pc2ggLSBub3c7XG4gICAgICBpZiAoZGlmZiA9PT0gMCkgcmV0dXJuIHJlc3VsdDtcblxuICAgICAgY29uc3Qgc2lnbiA9IChkaWZmIDwgMCkgPyAtMSA6IDE7XG5cbiAgICAgIC8vVE9ETzrjgZPjga7ovrrjgorjgoLjgYblsJHjgZfntrrpupfjgavmm7jjgZHjgarjgYTjgYvmpJzoqI5cbiAgICAgIC8v5Y2Y5L2N5YilIDHmnKrmuoDjga8wXG4gICAgICByZXN1bHRbXCJ0b3RhbERhdGVcIl0gPSBwYXJzZUludChkaWZmIC8gMTAwMCAvIDYwIC8gNjAgLyAyNCk7XG4gICAgICByZXN1bHRbXCJ0b3RhbEhvdXJcIl0gPSBwYXJzZUludChkaWZmIC8gMTAwMCAvIDYwIC8gNjApO1xuICAgICAgcmVzdWx0W1widG90YWxNaW51dGVzXCJdID0gcGFyc2VJbnQoZGlmZiAvIDEwMDAgLyA2MCk7XG4gICAgICByZXN1bHRbXCJ0b3RhbFNlY29uZHNcIl0gPSBwYXJzZUludChkaWZmIC8gMTAwMCk7XG5cbiAgICAgIGRpZmYgLT0gcmVzdWx0W1widG90YWxEYXRlXCJdICogODY0MDAwMDA7XG4gICAgICByZXN1bHRbXCJob3VyXCJdID0gcGFyc2VJbnQoZGlmZiAvIDEwMDAgLyA2MCAvIDYwKTtcblxuICAgICAgZGlmZiAtPSByZXN1bHRbXCJob3VyXCJdICogMzYwMDAwMDtcbiAgICAgIHJlc3VsdFtcIm1pbnV0ZXNcIl0gPSBwYXJzZUludChkaWZmIC8gMTAwMCAvIDYwKTtcblxuICAgICAgZGlmZiAtPSByZXN1bHRbXCJtaW51dGVzXCJdICogNjAwMDA7XG4gICAgICByZXN1bHRbXCJzZWNvbmRzXCJdID0gcGFyc2VJbnQoZGlmZiAvIDEwMDApO1xuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuXG4gICAgfSxcblxuICAgIC8v44Os44Kk44Ki44Km44OI44Ko44OH44Kj44K/44O844Gn44GvU3ByaXRl5YWo44GmQXRhbHNTcHJpdGXjgavjgarjgaPjgabjgZfjgb7jgYbjgZ/jgoHjgIFcbiAgICAvL1Nwcml0ZeOBq+W3ruOBl+abv+OBiOOCieOCjOOCi+OCiOOBhuOBq+OBmeOCi1xuXG4gICAgLy9BdGxhc1Nwcml0ZeiHqui6q+OBq+WNmOeZuuOBrkltYWdl44KS44K744OD44OI44Gn44GN44KL44KI44GG44Gr44GZ44KL77yfXG4gICAgLy/jgYLjgajjgafjgarjgavjgYvjgZfjgonlr77nrZbjgZfjgarjgYTjgajjgaDjgoHjgaDjgYzvvJPmnIjntI3lk4Hjgafjga/kuIDml6bjgZPjgozjgadcbiAgICByZXBsYWNlQXRsYXNTcHJpdGVUb1Nwcml0ZTogZnVuY3Rpb24ocGFyZW50LCBhdGxhc1Nwcml0ZSwgc3ByaXRlKSB7XG4gICAgICBjb25zdCBpbmRleCA9IHBhcmVudC5nZXRDaGlsZEluZGV4KGF0bGFzU3ByaXRlKTtcbiAgICAgIHNwcml0ZS5zZXRPcmlnaW4oYXRsYXNTcHJpdGUub3JpZ2luWCwgYXRsYXNTcHJpdGUub3JpZ2luWSk7XG4gICAgICBzcHJpdGUuc2V0UG9zaXRpb24oYXRsYXNTcHJpdGUueCwgYXRsYXNTcHJpdGUueSk7XG4gICAgICBwYXJlbnQuYWRkQ2hpbGRBdChzcHJpdGUsIGluZGV4KTtcbiAgICAgIGF0bGFzU3ByaXRlLnJlbW92ZSgpO1xuICAgICAgcmV0dXJuIHNwcml0ZTtcbiAgICB9LFxuICB9XG59KTtcbiIsIi8qXG4gKiAgcGhpbmEueG1sbG9hZGVyLmpzXG4gKiAgMjAxOS85LzEyXG4gKiAgQGF1dGhlciBtaW5pbW8gIFxuICogIFRoaXMgUHJvZ3JhbSBpcyBNSVQgbGljZW5zZS5cbiAqXG4gKi9cblxucGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRlZmluZShcInBoaW5hLmFzc2V0LlhNTExvYWRlclwiLCB7XG4gICAgc3VwZXJDbGFzczogXCJwaGluYS5hc3NldC5Bc3NldFwiLFxuXG4gICAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgfSxcblxuICAgIF9sb2FkOiBmdW5jdGlvbihyZXNvbHZlKSB7XG4gICAgICByZXNvbHZlKCk7XG4gICAgfSxcblxuICAgIC8vWE1M44OX44Ot44OR44OG44Kj44KSSlNPTuOBq+WkieaPm1xuICAgIF9wcm9wZXJ0aWVzVG9KU09OOiBmdW5jdGlvbihlbG0pIHtcbiAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSBlbG0uZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJwcm9wZXJ0aWVzXCIpWzBdO1xuICAgICAgY29uc3Qgb2JqID0ge307XG4gICAgICBpZiAocHJvcGVydGllcyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gb2JqO1xuXG4gICAgICBmb3IgKGxldCBrID0gMDsgayA8IHByb3BlcnRpZXMuY2hpbGROb2Rlcy5sZW5ndGg7IGsrKykge1xuICAgICAgICBjb25zdCBwID0gcHJvcGVydGllcy5jaGlsZE5vZGVzW2tdO1xuICAgICAgICBpZiAocC50YWdOYW1lID09PSBcInByb3BlcnR5XCIpIHtcbiAgICAgICAgICAvL3Byb3BlcnR544GrdHlwZeaMh+WumuOBjOOBguOBo+OBn+OCieWkieaPm1xuICAgICAgICAgIGNvbnN0IHR5cGUgPSBwLmdldEF0dHJpYnV0ZSgndHlwZScpO1xuICAgICAgICAgIGNvbnN0IHZhbHVlID0gcC5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJyk7XG4gICAgICAgICAgaWYgKCF2YWx1ZSkgdmFsdWUgPSBwLnRleHRDb250ZW50O1xuICAgICAgICAgIGlmICh0eXBlID09IFwiaW50XCIpIHtcbiAgICAgICAgICAgIG9ialtwLmdldEF0dHJpYnV0ZSgnbmFtZScpXSA9IHBhcnNlSW50KHZhbHVlLCAxMCk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0eXBlID09IFwiZmxvYXRcIikge1xuICAgICAgICAgICAgb2JqW3AuZ2V0QXR0cmlidXRlKCduYW1lJyldID0gcGFyc2VGbG9hdCh2YWx1ZSk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0eXBlID09IFwiYm9vbFwiICkge1xuICAgICAgICAgICAgaWYgKHZhbHVlID09IFwidHJ1ZVwiKSBvYmpbcC5nZXRBdHRyaWJ1dGUoJ25hbWUnKV0gPSB0cnVlO1xuICAgICAgICAgICAgZWxzZSBvYmpbcC5nZXRBdHRyaWJ1dGUoJ25hbWUnKV0gPSBmYWxzZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgb2JqW3AuZ2V0QXR0cmlidXRlKCduYW1lJyldID0gdmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH0sXG5cbiAgICAvL1hNTOWxnuaAp+OCkkpTT07jgavlpInmj5tcbiAgICBfYXR0clRvSlNPTjogZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICBjb25zdCBvYmogPSB7fTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgc291cmNlLmF0dHJpYnV0ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgbGV0IHZhbCA9IHNvdXJjZS5hdHRyaWJ1dGVzW2ldLnZhbHVlO1xuICAgICAgICB2YWwgPSBpc05hTihwYXJzZUZsb2F0KHZhbCkpPyB2YWw6IHBhcnNlRmxvYXQodmFsKTtcbiAgICAgICAgb2JqW3NvdXJjZS5hdHRyaWJ1dGVzW2ldLm5hbWVdID0gdmFsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9LFxuXG4gICAgLy9YTUzlsZ7mgKfjgpJKU09O44Gr5aSJ5o+b77yIU3RyaW5n44Gn6L+U44GZ77yJXG4gICAgX2F0dHJUb0pTT05fc3RyOiBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGNvbnN0IG9iaiA9IHt9O1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzb3VyY2UuYXR0cmlidXRlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCB2YWwgPSBzb3VyY2UuYXR0cmlidXRlc1tpXS52YWx1ZTtcbiAgICAgICAgb2JqW3NvdXJjZS5hdHRyaWJ1dGVzW2ldLm5hbWVdID0gdmFsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9iajtcbiAgICB9LFxuXG4gICAgLy9DU1bjg5Hjg7zjgrlcbiAgICBfcGFyc2VDU1Y6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIGNvbnN0IGRhdGFMaXN0ID0gZGF0YS5zcGxpdCgnLCcpO1xuICAgICAgY29uc3QgbGF5ZXIgPSBbXTtcblxuICAgICAgZGF0YUxpc3QuZWFjaChlbG0gPT4ge1xuICAgICAgICBjb25zdCBudW0gPSBwYXJzZUludChlbG0sIDEwKTtcbiAgICAgICAgbGF5ZXIucHVzaChudW0pO1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiBsYXllcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQkFTRTY044OR44O844K5XG4gICAgICogaHR0cDovL3RoZWthbm5vbi1zZXJ2ZXIuYXBwc3BvdC5jb20vaGVycGl0eS1kZXJwaXR5LmFwcHNwb3QuY29tL3Bhc3RlYmluLmNvbS83NUtrczBXSFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX3BhcnNlQmFzZTY0OiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICBjb25zdCBkYXRhTGlzdCA9IGF0b2IoZGF0YS50cmltKCkpO1xuICAgICAgY29uc3QgcnN0ID0gW107XG5cbiAgICAgIGRhdGFMaXN0ID0gZGF0YUxpc3Quc3BsaXQoJycpLm1hcChlID0+IGUuY2hhckNvZGVBdCgwKSk7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwLCBsZW4gPSBkYXRhTGlzdC5sZW5ndGggLyA0OyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgY29uc3QgbiA9IGRhdGFMaXN0W2kqNF07XG4gICAgICAgIHJzdFtpXSA9IHBhcnNlSW50KG4sIDEwKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJzdDtcbiAgICB9LFxuICB9KTtcblxufSk7IiwicGhpbmEuZGVmaW5lKFwiQWZ0ZXJCYW5uZXJcIiwge1xuICBzdXBlckNsYXNzOiAncGhpbmEuYWNjZXNzb3J5LkFjY2Vzc29yeScsXG5cbiAgaW5pdDogZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgdGhpcy5zdXBlckluaXQodGFyZ2V0KTtcblxuICAgIHRoaXMuaXNEaXNhYmxlID0gZmFsc2U7XG4gICAgdGhpcy5sYXllciA9IG51bGw7XG4gICAgdGhpcy5vZmZzZXQgPSBWZWN0b3IyKDAsIDApO1xuICAgIHRoaXMudmVsb2NpdHkgPSBWZWN0b3IyKDAsIDApO1xuICAgIHRoaXMuYmVmb3JlID0gbnVsbDtcbiAgfSxcblxuICBzZXRMYXllcjogZnVuY3Rpb24obGF5ZXIpIHtcbiAgICB0aGlzLmxheWVyID0gbGF5ZXI7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0sXG5cbiAgZW5hYmxlOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlzRGlzYWJsZSA9IGZhbHNlO1xuICAgIHJldHVybiB0aGlzO1xuICB9LFxuXG4gIGRpc2FibGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuaXNEaXNhYmxlID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBzZXRPZmZzZXQ6IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgaWYgKHggaW5zdGFuY2VvZiBWZWN0b3IyKSB7XG4gICAgICB0aGlzLm9mZnNldC5zZXQoeC54LCB4LnkpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHRoaXMub2Zmc2V0LnNldCh4LCB5KTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICBzZXRWZWxvY2l0eTogZnVuY3Rpb24oeCwgeSkge1xuICAgIGlmICh4IGluc3RhbmNlb2YgVmVjdG9yMikge1xuICAgICAgdGhpcy52ZWxvY2l0eSA9IHguY2xvbmUoKS5tdWwoLTEpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHRoaXMudmVsb2NpdHkueCA9IHg7XG4gICAgdGhpcy52ZWxvY2l0eS54ID0geTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmlzRGlzYWJsZSkge1xuICAgICAgdGhpcy5iZWZvcmUgPSBudWxsO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB0YXJnZXQgPSB0aGlzLnRhcmdldDtcbiAgICBjb25zdCBvcHRpb25zID0geyBzY2FsZTogMC4zIH07XG4gICAgY29uc3QgcG9zID0gdGFyZ2V0LnBvc2l0aW9uLmNsb25lKCkuYWRkKHRoaXMub2Zmc2V0KTtcbiAgICBpZiAodGhpcy5iZWZvcmUpIHtcbiAgICAgIGNvbnN0IGRpcyA9IHRhcmdldC5wb3NpdGlvbi5kaXN0YW5jZSh0aGlzLmJlZm9yZSk7XG4gICAgICBjb25zdCBudW1TcGxpdCA9IE1hdGgubWF4KE1hdGguZmxvb3IoZGlzIC8gMyksIDYpO1xuICAgICAgY29uc3QgdW5pdFNwbGl0ID0gKDEgLyBudW1TcGxpdCk7XG4gICAgICBudW1TcGxpdC50aW1lcyhpID0+IHtcbiAgICAgICAgY29uc3QgcGVyID0gdW5pdFNwbGl0ICogaTtcbiAgICAgICAgY29uc3QgcFBvcyA9IFZlY3RvcjIocG9zLnggKiBwZXIgKyB0aGlzLmJlZm9yZS54ICogKDEgLSBwZXIpLCBwb3MueSAqIHBlciArIHRoaXMuYmVmb3JlLnkgKiAoMSAtIHBlcikpXG4gICAgICAgIFBhcnRpY2xlU3ByaXRlKG9wdGlvbnMpXG4gICAgICAgICAgLnNldFBvc2l0aW9uKHBQb3MueCwgcFBvcy55KVxuICAgICAgICAgIC5hZGRDaGlsZFRvKHRoaXMubGF5ZXIpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLmJlZm9yZS5zZXQocG9zLngsIHBvcy55KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5iZWZvcmUgPSBWZWN0b3IyKHBvcy54LCBwb3MueSk7XG4gICAgfVxuICB9LFxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJQYXJ0aWNsZVwiLCB7XG4gIHN1cGVyQ2xhc3M6ICdwaGluYS5kaXNwbGF5LkNpcmNsZVNoYXBlJyxcblxuICBfc3RhdGljOiB7XG4gICAgZGVmYXVsdENvbG9yOiB7XG4gICAgICBzdGFydDogMTAsIC8vIGNvbG9yIGFuZ2xlIOOBrumWi+Wni+WApFxuICAgICAgZW5kOiAzMCwgICAvLyBjb2xvciBhbmdsZSDjga7ntYLkuoblgKRcbiAgICB9LFxuICAgIGRlZmF1bFNjYWxlOiAxLCAgICAgLy8g5Yid5pyf44K544Kx44O844OrXG4gICAgc2NhbGVEZWNheTogMC4wMywgIC8vIOOCueOCseODvOODq+ODgOOCpuODs+OBruOCueODlOODvOODiVxuICB9LFxuICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdGhpcy5vcHRpb25zID0gKG9wdGlvbnMgfHwge30pLiRzYWZlKHsgc3Ryb2tlOiBmYWxzZSwgcmFkaXVzOiAyNCwgc2NhbGU6IDEuMCB9KTtcbiAgICB0aGlzLnN1cGVySW5pdCh0aGlzLm9wdGlvbnMpO1xuXG4gICAgdGhpcy5ibGVuZE1vZGUgPSAnbGlnaHRlcic7XG5cbiAgICBjb25zdCBjb2xvciA9IHRoaXMub3B0aW9ucy5jb2xvciB8fCBQYXJ0aWNsZS5kZWZhdWx0Q29sb3I7XG4gICAgY29uc3QgZ3JhZCA9IHRoaXMuY2FudmFzLmNvbnRleHQuY3JlYXRlUmFkaWFsR3JhZGllbnQoMCwgMCwgMCwgMCwgMCwgdGhpcy5yYWRpdXMpO1xuICAgIGdyYWQuYWRkQ29sb3JTdG9wKDAsICdoc2xhKHswfSwgNzUlLCA1MCUsIDEuMCknLmZvcm1hdChNYXRoLnJhbmRpbnQoY29sb3Iuc3RhcnQsIGNvbG9yLmVuZCkpKTtcbiAgICBncmFkLmFkZENvbG9yU3RvcCgxLCAnaHNsYSh7MH0sIDc1JSwgNTAlLCAwLjApJy5mb3JtYXQoTWF0aC5yYW5kaW50KGNvbG9yLnN0YXJ0LCBjb2xvci5lbmQpKSk7XG5cbiAgICB0aGlzLmZpbGwgPSBncmFkO1xuXG4gICAgdGhpcy5iZWdpblBvc2l0aW9uID0gVmVjdG9yMigpO1xuICAgIHRoaXMudmVsb2NpdHkgPSB0aGlzLm9wdGlvbnMudmVsb2NpdHkgfHwgVmVjdG9yMigwLCAwKTtcbiAgICB0aGlzLm9uZShcImVudGVyZnJhbWVcIiwgKCkgPT4gdGhpcy5yZXNldCgpKTtcbiAgfSxcblxuICByZXNldDogZnVuY3Rpb24oeCwgeSkge1xuICAgIHggPSB4IHx8IHRoaXMueDtcbiAgICB5ID0geSB8fCB0aGlzLnk7XG4gICAgdGhpcy5iZWdpblBvc2l0aW9uLnNldCh4LCB5KTtcbiAgICB0aGlzLnBvc2l0aW9uLnNldCh0aGlzLmJlZ2luUG9zaXRpb24ueCwgdGhpcy5iZWdpblBvc2l0aW9uLnkpO1xuICAgIHRoaXMuc2NhbGVYID0gdGhpcy5zY2FsZVkgPSB0aGlzLm9wdGlvbnMuc2NhbGUgfHwgTWF0aC5yYW5kZmxvYXQoUGFydGljbGUuZGVmYXVsU2NhbGUgKiAwLjgsIFBhcnRpY2xlLmRlZmF1bFNjYWxlICogMS4yKTtcbiAgfSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucG9zaXRpb24uYWRkKHRoaXMudmVsb2NpdHkpO1xuICAgIHRoaXMudmVsb2NpdHkueCAqPSAwLjk5O1xuICAgIHRoaXMudmVsb2NpdHkueSAqPSAwLjk5O1xuICAgIHRoaXMuc2NhbGVYIC09IFBhcnRpY2xlLnNjYWxlRGVjYXk7XG4gICAgdGhpcy5zY2FsZVkgLT0gUGFydGljbGUuc2NhbGVEZWNheTtcblxuICAgIGlmICh0aGlzLnNjYWxlWCA8IDApIHRoaXMucmVtb3ZlKCk7XG4gIH0sXG5cbiAgc2V0VmVsb2NpdHk6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICBpZiAoeCBpbnN0YW5jZW9mIFZlY3RvcjIpIHtcbiAgICAgIHRoaXMudmVsb2NpdHkgPSB4O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHRoaXMudmVsb2NpdHkueCA9IHg7XG4gICAgdGhpcy52ZWxvY2l0eS54ID0geTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJQYXJ0aWNsZVNwcml0ZVwiLCB7XG4gIHN1cGVyQ2xhc3M6ICdwaGluYS5kaXNwbGF5LlNwcml0ZScsXG5cbiAgX3N0YXRpYzoge1xuICAgIGRlZmF1bHRTY2FsZTogMS4wLCAgICAvLyDliJ3mnJ/jgrnjgrHjg7zjg6tcbiAgICBzY2FsZURlY2F5OiAwLjAxLCAgLy8g44K544Kx44O844Or44OA44Km44Oz44Gu44K544OU44O844OJXG4gIH0sXG4gIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB0aGlzLnN1cGVySW5pdChcInBhcnRpY2xlXCIsIDE2LCAxNik7XG5cbiAgICB0aGlzLmJsZW5kTW9kZSA9ICdsaWdodGVyJztcblxuICAgIHRoaXMuYmVnaW5Qb3NpdGlvbiA9IFZlY3RvcjIoKTtcbiAgICB0aGlzLnZlbG9jaXR5ID0gb3B0aW9ucy52ZWxvY2l0eSB8fCBWZWN0b3IyKDAsIDApO1xuICAgIHRoaXMuc2NhbGVYID0gdGhpcy5zY2FsZVkgPSBvcHRpb25zLnNjYWxlIHx8IFBhcnRpY2xlU3ByaXRlLmRlZmF1bHRTY2FsZTtcbiAgICB0aGlzLnNjYWxlRGVjYXkgPSBvcHRpb25zLnNjYWxlRGVjYXkgfHwgUGFydGljbGVTcHJpdGUuc2NhbGVEZWNheTtcbiAgfSxcblxuICB1cGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMucG9zaXRpb24uYWRkKHRoaXMudmVsb2NpdHkpO1xuICAgIHRoaXMudmVsb2NpdHkueCAqPSAwLjk5O1xuICAgIHRoaXMudmVsb2NpdHkueSAqPSAwLjk5O1xuICAgIHRoaXMuc2NhbGVYIC09IHRoaXMuc2NhbGVEZWNheTtcbiAgICB0aGlzLnNjYWxlWSAtPSB0aGlzLnNjYWxlRGVjYXk7XG5cbiAgICBpZiAodGhpcy5zY2FsZVggPCAwKSB0aGlzLnJlbW92ZSgpO1xuICB9LFxuXG4gIHNldFZlbG9jaXR5OiBmdW5jdGlvbih4LCB5KSB7XG4gICAgaWYgKHggaW5zdGFuY2VvZiBWZWN0b3IyKSB7XG4gICAgICB0aGlzLnZlbG9jaXR5ID0geC5jbG9uZSgpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuICAgIHRoaXMudmVsb2NpdHkueCA9IHg7XG4gICAgdGhpcy52ZWxvY2l0eS54ID0geTtcbiAgICByZXR1cm4gdGhpcztcbiAgfSxcblxufSk7XG4iLCJwaGluYS5kZWZpbmUoXCJCdWxsZXRcIiwge1xuICBzdXBlckNsYXNzOiAncGhpbmEuZGlzcGxheS5EaXNwbGF5RWxlbWVudCcsXG5cbiAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHRoaXMuc3VwZXJJbml0KG9wdGlvbnMpO1xuICB9LFxuXG59KTtcblxuIiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRlZmluZSgnRW5lbXl5RmlnaHRlcicsIHtcbiAgICBzdXBlckNsYXNzOiAnQmFzZVVuaXQnLFxuXG4gICAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICB0aGlzLnN1cGVySW5pdChvcHRpb25zLiRzYWZlKHsgd2lkdGg6IDMyLCBoZWlnaHQ6IDMyIH0pKTtcblxuICAgICAgdGhpcy5zcHJpdGUgPSBTcHJpdGUoXCJmaWdodGVyXCIsIDMyLCAzMilcbiAgICAgICAgLnNldEZyYW1lSW5kZXgoMClcbiAgICAgICAgLmFkZENoaWxkVG8odGhpcy5iYXNlKTtcblxuICAgICAgdGhpcy5wbGF5ZXIgPSBvcHRpb25zLnBsYXllcjtcbiAgICAgIHRoaXMudmVsb2NpdHkgPSBWZWN0b3IyKDAsIDApO1xuICAgICAgdGhpcy5hbmdsZSA9IDA7XG4gICAgICB0aGlzLnNwZWVkID0gMTA7XG4gICAgICB0aGlzLnRpbWUgPSAwO1xuXG4gICAgICB0aGlzLmFmdGVyQmFubmVyID0gQWZ0ZXJCYW5uZXIoKVxuICAgICAgICAuc2V0TGF5ZXIodGhpcy53b3JsZC5tYXBMYXllcltMQVlFUl9FRkZFQ1RfQkFDS10pXG4gICAgICAgIC5hdHRhY2hUbyh0aGlzKTtcbiAgICB9LFxuXG4gICAgdXBkYXRlOiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnN0IHRvUGxheWVyID0gVmVjdG9yMih0aGlzLnBsYXllci54IC0gdGhpcy54ICx0aGlzLnBsYXllci55IC0gdGhpcy55KVxuICAgICAgaWYgKHRvUGxheWVyLmxlbmd0aCgpID4gMzApIHtcbiAgICAgICAgLy/oh6rliIbjgYvjgonopovjgZ/jg5fjg6zjgqTjg6Tjg7zjga7mlrnop5JcbiAgICAgICAgY29uc3QgciA9IE1hdGguYXRhbjIodG9QbGF5ZXIueSwgdG9QbGF5ZXIueCk7XG4gICAgICAgIGxldCBkID0gKHIudG9EZWdyZWUoKSArIDkwKTtcbiAgICAgICAgaWYgKGQgPCAwKSBkICs9IDM2MDtcbiAgICAgICAgaWYgKGQgPiAzNjApIGQgLT0gMzYwO1xuICAgICAgICB0aGlzLmFuZ2xlID0gTWF0aC5mbG9vcihkIC8gMjIuNSk7XG4gICAgICAgIHRoaXMuc3ByaXRlLnNldEZyYW1lSW5kZXgodGhpcy5hbmdsZSk7XG4gICAgICAgIHRoaXMudmVsb2NpdHkuYWRkKFZlY3RvcjIoTWF0aC5jb3MocikgKiB0aGlzLnNwZWVkLCBNYXRoLnNpbihyKSAqIHRoaXMuc3BlZWQpKTtcbiAgICAgICAgdGhpcy52ZWxvY2l0eS5ub3JtYWxpemUoKTtcbiAgICAgICAgdGhpcy52ZWxvY2l0eS5tdWwodGhpcy5zcGVlZCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMucG9zaXRpb24uYWRkKHRoaXMudmVsb2NpdHkpO1xuXG4gICAgICB0aGlzLnRpbWUrKztcbiAgICB9LFxuICB9KTtcbn0pO1xuIiwicGhpbmEuZGVmaW5lKFwiTGFzZXJcIiwge1xuICBzdXBlckNsYXNzOiAncGhpbmEuZGlzcGxheS5EaXNwbGF5RWxlbWVudCcsXG5cbiAgX3N0YXRpYzoge1xuICAgIGRlZmF1bHRPcHRpb25zOiB7XG4gICAgICBsZW5ndGg6IDUwMCxcbiAgICB9LFxuICB9LFxuXG4gIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSAob3B0aW9ucyB8fCB7fSkuJHNhZmUoTGFzZXIuZGVmYXVsdE9wdGlvbnMpO1xuICAgIHRoaXMuc3VwZXJJbml0KG9wdGlvbnMpO1xuICAgIHRoaXMuc3ByaXRlID0gUmVjdGFuZ2xlU2hhcGUoeyB3aWR0aDogOCwgaGVpZ2h0OiB0aGlzLm9wdGlvbnMubGVuZ3RoIH0pLmFkZENoaWxkVG8odGhpcyk7XG4gIH0sXG5cbn0pO1xuXG4iLCJjb25zdCBvZmZzZXQgPSBbXG4gIFsge3g6IC0zLCB5OiAgMH0sIHt4OiAgMywgeTogIDB9LCBdLCAvLyAgMCDkuIpcblxuICBbIHt4OiAtMywgeTogIDJ9LCB7eDogIDMsIHk6IC0yfSwgXSwgLy8gIDFcbiAgWyB7eDogLTMsIHk6ICAyfSwge3g6ICAyLCB5OiAgMH0sIF0sIC8vICAyXG4gIFsge3g6IC0zLCB5OiAgM30sIHt4OiAgMCwgeTogLTF9LCBdLCAvLyAgM1xuXG4gIFsge3g6ICAwLCB5OiAgMH0sIHt4OiAgMCwgeTogIDB9LCBdLCAvLyAgNCDlt6ZcblxuICBbIHt4OiAtMywgeTogIDB9LCB7eDogIDMsIHk6ICAwfSwgXSwgLy8gIDVcbiAgWyB7eDogLTEsIHk6IC0yfSwge3g6ICAyLCB5OiAgMn0sIF0sIC8vICA2XG4gIFsge3g6IC0zLCB5OiAtMn0sIHt4OiAgMywgeTogIDB9LCBdLCAvLyAgN1xuXG4gIFsge3g6ICAzLCB5OiAgMH0sIHt4OiAtMywgeTogIDB9LCBdLCAvLyAgOCDkuItcblxuICBbIHt4OiAgMywgeTogLTJ9LCB7eDogLTMsIHk6ICAwfSwgXSwgLy8gIDlcbiAgWyB7eDogIDEsIHk6IC0yfSwge3g6IC0yLCB5OiAgMn0sIF0sIC8vIDEwXG4gIFsge3g6ICAzLCB5OiAgMH0sIHt4OiAtMywgeTogIDB9LCBdLCAvLyAxMVxuXG4gIFsge3g6ICAwLCB5OiAgMH0sIHt4OiAgMCwgeTogIDB9LCBdLCAvLyAxMiDlj7NcblxuICBbIHt4OiAtMywgeTogIDN9LCB7eDogIDAsIHk6IC0xfSwgXSwgLy8gMTNcbiAgWyB7eDogIDMsIHk6ICAyfSwge3g6IC0yLCB5OiAgMH0sIF0sIC8vIDE0XG4gIFsge3g6ICAzLCB5OiAgMn0sIHt4OiAtMywgeTogLTJ9LCBdLCAvLyAxNVxuXTtcblxucGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIHBoaW5hLmRlZmluZSgnUGxheWVyJywge1xuICAgIHN1cGVyQ2xhc3M6ICdCYXNlVW5pdCcsXG5cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICB0aGlzLnN1cGVySW5pdChvcHRpb25zLiRzYWZlKHsgd2lkdGg6IDMyLCBoZWlnaHQ6IDMyIH0pKTtcblxuICAgICAgdGhpcy5zcHJpdGUgPSBTcHJpdGUoXCJmaWdodGVyXCIsIDMyLCAzMilcbiAgICAgICAgLnNldEZyYW1lSW5kZXgoNClcbiAgICAgICAgLmFkZENoaWxkVG8odGhpcy5iYXNlKTtcbiAgICB9LFxuXG4gICAgdXBkYXRlOiBmdW5jdGlvbigpIHtcbiAgICB9LFxuXG4gIH0pO1xufSk7XG4iLCJwaGluYS5uYW1lc3BhY2UoZnVuY3Rpb24oKSB7XG5cbiAgcGhpbmEuZGVmaW5lKCdXb3JsZCcsIHtcbiAgICBzdXBlckNsYXNzOiAnRGlzcGxheUVsZW1lbnQnLFxuXG4gICAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICAgIHRoaXMuc2V0dXAoKTtcblxuICAgICAgdGhpcy50aW1lID0gMDtcbiAgICB9LFxuXG4gICAgc2V0dXA6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5tYXBCYXNlID0gRGlzcGxheUVsZW1lbnQoKVxuICAgICAgICAuc2V0UG9zaXRpb24oU0NSRUVOX1dJRFRIX0hBTEYsIFNDUkVFTl9IRUlHSFRfSEFMRilcbiAgICAgICAgLmFkZENoaWxkVG8odGhpcyk7XG5cbiAgICAgIC8v44Os44Kk44Ok44O85qeL56+JXG4gICAgICB0aGlzLm1hcExheWVyID0gW107XG4gICAgICAoTlVNX0xBWUVSUykudGltZXMoaSA9PiB7XG4gICAgICAgIGNvbnN0IGxheWVyID0gRGlzcGxheUVsZW1lbnQoKS5hZGRDaGlsZFRvKHRoaXMubWFwQmFzZSk7XG4gICAgICAgIHRoaXMubWFwTGF5ZXJbaV0gPSBsYXllcjtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLnBsYXllciA9IFBsYXllcih7IHdvcmxkOiB0aGlzIH0pXG4gICAgICAgIC5zZXRQb3NpdGlvbigtU0NSRUVOX1dJRFRIX0hBTEYgKyA2NCwgMClcbiAgICAgICAgLmFkZENoaWxkVG8odGhpcy5tYXBMYXllcltMQVlFUl9QTEFZRVJdKTtcblxuICAgICAgdGhpcy5zZXR1cE1hcCgpO1xuICAgIH0sXG5cbiAgICB1cGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5jb250cm9sUGxheWVyKCk7XG4gICAgICB0aGlzLnRpbWUrKztcbiAgICB9LFxuXG4gICAgc2V0dXBNYXA6IGZ1bmN0aW9uKCkge1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMDA7IGkrKykge1xuICAgICAgICBSZWN0YW5nbGVTaGFwZSh7XG4gICAgICAgICAgd2lkdGg6IE1hdGgucmFuZGludCg1MCwgMTAwKSxcbiAgICAgICAgICBoZWlnaHQ6IE1hdGgucmFuZGludCg1MCwgMTAwKSxcbiAgICAgICAgICBmaWxsOiAnYmx1ZScsXG4gICAgICAgICAgc3Ryb2tlOiAnI2FhYScsXG4gICAgICAgICAgc3Ryb2tlV2lkdGg6IDQsXG4gICAgICAgICAgY29ybmVyUmFkaXVzOiAwLFxuICAgICAgICAgIHg6IE1hdGgucmFuZGludCgtMTAwMCwgMTAwMCksXG4gICAgICAgICAgeTogTWF0aC5yYW5kaW50KC0xMDAwLCAxMDAwKSxcbiAgICAgICAgfSkuYWRkQ2hpbGRUbyh0aGlzLm1hcExheWVyW0xBWUVSX0JBQ0tHUk9VTkRdKTtcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgY29udHJvbFBsYXllcjogZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCBwbGF5ZXIgPSB0aGlzLnBsYXllcjtcbiAgICAgIGNvbnN0IGN0ID0gcGhpbmFfYXBwLmNvbnRyb2xsZXI7XG4gICAgICBpZiAoY3QudXApIHtcbiAgICAgICAgcGxheWVyLnNwZWVkIC09IDAuMjtcbiAgICAgICAgaWYgKHBsYXllci5zcGVlZCA8IC00KSBwbGF5ZXIuc3BlZWQgPSAtNDtcbiAgICAgIH0gZWxzZSBpZiAoY3QuZG93bikge1xuICAgICAgICBwbGF5ZXIuc3BlZWQgKz0gMC4yO1xuICAgICAgICBpZiAocGxheWVyLnNwZWVkID4gNCkgcGxheWVyLnNwZWVkID0gNDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBsYXllci5zcGVlZCAqPSAwLjk4O1xuICAgICAgfVxuICAgICAgcGxheWVyLnkgKz0gcGxheWVyLnNwZWVkO1xuICAgIH0sXG4gIH0pO1xuXG59KTtcbiIsIi8vXG4vLyDjgrfjg7zjg7Pjgqjjg5Xjgqfjgq/jg4jjga7ln7rnpI7jgq/jg6njgrlcbi8vXG5waGluYS5kZWZpbmUoXCJTY2VuZUVmZmVjdEJhc2VcIiwge1xuICBzdXBlckNsYXNzOiBcIklucHV0SW50ZXJjZXB0XCIsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB0aGlzLmVuYWJsZSgpO1xuICB9LFxuXG59KTtcbiIsIi8vXG4vLyDjgrfjg7zjg7Pjgqjjg5Xjgqfjgq/jg4jvvJropIfmlbDjga7lhobjgafjg5Xjgqfjg7zjg4njgqTjg7PjgqLjgqbjg4hcbi8vXG5waGluYS5kZWZpbmUoXCJTY2VuZUVmZmVjdENpcmNsZUZhZGVcIiwge1xuICBzdXBlckNsYXNzOiBcIlNjZW5lRWZmZWN0QmFzZVwiLFxuXG4gIGluaXQ6IGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICB0aGlzLm9wdGlvbnMgPSAoe30pLiRzYWZlKG9wdGlvbnMsIFNjZW5lRWZmZWN0Q2lyY2xlRmFkZS5kZWZhdWx0cyk7XG5cbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICB9LFxuXG4gIF9jcmVhdGVDaXJjbGU6IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IG51bSA9IDU7XG4gICAgY29uc3Qgd2lkdGggPSBTQ1JFRU5fV0lEVEggLyBudW07XG4gICAgcmV0dXJuIEFycmF5LnJhbmdlKChTQ1JFRU5fSEVJR0hUIC8gd2lkdGgpICsgMSkubWFwKHkgPT4ge1xuICAgICAgcmV0dXJuIEFycmF5LnJhbmdlKG51bSArIDEpLm1hcCh4ID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWRkQ2hpbGQoQ2lyY2xlU2hhcGUoe1xuICAgICAgICAgIHg6IHggKiB3aWR0aCxcbiAgICAgICAgICB5OiB5ICogd2lkdGgsXG4gICAgICAgICAgZmlsbDogdGhpcy5vcHRpb25zLmNvbG9yLFxuICAgICAgICAgIHN0cm9rZTogbnVsbCxcbiAgICAgICAgICByYWRpdXM6IHdpZHRoICogMC41LFxuICAgICAgICB9KSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICBiZWdpbjogZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgY2lyY2xlcyA9IHRoaXMuX2NyZWF0ZUNpcmNsZSgpO1xuICAgIGNvbnN0IHRhc2tzID0gW107XG4gICAgY2lyY2xlcy5mb3JFYWNoKCh4TGluZSwgeSkgPT4ge1xuICAgICAgeExpbmUuZm9yRWFjaCgoY2lyY2xlLCB4KSA9PiB7XG4gICAgICAgIGNpcmNsZS5zY2FsZVggPSAwO1xuICAgICAgICBjaXJjbGUuc2NhbGVZID0gMDtcbiAgICAgICAgdGFza3MucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICBjaXJjbGUudHdlZW5lci5jbGVhcigpXG4gICAgICAgICAgICAudG8oe1xuICAgICAgICAgICAgICBzY2FsZVg6IDEuNSxcbiAgICAgICAgICAgICAgc2NhbGVZOiAxLjVcbiAgICAgICAgICAgIH0sIDUwMCwgXCJlYXNlT3V0UXVhZFwiKVxuICAgICAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgICAgICBjaXJjbGUucmVtb3ZlKCk7XG4gICAgICAgICAgICAgIGNpcmNsZS5kZXN0cm95Q2FudmFzKCk7XG4gICAgICAgICAgICAgIHRoaXMuY2hpbGRyZW4uY2xlYXIoKTtcbiAgICAgICAgICAgICAgdGhpcy5kaXNhYmxlKCk7XG4gICAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHJldHVybiBQcm9taXNlLmFsbCh0YXNrcyk7XG4gIH0sXG5cbiAgZmluaXNoOiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmNoaWxkcmVuLmNsZWFyKCk7XG5cbiAgICBjb25zdCBjaXJjbGVzID0gdGhpcy5fY3JlYXRlQ2lyY2xlKCk7XG4gICAgY29uc3QgdGFza3MgPSBbXTtcbiAgICBjaXJjbGVzLmZvckVhY2goeExpbmUgPT4ge1xuICAgICAgeExpbmUuZm9yRWFjaChjaXJjbGUgPT4ge1xuICAgICAgICBjaXJjbGUuc2NhbGVYID0gMS41O1xuICAgICAgICBjaXJjbGUuc2NhbGVZID0gMS41O1xuICAgICAgICB0YXNrcy5wdXNoKG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICAgIGNpcmNsZS50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAgIC50byh7XG4gICAgICAgICAgICAgIHNjYWxlWDogMCxcbiAgICAgICAgICAgICAgc2NhbGVZOiAwXG4gICAgICAgICAgICB9LCA1MDAsIFwiZWFzZU91dFF1YWRcIilcbiAgICAgICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICAgICAgY2lyY2xlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICBjaXJjbGUuZGVzdHJveUNhbnZhcygpO1xuICAgICAgICAgICAgICB0aGlzLmNoaWxkcmVuLmNsZWFyKCk7XG4gICAgICAgICAgICAgIHRoaXMuZGlzYWJsZSgpO1xuICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHRhc2tzKTtcbiAgfSxcblxuICBfc3RhdGljOiB7XG4gICAgZGVmYXVsdHM6IHtcbiAgICAgIGNvbG9yOiBcIndoaXRlXCIsXG4gICAgfVxuICB9XG5cbn0pO1xuIiwiLy9cbi8vIOOCt+ODvOODs+OCqOODleOCp+OCr+ODiO+8muODleOCp+ODvOODieOCpOODs+OCouOCpuODiFxuLy9cbnBoaW5hLmRlZmluZShcIlNjZW5lRWZmZWN0RmFkZVwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiU2NlbmVFZmZlY3RCYXNlXCIsXG5cbiAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucykge1xuICAgIHRoaXMub3B0aW9ucyA9ICh7fSkuJHNhZmUob3B0aW9ucywge1xuICAgICAgY29sb3I6IFwiYmxhY2tcIixcbiAgICAgIHRpbWU6IDUwMCxcbiAgICB9KTtcblxuICAgIHRoaXMuc3VwZXJJbml0KCk7XG4gICAgdGhpcy5mcm9tSlNPTih7XG4gICAgICBjaGlsZHJlbjoge1xuICAgICAgICBmYWRlOiB7XG4gICAgICAgICAgY2xhc3NOYW1lOiBcIlJlY3RhbmdsZVNoYXBlXCIsXG4gICAgICAgICAgYXJndW1lbnRzOiB7XG4gICAgICAgICAgICB3aWR0aDogU0NSRUVOX1dJRFRILFxuICAgICAgICAgICAgaGVpZ2h0OiBTQ1JFRU5fSEVJR0hULFxuICAgICAgICAgICAgZmlsbDogdGhpcy5vcHRpb25zLmNvbG9yLFxuICAgICAgICAgICAgc3Ryb2tlOiBudWxsLFxuICAgICAgICAgICAgcGFkZGluZzogMCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHg6IFNDUkVFTl9XSURUSCAqIDAuNSxcbiAgICAgICAgICB5OiBTQ1JFRU5fSEVJR0hUICogMC41LFxuICAgICAgICB9LFxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIHN0YXk6IGZ1bmN0aW9uKCkge1xuICAgIGNvbnN0IGZhZGUgPSB0aGlzLmZhZGU7XG4gICAgZmFkZS5hbHBoYSA9IDEuMDtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIH0sXG5cbiAgYmVnaW46IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgIGNvbnN0IGZhZGUgPSB0aGlzLmZhZGU7XG4gICAgICBmYWRlLmFscGhhID0gMS4wO1xuICAgICAgZmFkZS50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgLmZhZGVPdXQodGhpcy5vcHRpb25zLnRpbWUpXG4gICAgICAgIC5jYWxsKCgpID0+IHtcbiAgICAgICAgICAvLzFGcmFtZeaPj+eUu+OBleOCjOOBpuOBl+OBvuOBo+OBpuOBoeOCieOBpOOBj+OBruOBp2VudGVyZnJhbWXjgafliYrpmaRcbiAgICAgICAgICB0aGlzLm9uZShcImVudGVyZnJhbWVcIiwgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5mYWRlLnJlbW92ZSgpO1xuICAgICAgICAgICAgdGhpcy5mYWRlLmRlc3Ryb3lDYW52YXMoKTtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKClcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIGZpbmlzaDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgY29uc3QgZmFkZSA9IHRoaXMuZmFkZTtcbiAgICAgIGZhZGUuYWxwaGEgPSAwLjA7XG4gICAgICBmYWRlLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAuZmFkZUluKHRoaXMub3B0aW9ucy50aW1lKVxuICAgICAgICAuY2FsbCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5mbGFyZShcImZpbmlzaFwiKTtcbiAgICAgICAgICAvLzFGcmFtZeaPj+eUu+OBleOCjOOBpuOBl+OBvuOBo+OBpuOBoeOCieOBpOOBj+OBruOBp2VudGVyZnJhbWXjgafliYrpmaRcbiAgICAgICAgICB0aGlzLm9uZShcImVudGVyZnJhbWVcIiwgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5mYWRlLnJlbW92ZSgpO1xuICAgICAgICAgICAgdGhpcy5mYWRlLmRlc3Ryb3lDYW52YXMoKTtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKClcbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIF9zdGF0aWM6IHtcbiAgICBkZWZhdWx0czoge1xuICAgICAgY29sb3I6IFwiYmxhY2tcIixcbiAgICB9XG4gIH1cblxufSk7XG4iLCIvL1xuLy8g44K344O844Oz44Ko44OV44Kn44Kv44OI77ya44Gq44Gr44KC44GX44Gq44GEXG4vL1xucGhpbmEuZGVmaW5lKFwiU2NlbmVFZmZlY3ROb25lXCIsIHtcbiAgc3VwZXJDbGFzczogXCJTY2VuZUVmZmVjdEJhc2VcIixcblxuICBpbml0OiBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN1cGVySW5pdCgpO1xuICB9LFxuXG4gIGJlZ2luOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICB0aGlzLm9uZShcImVudGVyZnJhbWVcIiwgKCkgPT4gdGhpcy5yZW1vdmUoKSk7XG4gICAgICByZXNvbHZlKCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgZmluaXNoOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICB0aGlzLm9uZShcImVudGVyZnJhbWVcIiwgKCkgPT4gdGhpcy5yZW1vdmUoKSk7XG4gICAgICByZXNvbHZlKCk7XG4gICAgfSk7XG4gIH1cblxufSk7XG4iLCIvL1xuLy8g44K344O844Oz44Ko44OV44Kn44Kv44OI77ya44K/44Kk44Or44OV44Kn44O844OJXG4vL1xucGhpbmEuZGVmaW5lKFwiU2NlbmVFZmZlY3RUaWxlRmFkZVwiLCB7XG4gIHN1cGVyQ2xhc3M6IFwiU2NlbmVFZmZlY3RCYXNlXCIsXG5cbiAgdGlsZXM6IG51bGwsXG4gIG51bTogMTUsXG4gIHNwZWVkOiA1MCxcblxuICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcbiAgICB0aGlzLm9wdGlvbnMgPSAoe30pLiRzYWZlKG9wdGlvbnMsIHtcbiAgICAgIGNvbG9yOiBcImJsYWNrXCIsXG4gICAgICB3aWR0aDogNzY4LFxuICAgICAgaGVpZ2h0OiAxMDI0LFxuICAgIH0pO1xuXG4gICAgdGhpcy50aWxlcyA9IHRoaXMuX2NyZWF0ZVRpbGVzKCk7XG4gIH0sXG5cbiAgX2NyZWF0ZVRpbGVzOiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCB3aWR0aCA9IE1hdGguZmxvb3IodGhpcy5vcHRpb25zLndpZHRoIC8gdGhpcy5udW0pO1xuXG4gICAgcmV0dXJuIEFycmF5LnJhbmdlKCh0aGlzLm9wdGlvbnMuaGVpZ2h0IC8gd2lkdGgpICsgMSkubWFwKHkgPT4ge1xuICAgICAgcmV0dXJuIEFycmF5LnJhbmdlKHRoaXMubnVtICsgMSkubWFwKHggPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5hZGRDaGlsZChSZWN0YW5nbGVTaGFwZSh7XG4gICAgICAgICAgd2lkdGg6IHdpZHRoICsgMixcbiAgICAgICAgICBoZWlnaHQ6IHdpZHRoICsgMixcbiAgICAgICAgICB4OiB4ICogd2lkdGgsXG4gICAgICAgICAgeTogeSAqIHdpZHRoLFxuICAgICAgICAgIGZpbGw6IHRoaXMub3B0aW9ucy5jb2xvcixcbiAgICAgICAgICBzdHJva2U6IG51bGwsXG4gICAgICAgICAgc3Ryb2tlV2lkdGg6IDAsXG4gICAgICAgIH0pKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIHN0YXk6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMudGlsZXMuZm9yRWFjaCgoeGxpbmUsIHkpID0+IHtcbiAgICAgIHhsaW5lLmZvckVhY2goKHRpbGUsIHgpID0+IHtcbiAgICAgICAgdGlsZS5zY2FsZVggPSAxLjA7XG4gICAgICAgIHRpbGUuc2NhbGVZID0gMS4wO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICB9LFxuXG4gIGJlZ2luOiBmdW5jdGlvbigpIHtcbiAgICBjb25zdCB0YXNrcyA9IFtdO1xuICAgIHRoaXMudGlsZXMuZm9yRWFjaCgoeGxpbmUsIHkpID0+IHtcbiAgICAgIGNvbnN0IHcgPSBNYXRoLnJhbmRmbG9hdCgwLCAxKSAqIHRoaXMuc3BlZWQ7XG4gICAgICB4bGluZS5mb3JFYWNoKCh0aWxlLCB4KSA9PiB7XG4gICAgICAgIHRpbGUuc2NhbGVYID0gMS4wO1xuICAgICAgICB0aWxlLnNjYWxlWSA9IDEuMDtcbiAgICAgICAgdGFza3MucHVzaChuZXcgUHJvbWlzZShyZXNvbHZlID0+IHtcbiAgICAgICAgICB0aWxlLnR3ZWVuZXIuY2xlYXIoKVxuICAgICAgICAgICAgLndhaXQoeCAqIHRoaXMuc3BlZWQgKyB3KVxuICAgICAgICAgICAgLnRvKHtcbiAgICAgICAgICAgICAgc2NhbGVYOiAwLFxuICAgICAgICAgICAgICBzY2FsZVk6IDBcbiAgICAgICAgICAgIH0sIDUwMCwgXCJlYXNlT3V0UXVhZFwiKVxuICAgICAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgICAgICB0aWxlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICB0aWxlLmRlc3Ryb3lDYW52YXMoKTtcbiAgICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHRhc2tzKVxuICB9LFxuXG4gIGZpbmlzaDogZnVuY3Rpb24oKSB7XG4gICAgY29uc3QgdGFza3MgPSBbXTtcbiAgICB0aGlzLnRpbGVzLmZvckVhY2goKHhsaW5lLCB5KSA9PiB7XG4gICAgICBjb25zdCB3ID0gTWF0aC5yYW5kZmxvYXQoMCwgMSkgKiB0aGlzLnNwZWVkO1xuICAgICAgeGxpbmUuZm9yRWFjaCgodGlsZSwgeCkgPT4ge1xuICAgICAgICB0aWxlLnNjYWxlWCA9IDAuMDtcbiAgICAgICAgdGlsZS5zY2FsZVkgPSAwLjA7XG4gICAgICAgIHRhc2tzLnB1c2gobmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICAgICAgdGlsZS50d2VlbmVyLmNsZWFyKClcbiAgICAgICAgICAgIC53YWl0KCh4bGluZS5sZW5ndGggLSB4KSAqIHRoaXMuc3BlZWQgKyB3KVxuICAgICAgICAgICAgLnRvKHtcbiAgICAgICAgICAgICAgc2NhbGVYOiAxLFxuICAgICAgICAgICAgICBzY2FsZVk6IDFcbiAgICAgICAgICAgIH0sIDUwMCwgXCJlYXNlT3V0UXVhZFwiKVxuICAgICAgICAgICAgLmNhbGwoKCkgPT4ge1xuICAgICAgICAgICAgICB0aWxlLnJlbW92ZSgpO1xuICAgICAgICAgICAgICB0aWxlLmRlc3Ryb3lDYW52YXMoKTtcbiAgICAgICAgICAgICAgcmVzb2x2ZSgpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHRhc2tzKVxuICB9LFxuXG4gIF9zdGF0aWM6IHtcbiAgICBkZWZhdWx0czoge1xuICAgICAgY29sb3I6IFwiYmxhY2tcIixcbiAgICB9XG4gIH1cblxufSk7XG4iLCIvL1xuLy8g44Kv44Oq44OD44Kv44KE44K/44OD44OB44KS44Kk44Oz44K/44O844K744OX44OI44GZ44KLXG4vL1xucGhpbmEuZGVmaW5lKFwiSW5wdXRJbnRlcmNlcHRcIiwge1xuICBzdXBlckNsYXNzOiBcIkRpc3BsYXlFbGVtZW50XCIsXG5cbiAgaW5pdDogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdXBlckluaXQoKTtcblxuICAgIHRoaXMub24oXCJhZGRlZFwiLCAoKSA9PiB7XG4gICAgICAvL+imquOBq+WvvuOBl+OBpuimhuOBhOOBi+OBtuOBm+OCi1xuICAgICAgdGhpcy53aWR0aCA9IHRoaXMucGFyZW50LndpZHRoO1xuICAgICAgdGhpcy5oZWlnaHQgPSB0aGlzLnBhcmVudC5oZWlnaHQ7XG4gICAgICB0aGlzLm9yaWdpblggPSB0aGlzLnBhcmVudC5vcmlnaW5YIHx8IDA7XG4gICAgICB0aGlzLm9yaWdpblkgPSB0aGlzLnBhcmVudC5vcmlnaW5ZIHx8IDA7XG4gICAgICB0aGlzLnggPSAwO1xuICAgICAgdGhpcy55ID0gMDtcbiAgICB9KTtcbiAgICB0aGlzLmRpc2FibGUoKTtcbiAgfSxcblxuICBlbmFibGU6IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc2V0SW50ZXJhY3RpdmUodHJ1ZSk7XG4gIH0sXG5cbiAgZGlzYWJsZTogZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRJbnRlcmFjdGl2ZShmYWxzZSk7XG4gIH0sXG5cbn0pO1xuIiwicGhpbmEubmFtZXNwYWNlKGZ1bmN0aW9uKCkge1xuXG4gIGxldCBkdW1teVRleHR1cmUgPSBudWxsO1xuXG4gIHBoaW5hLmRlZmluZShcIlNwcml0ZUxhYmVsXCIsIHtcbiAgICBzdXBlckNsYXNzOiBcIkRpc3BsYXlFbGVtZW50XCIsXG5cbiAgICBfdGV4dDogbnVsbCxcbiAgICB0YWJsZTogbnVsbCxcbiAgICBmaXhXaWR0aDogMCxcblxuICAgIHNwcml0ZXM6IG51bGwsXG5cbiAgICBpbml0OiBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICBpZiAoIWR1bW15VGV4dHVyZSkge1xuICAgICAgICBkdW1teVRleHR1cmUgPSBDYW52YXMoKS5zZXRTaXplKDEsIDEpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnN1cGVySW5pdChvcHRpb25zKTtcbiAgICAgIHRoaXMudGFibGUgPSBvcHRpb25zLnRhYmxlO1xuICAgICAgdGhpcy5maXhXaWR0aCA9IG9wdGlvbnMuZml4V2lkdGggfHwgMDtcblxuICAgICAgdGhpcy5zcHJpdGVzID0gW107XG5cbiAgICAgIHRoaXMuc2V0VGV4dChcIlwiKTtcbiAgICB9LFxuXG4gICAgc2V0VGV4dDogZnVuY3Rpb24odGV4dCkge1xuICAgICAgdGhpcy5fdGV4dCA9IHRleHQ7XG5cbiAgICAgIGNvbnN0IGNoYXJzID0gdGhpcy50ZXh0LnNwbGl0KFwiXCIpO1xuXG4gICAgICBpZiAodGhpcy5zcHJpdGVzLmxlbmd0aCA8IGNoYXJzLmxlbmd0aCkge1xuICAgICAgICBBcnJheS5yYW5nZSgwLCB0aGlzLnNwcml0ZXMubGVuZ3RoIC0gY2hhcnMubGVuZ3RoKS5mb3JFYWNoKCgpID0+IHtcbiAgICAgICAgICB0aGlzLnNwcml0ZXMucHVzaChTcHJpdGUoZHVtbXlUZXh0dXJlKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgQXJyYXkucmFuZ2UoMCwgY2hhcnMubGVuZ3RoIC0gdGhpcy5zcHJpdGVzLmxlbmd0aCkuZm9yRWFjaCgoKSA9PiB7XG4gICAgICAgICAgdGhpcy5zcHJpdGVzLmxhc3QucmVtb3ZlKCk7XG4gICAgICAgICAgdGhpcy5zcHJpdGVzLmxlbmd0aCAtPSAxO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fdGV4dC5zcGxpdChcIlwiKS5tYXAoKGMsIGkpID0+IHtcbiAgICAgICAgdGhpcy5zcHJpdGVzW2ldXG4gICAgICAgICAgLnNldEltYWdlKHRoaXMudGFibGVbY10pXG4gICAgICAgICAgLnNldE9yaWdpbih0aGlzLm9yaWdpblgsIHRoaXMub3JpZ2luWSlcbiAgICAgICAgICAuYWRkQ2hpbGRUbyh0aGlzKTtcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCB0b3RhbFdpZHRoID0gdGhpcy5zcHJpdGVzLnJlZHVjZSgodywgcykgPT4gdyArICh0aGlzLmZpeFdpZHRoIHx8IHMud2lkdGgpLCAwKTtcbiAgICAgIGNvbnN0IHRvdGFsSGVpZ2h0ID0gdGhpcy5zcHJpdGVzLm1hcChfID0+IF8uaGVpZ2h0KS5zb3J0KCkubGFzdDtcblxuICAgICAgbGV0IHggPSB0b3RhbFdpZHRoICogLXRoaXMub3JpZ2luWDtcbiAgICAgIHRoaXMuc3ByaXRlcy5mb3JFYWNoKChzKSA9PiB7XG4gICAgICAgIGNvbnN0IHdpZHRoID0gdGhpcy5maXhXaWR0aCB8fCBzLndpZHRoO1xuICAgICAgICBzLnggPSB4ICsgd2lkdGggKiBzLm9yaWdpblg7XG4gICAgICAgIHggKz0gd2lkdGg7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIF9hY2Nlc3Nvcjoge1xuICAgICAgdGV4dDoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLl90ZXh0O1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICB0aGlzLnNldFRleHQodik7XG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG5cbiAgfSk7XG5cbn0pO1xuIl19
