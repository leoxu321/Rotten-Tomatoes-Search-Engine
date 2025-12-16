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

const queuedLinks = new Set();
const visitedLinks = new Set();
const incomingLinks = {}; // To store incoming links

let pagesStored = [];
let idCounter = 0;
const maxCrawledPages = 500;
const c = new Crawler({
    maxConnections : 10, //use this for parallel, rateLimit for individual
    // rateLimit: 10,
    callback : function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            let $ = res.$; //get cheerio data, see cheerio docs for info
            let castWrap = cheerio.html($('.cast-wrap'));
            let castLinks = $(castWrap).find('a[data-qa="cast-crew-item-img-link"]');

            let celebFilmography = cheerio.html($('.celebrity-filmography__tbody'));
            let movieLinks = $(celebFilmography).find('a');

            let pageLinks;
            if (castLinks.length > 0) {//if there are cast links
                pageLinks = castLinks;
            }else if(movieLinks.length > 0){//if there are movie links
                pageLinks = movieLinks;
            }

            let top10Words;
            let info;
            if (castLinks.length > 0) {//if there are cast links, were in a movie page
                info = ($("div.media-body").text()).replace(/\s+/g, ' ');
                top10Words = helperFunctions.findTop10Words(info);
            }else if(movieLinks.length > 0){//if there are movie links, were in an actor page
                info = ($("div.celebrity-bio__content").text()).replace(/\s+/g, ' ');
                top10Words = helperFunctions.findTop10Words(info);
            }

            let queuedLink = res.request.uri.href;//current Crawled Page's link
            visitedLinks.add(queuedLink);//add current crawled link to visited set
            
            //if queued page doesnt exist in DB, then add it to DB
            let findQueuedpage = pagesStored.find((page) => page.queuedLink === queuedLink);
            if (!findQueuedpage){
                let tempPage = {};
                tempPage["id"] = idCounter++;
                tempPage["title"] = (queuedLink.match(/\/([^/]+)$/)[1]).replace(/[_-]/g, ' ');
                tempPage["info"] = info;
                tempPage["queuedLink"] = queuedLink;
                tempPage["pageRank"] = 1;
                tempPage["incomingLinks"] = [];
                tempPage["outgoingLinks"] = [];//outgoing links
                tempPage["wordFrequency"] = top10Words;//word frequency
                tempPage["isFruit"] = false;
                pagesStored.push(tempPage);
            }else{
                console.log(findQueuedpage.queuedLink + "Page already exists in Pages Stored.");
            }

            let linkSet = new Set();
            $(pageLinks).each(function(i, link){
                if(!$(link).attr('href').includes('/tv/')){//exclude tv links, so just movies and actors
                    linkSet.add($(link).attr('href'));
                }
            });
            // pageLinks = Array.from(linkSet).slice(0,5);//cap at 5 outgoing links for each page, otherwise itd be too much
            pageLinks = Array.from(linkSet);
            pageLinks.forEach((link) => {
                let currLink = "https://www.rottentomatoes.com" + link;

                let findQueuedpage = pagesStored.find((page) => page.queuedLink === queuedLink);//for outgoing links
                if (findQueuedpage){//if queued page exists in DB, then add currLink to outgoingLinks
                    findQueuedpage.outgoingLinks.push(currLink);
                    // findQueuedpage.incomingLinks.push(currLink);
                }

                // Store incoming links as queued link for each link on Queued page
                if (!incomingLinks[currLink]) {
                    incomingLinks[currLink] = [queuedLink];
                }else{
                    incomingLinks[currLink].push(queuedLink);
                }
                
                //if the curr link on page iterated isnt in the queue, then add it
                if (!queuedLinks.has(currLink) && queuedLinks.size < maxCrawledPages){
                    queuedLinks.add(currLink);
                    c.queue(currLink);
                }//uncomment this block to add and crawl through more links
                
            });
            console.log("Pages Stored Size: " + pagesStored.length + " Visited Pages Size: " + visitedLinks.size + " Queued Pages Size: " + queuedLinks.size);
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
    console.log("Done Personal Crawling.");
    
    //adds all incoming links to each page in incomingLinks
    let pageLinks = Object.keys(incomingLinks);
    for (let pageLink of pageLinks) {
        let currPage = pagesStored.find((page) => page.queuedLink === pageLink);
        if(currPage){
            currPage.incomingLinks = incomingLinks[pageLink]; // value is array of incoming links
            // console.log(currPage.incomingLinks);
        }
    }
    console.log("Personal Incoming Links Added.");

    await db.dropCollection("personalContent");
    await db.createCollection("personalContent");
    
    pagesStored.forEach(async function (page){
        await db.collection("personalContent").insertOne(page);
    });
    console.log("Personal Inserted to DB.");
    
    let allpersonalContent = await db.collection("personalContent").find().toArray();
    allpersonalContent.forEach(async function(doc){
        index.addDoc(doc);
    });
    console.log("Added all Personal Docs to Index.");
    helperFunctions.calcAllPageRanks(db, "personalContent"); //calculate pageRank for all pages and updates DB
    console.log("personalCrawler finished running.");
});

//Queue a URL, which starts the crawl
c.queue('https://www.rottentomatoes.com/celebrity/jim-sturgess');
queuedLinks.add('https://www.rottentomatoes.com/celebrity/jim-sturgess');

module.exports.index = index;