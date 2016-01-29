var config = require('../config.js');
var express = require('express');
var parser = require('../libs/parser.js');

var debug = require('debug')(__filename.substr(__dirname.length + 1));

var router = module.exports = express.Router();
var model = {};

router.get('/:q?', function(req, res, next) {
	var q = req.query.q || req.params.q || "";
	q = q.trim();
	if(!q) return res.redirect('/');
	model.q = q;
	res.locals.pageTitle = '搜尋「' + q + '」的結果';

	var re = new RegExp(q);
	config.db.collection('latest').find({$or:[
		{'法規名稱': re}/*,
		{'法規內容.條文內容': re}*/
	]}).limit(20)
	.project({'法規內容': false}).toArray(function(err, docs) {
		docs.forEach(function(doc) {
			doc.沿革內容 = parser.parseHistory(doc.沿革內容);
		});
		model.lawList = docs;
		res.render('search', model);
	});
});
