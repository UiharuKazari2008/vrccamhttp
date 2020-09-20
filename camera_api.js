console.log("Discord Actor");

const eris = require('eris');
const express = require("express");
const app = express()
const path = require("path");
const fs = require('fs')
const fetch = require('node-fetch');
const http = require('http').createServer(app).listen(9080);
const global = require('./config.json');
const discordClient = new eris.Client(global.APIKey, {
    compress: true,
    restMode: true,
});
let ready1 = false;
let ready2 = false;
let frameCycle = 0;

let imageScreenshotCache = new Map();
let imageFrameCache = new Map();
let defaultImages = new Map();
let imageScreenshotKeys = [];
let imageFrameKeys = [];

const defaultImagesPath = path.join(__dirname, '/img/');
const dir = fs.opendirSync(defaultImagesPath)
let dirent
while ((dirent = dir.readSync()) !== null) {
    const buffer = fs.readFileSync(path.join(defaultImagesPath, dirent.name));
    console.log(`Loaded ${dirent.name} - (${buffer.length} bytes)`);
    defaultImages.set(dirent.name, buffer);
}
dir.closeSync()

function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

console.log(defaultImages.keys())

function refreshCache() {
    // Refresh Images from Discord
    ready1 = false;
    ready2 = false;
    let _imageScreenshotKeysActive = [];
    let _imageFramesKeysActive = [];
    discordClient.getMessages(global.ScreenshotChannelID, parseInt(global.ScreenshotNumImages))
        .then(function (messages) {
            let requests = messages.reduce((promiseChain, message) => {
                return promiseChain.then(() => new Promise((resolve) => {
                    let requests2 = message.attachments.reduce((promiseChain2, image) => {
                        return promiseChain2.then(() => new Promise((resolve2) => {
                            const key = image.url.split('/').pop()
                            if (imageScreenshotKeys.indexOf(key) === -1) {
                                console.log(`Loading Image "${key}" into cache...`)
                                fetch(image.url)
                                    .then(res => res.buffer())
                                    .then(buffer => {
                                        imageScreenshotCache.set(key, buffer);
                                        _imageScreenshotKeysActive.push(key);
                                        resolve2()
                                    })
                            } else {
                                _imageScreenshotKeysActive.push(key);
                                resolve2()
                            }
                        }));
                    }, Promise.resolve());
                    requests2.then(() => resolve());
                }));
            }, Promise.resolve());
            requests.then(() => {
                imageScreenshotKeys = []
                imageScreenshotCache.forEach(function(bufferdata, key) {
                    if (_imageScreenshotKeysActive.indexOf(key) === -1) {
                        imageScreenshotCache.delete(key)
                    } else {
                        imageScreenshotKeys.push(key)
                    }
                })
                ready1 = true
                console.log(`Local Image Cache Is Ready! Loaded ${imageScreenshotKeys.length} Images into Memory`)
            });
        })
    discordClient.getMessages(global.FramePortChannelID, parseInt(global.FramePortNumImages))
        .then(function (messages) {
            let requests = messages.reduce((promiseChain, message) => {
                return promiseChain.then(() => new Promise((resolve) => {
                    let requests2 = message.attachments.reduce((promiseChain2, image) => {
                        return promiseChain2.then(() => new Promise((resolve2) => {
                            const key = image.url.split('/').pop()
                            if (imageFrameKeys.indexOf(key) === -1) {
                                console.log(`Loading Image "${key}" into cache...`)
                                fetch(image.url)
                                    .then(res => res.buffer())
                                    .then(buffer => {
                                        imageFrameCache.set(key, buffer);
                                        _imageFramesKeysActive.push(key);
                                        resolve2()
                                    })
                            } else {
                                _imageFramesKeysActive.push(key);
                                resolve2()
                            }
                        }));
                    }, Promise.resolve());
                    requests2.then(() => resolve());
                }));
            }, Promise.resolve());
            requests.then(() => {
                imageFrameKeys = []
                let _imageFrameKeys = []
                imageFrameCache.forEach(function(bufferdata, key) {
                    if (_imageFramesKeysActive.indexOf(key) === -1) {
                        imageFrameCache.delete(key)
                    } else {
                        _imageFrameKeys.push(key)
                    }
                })
                imageFrameKeys = shuffle(_imageFrameKeys)
                ready2 = true
                console.log(`Local Image Cache Is Ready! Loaded ${imageFrameKeys.length} Images into Memory`)
            });
        })
}

discordClient.on("ready", () => {
    console.log('[Discord] Connected to Discord!');
    discordClient.getSelf()
        .then(function(selfstatic) {
            console.log(`[Discord] User: ${selfstatic.username}(${selfstatic.id})`);
            refreshCache()
            setInterval(refreshCache, 60000);
        })
        .catch((er) => {
            console.log(er);
        });
});
discordClient.connect()
discordClient.on("error", function(er) {
    console.log('Discord Error!')
    console.error(er);
    process.exit(1);
})



app.use(express.json({limit: '1mb'}));
app.use(express.urlencoded({extended : true, limit: '1mb'}));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, User-Agent");
    next();
});
// Handle 404
//app.use(function(req, res) {
//    res.contentType('image/jpeg');
//    res.status(404).end(defaultImages.get('unknown.jpg'), 'binary');
//});
// Handle 500
app.use(function(error, req, res, next) {
    res.contentType('image/jpeg');
    res.status(404).end(defaultImages.get('error.jpg'), 'binary');
    console.log(error)
});
// Handle Default Requests
app.get('/', function (req, res) {
    res.status(200).send('<b>BlackHeart API2 v0.2 - PERSONAL USE ONLY</b>')
});
// Handle Image Requests
app.get("/endpoint/getImage", function(req, res) {
    res.contentType('image/jpeg');
    if (req.query.query !== null && req.query.query !== undefined) {
        let wide = null;
        if (req.query.query.substring(0,10) === "vrccam") {
            wide = true;
        } else if (req.query.query.substring(0,10) === "pframe") {
            wide = false;
        } else {
            wide = null;
            console.log("Invalid Request Type")
            res.status(404).end(defaultImages.get('unknown.jpg'), 'binary');
        }
        if ( wide !== null && ((req.query.query.substring(0,10) === "vrccam" && ready1 === true) || (req.query.query.substring(0,10) === "pframe" && ready2 === true)) ) {
            if ( req.query.key !== undefined && "" + req.query.key.substring(0, 32) === global.LoginKey ) {
                if ((req.query.query.substring(0,10) === "vrccam" && imageScreenshotKeys.length === 0) || (req.query.query.substring(0,10) === "pframe" && imageFrameKeys.length === 0)) {
                    console.log("Not Ready, no data")
                    if (wide) {
                        res.status(200).end(defaultImages.get('wide-not-ready.jpg'), 'binary');
                    } else {
                        res.status(200).end(defaultImages.get('tall-not-ready.jpg'), 'binary');
                    }
                } else {
                    if (req.query.nimage !== null && req.query.nimage !== undefined) {
                        const nImage = parseInt(req.query.nimage.substring(0, 5));
                        if ((!isNaN(nImage)) && ((req.query.query.substring(0,10) === "vrccam" && imageScreenshotKeys.length !== 0 && nImage <= imageScreenshotKeys.length - 1) || (req.query.query.substring(0,10) === "pframe" && imageFrameKeys.length !== 0 && nImage <= imageFrameKeys.length - 1))) {
                            let imageWanted = undefined;
                            if (req.query.query.substring(0,10) === "vrccam") {
                                imageWanted = imageScreenshotCache.get(imageScreenshotKeys[nImage])
                            } else if (req.query.query.substring(0,10) === "pframe") {
                                imageWanted = imageFrameCache.get(imageFrameKeys[nImage])
                            }

                            if (imageWanted !== undefined) {
                                res.contentType('image/png');
                                res.status(200).end(imageWanted, 'binary');
                            } else {
                                if (wide) {
                                    res.status(500).end(defaultImages.get('wide-read-failed.jpg'), 'binary');
                                } else {
                                    res.status(500).end(defaultImages.get('tall-read-failed.jpg'), 'binary');
                                }
                            }
                        } else {
                            console.log("Invalid Request")
                            if (wide) {
                                res.status(404).end(defaultImages.get('wide-not-found.jpg'), 'binary');
                            } else {
                                res.status(404).end(defaultImages.get('tall-not-found.jpg'), 'binary');
                            }
                        }
                    } else {
                        if (req.query.query.substring(0,10) === "vrccam") {
                            res.status(200).end(imageScreenshotCache.get(imageScreenshotKeys[Math.floor(Math.random() * imageScreenshotKeys.length)]), 'binary');
                        } else if (req.query.query.substring(0,10) === "pframe") {
                            if (frameCycle > imageFrameKeys.length - 1) {
                                frameCycle = 0;
                            }
                            res.status(200).end(imageFrameCache.get(imageFrameKeys[frameCycle]), 'binary');
                            frameCycle++;
                        }

                    }
                }
            } else {
                console.log("Verification of World Failed")
                if (wide) {
                    res.status(200).end(defaultImages.get('wide-old-key.jpg'), 'binary');
                } else {
                    res.status(200).end(defaultImages.get('tall-old-key.jpg'), 'binary');
                }
            }
        } else {
            console.log("Not Ready")
            if (wide) {
                res.status(200).end(defaultImages.get('wide-not-ready.jpg'), 'binary');
            } else {
                res.status(200).end(defaultImages.get('tall-not-ready.jpg'), 'binary');
            }
        }
    } else {
        console.log("Invalid Request Type")
        res.status(404).end(defaultImages.get('unknown.jpg'), 'binary');
    }
});