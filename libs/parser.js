var util = require('util');
var cpi = require('chinese-parseint');
var strwidth = require('./strwidth.js');

var debug = require('debug')(__filename.substr(__dirname.length + 1));

/**
 * Parse a law object to another object.
 *
 * @param {object} law An object parsed from JSON file; not being chaged in this function.
 * @param {object} [options=null] Optional settings.
 * @param {boolean} [options.details=false] Returns stratum and space information in content.
 * @return {object} returns Law object
 */
function parseLaw(law, options) {
	if(!options) options = {};
	var value;
	var result = {
		PCode:			law.PCode,
		characteristic:	law.法規性質,
		name:			law.法規名稱,
		category: 		law.法規類別.split('＞'),
		lastUpdate:		parseDate(law.最新異動日期),
		effectiveDate:	law.生效日期 ? parseDate(law.生效日期) : null,
		effectiveContent:law.生效內容 ? law.生效內容.replace(/\r\n/g, '') : null,
		discarded:		!!law.廢止註記,
		translated:		(law.是否英譯註記 === 'Y'),
		english:		law.英文法規名稱 ? law.英文法規名稱 : null,
		history:		parseHistory(law.沿革內容),
		preamble:		law.前言 ? law.前言.replace(/\r\n/g, '') : null,
		content:		parseLawContent(law.法規內容, options)
	};
	for(var i in result)
		if(result[i] === null) delete result[i];

	if(options.details) {
		result.hasDivisions = result.content.some(function(article) {
			return !!article.divDepth;
		})
	}

	result.tableOfContents = makeTree(result.content);

	return result;
}

/**
 * 將日期從 'YYYYmmdd' 轉為 'YYYY-mm-dd' 。
 */
function parseDate(str) {
	str = str.toString();
	return str.substr(0, 4) + '-' + str.substr(4, 2) + '-' + str.substr(6);
}

/**
 * 將「沿革內容」轉為每個項目為一元素的陣列。
 */
function parseHistory(str) {
	return str.split(/\r\n\d+\./).map(function(str, index) {
		if(!index) str = str.substr(2);
		return str.replace(/\s+/g, '').replace(/([\w\-、～]+)(?![）\w])/g, " $1 ");
	});
}

/**
 * 轉換「法規內容」。
 *
 * * H0170012 「公共藝術設置辦法」在第一條之前有一個空白的「編章節」。
 * * D0070115 「建築技術規則建築設計施工編」有數個歷史版本的第11至13條沒有內容（連「（刪除）」都沒有）。
 */
function parseLawContent(lawContent, options) {
	return lawContent.map(function(ele) {
		if(ele.編章節 !== undefined) return parseOrdinal(ele.編章節, options);
		else {
			var article = parseOrdinal(ele.條號, options);
			if(ele.條文內容) article.content = parseArticleContent(ele.條文內容, options);
			return article;
		}
	});
}

/**
 * 轉換「條號」與「編章節」。
 * @return {object} returns An object has property `type`, `number`, and maybe `title`.
 */
function parseOrdinal(str, options) {
	if(!str) return {};	// H0170012 「公共藝術設置辦法」在第一條之前有一個空白的「編章節」。
	var match = str.match(/^第?([\d零一二三四五六七八九十百千\s]+)(-(\d+))?\s*([條項編章節款目]|小目)?(\s*之\s*([\d零一二三四五六七八九十百千]+))?\s*/);
	if(!match) return {warning: '偵測不到條號', title: str};
	var main = cpi(match[1].replace(/\s/g, ''));	//< 「電業供電線路裝置規則」有個「第 十 四章」
	var sub = cpi(match[3] || match[6] || 0);
	var result = {};

	if(match[4]) {
		result.type = match[4];
		if(options.details) result.divDepth = "條編章節款目".indexOf(result.type);
	}
	result.number = cpi(match[1]) * 100 + sub;
	if(options.details) result.numberString = main + (sub ? ('-' + sub) : '');
	var title = str.substr(match[0].length).trim();
	if(title) result.title = title;
	return result;
}

/**
 * 條文內容的巢狀結構元素節點。
 * @typedef {Object} articleContentElement
 * @property {?string} warning 於條文內容不如程式預期時存在。為警告文字，用以提示使用者轉換結果可能不正確，或是沒有轉換。
 * @property {?number} stratum 於 options.details 為真時存在，提示本元素是「項」、「款」、「目」還是其他。
 * @property {?number} spaces 於 options.details 為真時存在，提示本元素若需換行，第二行後宜縮排幾個半形空白。
 * @property {string} text 本文，如果有分段的情形則會有換行字元（如所得稅法第4條第1項第16款、第22款、第14條第1項第1類、第2類、第4類第3款）。
 * @property {articleContentElement[]} children 子項目們，例如某「項」之中的各個分「款」。
 * @property {string} posttext 後文，用於顯示「（附件…」，以及如所得稅法14條1項9類1款各目之後的那段文字。
 */

/**
 * 將「條文內容」字串轉為巢狀結構。
 *
 * 未支援國際法的中譯版，例如「維也納條約法公約」第7條第1項（甲）款末尾是「；或」。
 * @return {articleContentElement[]}
 */
function parseArticleContent(str, options) {
	if(!options) options = {};

	//
	// 把不打算處理的直接回傳。
	//
	var warning;

	// 如「加值型及非加值型營業稅法」§15-1
	if(str.indexOf('＝') != -1) warning = '偵測到算式';

	// 如「考試院檔案申請閱覽規則」§2
	if(str.indexOf('──') != -1) warning = '偵測到表格';

	// 如「使用中汽車召回改正辦法」§19
	if(str.indexOf('\r\n\r\n') != -1) warning = '偵測到連續換行';

	// 如「考試院檔案申請閱覽規則」§5 ，
	// 但不包含「所得稅法」14條1項9類1款各目，以及「交通技術人員執業證書核發規則」§2 。
	if(/[\x20\u3000]{15,}(?=[^\s$])/.test(str)) warning = '偵測到空格排版';

	if(warning) {
		var elem = {
			warning: warning,
			text: str
		};
		if(options.details) {
			elem.stratum = -1;
			elem.spaces = 0;
		}
		return [elem];
	}

	// --------------------------------
	//
	// 將各行轉換為各項款目。
	//
	var elems = [];
	str.split('\r\n')
	.map(function(str) {return str.replace(/\s+$/, '');})
	.forEach(function(line, index, lines) {
		var trimmed = line.trim();
		var prevLine = index ? lines[index - 1] : '';
		var prevElem = index ? elems[elems.length - 1] : null;

		//
		// Step 1: 先假設這一行是新的項款目，判斷是哪種項款目。
		//
		var stratum, spaces, match;
		for(var s = stratums.length - 1; s >= 0; --s) {
			match = stratums[s].ordinal.exec(line);
			if(match) break;
		}
		stratum = s;
		spaces = strwidth(match ? match[0] : line.match(/\s*/)[0]);

		//
		// Step 2: 參考前一行的結尾，據以判斷這一行是否為新的項款目。
		//
		var newElem = {text: trimmed, stratum: stratum, spaces: spaces};
		if(!index || /（刪除）。?$/.test(prevLine))
			elems.push(newElem);
		else if(/[：︰]$/.test(prevLine)) {
			if(stratum == prevElem.stratum || stratum == -1) //< 如憲法§48
				prevElem.text += '\n' + line;
			else if(stratum > prevElem.stratum)
				elems.push(newElem);
			else throw new Error('層級錯誤');
		}
		else if(/。、?$/.test(prevLine)) {
			//< 句號後的頓號出現在「行政院主計處電子處理資料中心辦事細則」
			if(prevElem.stratum == 0) {
				if(stratum == 0) {
					if(strwidth(prevLine) < 64) elems.push(newElem);
					else if(line.charAt(0) == '但') prevElem.text += trimmed;
					else {
						newElem.warning = '未能確認是否分項';
						elems.push(newElem);
					}
				}
				else if(stratum > 0) elems.push(newElem);
				else throw Error('層級錯誤');
			}
			else elems.push(newElem);
		}
		else prevElem.text += trimmed;
	});

	// --------------------------------
	//
	// 把陣列依層級轉換成樹。
	//
	var tree = {children: []};
	var parent = tree;
	elems.forEach(function(elem, index) {
		if(!index) {
			parent.children.push(elem);
			return;
		}
		var e;
		if(elem.stratum >= 0) {
			for(e = index - 1; e >= 0; --e) {
				if(elems[e].stratum >= 0
					&& elems[e].stratum < elem.stratum
				) break;
			}
			parent = (e >= 0) ? elems[e] : tree;
			if(!parent.children) parent.children = [];
			parent.children.push(elem);
		}
		else {
			for(e = index - 1; e >= 0; --e) {
				if(elems[e].stratum >= 0
					&& elems[e].spaces == elem.spaces
				) break;
			}
			if(e < 0) for(e = index - 1; e >= 0; --e)
				if(elems[e].stratum >= 0) break;
			parent = elems[e];
			if(!parent.children) parent.text += '\n' + elem.text;
			else if(!parent.posttext) parent.posttext = elem.text;
			else parent.posttext += '\n' + elem.text;
		}
	});

	if(!options.details) elems.map(function(elem) {
		delete elem.stratum;
		delete elem.spaces;
	});

	return tree.children;
}

function makeTree(content, options) {
	if(typeof content == 'string')
		content = parseLawContent(content, options);
	//if(!content[0].type || content[0].type == '條') return [];

	//
	// 找出各個編章節的開始與結束條號。
	//
	var list = []; //< 僅包含編章節節點的陣列。
	var trace = [0, 0, 0, 0, 0]; //< 用於表達這是第幾編、第幾章的第幾節。
	var flags = [null];	//< 紀錄前一個第 i 層的編章節。
	content.forEach(function(node, index) {
		var types = "編章節款目";
		var stratum = types.indexOf(node.type);
		if(stratum < 0) {
			// 例如遇到第一條時，要把第一編、第一章、第一節這些節點的開始條號均記為 100 。
			for(var i = index - 1; i >= 0; --i) {
				if(types.indexOf(content[i].type) < 0) break;
				content[i].range = [node.number];
			}
		}
		else {
			trace[stratum] = node.number;
			for(var i = stratum + 1; i < trace.length; ++i) trace[i] = 0;
			node.trace = [];
			for(var i = 0; i <= stratum; ++i) node.trace.push(trace[i]);
			list.push(node);

			if(node.number > 100) {
				var endNum = content[index - 1].number;
				for(var i = stratum; i < flags.length; ++i) {
					if(!flags[i]) break;
					flags[i].range.push(endNum);
					flags[i] = null;
				}
			}
			flags[stratum] = node;
		}
	});
	var lastNum = content[content.length - 1].number;
	for(var i = 0; i < flags.length; ++i) {
		if(i && !flags[i]) break;
		if(flags[i]) flags[i].range.push(lastNum);
	}

	//
	// 建一棵樹
	//
	// 為避免輸出 JSON 時丟出太多東西，先複製一些物件（注意這只是便宜行事的複製方式）
	var listCopy = list.map(function(node) {
		var result = {};
		for(var i in node) result[i] = node[i];
		return result;
	});
	var tree = {children: []};
	listCopy.forEach(function(node, index) {
		if(!index) {
			tree.children.push(node);
			return;
		}
		for(var i = index - 1; i >= 0; --i) {
			if(listCopy[i].trace.length < node.trace.length) {
				if(!listCopy[i].children) listCopy[i].children = [];
				listCopy[i].children.push(node);
				return;
			}
		}
		tree.children.push(node);
	});
	return tree.children;
}

module.exports = {
	parseLaw: parseLaw,
	parseHistory: parseHistory,
	parseLawContent: parseLawContent,
	parseOrdinal: parseOrdinal,
	parseArticleContent: parseArticleContent
};

var stratums = [
    {	"name": "paragraph",       ///< 可用於CSS
        "ordinal": /^(?! )/   ///< 開頭沒有空格。但憲法第48條怎麼辦？
    },
    {	"name": "categorie",
        "ordinal": /^第[一二三四五六七八九十]+類：/
    },
    {	"name": "subparagraph",
        "ordinal": /^\s*[零壹貳參肆伍陸柒捌玖拾]+\s+/  ///< H0070027 中華民國中小學科學展覽會參展安全規則
    },
    {	"name": "subparagraph",
        "ordinal": /^\s*[○一二三四五六七八九十]+(、|　|  )/  ///< 憲法裡的「款」有時是全形空格，有時是兩個半形空格
    },
	{	"name": "celestial-subparagraph",
		"ordinal": /^\s*[甲乙丙丁戊己庚辛壬癸]、/ ///< 海上捕獲條例第25條
	},
    {	"name": "item",
        "ordinal": /^\s*[\(（][一二三四五六七八九十]+[\)）] ?/    ///< 有些括號是全形，有些是半形（如所得稅法25條2項2款）
    },
    {	"name": "celestrial-item",
        "ordinal": /^\s*\([甲乙丙丁戊己庚辛壬癸]\) /    ///< 美援進口器材及美援衍生之新臺幣所購器材使用及移轉辦法§8
    },
    {	"name": "subitem",
        "ordinal": /^\s+(\d+[\. ]|[０１２３４５６７８９]+、)/
		///< 空格情形如「中華民國八十八年下半年及八十九年度中央政府總預算附屬單位預算編製辦法」第7條
		///< 全形數字如「中華民國九十四年度中央政府總預算附屬單位預算編製辦法」第7條
    },
    {	"name": "subsubitem",
        "ordinal": /^\s+[\(（]\d+[\)）] ?/	///< 通常是全形括號、後無空格，例外見 J0030002 「食品工廠建築及設備之設置標準」§15
    },
    {	"name": "subsubsubitem",
        "ordinal": /^\s+[\uf6b1-\uf6b9]/   ///< 食品工廠建築及設備之設置標準§15
    }
];
