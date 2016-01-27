var config = require('../config.js');
var parser = require('../libs/parser.js');

var debug = require('debug')('tests/parser.js');

// 所得稅法第四條
//var text = "下列各種所得，免納所得稅：\r\n一、（刪除）\r\n二、（刪除）\r\n三、傷害或死亡之損害賠償金，及依國家賠償法規定取得之賠償金。\r\n四、個人因執行職務而死亡，其遺族依法令或規定領取之撫卹金或死亡補\r\n    償。個人非因執行職務而死亡，其遺族依法令或規定一次或按期領取\r\n    之撫卹金或死亡補償，應以一次或全年按期領取總額，與第十四條第\r\n    一項規定之退職所得合計，其領取總額以不超過第十四條第一項第九\r\n    類規定減除之金額為限。\r\n五、公、教、軍、警人員及勞工所領政府發給之特支費、實物配給或其代\r\n    金及房租津貼。公營機構服務人員所領單一薪俸中，包括相當於實物\r\n    配給及房租津貼部分。\r\n六、依法令規定，具有強制性質儲蓄存款之利息。\r\n七、人身保險、勞工保險及軍、公、教保險之保險給付。\r\n八、中華民國政府或外國政府，國際機構、教育、文化、科學研究機關、\r\n    團體，或其他公私組織，為獎勵進修、研究或參加科學或職業訓練而\r\n    給與之獎學金及研究、考察補助費等。但受領之獎學金或補助費，如\r\n    係為授與人提供勞務所取得之報酬，不適用之。\r\n九、各國駐在中華民國使領館之外交官、領事官及其他享受外交官待遇人\r\n    員在職務上之所得。\r\n十、各國駐在中華民國使領館及其附屬機關內，除外交官、領事官及享受\r\n    外交官待遇之人員以外之其他各該國國籍職員在職務上之所得。但以\r\n    各該國對中華民國駐在各該國使領館及其附屬機關內中華民國籍職員\r\n    ，給與同樣待遇者為限。\r\n十一、自國外聘請之技術人員及大專學校教授，依據外國政府機關、團體\r\n      或教育、文化機構與中華民國政府機關、團體、教育機構所簽訂技\r\n      術合作或文化教育交換合約，在中華民國境內提供勞務者，其由外\r\n      國政府機關、團體或教育、文化機構所給付之薪資。\r\n十二、（刪除）\r\n十三、教育、文化、公益、慈善機關或團體，符合行政院規定標準者，其\r\n      本身之所得及其附屬作業組織之所得。\r\n十四、依法經營不對外營業消費合作社之盈餘。\r\n十五、（刪除）\r\n十六、個人及營利事業出售土地，或個人出售家庭日常使用之衣物、家具\r\n      ，或營利事業依政府規定為儲備戰備物資而處理之財產，其交易之\r\n      所得。\r\n      個人或營利事業出售中華民國六十二年十二月三十一日前所持有股\r\n      份有限公司股票或公司債，其交易所得額中，屬於中華民國六十二\r\n      年十二月三十一日前發生之部分。\r\n十七、因繼承、遺贈或贈與而取得之財產。但取自營利事業贈與之財產，\r\n      不在此限。\r\n十八、各級政府機關之各種所得。\r\n十九、各級政府公有事業之所得。\r\n二十、外國國際運輸事業在中華民國境內之營利事業所得。但以各該國對\r\n      中華民國之國際運輸事業給與同樣免稅待遇者為限。\r\n二十一、營利事業因引進新生產技術或產品，或因改進產品品質，降低生\r\n        產成本，而使用外國營利事業所有之專利權、商標權及各種特許\r\n        權利，經政府主管機關專案核准者，其所給付外國事業之權利金\r\n        ；暨經政府主管機關核定之重要生產事業因建廠而支付外國事業\r\n        之技術服務報酬。\r\n二十二、外國政府或國際經濟開發金融機構，對中華民國政府或中華民國\r\n        境內之法人所提供之貸款，及外國金融機構，對其在中華民國境\r\n        內之分支機構或其他中華民國境內金融事業之融資，其所得之利\r\n        息。\r\n        外國金融機構，對中華民國境內之法人所提供用於重要經濟建設\r\n        計畫之貸款，經財政部核定者，其所得之利息。\r\n        以提供出口融資或保證為專業之外國政府機構及外國金融機構，\r\n        對中華民國境內之法人所提供或保證之優惠利率出口貸款，其所\r\n        得之利息。\r\n二十三、個人稿費、版稅、樂譜、作曲、編劇、漫畫及講演之鐘點費之收\r\n        入。但全年合計數以不超過十八萬元為限。\r\n二十四、政府機關或其委託之學術團體辦理各種考試及各級公私立學校辦\r\n        理入學考試，發給辦理試務工作人員之各種工作費用。\r\n前項第四款所稱執行職務之標準，由行政院定之。";

// 所得稅法第十四條
var text = "個人之綜合所得總額，以其全年下列各類所得合併計算之：\r\n第一類：營利所得：公司股東所獲分配之股利總額、合作社社員所獲分配\r\n        之盈餘總額、合夥組織營利事業之合夥人每年度應分配之盈餘總\r\n        額、獨資資本主每年自其獨資經營事業所得之盈餘總額及個人一\r\n        時貿易之盈餘皆屬之。\r\n        公司股東所獲分配之股利總額或合作社社員所獲分配之盈餘總額\r\n        ，應按股利憑單所載股利淨額或盈餘淨額與可扣抵稅額之合計數\r\n        計算之；合夥人應分配之盈餘總額或獨資資本主經營獨資事業所\r\n        得之盈餘總額，除獨資、合夥組織為小規模營利事業者，按核定\r\n        之營利事業所得額計算外，應按核定之營利事業所得額減除全年\r\n        應納稅額半數後之餘額計算之。\r\n第二類：執行業務所得：凡執行業務者之業務或演技收入，減除業務所房\r\n        租或折舊、業務上使用器材設備之折舊及修理費，或收取代價提\r\n        供顧客使用之藥品、材料等之成本、業務上雇用人員之薪資、執\r\n        行業務之旅費及其他直接必要費用後之餘額為所得額。\r\n        執行業務者至少應設置日記帳一種，詳細記載其業務收支項目；\r\n        業務支出，應取得確實憑證。帳簿及憑證最少應保存五年；帳簿\r\n        、憑證之設置、取得、保管及其他應遵行事項之辦法，由財政部\r\n        定之。\r\n        執行業務者為執行業務而使用之房屋及器材、設備之折舊，依固\r\n        定資產耐用年數表之規定。執行業務費用之列支，準用本法有關\r\n        營利事業所得稅之規定；其帳簿、憑證之查核、收入與費用之認\r\n        列及其他應遵行事項之辦法，由財政部定之。\r\n第三類：薪資所得：凡公、教、軍、警、公私事業職工薪資及提供勞務者\r\n        之所得：\r\n        一、薪資所得之計算，以在職務上或工作上取得之各種薪資收入\r\n            為所得額。\r\n        二、前項薪資包括：薪金、俸給、工資、津貼、歲費、獎金、紅\r\n            利及各種補助費。但為雇主之目的，執行職務而支領之差旅\r\n            費、日支費及加班費不超過規定標準者，及依第四條規定免\r\n            稅之項目，不在此限。\r\n        三、依勞工退休金條例規定自願提繳之退休金或年金保險費，合\r\n            計在每月工資百分之六範圍內，不計入提繳年度薪資所得課\r\n            稅；年金保險費部分，不適用第十七條有關保險費扣除之規\r\n            定。\r\n第四類：利息所得：凡公債、公司債、金融債券、各種短期票券、存款及\r\n        其他貸出款項利息之所得：\r\n        一、公債包括各級政府發行之債票、庫券、證券及憑券。\r\n        二、有獎儲蓄之中獎獎金，超過儲蓄額部分，視為存款利息所得\r\n            。\r\n        三、短期票券指期限在一年期以內之國庫券、可轉讓銀行定期存\r\n            單、公司與公營事業機構發行之本票或匯票及其他經目的事\r\n            業主管機關核准之短期債務憑證。\r\n            短期票券到期兌償金額超過首次發售價格部分為利息所得，\r\n            除依第八十八條規定扣繳稅款外，不併計綜合所得總額。\r\n第五類：租賃所得及權利金所得：凡以財產出租之租金所得，財產出典典\r\n        價經運用之所得或專利權、商標權、著作權、秘密方法及各種特\r\n        許權利，供他人使用而取得之權利金所得：\r\n        一、財產租賃所得及權利金所得之計算，以全年租賃收入或權利\r\n            金收入，減除必要損耗及費用後之餘額為所得額。\r\n        二、設定定期之永佃權及地上權取得之各種所得，視為租賃所得\r\n            。\r\n        三、財產出租，收有押金或任何款項類似押金者，或以財產出典\r\n            而取得典價者，均應就各該款項按當地銀行業通行之一年期\r\n            存款利率，計算租賃收入。\r\n        四、將財產借與他人使用，除經查明確係無償且非供營業或執行\r\n            業務者使用外，應參照當地一般租金情況，計算租賃收入，\r\n            繳納所得稅。\r\n        五、財產出租，其約定之租金，顯較當地一般租金為低，稽徵機\r\n            關得參照當地一般租金調整計算租賃收入。\r\n第六類：自力耕作、漁、牧、林、礦之所得：全年收入減除成本及必要費\r\n        用後之餘額為所得額。\r\n第七類：財產交易所得：凡財產及權利因交易而取得之所得：\r\n        一、財產或權利原為出價取得者，以交易時之成交價額，減除原\r\n            始取得之成本，及因取得、改良及移轉該項資產而支付之一\r\n            切費用後之餘額為所得額。\r\n        二、財產或權利原為繼承或贈與而取得者，以交易時之成交價額\r\n            ，減除繼承時或受贈與時該項財產或權利之時價及因取得、\r\n            改良及移轉該項財產或權利而支付之一切費用後之餘額為所\r\n            得額。\r\n        三、個人購買或取得股份有限公司之記名股票或記名公司債、各\r\n            級政府發行之債券或銀行經政府核准發行之開發債券，持有\r\n            滿一年以上者，於出售時，得僅以其交易所得之半數作為當\r\n            年度所得，其餘半數免稅。\r\n第八類：競技、競賽及機會中獎之獎金或給與：凡參加各種競技比賽及各\r\n        種機會中獎之獎金或給與皆屬之：\r\n        一、參加競技、競賽所支付之必要費用，准予減除。\r\n        二、參加機會中獎所支付之成本，准予減除。\r\n        三、政府舉辦之獎券中獎獎金，除依第八十八條規定扣繳稅款外\r\n            ，不併計綜合所得總額。\r\n第九類：退職所得：凡個人領取之退休金、資遣費、退職金、離職金、終\r\n        身俸、非屬保險給付之養老金及依勞工退休金條例規定辦理年金\r\n        保險之保險給付等所得。但個人歷年自薪資所得中自行繳付之儲\r\n        金或依勞工退休金條例規定提繳之年金保險費，於提繳年度已計\r\n        入薪資所得課稅部分及其孳息，不在此限：\r\n        一、一次領取者，其所得額之計算方式如下：\r\n        （一）一次領取總額在十五萬元乘以退職服務年資之金額以下者\r\n              ，所得額為零。\r\n        （二）超過十五萬元乘以退職服務年資之金額，未達三十萬元乘\r\n              以退職服務年資之金額部分，以其半數為所得額。\r\n        （三）超過三十萬元乘以退職服務年資之金額部分，全數為所得\r\n              額。\r\n            退職服務年資之尾數未滿六個月者，以半年計；滿六個月者\r\n            ，以一年計。\r\n        二、分期領取者，以全年領取總額，減除六十五萬元後之餘額為\r\n            所得額。\r\n        三、兼領一次退職所得及分期退職所得者，前二款規定可減除之\r\n            金額，應依其領取一次及分期退職所得之比例分別計算之。\r\n第十類：其他所得：不屬於上列各類之所得，以其收入額減除成本及必要\r\n        費用後之餘額為所得額。但告發或檢舉獎金、與證券商或銀行從\r\n        事結構型商品交易之所得，除依第八十八條規定扣繳稅款外，不\r\n        併計綜合所得總額。\r\n前項各類所得，如為實物、有價證券或外國貨幣，應以取得時政府規定之\r\n價格或認可之兌換率折算之；未經政府規定者，以當地時價計算。\r\n個人綜合所得總額中，如有自力經營林業之所得、受僱從事遠洋漁業，於\r\n每次出海後一次分配之報酬、一次給付之撫卹金或死亡補償，超過第四條\r\n第一項第四款規定之部分及因耕地出租人收回耕地，而依平均地權條例第\r\n七十七條規定，給予之補償等變動所得，得僅以半數作為當年度所得，其\r\n餘半數免稅。\r\n第一項第九類規定之金額，每遇消費者物價指數較上次調整年度之指數上\r\n漲累計達百分之三以上時，按上漲程度調整之。調整金額以千元為單位，\r\n未達千元者按百元數四捨五入。其公告方式及所稱消費者物價指數準用第\r\n五條第四項之規定。";

//var text = "測試。\n不但如何：\n一、哈哈。\n    奇怪的段落。";
//parser.parseArticle(text);
//console.log(JSON.stringify(parser.parseArticle(text), null, 2));

//console.log(parser.parseOrdinal('第 八 節之一 旅遊'));
//console.log(parser.parseOrdinal('第 514-1 條'));


var mongodb = require('mongodb');

mongodb.MongoClient.connect(config.dburl, function(err, database) {
	if(err) throw err;
	debug('Connected to the database.');
	var db = config.db = database;

	db.collection('latest').find().forEach(function(doc) {
		debug(doc.PCode + ' ' + doc.法規名稱);
		parser.parseLawContent(doc.法規內容);
		//debug('--------------------------');
	}, function() {db.close();});
});
