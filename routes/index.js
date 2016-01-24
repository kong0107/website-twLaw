var config = require('../config.js');
var express = require('express');
var parser = require('../libs/parser.js');

var router = module.exports = express.Router();
var model = { config: config };

router.get('/', function(req, res) {
	res.redirect('/law');
});
