var config = require('./config.js');
var https = require('https');
var mongodb = require('mongodb');

mongodb.MongoClient.connect(config.dburl, function(err, db) {
	if(err) throw err;
	console.log('Connected to the database.');
	
	var coll = db.collection('jyi');
	coll.drop(function(err, res) {
		if(err && err.code != 26) throw err;
		console.log("Dropped the old collection.", res);
		download('https://raw.githubusercontent.com/kong0107/constitutionalcourt/master/json/all.json', function(err, res) {
			if(err) throw err;
			var docs = JSON.parse(res).slice(1);
			coll.insertMany(docs, function(err, res) {
				if(err) throw err;
				console.log("Inserted %d JY interpretations.", docs.length);
				db.close();
			})
		});
	});
});

function download(path, callback) {
	console.log('Downloading %s ', path);
	https.get(path).on('response', function(res) {
		var body = '';
		res.on('data', function(chunk) {
			process.stdout.write('.');
			body += chunk;
		});
		res.on('end', function() {
			process.stdout.write('\n');
			callback(null, body);
		});
	}).on('error', callback);
}
