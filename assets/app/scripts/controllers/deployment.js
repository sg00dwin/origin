'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:PodController
 * @description
 * # ProjectController
 * Controller of the openshiftConsole
 */
angular.module('openshiftConsole')
  .controller('DeploymentController', function ($scope, $routeParams, DataService, project, DeploymentsService, ImageStreamResolver, $filter) {
    $scope.deployment = null;
    $scope.deploymentConfig = null;
    $scope.deployments = {};
    $scope.podTemplates = {};
    $scope.alerts = {};
    $scope.renderOptions = $scope.renderOptions || {};    
    $scope.renderOptions.hideFilterWidget = true;    
    $scope.breadcrumbs = [
      {
        title: "Deployments",
        link: "project/" + $routeParams.project + "/browse/deployments"
      }
    ];
    // if this is an RC it won't have deploymentconfig
    if ($routeParams.deploymentconfig){
      $scope.breadcrumbs.push({
        title: $routeParams.deploymentconfig,
        link: "project/" + $routeParams.project + "/browse/deployment/" + $routeParams.deploymentconfig
      });
    }
    $scope.breadcrumbs.push({
      title: $routeParams.deployment || $routeParams.replicationcontroller
    });

    var watches = [];

    project.get($routeParams.project).then(function(resp) {
      angular.extend($scope, {
        project: resp[0],
        projectPromise: resp[1].projectPromise
      });
      DataService.get("replicationcontrollers", $routeParams.deployment || $routeParams.replicationcontroller, $scope).then(
        // success
        function(deployment) {
          $scope.deployment = deployment;
          var deploymentVersion = $filter("annotation")(deployment, "deploymentVersion")
          if (deploymentVersion) {
            $scope.breadcrumbs[2].title = "#" + deploymentVersion;
          }
          $scope.deploymentConfigName = $filter("annotation") (deployment, "deploymentConfig");
        },
        // failure
        function(e) {
          $scope.alerts["load"] = {
            type: "error",
            message: "The deployment details could not be loaded.",
            details: e.data
          };
        }
      );

      if ($routeParams.deploymentconfig) {
        DataService.get("deploymentconfigs", $routeParams.deploymentconfig, $scope).then(
          // success
          function(deploymentConfig) {
            $scope.deploymentConfig = deploymentConfig;
          },
          // failure
          function(e) {
            $scope.alerts["load"] = {
              type: "error",
              message: "The deployment configuration details could not be loaded.",
              details: e.data
            };
          }
        );      
      }

      function extractPodTemplates() {
        angular.forEach($scope.deployments, function(deployment, deploymentId){
          $scope.podTemplates[deploymentId] = deployment.spec.template;
        });
      }

      watches.push(DataService.watch("replicationcontrollers", $scope, function(deployments, action, deployment) {
        $scope.deployments = deployments.by("metadata.name");
        extractPodTemplates();
        // TODO do we want image stuff at all
        //ImageStreamResolver.fetchReferencedImageStreamImages($scope.podTemplates, $scope.imagesByDockerReference, $scope.imageStreamImageRefByDockerReference, $scope);
        $scope.emptyMessage = "No deployments to show";
        $scope.deploymentsByDeploymentConfig = DeploymentsService.associateDeploymentsToDeploymentConfig($scope.deployments);

        var deploymentConfigName;
        var deploymentName;
        if (deployment) {
          deploymentConfigName = $filter('annotation')(deployment, 'deploymentConfig');
          deploymentName = deployment.metadata.name;
        }
        if (!action) {
          // Loading of the page that will create deploymentConfigDeploymentsInProgress structure, which will associate running deployment to his deploymentConfig.
          $scope.deploymentConfigDeploymentsInProgress = DeploymentsService.associateRunningDeploymentToDeploymentConfig($scope.deploymentsByDeploymentConfig);
        } else if (action === 'ADDED' || (action === 'MODIFIED' && ['New', 'Pending', 'Running'].indexOf(deploymentStatus(deployment)) > -1)) {
          // When new deployment id instantiated/cloned, or in case of a retry, associate him to his deploymentConfig and add him into deploymentConfigDeploymentsInProgress structure.
          $scope.deploymentConfigDeploymentsInProgress[deploymentConfigName] = $scope.deploymentConfigDeploymentsInProgress[deploymentConfigName] || {};
          $scope.deploymentConfigDeploymentsInProgress[deploymentConfigName][deploymentName] = deployment;
        } else if (action === 'MODIFIED') {
          // After the deployment ends remove him from the deploymentConfigDeploymentsInProgress structure.
          var status = deploymentStatus(deployment);
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
      }));
    });

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
    $scope.isDeployment = DeploymentsService.isDeployment;

    $scope.$on('$destroy', function(){
      DataService.unwatchAll(watches);
    });
  });
