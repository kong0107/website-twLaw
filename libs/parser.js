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
	var value;
	var result = {
		PCode:			law.PCode,
		characteristic:	law.法規性質,
		name:			law.法規名稱,
		category: 		law.法規類別.split('＞'),
		lastUpdate:		parseDate(law.最新異動日期),

		discarded:		!!law.廢止註記,
		translated:		law.是否英譯註記 === 'Y',
		history:		parseHistory(law.沿革內容),
		content:		parseLawContent(law.法規內容, options)
	};

	if(value = law.生效日期) result.effectiveDate = parseDate(value);
	if(value = law.生效內容) result.effectiveContent = value.replace(/\r\n/g, '');
	if(value = law.英文法規名稱) result.english = value;

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
		if(ele.編章節 !== undefined) return parseOrdinal(ele.編章節);
		else {
			var article = parseOrdinal(ele.條號);
			if(ele.條文內容) article.content = parseArticleContent(ele.條文內容);
			return article;
		}
	});
}

/**
 * 轉換「條號」與「編章節」。
 * @return {object} returns An object has property `type`, `number`, and maybe `title`.
 */
function parseOrdinal(str) {
	if(!str) return {};	// H0170012 「公共藝術設置辦法」在第一條之前有一個空白的「編章節」。
	var match = str.match(/^第?\s*([\d零一二三四五六七八九十百千]+)\s*(-(\d+))?\s*([條項編章節款目]|小目)?(\s*之\s*([\d零一二三四五六七八九十百千]+))?\s*/);
	if(!match) return {};
	var result = {number: cpi(match[1]) * 100 + cpi(match[3] || match[6] || 0)};
	if(match[4]) result.type = match[4];
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

module.exports = {
	parseLaw: parseLaw,
	parseHistory: parseHistory,
	parseLawContent: parseLawContent,
	parseOrdinal: parseOrdinal,
	parseArticleContent: parseArticleContent
};


//-----------------------------------------------------------------------------------------------


/**
 * 將條文內容字串，轉為巢狀結構
 *
 * 憲法第 49 條其實沒有分項，但從全國法規資料庫是看不出來的，須經由立法院法律系統確認。
 * 國際法中譯版會有問題，例如「維也納條約法公約」第7條第1項（甲）款末尾是「；或」。
 *
 * @param {string} str 以換行做為排版的條文內容字串。
 * @return {object} 物件有成員 `stratum`, `texts`, `children`, `posttexts`，各自意義見程式碼最後步驟的註解說明。
 */
function parseArticle(str) {
	var result = {children: []};

	/// Step 0: 把還不打算處理的先避開。
	/// 須留意回傳的格式是否與 step 4 相同。
	/// 未處理「海關進口稅則」
	if(str.indexOf('＝') >= 0) { ///< 算式。例如「加值型及非加值型營業稅法」§15-1
		debug('equation');
		return {
			warning: 'equation',
			children: [{texts: [str]}]
		};
	}
	else if(str.indexOf('──') >= 0) { ///< 表格，如「考試院檔案申請閱覽規則」§2
		debug('table');
		return {
			warning: 'table',
			children: [{texts: [str]}]
		};
	}
	else if(str.indexOf('\r\n\r\n') >= 0) { ///< 如「使用中汽車召回改正辦法」§19
		debug('continuous newlines');
		return {
			warning: 'continuous newlines',
			children: [{texts: [str]}]
		}
	}
	else if(/[\x20\u3000]{15,}(?=[^\s$])/.test(str)) {
		// 空格排版，如「考試院檔案申請閱覽規則」§5 。
		// 連續空格的允許上限為14，如所得稅法14條1項9類1款各目。
		// 但若是結尾的連續空白就不用理了，如交通技術人員執業證書核發規則§2
		// 注意 \s 會對應到換行字元，而這裡還沒有 str.split('\n') ，所以才會前面用 [\x20\u3000] ，而後面需要 [^\s$] 。
		debug('too many spaces');
		return {
			warning: 'too many spaces',
			children: [{texts: [str]}]
		};
	}

	/// Step 1: 把同屬於一元素的各行重新組起來，但保留最初的空白字元。使 `eles` 每個元素有成員：
	/// * text {string}: 該段落文字。
	var eles = [];
	var lines = str.trim().split(/\r?\n/);
	var isNew = true;
	for(var i = 0; i < lines.length; ++i) {
		var trimmed = lines[i].trim();
		for(var j = stratums.length - 1; j >= 0; --j)
			if(stratums[j].ordinal.test(lines[i])) break;
		if(!eles.length	//< 如果這是第一行，或
			|| (isNew	//< 前一行看起來已經結束
				&& trimmed.charAt(0) != '但'	//< 且開頭不是「但」，如民法第95條。
				&& !/^\([^\d一二三四五六七八九十甲乙丙丁戊己庚辛壬癸]/.test(trimmed)
			)
			//< 而且這一行開頭不是：
			//< * "(附"，如職業介紹法§43
			//< * "(備"，如福建金門馬祖地區司法人員定期調動辦法§3、調度司法警察條例§14
			//< * "(其"，如中央政府附屬單位預算執行辦法§33
		) {	// 那就把這行當作新的一行。
			var newEle = {text: lines[i]};
			if(i > 0 && lines[i - 1].length == 32 && strwidth(lines[i - 1]) == 64
				&& j == 0
			) {
				debug('未能確認是否分項');
				newEle.warning = 'unsure of new paragraph';
			}
			eles.push(newEle);

			if(trimmed.charAt(0) === '「') debug('首字為引號');
		}
		//else if(!eles.length) debug('第一行就有問題！？');
		else eles[eles.length - 1].text += trimmed;

		isNew = /(：|︰|。、?|（刪除）)$/.test(trimmed); //< 句號後的頓號出現在「行政院主計處電子處理資料中心辦事細則」
	}

	/// Step 2: 確認各元素屬於哪一種「類項款目」。使 `eles` 每個元素有成員：
	/// * text {string}: 該段落文字。
	/// * stratum {integer}: 屬第幾層。 -1 代表非依照全國法規標準法的「分段」，所得稅法中有很多。必定成為 siblings 或 posttexts 。
	/// * spaces {integer}: 換行後前面會有幾個半形空格。例如「一、」和「十一、」分別為 4 和 6 。
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

	/// Step 3: 做一棵樹，但仍可用 `eles` 存取。使 `eles` 每個元素有成員：
	/// * text {string}: 同前步驟。
	/// * stratum {integer}: 同前步驟。
	/// * spaces {integer}: 同前步驟。
	/// * children {array}: 下一層的節點們，例如「項」下的「款」。
	/// * siblings {array}: 主文的分段（不含第一段）。目前發現有：所得稅法第4條第1項第16款、第22款、第14條第1項第1類、第2類、第4類第3款，以及憲法第48條。
	/// * posttexts {array}: 分層後出現的分段。目前僅發現所得稅法第14條第1項第9類第1款。
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

			if(j < 0) {
				debug('Not found previous paragraph of:', eles[j]);
				for(var j = i - 1; j >= 0; --j)
					if(eles[j].stratum >= 0) break;
				if(j < 0) {
					debug('Not even an acceptable paragraph!?');
					j = i - 1;
				}
				else debug('inserted into some paragraph');
			}
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

	/// Step 4: 重整樹，使每節點有成員：
	/// * stratum {integer}: 層級，即項、類、款、目、小目。為數字。已不應出現 -1 。
	/// * spaces {integer}: 換行後前面應有幾個半形空格（例如「一、」和「十一、」分別為 4 和 6 ），用於設定縮排。
	/// * texts {array}: 每元素均為字串，即分段。通常僅有一元素，但憲法第48條、所得稅法第4條、第14條為例外。
	/// * children {array}
	/// * posttexts {array}: 每元素均為字串。通常不存在，僅知所得稅法第14條第1項第9類第1款會有恰好一元素於其中。
	for(var i = 0; i < eles.length; ++i) {
		if(!eles[i]) continue;
		var temp;

		/// 將 text 和 siblings 合併為 texts 。
		eles[i].texts = [eles[i].text];
		if(eles[i].siblings) {
			eles[i].siblings.forEach(function(sib) {
				eles[i].texts.push(sib.text);
			});
			debug("siblings of:", eles[i].text);
		}
		delete eles[i].text;
		delete eles[i].siblings;

		/// 把 children 重新排到 texts 後面 。
		if(eles[i].children) {
			temp = eles[i].children;
			delete eles[i].children;
			eles[i].children = temp;
		}

		/// 把 posttexts 改成字串陣列，然後排到 children 後面。
		if(eles[i].posttexts) {
			debug("posttexts of:", eles[i].texts[0]);
			temp = eles[i].posttexts.map(function(obj) {return obj.text;});
			delete eles[i].posttexts;
			eles[i].posttexts = temp;
		}
	}

	return result;
}
module.exports.parseArticle = parseArticle;

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
