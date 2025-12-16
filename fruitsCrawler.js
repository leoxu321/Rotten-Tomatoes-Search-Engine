const mongoose = require("mongoose");
const Crawler = require("crawler");
const elasticlunr = require("elasticlunr");
const cheerio = require("cheerio");
const helperFunctions = require("./helperFunctions.js");

mongoose.connect('mongodb://127.0.0.1:27017/FruitGraphDatabase', {useNewUrlParser: true});
let db = mongoose.connection;
mongoose.connection.on("error", err => {
	console.log("err", err)
})
mongoose.connection.on("connected", (err, res) => {
	console.log("mongoose is connected")
})

const visitedLinks = new Set();
const incomingLinks = {}; // To store incoming links
let pagesStored = [];
const c = new Crawler({
    maxConnections : 10, //use this for parallel, rateLimit for individual
    //rateLimit: 1000,
    // This will be called for each crawled page
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            let $ = res.$; //get cheerio data, see cheerio docs for info
            let links = $("a") //get all links from page

            let queuedLink = 'https://people.scs.carleton.ca/~davidmckenney/fruitgraph/' + $("title").text() + '.html';
            let findQueuedpage = pagesStored.find((page) => page.queuedLink === queuedLink);//for outgoing links
            if (!findQueuedpage){//if queued page doesnt exist in DB, then add it to DB
                let tempPage = {};
                tempPage["id"] = Number(queuedLink.split('-')[1].split('.')[0]);
                tempPage["title"] = $("title").text();
                tempPage["info"] = $("p").text();
                tempPage["queuedLink"] = queuedLink;
                tempPage["pageRank"] = 1;
                tempPage["incomingLinks"] = [];
                tempPage["outgoingLinks"] = [];//outgoing links
                let top10Words = helperFunctions.findTop10Words($("p").text());//find top 10 words in page
                tempPage["wordFrequency"] = top10Words;//word frequency
                tempPage["isFruit"] = true;
                pagesStored.push(tempPage);
            }

            $(links).each(function(i, link){
                //Log out links
                let currLink = 'https://people.scs.carleton.ca/~davidmckenney/fruitgraph/' + $(link).attr('href').slice(2);

                let findQueuedpage = pagesStored.find((page) => page.queuedLink === queuedLink);//for outgoing links
                if (findQueuedpage){//if queued page exists in DB, then add currLink to outgoingLinks
                    findQueuedpage.outgoingLinks.push(currLink);
                }
                
                // Store incoming links for each linked page
                if (!incomingLinks[currLink]) {
                    incomingLinks[currLink] = [queuedLink];
                }else{
                    incomingLinks[currLink].push(queuedLink);
                }

                if (!visitedLinks.has(currLink)){//if the curr link iterated hasnt been visited, then add it to the queue
                    // console.log($(link).text() + ':  ' + $(link).attr('href'));
                    visitedLinks.add(currLink);
                    c.queue(currLink);
                }//uncomment this block to add and crawl through more links
            });
        }
        done();
    }
});

let index = elasticlunr(function() {
    this.addField('title');
    this.addField('info');
    this.setRef('id');
});

c.on('drain',async function(){
    console.log("Fruits Done.");

    let pageLinks = Object.keys(incomingLinks);
    for (let pageLink of pageLinks) {//adds all incoming links to each page in incomingLinks
        let currPage = pagesStored.find((page) => page.queuedLink === pageLink);
        if(currPage){
            currPage.incomingLinks = incomingLinks[pageLink]; // value is array of incoming links
            // console.log(currPage.incomingLinks);
        }
    }
    console.log("Fruits Incoming Links Added.");

    await db.dropCollection("pageContent");
    await db.createCollection("pageContent");

    pagesStored.forEach(async function (page){
        await db.collection("pageContent").insertOne(page);
    });
    console.log("Fruits Inserted to DB.");
    
    let allPageContent = await db.collection("pageContent").find().toArray();
    allPageContent.forEach(async function(doc){
        index.addDoc(doc);
    });
    console.log("Added all Fruits Docs to Index.");
    helperFunctions.calcAllPageRanks(db, "pageContent"); //calculate pageRank for all pages and updates DB
    console.log("fruitsCrawler finished running.");
});

//Queue a URL, which starts the crawl
c.queue('https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html');
visitedLinks.add('https://people.scs.carleton.ca/~davidmckenney/fruitgraph/N-0.html');


module.exports.index = index;