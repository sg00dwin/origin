'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:PodController
 * @description
 * # ProjectController
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('PodController', function ($scope, $routeParams, DataService, project, $filter) {
    $scope.pod = null;
    $scope.alerts = {};
    $scope.renderOptions = $scope.renderOptions || {};    
    $scope.renderOptions.hideFilterWidget = true;    
    $scope.breadcrumbs = [
      {
        title: "Pods",
        link: "project/" + $routeParams.project + "/browse/pods"
      },
      {
        title: $routeParams.pod
      }
    ];

    var objectWatches = [];

    project.get($routeParams.project).then(function(resp) {
      angular.extend($scope, {
        project: resp[0],
        projectPromise: resp[1].projectPromise
      });
      DataService.get("pods", $routeParams.pod, $scope).then(
        // success
        function(pod) {
          $scope.pod = pod;

          // If we found the item successfully, watch for changes on it
          objectWatches.push(DataService.watchObject("pods", $routeParams.pod, $scope, function(pod, action) {
            if (action === "DELETED") {
              $scope.alerts["deleted"] = {
                type: "warning",
                message: "This pod has been deleted."
              }; 
            }
            $scope.pod = pod;
          }));          
        },
        // failure
        function(e) {
          $scope.alerts["load"] = {
            type: "error",
            message: "The pod details could not be loaded.",
            details: "Reason: " + $filter('getErrorDetails')(e)
          };
        }
      );
    });

    $scope.$on('$destroy', function(){
      DataService.unwatchAllObjects(objectWatches);
    });    
  });
