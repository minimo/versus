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
