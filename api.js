var config = require('./config.js');
var express = require('express');
var MongoClient = require('mongodb');

var dburl = config.dburl;
var db;

MongoClient.connect(dburl, function(err, database) {
	if(err) throw err;
	console.log('Connected to the database.');
	db = database;
});


var router = express.Router();
module.exports = router;

router.get('/', function(req, res) {
	res.send('API root');
});

router.get('/law/:name?', function(req, res) {
	var name = req.params.name;
	if(!name) {
		res.send('API Law');
		return;
	}
	var coll = db.collection('latest');

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
});

