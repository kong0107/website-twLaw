var config = require('../config.js');
var express = require('express');
var parser = require('../libs/parser.js');

var debug = require('debug')(__filename.substr(__dirname.length + 1));
var router = module.exports = express.Router();

router.get('/', function(req, res) {
	res.redirect('/');
});

router.get('/law/:name?', function(req, res) {
	var name = req.params.name;
	var coll = config.db.collection('latest');

	if(!name || name == 'all') {
		coll.find().project({
			'法規名稱': true, 'PCode': true, '_id': false
		}).toArray(function(err, docs){
			res.jsonp(docs);
		});
	}
	else {
		coll.findOne(
			{$or: [
				{'法規名稱': name},
				{'PCode': name}
			]},
			{fields: {'_id': 0}},
			function(err, doc) {
				if(err || !doc) res.jsonp({error: 1, message: '資料庫中無此法規'});

				doc = parser.parseLaw(doc);
				if(!req.query.fields) res.jsonp(doc);

				var result = {PCode: doc.PCode};
				req.query.fields.split(',').forEach(function(field) {
					if(doc[field] !== undefined) result[field] = doc[field];
				});
				res.jsonp(result);
			}
		);
	}
});

router.get('/articles/:list', function(req, res) {
	var coll = config.db.collection('latest');
	var law, range;
	var result = [];
	var list = req.params.list.replace(/\s+/, '').split(',');

	coll.find({PCode: {$in: list}}).toArray(function(err, docs) {
		if(err) return res.jsonp(err);
		docs.forEach(function(doc) {
			debug(doc.PCode);
			var law = {
				PCode:	doc.PCode,
				name:	doc.法規名稱,
				content:[]
			};
			var content = parser.parseLawContent(doc.法規內容);
			for(var i = list.indexOf(law.PCode) + 1; i < list.length; ++i) {
				if(!list[i]) continue;
				var match = list[i].match(/^(\d+)([-~](\d+))?$/);
				if(!match) break;
				debug(list[i]);
				var start = parseInt(match[1]);
				var end = match[3] ? parseInt(match[3]) : start;
				content.forEach(function(article) {
					if(article.type == '條'
						&& article.number >= start
						&& article.number <= end
					) law.content.push(article);
				});
			}
			result.push(law);
		})
		res.jsonp(result);
	});
});


router.get('/jyi/:no?', function(req, res) {
	var no = parseInt(req.params.no);
	var coll = config.db.collection('jyi');
	if(!no) {
		coll.find().project({
			number: 1, date: 1, holding: 1, _id: 0
		}).toArray(function(err, docs) {
			res.jsonp(docs);
		});
	}
	else {
		coll.findOne(
			{'number': no},
			{fields: {'_id': 0}},
			function(err, doc) {
				if(err || !doc) {
					res.jsonp({error: 2, message: '資料庫中無此解釋'});
					return;
				}
				res.jsonp(doc);
			}
		)
	}
});

router.use(function(req, res) {
	res.status(404).jsonp({
		error: '404',
		message: 'Not Found'
	});
});
