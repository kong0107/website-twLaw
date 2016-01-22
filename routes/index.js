var config = require('../config.js');
var express = require('express');

var router = module.exports = express.Router();

var model = { title: config.siteName };
model.lawUpdate = config.lawUpdate;

router.get('/', function(req, res) {
	res.render('index', model);
});

router.get('/law/:name', function(req, res, next) {
	var name = req.params.name;

	if(!name) return next();
	config.db.collection('latest').findOne(
		{$or: [
			{'法規名稱': name},
			{'PCode': name}
		]},
		function(err, doc) {
			if(err || !doc) return next();
			delete doc._id;
			model.law = doc;
			res.render('law', model);
		}
	);
}, function(req, res) {
	res.render('index', { title: config.siteName });
});
