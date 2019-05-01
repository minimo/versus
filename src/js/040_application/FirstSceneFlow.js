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