phina.namespace(function() {

  const month = [
    "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
  ];

  phina.define("LineGraphElement", {
    superClass: 'GraphBaseElement',

    init: function(options) {
      options = (options || {}).$safe({
        backgroundColor: 'transparent',
        fill: 'transparent',
        stroke: '#63420e',
        strokeWidth: 4,
        width: 600,
        height: 600,
        graphData: {
          unitName: "頭数",
          step: 10,
          data: [
            {
              "jul": 10,
              "oct": 61,
              "feb": 55,
              "apr": 70,
              "jun": 55,
              "aug": 100,
              "dec": 90,
              "may": 50,
              "nov": 52,
              "jan": 51,
              "mar": 67,
              "sep": 40
            },
            {
              "jul": 20,
              "oct": 30,
              "feb": 45,
              "apr": 12,
              "jun": 36,
              "aug": 8,
              "dec": 42,
              "may": 42,
              "nov": 33,
              "jan": 89,
              "mar": 65,
              "sep": 20
            },
          ],
        }
      })
      this.superInit(options);
      this.options = options;

      this.setupGraphData();
      this.setupLayout();
      this.renderGraph(this.canvas);

      const now = new Date();
      this.month = now.getMonth() + 1;

      this.progress = 0;
      this.tweener.clear()
        .wait(100)
        .to({ progress: 1.0 }, 1000, "easeOutSine");
    },

    update: function() {
      if (this.progress < 1) this.renderGraph(this.canvas);
    },

    //最大値を上限として、いい感じにグラフを調整する
    setupGraphData: function() {
      //最大値調査
      let max = 0;
      this.options.graphData.data.forEach((data, index) => {
        month.forEach(m => max = Math.max(data[m], max))
      });
      max = Math.max(max, 8); //8が最大値の下限とする

      //最大値の桁数を求める
      const digit = Math.floor(Math.log10(max));

      //ステップ数をキリの良い数に整形
      // const step = Math.floor(max / 8);
      const step = Math.pow(10, digit); //とりあえず10の累乗にする
      this.options.graphData.step = step;
    },

    setupLayout: function(options) {
      //あとで解放する為に使用ラベルを配列に保存
      this.labels = [];

      //横軸表示(月)
      for (let i = 0; i < 12; i++) {
        const x = i * 40 - 256 + 20;
        const lb = Label({
          fill: "#63420e",
          fontSize: 24,
          text: `${i + 1}`,
        }).addChildTo(this)
          .setPosition(x, 220);
        this.labels.push(lb);
      }
      const lb = Label({
        fill: "#63420e",
        fontSize: 24,
        text: `月`,
      }).addChildTo(this)
        .setPosition(250, 220);
      this.labels.push(lb);

      //縦軸表示
      for (let i = 0; i < 9; i++) {
        const y = i * -50 + 150;
        const lb = Label({
          fill: "#63420e",
          fontSize: 32,
          text: i < 8 ? `${this.options.graphData.step * (i + 1)}` : this.options.graphData.unitName,
          allign: "right",
        }).addChildTo(this)
          .setPosition(-280, y);
        this.labels.push(lb);
      }
    },

    renderGraph: function(canvas) {
      canvas.clear(0, 0, this.width, this.height);
      canvas.beginPath();

      //中心を0,0にする為のオフセット値
      const offsetX = Math.floor(this.width * 0.5);
      const offsetY = Math.floor(this.height * 0.5);

      //中心を0とした時のグラフの底辺Y座標
      const graphBottom = 200;

      //横線
      canvas.strokeStyle = "#63420e";
      canvas.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const y = i * 50;
        canvas.moveTo(-256 + offsetX, y + offsetY);
        canvas.lineTo( 256 + offsetX, y + offsetY);
        if (i != 0) {
          canvas.moveTo(-256 + offsetX, -y + offsetY);
          canvas.lineTo( 256 + offsetX, -y + offsetY);
        }
      }

      //横目盛り
      for (let i = 0; i < 12; i++) {
        const x = i * 40 - 256 + 20 + offsetX;
        canvas.moveTo(x, 190 + offsetY);
        canvas.lineTo(x, 200 + offsetY);
      }
      canvas.stroke();

      //単位あたりのピクセルを計算
      const unit = 50 / this.options.graphData.step;

      // グラフ描画
      this.options.graphData.data.forEach((graphData, index) => {
        canvas.beginPath();
        canvas.strokeStyle = index == 0 ? "#0000ff" : "#ff0000";
        canvas.lineWidth = 4;
        for (let i = 0; i < this.month; i++) {
          const value = graphData[month[i]];
          if (value !== undefined && value !== null) {
            const x = i * 40 - 256 + 20 + offsetX;
            const y = graphBottom + offsetY - (value * unit * this.progress);
            if (i == 0) {
              canvas.moveTo(x, y);
            } else {
              canvas.lineTo(x, y);
            }
          }
        }
        canvas.stroke();
      });
    },

    destroyCanvas: function() {
      this.remove();
      if (!this.canvas) return;
      this.canvas.destroy();
      delete this.canvas;
      this.labels.forEach(e => e.destroyCanvas());
    }

  });

});
