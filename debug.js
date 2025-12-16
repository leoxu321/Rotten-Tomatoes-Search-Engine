const {Matrix} = require("ml-matrix");
const mongoose = require("mongoose");


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
                //console.log(currLink+" =  "+currLinkNum);
            });
        }
    }

    console.log("alphaMatrix Sum of First Row: " + alphaMatrix.getRow(0).reduce((acc, value) => acc + value, 0));

    let randomMatrix = Matrix.ones(n,n).mul(alpha / n);
    let probabilityMatrix = Matrix.add(alphaMatrix, randomMatrix);
    writeCSV(probabilityMatrix, "Matrices/probabilityMatrix.csv");

    console.log("probabilityMatrix Sum of First Row: " + probabilityMatrix.getRow(0).reduce((acc, value) => acc + value, 0));
    
    let ranks = await calculatePageRank(probabilityMatrix);
    writeCSV(ranks, "Matrices/x3.csv");
    console.log("Updated x3");

    for (let i = 0; i < n; i++) {
        //console.log("Row Calc: " + i);
        let rank = ranks.get(0, i);
        //console.log(rank);
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
        if(prev_x == null) {
            prev_x = x.clone();
            continue;   
        }
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

function writeCSV(matrix, filename) {
    // Requiring fs module in which 
    // writeFile function is defined. 
    const fs = require('fs') 
      
    // Data which will write in a file. 
    let data = ""
    for (let row = 0; row < matrix.rows; row++){
        for(let col = 0; col < matrix.columns; col++){
            data += matrix.get(row, col) + ",";
        }
        data += "\n";
    }
      
    // Write data
    fs.writeFile(filename, data, (err) => { 
        // In case of a error throw err. 
        if (err) throw err; 
    }) 
}








mongoose.connect('mongodb://127.0.0.1:27017/FruitGraphDatabase', {useNewUrlParser: true});
let db = mongoose.connection;
mongoose.connection.on("error", err => {
	console.log("err", err);
})
mongoose.connection.on("connected", (err, res) => {
	console.log("mongoose is connected");
    //calcAllPageRanks(db, "pageContent");
    calcAllPageRanks(db, "personalContent");
})

