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
		//if(!isNew) eles[eles.length - 1].spacesDebug = lines[i].match(/\s*/)[0].length;
		isNew = /(：|︰|。|（刪除）)$/.exec(trimmed);
	}
	
	/// Step 2: 確認各元素屬於哪一種「類項款目」。
	for(var i = 0; i < eles.length; ++i) {
		for(var j = stratums.length - 1; j >= 0; --j) {
			var match = stratums[j].ordinal.exec(eles[i].text);
			if(match) break;
			//if(stratums[j].ordinal.test(eles[i].text)) break;
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
/**
 * 老方法，輸出 HTML 。
 * 
 * @see https://github.com/g0v/laweasyread-front/blob/master/pre32.js
 */
parser.parseArticleToHTML = function(str) {
	var html = "<li>";
	var depthArr = [];
	var lines = str.split(/\r?\n/);
	if(lines[lines.length - 1]) lines.push('');
    for(var j = 0; j < lines.length; ++j) {
        var endDetect = /(：|︰|。|（刪除）)$/.exec(html); ///< 兩種冒號不同
        if(endDetect) {
            var stratum = -1;
            for(var k = stratums.length - 1; k >= 0; --k) {
                if(stratums[k].ordinal.test(lines[j])) {
                    stratum = k;
                    break;
                }
            }
            
            /// 唔，有些分款的項是用句點結尾的，先這樣繞過去吧...
            if(stratum >= 0 && lines[j].indexOf("一、") == 0) endDetect[1] = "：";
            
            switch(endDetect[1]) {
            case "。":
                /// 處理所得稅法中，同一層之中又分段的情形，例如14條1項2類
                if(stratum < 0) {
                    html += "<br />";
                    break;
                }
                /// 警告可能的錯誤情形
                if(!depthArr.length             ///< 「項」
                    && lines[j-1].length == 32  ///< 前一行有32字
                    && !/\w/.test(lines[j-1])   ///< 且沒有英數
                    && lines[j]                 ///< 而這行不是最後一行
                ) html += '<div class="LER-warning" title="原始資料用「換行」的方式排版，因而本站沒能判斷這裡究竟是「換行」還是「分項」。">警告：這裡可能其實沒有分項。</div>';
                // no break!
            case "（刪除）":
                html += "</li>";
                while(depthArr.length && depthArr[depthArr.length - 1] != stratum) {
                    html += "</ol></li>";
                    depthArr.pop();
                }   
                break;
            case "：":
            case "︰":   ///< 這兩個冒號不同
                /// 處理憲法§48
                /// 其實有「算式」的條文也會出錯，例如所得稅法§66-6的第一項和第二項就很難分
                if(lines[j][0] == "「") {
                    stratum = -1;
                    break; 
                }
                html += '<ol class="LER-art-' + stratums[stratum].name + '">';
                depthArr.push(stratum);
                break;
            default: 
                console.log(endDetect);
                throw new SyntaxError("RegExp returns wrong match.");
            }
            if(lines[j] && stratum >= 0) html += "<li>"; ///< 如果是末行的空白就不用加了
        }            
        html += lines[j].trim();	///< 有些條文在冒號後還會有空白，例如民訴§§307,541
    }
	return html;
};

module.exports = parser;
