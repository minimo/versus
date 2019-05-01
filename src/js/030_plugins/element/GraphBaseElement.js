phina.namespace(function() {

  phina.define("GraphBaseElement", {
    superClass: 'PlainElement',

    init: function(options) {
      options = (options || {}).$safe({
        width: 200,
        height: 200,
      })
      this.superInit(options);
    },
  });

});