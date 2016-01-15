var config = require('./config.js');
var express = require('express');

var app = express();
app.listen(config.port);

app.get('/', function(req, res) {
	res.send('Hello World');
});

app.use('/api', require('./api.js'));
