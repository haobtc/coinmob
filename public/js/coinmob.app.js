var bitcore = require('bitcore');

var app = angular.module('coinmob', ['ngRoute'])
  .config(function($routeProvider) {
    $routeProvider
      .when('/', {
	controller: 'AddressCtrl',
	templateUrl: 'addresslist.html'
      })
/*      .when('', {
	controller: 'AddressCtrl',
	templateUrl: 'addresslist.html'
      }) */
      .otherwise({redirectTo: '/'});
  });

app.directive('newAddress', function($document) {
  return function(scope, element, attr) {
    element.on('click', function(event) {
      var netname = angular.element('#netnames').val();
      console.info('netname', netname);
      coinmob.walletman[netname].newAddress('hh');
    });
  };
});
app.controller('AddressCtrl', function($scope, $routeParams) {
  $scope.addresses = coinmob.walletman.addresses();
  var netnames = [];
  for(var netname in bitcore.networks) {
    netnames.push(netname);
  }
  $scope.netnames = coinmob.config.supportedNetnames;
});
