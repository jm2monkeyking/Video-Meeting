var app = angular.module("myApp", []);
app.controller("myCtrl", function ($scope) {
  $scope.join = function () {
    let url = $scope.url;
    if (url) {
      url = url.split("/");
      window.location.href = `/${url[url.length - 1]}`;
    } else {
      url = Math.random().toString(36).substring(2, 7);
      window.location.href = `/${url}`;
    }
  };
});
navigator.serviceWorker
  .register("/sw.js")
  .then((reg) => {})
  .catch((err) => console.log("Boo!", err));

setTimeout(() => {
  const img = new Image();
  img.src = "/static/image/dog.png";
  document.body.appendChild(img);
}, 5000);
