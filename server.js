var config = require('./config.js');
var express = require('express');
var MongoClient = require('mongodb');

MongoClient.connect(config.dburl, function(err, database) {
	if(err) throw err;
	console.log('Connected to the database.');
	config.db = database;
});

var app = express();
app.listen(config.port, config.hostname);

app.use(express.static(__dirname + '/public'));

app.use('/', require('./routes/index.js'));
app.use('/api', require('./routes/api.js'));
