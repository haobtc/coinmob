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
      coinmob.walletman[netname].newAddress('hh');
    });
  };
});

app.controller('AddressCtrl', function($scope, $routeParams) {
  coinmob.walletman.ready(function() {
    var addrBalances = {};
    coinmob.walletman.eachWallet(function(wallet) {
      var balances = wallet.addrBalances();
      for(var addrString in balances) {
	addrBalances[addrString] = balances[addrString];
      }
    });
    var arr = coinmob.walletman.addresses().map(function(addr) { 
      var a = {addr: addr};
      var balance = addrBalances[addr.toString()];
      if(balance) {
	a.balance = balance;
      } else {
	a.balance = new bitcore.Bignum(0);
      }
      return a;
    });
    $scope.$apply(function() {
      $scope.addresses = arr;
    });
  });
  var netnames = [];
  for(var netname in bitcore.networks) {
    netnames.push(netname);
  }
  $scope.netnames = coinmob.config.supportedNetnames;
});
