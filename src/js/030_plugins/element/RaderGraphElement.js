phina.namespace(function() {

  const category = [
    "incentive",
    "uriage",
    "hanbai_tousu",
    "syouhin_futai",
    "seimeihokenkingakuritsu",
  ];

  phina.define("RaderGraphElement", {
    superClass: 'GraphBaseElement',

    //一目盛りごとのピクセル数
    step: 30,

    init: function(options) {
      options = (options || {}).$safe({
        backgroundColor: 'transparent',
        fill: 'transparent',
        stroke: '#63420e',
        strokeWidth: 4,
        width: 600,
        height: 600,
        graphData: {
          data: [
            {
              incentive: 51,
              hanbai_tousu: 67,
              syouhin_futai: 49,
              seimeihokenkingakuritsu: 50,
              uriage: 55,
            },
            {
              incentive: 31,
              hanbai_tousu: 47,
              syouhin_futai: -5,
              seimeihokenkingakuritsu: 30,
              uriage: 80,
            }
          ],
        }
      })
      this.superInit(options);
      this.options = options;

      this.setupLayout();
      this.renderGraph(this.canvas);

      this.progress = 0;
      this.tweener.clear()
        .wait(100)
        .to({ progress: 1.0 }, 500, "easeOutQuad")
        .call(() => this.isUpdate = false);
    },

    update: function() {
      if (this.progress < 1) this.renderGraph(this.canvas);
    },

    setupLayout: function(options) {
    },

    renderGraph: function(canvas) {
      canvas.clear(0, 0, this.width, this.height);

      //中心を0,0にする為のオフセット値
      const offsetX = this.width / 2;
      const offsetY = this.height / 2;

      //レーダーシート
      canvas.beginPath();
      canvas.strokeStyle = "#63420e";
      canvas.lineWidth = 1;

      const degree = Math.PI / 180;
      (5).times(i => {
        //基本線
        const x =  Math.sin(degree * i * 72) * 210;
        const y = -Math.cos(degree * i * 72) * 210;
        canvas.moveTo(offsetX, offsetY);
        canvas.lineTo(x + offsetX, y + offsetY);
      });

      //等高線
      (7).times(level => {
        const r = (level + 1) * 30;
        canvas.moveTo(offsetX, offsetY - r);
        (6).times(i => {
          const x =  Math.sin(degree * i * 72) * r;
          const y = -Math.cos(degree * i * 72) * r;
          canvas.lineTo(x + offsetX, y + offsetY);
        });
      });
      canvas.stroke();

      //等高線（強調）
      canvas.beginPath();
      canvas.lineWidth = 3;
      [5, 7].forEach(level => {
        const r = level * 30;
        canvas.moveTo(offsetX, offsetY - r);
        (6).times(i => {
          const x =  Math.sin(degree * i * 72) * r;
          const y = -Math.cos(degree * i * 72) * r;
          canvas.lineTo(x + offsetX, y + offsetY);
        });
      });
      canvas.stroke();

      //単位あたりのピクセルを計算
      const unit = 3;

      //グラフ描画
      this.options.graphData.data.forEach((graphData, index) => {
        canvas.beginPath();
        canvas.lineWidth = 5;
        canvas.strokeStyle = index == 0 ? "#0000ff" : "#ff0000";
        canvas.fillStyle = index == 0 ? "rgba(0, 0, 255, 0.5)" : "rgba(255, 0, 0, 0.5)"

        let r = Math.max(graphData[category[0]] * unit, 0) * this.progress;
        canvas.moveTo(offsetX, offsetY - r);
        (4).times(i => {
          let r = Math.max(graphData[category[i + 1]] * unit, 0) * this.progress;
          const x =  Math.sin(degree * (i + 1) * 72) * r;
          const y = -Math.cos(degree * (i + 1) * 72) * r;
          canvas.lineTo(x + offsetX, y + offsetY);
        });
        r = Math.max(graphData[category[0]] * unit, 0) * this.progress;
        canvas.lineTo(offsetX, offsetY - r);

        canvas.fill();
        canvas.stroke();
      });
    },

    destroyCanvas: function() {
      this.remove();
      if (!this.canvas) return;
      this.canvas.destroy();
      delete this.canvas;
    }

  });

});
