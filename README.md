# twLaw
Web Server for Taiwan Law

## Instance
HTML: [憲法第二章](http://twlaw-kong0107.rhcloud.com/law/A0000001#第 二 章 人民之權利義務)
JSON: [憲法全文](http://twlaw-kong0107.rhcloud.com/api/law/A0000001)

## API
回傳 JSON ，支援 JSONP 。

### /api/law/:name
回傳名稱為 `:name` 的法規資料。

## Data Source
https://github.com/kong0107/mojLawSplitJSON

## Alike Project
https://github.com/g0v/laweasyread

# Data Sechema
(not implemented)

```javascript
/**
 * 法規物件。
 * @typedef {Object} lawDoc
 * @prop {!string} PCode 全國法規資料庫用的 ID 。
 * @prop {!string} characteristic 法規性質，分為「憲法」、「法律」、「命令」。注意「憲法」不是只有本文和增修條文，還有緊急命令等共八個。
 * @prop {!string} name 法規名稱，有些會包含括號。
 * @prop {!string} category[] 法規類別，依分層儲存。例如「行政 ＞ 勞動部 ＞ 組織目」即拆成三個元素的陣列。
 * @prop {!string} lastUpdate 最新異動日期，轉換為 "YYYY-mm-dd" 格式。
 * @prop {?string} effectiveDate 生效日期，轉換為 "YYYY-mm-dd" 格式。
 * @prop {?string} effectiveContent 生效內容，移除換行字元。
 * @prop {!boolean} discarded 廢止註記。
 * @prop {!boolean} translated 是否英譯註記。
 * @prop {?string} english 英文法規名稱。
 * @prop {?string} annexes[] 附件，們的連結。
 * @prop {!string} history[] 沿革內容，每次沿革存為一元素。
 * @prop {?string} preamble 前言，極少數才有，包含憲法與增修條文。
 * @prop {?lawDivision} divisions[] 編章節。
 * @prop {!lawArticle} articles[] 條文。
 */
 
/**
 * 法規分區（編章節）物件。
 * @typedef {Object} lawDivision
 * @prop {!string} type 編章節種類，即 "編" 或 "章" 等等。
 * @prop {!string} title 編章節標題，不包含「第Ｘ章」本身。
 * @prop {!number} trace 編章節位置，例如 [0, 300, 402] 表示不分編、第三章、第四節之二。
 * @prop {!number} start 此區間所含的第一個條號。
 * @prop {!number} end 此區間所含的最後一個條號。
 */
 
/**
 * 法規條文物件。
 * @typedef {Object} lawArticle
 * @prop {!number} number 條號，為排序方便，將「第X條之Y」存為 100*X + Y 。考量到民法，不宜以 int16 儲存。
 * @prop {!number} division[] 所屬編章節的 trace 屬性。
 * @prop {!Object} items[] 條文內容，每項、款、目…等均為一元素。且「項」元素並不包含「款」元素，依此類推。
 * @prop {!number} items[].stratum 層級，為整數。
 * @prop {!number} items[].trace[] 位置，如 [0, 2, 1] 通常表示第一項（或不分項）、第三款、第二目。但若該項有分「類」（如所得稅法），則為第一項、第三類、第二款。
 * @prop {!number} items[].space 換行時前面應有幾個半形空格的縮排。
 * @prop {!string} items[].text 項目本文，但不包含下一層級的文字。可能有多行，例如所得稅法4條1項16款。
 * @prop {?string} items[].posttext 如果該項目有下一層元素，而在其後又有文字的話，即會存於此。例如所得稅法14條1項9類1款3目之後的那一段。
 */
```
