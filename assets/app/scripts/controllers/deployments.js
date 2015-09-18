'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:DeploymentsController
 * @description
 * # ProjectController
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('DeploymentsController', function ($scope, DataService, $filter, LabelFilter, Logger, ImageStreamResolver, DeploymentsService) {
    $scope.deployments = {};
    $scope.unfilteredDeployments = {};
    // leave undefined so we know when data is loaded
    $scope.deploymentConfigs = undefined;
    $scope.deploymentsByDeploymentConfig = {};
    $scope.podTemplates = {};
    $scope.imageStreams = {};
    $scope.imagesByDockerReference = {};
    $scope.imageStreamImageRefByDockerReference = {}; // lets us determine if a particular container's docker image reference belongs to an imageStream
    $scope.builds = {};
    $scope.labelSuggestions = {};
    $scope.alerts = $scope.alerts || {};
    $scope.emptyMessage = "Loading...";
    $scope.expandedDeploymentConfigRow = {};
    var watches = [];

    function extractPodTemplates() {
      angular.forEach($scope.deployments, function(deployment, deploymentId){
        $scope.podTemplates[deploymentId] = deployment.spec.template;
      });
    }

    watches.push(DataService.watch("replicationcontrollers", $scope, function(deployments, action, deployment) {
      $scope.unfilteredDeployments = deployments.by("metadata.name");
      LabelFilter.addLabelSuggestionsFromResources($scope.unfilteredDeployments, $scope.labelSuggestions);
      LabelFilter.setLabelSuggestions($scope.labelSuggestions);
      $scope.deployments = LabelFilter.getLabelSelector().select($scope.unfilteredDeployments);
      extractPodTemplates();
      ImageStreamResolver.fetchReferencedImageStreamImages($scope.podTemplates, $scope.imagesByDockerReference, $scope.imageStreamImageRefByDockerReference, $scope);
      $scope.emptyMessage = "No deployments to show";
      $scope.deploymentsByDeploymentConfig = DeploymentsService.associateDeploymentsToDeploymentConfig($scope.deployments);
      console.log($scope.deploymentsByDeploymentConfig);
      updateFilterWarning();

      var deploymentConfigName;
      var deploymentName;
      if (deployment) {
        deploymentConfigName = $filter('annotation')(deployment, 'deploymentConfig');
        deploymentName = deployment.metadata.name;
      }
      if (!action) {
        // Loading of the page that will create deploymentConfigDeploymentsInProgress structure, which will associate running deployment to his deploymentConfig.
        $scope.deploymentConfigDeploymentsInProgress = DeploymentsService.associateRunningDeploymentToDeploymentConfig($scope.deploymentsByDeploymentConfig);
      } else if (action === 'ADDED' || (action === 'MODIFIED' && ['New', 'Pending', 'Running'].indexOf(DeploymentsService.deploymentStatus(deployment)) > -1)) {
        // When new deployment id instantiated/cloned, or in case of a retry, associate him to his deploymentConfig and add him into deploymentConfigDeploymentsInProgress structure.
        $scope.deploymentConfigDeploymentsInProgress[deploymentConfigName] = $scope.deploymentConfigDeploymentsInProgress[deploymentConfigName] || {};
        $scope.deploymentConfigDeploymentsInProgress[deploymentConfigName][deploymentName] = deployment;
      } else if (action === 'MODIFIED') {
        // After the deployment ends remove him from the deploymentConfigDeploymentsInProgress structure.
        var status = DeploymentsService.deploymentStatus(deployment);
        if (status === "Complete" || status === "Failed"){
          delete $scope.deploymentConfigDeploymentsInProgress[deploymentConfigName][deploymentName];
        }
      }

      // Extract the causes from the encoded deployment config
      if (deployment) {
        if (action !== "DELETED") {
          deployment.causes = $filter('deploymentCauses')(deployment);
        }
      }
      else {
        angular.forEach($scope.deployments, function(deployment) {
          deployment.causes = $filter('deploymentCauses')(deployment);
        });
      }

      Logger.log("deployments (subscribe)", $scope.deployments);
    }));

    watches.push(DataService.watch("deploymentconfigs", $scope, function(deploymentConfigs) {
      $scope.deploymentConfigs = deploymentConfigs.by("metadata.name");
      Logger.log("deploymentconfigs (subscribe)", $scope.deploymentConfigs);
    }));

    // Sets up subscription for imageStreams
    watches.push(DataService.watch("imagestreams", $scope, function(imageStreams) {
      $scope.imageStreams = imageStreams.by("metadata.name");
      ImageStreamResolver.buildDockerRefMapForImageStreams($scope.imageStreams, $scope.imageStreamImageRefByDockerReference);
      ImageStreamResolver.fetchReferencedImageStreamImages($scope.podTemplates, $scope.imagesByDockerReference, $scope.imageStreamImageRefByDockerReference, $scope);
      Logger.log("imagestreams (subscribe)", $scope.imageStreams);
    }));

    watches.push(DataService.watch("builds", $scope, function(builds) {
      $scope.builds = builds.by("metadata.name");
      Logger.log("builds (subscribe)", $scope.builds);
    }));

    function updateFilterWarning() {
      if (!LabelFilter.getLabelSelector().isEmpty() && $.isEmptyObject($scope.deployments) && !$.isEmptyObject($scope.unfilteredDeployments)) {
        $scope.alerts["deployments"] = {
          type: "warning",
          details: "The active filters are hiding all deployments."
        };
      }
      else {
        delete $scope.alerts["deployments"];
      }
    }

    $scope.startLatestDeployment = function(deploymentConfig) {
      DeploymentsService.startLatestDeployment(deploymentConfig, $scope)
    };

    $scope.retryFailedDeployment = function(deployment) {
      DeploymentsService.retryFailedDeployment(deployment, $scope);
    };

    $scope.rollbackToDeployment = function(deployment, changeScaleSettings, changeStrategy, changeTriggers) {
      DeploymentsService.rollbackToDeployment(deployment, changeScaleSettings, changeStrategy, changeTriggers, $scope);
    };

    $scope.cancelRunningDeployment = function(deployment) {
      DeploymentsService.cancelRunningDeployment(deployment, $scope);
    };

    $scope.deploymentIsLatest = DeploymentsService.deploymentIsLatest;
    $scope.deploymentIsInProgress = DeploymentsService.deploymentIsInProgress;
    $scope.deploymentStatus = DeploymentsService.deploymentStatus;

    LabelFilter.onActiveFiltersChanged(function(labelSelector) {
      // trigger a digest loop
      $scope.$apply(function() {
        $scope.deployments = labelSelector.select($scope.unfilteredDeployments);
        associateDeploymentsToDeploymentConfig();
        updateFilterWarning();
      });
    });

    $scope.$on('$destroy', function(){
      DataService.unwatchAll(watches);
    });
  });
