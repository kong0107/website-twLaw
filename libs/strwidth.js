/**
 * Copy `mb_strwidth` of PHP?
 *
 * @see http://php.net/manual/en/function.mb-strwidth.php
 */
var strwidth = (function() {
	var width0 = /[\x00-\x19]/g;
	var width2 = /[\u2000-\uff60\uffa0-\uffff]/g;
	return main = function(str) {
		return str.length - (str.match(width0) || []).length + (str.match(width2) || []).length;
	};
})();

if(typeof module === 'object') module.exports = strwidth;
