var config = require('./config.js');
var express = require('express');
var MongoClient = require('mongodb');

var debug = require('debug')(__filename.substr(__dirname.length + 1));

config.counter = 0;

MongoClient.connect(config.dburl, function(err, database) {
	if(err) throw err;
	console.log('Connected to the database.');
	config.db = database;
});

var app = express();
app.listen(config.port, config.hostname);

app.locals.pageTitle = config.siteName;

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.static(__dirname + '/public'));
app.use('/raw/json', express.static(config.dataDir + 'json'));

app.use(function(req, res, next) {
	config.counter++;
	next();
});

app.use('/', require('./routes/index.js'));
app.use('/api', require('./routes/api.js'));

app.use('/search', require('./routes/search.js'));
app.use('/law', require('./routes/law.js'));
app.use('/jyi', require('./routes/jyi.js'));

app.use(function(req, res) {
	res.status(404).render('404', {
		config: config,
		orignalUrl: req.orignalUrl
	});
});
