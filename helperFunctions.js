const {Matrix} = require("ml-matrix");


// =================================================================
// HELPER FUNCTIONS
// =================================================================

async function getTopResults(db, collectionName, index, req) {
    let query = require('url').parse(req.url,true).query.q;
    let boost = require('url').parse(req.url,true).query.boost;//dont convert to boolean, any non empty string turns to true
    let limit = Number(require('url').parse(req.url,true).query.limit);
    // Set limit to Number(limit) or if limit is empty string or undefined, limit defaults to 10
    limit = !limit || limit < 1 || limit > 50 ? 10 : limit;
    let results = index.search(query);

    let topResults = [];
    for (let i = 0; i < limit; i++) {
        if(results[i] != undefined){//if there are results, then add them to the topResults array
            let top = {};
            top["Result"] = results[i];
            top["Page"] = await db.collection(collectionName).findOne({id: Number(results[i].ref)});
            
            if(boost === "true"){//if boost is true, then boost the score
                console.log("Boosting Score.");
                top["Result"].score = top["Result"].score * top["Page"].pageRank;//simple strategy to boost search score
            }
            topResults.push(top);
        }else{//if there are no results, then add the first X pages to the topResults array
            let top = {};
            top["Result"] = {"ref": i, "score": 0};
            top["Page"] = await db.collection(collectionName).findOne({id: i});//return first X results, even if search scores were 0
            topResults.push(top);
        }
    }
    return topResults;
}

function getJsonResults(topResults) {
    let jsonResults = [];
    topResults.forEach(currResult => {
        let tempResult = {};
        tempResult["name"] = "Leo Xu, Kenji Isak Laguan, Minh Nguyen";
        tempResult["url"] = currResult["Page"].queuedLink;
        tempResult["score"] = currResult["Result"].score;
        tempResult["title"] = currResult["Page"].title;
        tempResult["pr"] = currResult["Page"].pageRank;

        jsonResults.push(tempResult);
    });
    return jsonResults;
}


// =================================================================
// PAGE RANKING FUNCTIONS
// =================================================================


const alpha = 0.1;
const euclideanDistanceThreshold = 0.0001; 

async function calcAllPageRanks(db, collectionName) {

    let allPageContent = await db.collection(collectionName).find().toArray();
    let n = allPageContent.length;
    let contentMap = new Map();
    allPageContent.forEach((page) => {
        contentMap.set(page.queuedLink, page.id);
    });

    let alphaMatrix = Matrix.zeros(n,n);
    for (let row = 0; row < n; row++) {
        let incomingLinks = (await db.collection(collectionName).findOne({id: Number(row)})).incomingLinks; //grab by id number

        if (incomingLinks.length == 0) {//if theres only zeroes in a row, set all to 1/N
            for(let col = 0; col < n; col++){
                alphaMatrix.set(row, col, (1 - alpha) / n);
            }
        } else {
            incomingLinks.forEach((currLink) => {
                let currLinkNum = contentMap.get(currLink);//get index of link to use as "column" num
                alphaMatrix.set(row, currLinkNum, (1 - alpha) / incomingLinks.length);//find the Adj row(N-0) page has a link -> to col(N-3) page and set as 1
            });
        }
    }
    let randomMatrix = Matrix.ones(n,n).mul(alpha / n);
    let probabilityMatrix = Matrix.add(alphaMatrix, randomMatrix);

    console.log("probabilityMatrix Sum of First Row: " + probabilityMatrix.getRow(0).reduce((acc, value) => acc + value, 0));
    
    let ranks = await calculatePageRank(probabilityMatrix);

    for (let i = 0; i < n; i++) {
        
        let rank = ranks.get(0, i);
        console.log("Row Calc: " + i + " = " + rank);
        await db.collection(collectionName).updateOne({id: i}, {$set: {pageRank: rank}});//update pageRank in DB
    }
}

function calculatePageRank(probabilityMatrix) {
    let x = Matrix.zeros(1, probabilityMatrix.rows);
    x.set(0, 0, 1);

    let prev_x = null;
    let diff = 1;
    let iterCount = 0;
    while (diff > euclideanDistanceThreshold){
        prev_x = x.clone();
        x = x.mmul(probabilityMatrix.clone());

        diff = euclideanDistance(prev_x, x);
        iterCount++;
    }

    return x;
}

function euclideanDistance(prev_x, x) {
    let n = x.columns;
    let diffVec = x.clone().sub(prev_x.clone());

    let sum = 0; 
    for(let i = 0; i < n; i++){
        sum += Math.pow(diffVec.get(0,i), 2);
    }

    let euclideanDistance = Math.sqrt(sum);

    return euclideanDistance;
}

function findTop10Words(text){
    let words = text.split(/\s+/);
    let wordFrequency = {};

    words.forEach(word => {//Count the frequency of each word
        if(word != ''){//if word is not empty, then add it to the wordFrequency object
            if (wordFrequency[word]) {
                wordFrequency[word] += 1;
            } else {
                wordFrequency[word] = 1;
            }
        }
    });
    let saveWordFrequency = [];
    let wordsKeys = Object.keys(wordFrequency);
    for (let word of wordsKeys) {//convert wordFrequency object to array of objects instead
        saveWordFrequency.push({"word": word, "count": wordFrequency[word]});
    }
    wordFrequency = saveWordFrequency;
    wordFrequency.sort((word1, word2) => word2["count"] - word1["count"]);//sort by count, highest to lowest
    
    let top10Words = [];
    for(let i = 0; i < 10; i++){//only keep top 10 words
        if(wordFrequency[i] === undefined){ break; }//if there are less than 10 words, then break
        top10Words.push(wordFrequency[i]);
    }

    return top10Words;
}

module.exports = {
    getTopResults,
    calcAllPageRanks,
    getJsonResults,
    findTop10Words
}

