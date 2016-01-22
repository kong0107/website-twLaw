var config = require('../config.js');
var express = require('express');

var router = module.exports = express.Router();

router.get('/', function(req, res, next) {
	res.render('index', { title: config.siteName });
});
