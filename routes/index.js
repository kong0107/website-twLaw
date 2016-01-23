var config = require('../config.js');
var express = require('express');
var parser = require('../libs/parser.js');

var router = module.exports = express.Router();
var model = { config: config };

router.get('/', function(req, res) {
	config.db.collection('latest').find().sort({'最新異動日期': -1}).limit(20)
	.project({'法規內容': false}).toArray(function(err, docs) {
		for(var i = 0; i < docs.length; ++i) {
			docs[i].lastUpdateMessage = docs[i].沿革內容.match(/[^.]*$/)[0]
				.replace(/\s+/g, '').replace(/([\w\-、～]+)/g, " $1 ")
			;
		}
		model.latest = docs;
		res.render('index', model);
	});
});

router.get('/law/:name', function(req, res, next) {
	var name = req.params.name;

	config.db.collection('latest').findOne(
		{$or: [
			{'法規名稱': name},
			{'PCode': name}
		]},
		function(err, doc) {
			if(err || !doc) return next();
			delete doc._id;
			config.pageTitle = doc.法規名稱;
			model.law = doc;
			res.render('law', model);
		}
	);
}, function(req, res) {
	res.render('index', model);
});
