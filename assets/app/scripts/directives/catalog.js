'use strict';

angular.module('openshiftConsole')
  .directive('catalogTemplate', function() {
    return {
      restrict: 'E',
      // Replace the catalog-template element so that the tiles are all equal height as flexbox items.
      // Otherwise, you have to add the CSS tile classes to catalog-template.
      replace: true,
      scope: {
        template: '=',
        project: '='
      },
      templateUrl: 'views/catalog/_template.html'
    };
  })
  .directive('catalogImage', function() {
    return {
      restrict: 'E',
      // Replace the catalog-template element so that the tiles are all equal height as flexbox items.
      // Otherwise, you have to add the CSS tile classes to catalog-template.
      replace: true,
      scope: {
        image: '=',
        imageStream: '=',
        imageTag: '=',
        version: '=',
        project: '='
      },
      templateUrl: 'views/catalog/_image.html'
    };
  });
