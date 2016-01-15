var express = require('express');

var router = express.Router();
module.exports = router;

router.use(function(req, res, next) {
	console.log('Time: ', new Date());
	next();
});

router.get('/', function(req, res) {
	res.send('API root');
});

router.get('/law', function(req, res) {
	res.send('API Law');
});

