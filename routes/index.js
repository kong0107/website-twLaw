var config = require('../config.js');
var express = require('express');
var parser = require('../libs/parser.js');

var router = module.exports = express.Router();
var model = { config: config };

router.get('/', function(req, res) {
	config.db.collection('latest').find().sort({'最新異動日期': -1}).limit(20)
	.project({'法規內容': false}).toArray(function(err, docs) {
		docs.forEach(function(doc) {
			doc.沿革內容 = parser.parseHistory(doc.沿革內容);
		});
		model.latest = docs;
		res.render('index', model);
	});
});
