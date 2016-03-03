var config = require('../config.js');
var express = require('express');
var parser = require('../libs/parser.js');

var debug = require('debug')(__filename.substr(__dirname.length + 1));

var router = module.exports = express.Router();
var model = {};

router.get('/:q?', function(req, res, next) {
	var q = req.query.q || req.params.q || '';
	q = model.q = q.trim();
	if(!q) return res.redirect('/');
	model.pageTitle = '搜尋「' + q + '」的結果';

	var searchType = model.t = req.query.t;
	var page = res.locals.page = parseInt(req.query.page, 10) || 1;
	var skip = (page - 1) * config.ipp;

	var re = new RegExp(q);
	var conds = {$or:[]};
	if(searchType != 'content') conds.$or.push({'法規名稱': re});
	if(searchType != 'name') conds.$or.push({'法規內容.條文內容': re});

	var cursor = config.db.collection('latest').find(conds);
	cursor.count(function(err, result) {
		model.count = result;
		cursor.skip(skip).limit(config.ipp).toArray(function(err, docs) {
			docs.forEach(function(doc) {
				doc.沿革內容 = parser.parseHistory(doc.沿革內容);
			});
			model.lawList = docs;
			res.render('search', model);
		});
	});
});
