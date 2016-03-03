var fs = require('fs');
var config = require('./config.js');
var express = require('express');
var MongoClient = require('mongodb');

var debug = require('debug')(__filename.substr(__dirname.length + 1));

MongoClient.connect(config.dburl, function(err, database) {
	if(err) throw err;
	console.log('Connected to the database.');
	config.db = database;
});

var app = express();
app.listen(config.port, config.hostname);

app.locals.db = config.db;
app.locals.ipp = config.ipp;
app.locals.siteName = app.locals.pageTitle = config.siteName;
fs.readFile(config.dataDir + 'json/UpdateDate.txt', function(err, data) {
	if(!err) app.locals.lawUpdate = data;
});
app.locals.visitCounter = 0;

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(function(req, res, next) {
	++app.locals.visitCounter;
	next();
});

app.use(express.static(__dirname + '/public'));
app.use('/raw/json', express.static(config.dataDir + 'json'));

app.use('/', require('./routes/index.js'));
app.use('/api', require('./routes/api.js'));
app.use('/search', require('./routes/search.js'));
app.use('/law', require('./routes/law.js'));
app.use('/jyi', require('./routes/jyi.js'));

app.use(function(req, res) {
	res.status(404).render('404', {
		orignalUrl: req.orignalUrl
	});
});
