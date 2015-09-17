'use strict';

angular.module("openshiftConsole")
  .service("BuildsService", function(DataService, $filter){
    return {
      // Function which will 'instantiate' new build from given buildConfigName
      startBuild: function(buildConfigName, $scope) {
        var req = {
          kind: "BuildRequest",
          apiVersion: "v1",
          metadata: {
            name: buildConfigName
          }
        };
        DataService.create("buildconfigs/instantiate", buildConfigName, req, $scope).then(
          function(build) { //success
              $scope.alerts = [
              {
                type: "success",
                message: "Build " + build.metadata.name + " has started."
              }
            ];
          },
          function(result) { //failure
            $scope.alerts = [
              {
                type: "error",
                message: "An error occurred while starting the build.",
                details: $filter('getErrorDetails')(result)
              }
            ];
          }
        );
      },

      cancelBuild: function(build, buildConfigName, $scope) {
        var canceledBuild = angular.copy(build);
        canceledBuild.status.cancelled = true;
        DataService.update("builds", canceledBuild.metadata.name, canceledBuild, $scope).then(
          function() {
              $scope.alerts = [
              {
                type: "success",
                message: "Cancelling build " + build.metadata.name + " of " + buildConfigName + "."
              }
            ];
          },
          function(result) {
            $scope.alerts = [
              {
                type: "error",
                message: "An error occurred cancelling the build.",
                details: $filter('getErrorDetails')(result)
              }
            ];
          }
        );
      },

      // Function which will 'clone' build from given buildName
      cloneBuild: function(buildName, $scope) {
        var req = {
          kind: "BuildRequest",
          apiVersion: "v1",
          metadata: {
            name: buildName
          }
        };
        DataService.create("builds/clone", buildName, req, $scope).then(
          function(build) { //success
              $scope.alerts = [
              {
                type: "success",
                message: "Build " + buildName + " is being rebuilt as " + build.metadata.name + "."
              }
            ];
          },
          function(result) { //failure
            $scope.alerts = [
              {
                type: "error",
                message: "An error occurred while rerunning the build.",
                details: $filter('getErrorDetails')(result)
              }
            ];
          }
        );
      },

      associateRunningBuildToBuildConfig: function(builds) {
        var buildConfigBuildsInProgress = {};
        angular.forEach(builds, function(build, buildName) {
          var buildStatus = build.status.phase;
          if (buildStatus === "New" || buildStatus === "Pending" || buildStatus === "Running") {
            var buildConfigName = build.metadata.labels.buildconfig;
            buildConfigBuildsInProgress[buildConfigName] = buildConfigBuildsInProgress[buildConfigName] || {};
            buildConfigBuildsInProgress[buildConfigName][buildName] = build;
          }
        });
        return buildConfigBuildsInProgress;
      }      
    };
  });