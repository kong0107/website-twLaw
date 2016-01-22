/**
 * Import data from JSON files.
 *
 * @see https://github.com/kong0107/mojLawSplitJSON
 */

/**
 * Configuration.
 */
var config = require('./config.js');
var jsondir = config.dataDir + 'json/';
var subdirs = ["FalV", "MingLing"];

var fs = require("fs");
var MongoClient = require("mongodb").MongoClient;

var coll;

MongoClient.connect(config.dburl, function(err, db) {
	if(err) throw err;
	console.log("Connected to the database.");

	coll = db.collection("latest");
	coll.deleteMany({PCode: {$exists: false}}, null, function(err, res) {
		if(err) throw err;
		if(res.deletedCount) console.log("Deleted %d documents without PCode.", res.deletedCount);
		parseDir(0, function(){
			console.log("Program finished.");
			db.close();
		});
	});
});

function parseDir(index, callback) {
	if(index == subdirs.length) {
		console.log("All directories parsed.");
		setImmediate(callback);
		return;
	}
	console.log("Parsing directory %s", subdirs[index]);
	var dir = jsondir + subdirs[index] + "/";
	var files = fs.readdirSync(dir);
	parseFile(dir, files, 0, function() {
		parseDir(index + 1, callback);
	});
}

function parseFile(dir, files, index, callback) {
	if(index == files.length) {
		console.log("\r\nParsed a directory.");
		setImmediate(callback);
		return;
	}
	if(!(index % 100)) process.stdout.write(".");
	var s = files[index].split(".");
	if(s.length != 2 || s[1] != "json") {
		setImmediate(parseFile, dir, files, index + 1, callback);
		return;
	}
	var jsObj = JSON.parse(fs.readFileSync(dir + files[index], "utf8"));

	var PCode = jsObj.法規網址.substr(jsObj.法規網址.indexOf("PCODE") + 6);
	jsObj.PCode = PCode;

	coll.updateOne({PCode: PCode}, jsObj, {upsert: true}, function(err, result) {
		if(err) throw err;
		setImmediate(parseFile, dir, files, index + 1, callback);
	});
}
