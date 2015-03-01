var app = angular.module('app', ['angularPikaday']).filter('getDiff', function() {
  return function(input) {
  	if(input && input[0]!='' && input[1]!=''){
  		var res = input[1].getMoment().diff(input[0].getMoment());
  		var inDays = res/(1000*60*60*24);
   		return 'Duration : '+inDays+' day'+((inDays>1)?'s':'');
   	}else{
   		console.log(input);
   		return '';
   	}
  };
});

var SC;
app.controller('ctrl', function($scope) {
	SC = $scope;
	$scope.to = '';
	$scope.from = '';
	$scope.results = {};

	$scope.fetchInfo = function(inFrom, inTo, outFrom, outTo){
		var inF = inFrom.getMoment().format('YYYY-MM-DD');
		var inT = inTo.getMoment().format('YYYY-MM-DD');
		var outF = outFrom.getMoment().format('YYYY-MM-DD');
		var outT = outTo.getMoment().format('YYYY-MM-DD');
		$.get(['', 'load', inF, inT, 'to', outF, outT].join('/'), function(res,b,c){
			
			for(var i in res)
				res[i].available = res[i].retours.length!=0;
			for(var i in res){
				if(res[i].available){
					res[i].data.sort(function(a, b){return a.price - b.price;});
					res[i].retours.sort(function(a, b){return a.price - b.price;});

					res[i].minPriceAller = res[i].data[0].price;
					res[i].minPriceRetour = res[i].retours[0].price;
					res[i].money = res[i].data[0].priceIn;

					res[i].minTotal = parseFloat(res[i].minPriceAller)+parseFloat(res[i].minPriceRetour);
				}
			}

			$scope.results = new Array();

			for(var i in res){
				res[i].destination = i;
				$scope.results.push(res[i]);
			}

			$scope.results.sort(function(a, b){
				return (a.minTotal || 0) - (b.minTotal || 0);
			});

			$scope.$apply();
		});
	};
});