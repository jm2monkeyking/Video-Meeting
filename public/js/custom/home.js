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
