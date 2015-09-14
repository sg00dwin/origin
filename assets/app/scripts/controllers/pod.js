'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:PodController
 * @description
 * # ProjectController
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('PodController', function ($scope, $routeParams, DataService, project) {
    $scope.pod = null;
    $scope.alerts = {};
console.log("is it getting in the controller");
    project.get($routeParams.project).then(function() {
      DataService.get("pods", $routeParams.pod, $scope).then(
        // success
        function(pod) {
          $scope.pod = pod;
        },
        // failure
        function(e) {
          $scope.alerts["load"] = {
            type: "error",
            message: "The pod details could not be loaded.",
            details: e.data
          };
        }
      );
    });
  });
