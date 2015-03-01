var request = require('request');
var cheerio = require('cheerio');
var http = require('http');
var NAMES = require('./names.js');
var express = require("express");
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser');
var session = require('express-session');
var fs = require('fs');

var app = express();

app.use(cookieParser('qSCbc_è9HBOçè_ccb'));
app.use(session({secret: 'I love cats and sweet dogs with a great bottle. That\'s not making any sens, I know :-)', resave: true, saveUninitialized: true, cookie:{maxAge: 1000*60*60*24*356}}));

app.set("views", __dirname+'/views');
app.set("view engine", "jade");
app.use('/static', express.static(__dirname+"/static"));

app.use( bodyParser.json() );
app.use( bodyParser.urlencoded({extended: true}) );


function getFrom(from, start, end, callback){
	var url = "http://www.ryanair.com/en/cheap-flights/?from="+from+"&out-date-start="+start+"&out-date-end="+end;
	request(url, function(err, res, body){
		var data = new Array();
		$ = cheerio.load(body);
		var content = '<meta charset="UTF-8">';
		$('#list-fares > div.results > a').each(function(i, elem){
			var o = $(this);
			var link = o.attr('src');
			var airportA = o.find('.airports-info > span:first-child').text();
			var airportB = o.find('.airports-info > span:last-child').text();
			var dateFrom = o.find('.date-from').text();
			var price = o.find('.price-cell > div > div').text();
			data.push({
				airport: {from: airportA, to: airportB},
				dateFrom: dateFrom,
				price: price.substr(0, 5),
				priceIn: price.substr(5),
				link: link
			});
		});
		callback(data);
	});
}

function getAll(airports_src, start, end, callback){
	var data = new Array();
	var airports = airports_src.slice();
	console.log(airports);

	var CB = function(D){
		for(var i in D)
			data.push(D[i]);
		if(airports.length==0){
			callback(data);
		}else{
			var airport = airports.pop();
			console.log('Load from '+airport+"...");
			getFrom(airport, start, end, CB);
		}
	};
	CB([]);
}

function getCode(name){
	return NAMES[name] || 'ERROR';
}

function getName(code){
	for(var i in NAMES)
		if(NAMES[i]==code)
			return i;
	return 'ERROR';
}
function mm(a){
	if(a.length==1)
		return '0'+a;
	return a;
}
// var lastData = 'ERROR';
// function getDate(question, def){
// 	var dd = prompt.question(question+'\t').split('/');
// 	if(dd[0]=='')
// 		return def||lastData;
// 	return lastData=(dd[2] || '2015')+'-'+mm(dd[1])+'-'+mm(dd[0]);
// }

var savedFromAirports = ['MPL', 'FNI', 'MRS', 'BZR', 'CCF', 'PGF'];
// ask();
// function ask(){
// 	console.log('');
// 	console.log('');
// 	console.log('# MENU #');
// 	console.log(' 1- Obtenir * allers pour une periode donnée');
// 	console.log(' 2- Obtenir * A/R pour deux periodes données');
// 	var choice = prompt.question("Choix : \t");
// 	console.log('');
// 	console.log('');

// 	if(choice=='1'){
// 		var start = getDate('Entre le :');
// 		var end = getDate('Et le :');

		
// 	}else if(choice=='2'){
// 		var in_start = getDate('Entre le :', '2015-01-01');
// 		var in_end = getDate('Et le :', '2015-06-01');
// 		var out_start = getDate('Entre le :', '2015-06-03');
// 		var out_end = getDate('Et le :', '2015-12-29');

		
// 	}
// }

function getSingle(start, end, callback){
	getAllStuff(savedFromAirports, start, end, function(data){
		callback(data);
		// showResults(data);
		// ask();
	});
}
function getReturn(in_start, in_end, out_start, out_end, callback){
	getAllStuff(savedFromAirports, in_start, in_end, function(data_dico){
		var data = new Array();
		for(var i in data_dico){
			data_dico[i] = {data: data_dico[i], retours: new Array()};
			data.push(i);
		}
		// for(var desination in data){
		function loadForDest(){
			if(data.length==0){
				callback(data_dico);
			}else{
				var destination = data.pop();
				console.log('Traite '+destination+'.');
				var CodeDest = getCode(destination);
				if(CodeDest=='ERROR')
					throw('Merde, erreur chiante.');
				getFrom(CodeDest, out_start, out_end, function(r){
					for(var i in r){
						var CodeTo = getCode(r[i].airport.to);//En gros, on veut montpellier nimes ou autre quoi
						if(savedFromAirports.indexOf(CodeTo)!=-1){	//Youpi, c'est bon !
							data_dico[destination].retours.push(r[i]);
						}
					}
					loadForDest();
				});
			}
		}
		loadForDest();
	});
}

app.get('/', function(req, res){
	res.setHeader('Content-type', 'text/html');
	res.render('index', {});
});


//Format date : 2015-12-31
app.get('/load/:inStart/:inEnd/to/:outStart/:outEnd', function(req, res){
	res.setHeader('Content-type', 'application/json');
	getReturn(req.params.inStart, req.params.inEnd, req.params.outStart, req.params.outEnd, function(data){
		res.end(JSON.stringify(data));
	});
});
app.get('/load/:inStart/:inEnd', function(req, res){
	res.setHeader('Content-type', 'text/html');
	getSingle(req.params.inStart, req.params.inEnd, function(data){
		res.end(JSON.stringify(data));
	});
});

function getAllStuff(airports, start, end, callback){
	getAll(airports, start, end, function(data, backup){
		if(!backup){
			var GoTo = {};
			for(var i in data){
				if(!GoTo[data[i].airport.to])
					GoTo[data[i].airport.to] = [];
				GoTo[data[i].airport.to].push({
					price: data[i].price,
					from: data[i].airport.from,
					date: data[i].dateFrom,
					priceIn: data[i].priceIn
				});
			}
			for(var i in GoTo)
				GoTo[i].sort(function(a,b){
					return a.price - b.price;
				});
			GoTo
			fs.writeFileSync('save'+start+'--'+end, JSON.stringify(GoTo, null, 4));
			data = GoTo;
		}
		callback(data);
	});
}

function showIn(str, n, sautLigne){
	while(str.length<n)
		str += " ";
	process.stdout.write(str);
	if(sautLigne)
		process.stdout.write('\n');
}
function showNCarac(c, n, sautLigne){
	var s = '';
	while(n--) 
		s+=c;
	showIn(s, 0, sautLigne);
}

app.listen(1234);

// function showResults(data){
// 	showIn("", 3);
// 	showIn(" ## ", 4);
// 	showIn("", 2);
// 	showIn("Destination", 24);
// 	showIn("Prix min", 12);
// 	showIn("Prix max", 12);
// 	showIn("Nb. offre(s)", 14, true);
// 	showIn("", 3);
// 	showNCarac('-', 4+2+24+12+12+14, true);
// 	var count = 0;
// 	var links = [];
// 	for(var i in data){
// 		showIn('', 3);
// 		links.push({content: data[i], name: i});
// 		var toShow=++count;
// 		if(toShow<10)
// 			toShow = ' '+toShow;
// 		showIn(' '+toShow, 4);
// 		showIn("", 2);
// 		showIn(i, 24);
// 		var m = data[i][0].priceIn;
// 		m = (m=="€")?'e':'?';
// 		showIn(data[i][0].price+m, 12);
// 		var m = data[i][data[i].length-1].priceIn;
// 		m = (m=="€")?'e':'?';
// 		showIn(data[i][data[i].length-1].price+m, 12);
// 		showIn('   '+data[i].length, 14, true);
// 	}
// 	console.log('');
// 	console.log('');
// 	var d = -1;
// 	while(d!='q'){
// 		d = parseInt(prompt.question("Détail de ? "))-1;
// 		detailsOf(links[d].content, links[d].name);
// 	}
// }

// function detailsOf(d, city){
// 	console.log("");
// 	showNCarac('#', 79, true);
// 	var what = " Pour aller à "+city+' ';
// 	var ww = parseInt((79 - what.length)/2);
// 	for(var i=0; i<ww; i++)
// 		what = '#'+what+'#';
// 	if(what.length==78)
// 		what+='#';
// 	console.log(what);
// 	showNCarac('#', 79, true);
// 	console.log("");
// 	showIn("", 3);
// 	showIn(" ## ", 4);
// 	showIn("Depuis", 24);
// 	showIn("Prix", 12);
// 	showIn("Date exacte", 12, true);
// 	showIn("", 3);
// 	showNCarac('-', 4+2+24+12+12, true);
// 	for(var i in d){
// 		showIn("", 3);
// 		showIn(" "+i, 4);
// 		var m = d[i].priceIn;
// 		m = (m=="€")?'e':'?';
// 		showIn(d[i].from, 24);
// 		showIn(d[i].price+m, 12);
// 		showIn(d[i].date, 12, true);
// 	}
// 	console.log("");
// 	console.log("");
// }