var strwidth = require('./strwidth.js');
var parser = {};

parser.parseHistory = function(str) {
	return str.split(/\r\n\d+\./).map(function(str, index) {
		if(!index) str = str.substr(2);
		return str.replace(/\s+/g, '').replace(/([\w\-、～]+)(?![）\w])/g, " $1 ");
	});
}

/**
 * 將條文內容字串，轉為巢狀結構
 *
 * 憲法第 49 條其實沒有分項，但從全國法規資料庫是看不出來的，須經由立法院法律系統確認。
 * 國際法中譯版會有問題，例如「維也納條約法公約」第7條第1項（甲）款末尾是「；或」。
 *
 * @param {string} str 以換行做為排版的條文內容字串。
 * @return {object} 物件有成員：
 * * text {string}: 主文。
 * * stratum {integer}: 屬第幾層。 -1 代表非依照全國法規標準法的「分段」，所得稅法中有很多。必定成為 siblings 或 posttexts 。
 * * spaces {integer}: 換行後前面會有幾個半形空格。例如「一、」和「十一、」分別為 4 和 6 。
 * * children {array}: 下一層的節點們，例如「項」下的「款」。
 * * siblings {array}: 主文的分段（不含第一段）。目前發現有：所得稅法第4條第1項第16款、第22款、第14條第1項第1類、第2類、第4類第3款，以及憲法第48條。
 * * posttexts {array}: 分層後出現的分段。目前僅發現所得稅法第14條第1項第9類第1款。
 */
parser.parseArticle = function(str) {
	var result = {children: []};
	
	/// Step 1: 把同屬於一元素的各行重新組起來，但保留最初的空白字元。
	var eles = [];
	var lines = str.trim().split(/\r?\n/);
	var isNew = true;
	for(var i = 0; i < lines.length; ++i) {
		var trimmed = lines[i].trim();
		if(isNew && trimmed.charAt(0) != '但') eles.push({text: lines[i]}); ///< 例如民法第95條
		else eles[eles.length - 1].text += trimmed;
		isNew = /(：|︰|。|（刪除）)$/.exec(trimmed);
	}
	
	/// Step 2: 確認各元素屬於哪一種「類項款目」。
	for(var i = 0; i < eles.length; ++i) {
		for(var j = stratums.length - 1; j >= 0; --j) {
			var match = stratums[j].ordinal.exec(eles[i].text);
			if(match) break;
		}
		eles[i].stratum = j;
		
		var spacesAndOrdinal = match ? match[0] : eles[i].text.match(/\s*/)[0];
		eles[i].spaces = strwidth(spacesAndOrdinal);
		eles[i].text = eles[i].text.trim();
	}
	
	/// Step 3: 做一棵樹。
	result.children.push(eles[0]);
	var parent = result;;
	var prev = eles[0];
	for(var i = 1; i < eles.length; ++i) {
		if(eles[i].stratum >= 0) {
			if(eles[i].stratum == prev.stratum) parent.children.push(eles[i]);
			else if(eles[i].stratum > prev.stratum) {
				parent = prev;
				parent.children = [eles[i]];
			}
			else if(eles[i].stratum < prev.stratum) {
				for(var j = i - 2; j >= 0; --j) {
					if(eles[j].stratum >= 0 && eles[i].stratum > eles[j].stratum) break;
				}
				parent = (j < 0) ? result : eles[j];
				parent.children.push(eles[i]);
			}
			prev = eles[i];
		}
		else {
			/// eles[i].stratum == -1
			/// `prev` will not be re-assigned.
			for(var j = i - 1; j >= 0; --j)
				if(eles[j].stratum >= 0 && eles[i].spaces == eles[j].spaces) break;
			
			if(eles[j].children) {
				if(!eles[j].posttexts) eles[j].posttexts = [];
				eles[j].posttexts.push(eles[i]);
			}
			else {
				if(!eles[j].siblings) eles[j].siblings = [];
				eles[j].siblings.push(eles[i]);
			}
		}
	}
	
	return result;
};

var stratums = [
    {	"name": "paragraphs",       ///< 用於CSS
        "ordinal": /^(?![ 「])/   ///< 引號出現在憲法第48條
    },
    {	"name": "categories",
        "ordinal": /^第[一二三四五六七八九十]+類：/
    },
    {	"name": "subparagraphs",
        "ordinal": /^\s*[○一二三四五六七八九十]+(、|　|  )/  ///< 憲法裡的「款」有時是全形空格，有時是兩個半形空格
    },
    {	"name": "items",
        "ordinal": /^\s*[\(（][一二三四五六七八九十]+[\)）]/    ///< 有些括號是全形，有些是半形（如所得稅法25條2項2款）
    },
    {	"name": "subitems",
        "ordinal": /^\s+\d+\./
    },
    {	"name": "subsubitems",
        "ordinal": /^\s+（\d+）/   ///< 全形括號（與立法院不同）、半形數字
    }
];


module.exports = parser;
