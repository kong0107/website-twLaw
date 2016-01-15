/**
 * Import data from JSON files.
 *
 * @see https://github.com/kong0107/mojLawSplitJSON
 */

/**
 * Configuration.
 */
var dburl = "mongodb://localhost:27017/twLaw";
var jsondir = "../mojLawSplit/json/";
var subdirs = ["FalV", "Eng_FalV", "MingLing", "Eng_MingLing"];

var fs = require("fs");
var MongoClient = require("mongodb").MongoClient;

var coll;

MongoClient.connect(dburl, function(err, db) {
	if(err) throw err;
	console.log("Connected to the database.");

	coll = db.collection("latest");
	
	parseDir(0, function(){
		console.log("Program finished.");
		db.close();
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
		console.log("\r\nAll files in one directory parsed.");
		setImmediate(callback);
		return;
	}
	if(!(index % 100)) process.stdout.write(".");
	var s = files[index].split(".");
	if(s.length != 2 || s[1] != "json") {
		setImmediate(parseFile, dir, files, index + 1, callback);
		return;
	}
	var json = fs.readFileSync(dir + files[index], "utf8");
	coll.insertOne(JSON.parse(json), function(err, result) {
		if(err) throw err;
		setImmediate(parseFile, dir, files, index + 1, callback);
	});
}
