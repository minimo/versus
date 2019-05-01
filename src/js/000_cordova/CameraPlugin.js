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
