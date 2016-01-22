var config = require('../config.js');
var express = require('express');

var router = express.Router();
module.exports = router;

router.get('/', function(req, res, next) {
	res.send('Hello World');
});
