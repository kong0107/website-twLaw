var config = require('../config.js');
var express = require('express');
var parser = require('../libs/parser.js');

var router = module.exports = express.Router();
var model = { config: config };

router.get('/:name?', function(req, res, next) {
	var name = req.params.name;
	if(!name) {
		config.db.collection('latest').find().sort({'最新異動日期': -1}).limit(20)
		.project({'法規內容': false}).toArray(function(err, docs) {
			docs.forEach(function(doc) {
				doc.沿革內容 = parser.parseHistory(doc.沿革內容);
			});
			model.lawList = docs;
			res.locals.pageTitle = '最新異動法規';
			res.render('law-index', model);
		});
	}
	else {
		config.db.collection('latest').findOne(
			{$or: [
				{'法規名稱': name},
				{'PCode': name}
			]},
			function(err, doc) {
				if(err || !doc) return next();
				res.locals.pageTitle = doc.法規名稱;
				model.law = parser.parseLaw(doc, {details: true});
				/*doc.沿革內容 = parser.parseHistory(doc.沿革內容);
				doc.法規內容.forEach(function(article) {
					if(article.條文內容) 
						article.content = parser.parseArticle(article.條文內容);
				});
				model.law = doc;*/
				res.render('law', model);
			}
		);
	}
});
