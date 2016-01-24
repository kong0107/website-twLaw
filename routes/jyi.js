var config = require('../config.js');
var express = require('express');

var router = module.exports = express.Router();
var model = { config: config };

router.get('/:jyino', function(req, res, next) {
	var jyino = parseInt(req.params.jyino);
	if(isNaN(jyino)) return next();
	config.db.collection('jyi').findOne(
		{'number': jyino},
		function(err, doc) {
			if(err || !doc) return next();
			config.pageTitle = '司法院釋字第 ' + jyino + ' 號';

			doc.holding = doc.holding.split('\n');
			doc.reasoning = doc.reasoning.substr(0, doc.reasoning.lastIndexOf('。') + 1).split('\n');

			model.jyi = doc;
			res.render('jyi', model);
		}
	);
});
