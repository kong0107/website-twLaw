var config = require('../config.js');
var express = require('express');

var router = module.exports = express.Router();
var model = { config: config };

router.get('/', function(req, res) {
	config.db.collection('jyi').find().project({
		number: 1, date: 1, holding: 1, _id: 0
	}).sort({number: -1})
	.toArray(function(err, docs) {
		if(err) throw err;
		res.locals.pageTitle = '司法院釋字列表';
		docs.forEach(function(doc) {
			doc.holding = doc.holding.split('\n');
		});
		model.jyiList = docs;
		res.render('jyi-index', model);
	});
});

router.get('/:jyino', function(req, res, next) {
	var jyino = parseInt(req.params.jyino);
	if(isNaN(jyino)) return next();
	config.db.collection('jyi').findOne(
		{'number': jyino},
		function(err, doc) {
			if(err || !doc) return next();
			res.locals.pageTitle = '釋字第 ' + jyino + ' 號';

			doc.holding = doc.holding.split('\n');
			doc.reasoning = doc.reasoning.substr(0, doc.reasoning.lastIndexOf('。') + 1).split('\n');

			model.jyi = doc;
			res.render('jyi', model);
		}
	);
});
