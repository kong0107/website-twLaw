var config = require('../config.js');
var express = require('express');
var parser = require('../libs/parser.js');

var router = module.exports = express.Router();
var model = { config: config };

router.get('/:name', function(req, res, next) {
	var name = req.params.name;

	config.db.collection('latest').findOne(
		{$or: [
			{'法規名稱': name},
			{'PCode': name}
		]},
		function(err, doc) {
			if(err || !doc) return next();
			config.pageTitle = doc.法規名稱;
			doc.沿革內容 = parser.parseHistory(doc.沿革內容);
			model.law = doc;
			res.render('law', model);
		}
	);
}, function(req, res) {
	res.render('index', model);
});
