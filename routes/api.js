var config = require('../config.js');
var express = require('express');
var parser = require('../libs/parser.js');

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
				res.jsonp((err || !doc)
					? {error: 1, message: '資料庫中無此法規'}
					: parser.parseLaw(doc)
				);
			}
		);
	}
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
