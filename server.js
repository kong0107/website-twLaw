var config = require('./config.js');
var express = require('express');

var app = express();
app.listen(config.port, config.hostname);

app.use(express.static(__dirname + '/public'));

app.use('/', require('./routes/index.js'));
app.use('/api', require('./routes/api.js'));
