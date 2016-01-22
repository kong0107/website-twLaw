var config = require('../config.js');
var express = require('express');

var router = module.exports = express.Router();

router.get('/', function(req, res) {
	res.render('index', { title: config.siteName });
});

router.get('/law/:name?', function(req, res) {
	var name = req.params.name;
	var coll = config.db.collection('latest');

	if(!name || name == 'all') {
		coll.find({}).project({
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
			function(err, doc) {
				if(!doc) {
					res.jsonp({error: 1, message: '資料庫中無此法規'});
					return;
				}
				delete doc._id;
				res.jsonp(doc);
			}
		);
	}
});
