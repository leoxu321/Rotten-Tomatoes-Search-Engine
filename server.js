const express = require("express");
const mongoose = require("mongoose");
const helperFunctions = require("./helperFunctions.js");

let app = express();

app.use(express.static("public"));
app.set("view engine","pug");
app.set("views","views");

mongoose.connect('mongodb://127.0.0.1:27017/FruitGraphDatabase', {useNewUrlParser: true});
let db = mongoose.connection;
mongoose.connection.on("error", err => {
	console.log("err", err);
})
mongoose.connection.on("connected", (err, res) => {
	console.log("mongoose is connected");
})

let fruitsIndex;
let personalIndex;
function runCrawlers(){
    let fruitsCrawler = require('./fruitsCrawler.js');
    fruitsIndex = fruitsCrawler.index;

    let personalCrawler = require('./personalCrawler.js');
    personalIndex = personalCrawler.index;
}
runCrawlers();

app.use(express.json());//parses data
//route handlers
app.get('/', function (req, res){
	res.status(200).render("home",{});//renders home pug page 
});

app.get('/fruits/page/:pageID', async function (req, res){
    
    let pageContent = await db.collection("pageContent").findOne({id: Number(req.params.pageID)});
	res.status(200).render("viewPage", {"pageContent":pageContent});//renders viewPage pug page 
});

app.get('/personal/page/:pageID', async function (req, res){
    
    let pageContent = await db.collection("personalContent").findOne({id: Number(req.params.pageID)});
	res.status(200).render("viewPage", {"pageContent":pageContent});//renders viewPage pug page 
});

app.get('/fruits', async function (req, res){//searches and returns results
    
    let result = await helperFunctions.getTopResults(db, "pageContent", fruitsIndex, req);
    res.format({//handles headers asking for html or json
		"text/html": () => {res.status(200).render("searchResults",{"results":result})},
		"application/json": () => {
            console.log("Sending JSON.");
            let jsonResults = helperFunctions.getJsonResults(result);
            res.status(200).json(jsonResults);//send back as json object
        }
	});
});

app.get('/personal', async function (req, res){//searches and returns resultsz

    let result = await helperFunctions.getTopResults(db, "personalContent", personalIndex, req);
    res.format({//handles headers asking for html or json
		"text/html": () => {res.status(200).render("searchResults",{"results":result})},
		"application/json": () => {
            console.log("Sending JSON.");
            let jsonResults = helperFunctions.getJsonResults(result);
            res.status(200).json(jsonResults);//send back as json object
        }
	});
});

app.listen(3000);
console.log("Server listening at http://134.117.131.5:3000");