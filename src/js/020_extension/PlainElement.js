phina.namespace(function() {

  phina.display.PlainElement.prototype.$method("destroyCanvas", function() {
    this.remove();
    if (!this.canvas) return;
    this.canvas.destroy();
    delete this.canvas;
  });

});
