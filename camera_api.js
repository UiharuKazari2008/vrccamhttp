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
let ready = false;

let imageCache = new Map();
let defaultImages = new Map();
let imageKeys = [];

const defaultImagesPath = path.join(__dirname, '/img/');
const dir = fs.opendirSync(defaultImagesPath)
let dirent
while ((dirent = dir.readSync()) !== null) {
    const buffer = fs.readFileSync(path.join(defaultImagesPath, dirent.name));
    console.log(`Loaded ${dirent.name} - (${buffer.length} bytes)`);
    defaultImages.set(dirent.name, buffer);
}
dir.closeSync()

console.log(defaultImages.keys())

function refreshCache() {
    // Refresh Images from Discord
    discordClient.getMessages(global.ChannelID, parseInt(global.NumImages))
        .then(function (messages) {
            let requests = messages.reduce((promiseChain, message) => {
                return promiseChain.then(() => new Promise((resolve) => {
                    let requests2 = message.attachments.reduce((promiseChain2, image) => {
                        return promiseChain2.then(() => new Promise((resolve2) => {
                            const key = image.url.split('/').pop()
                            console.log(`Loading Image "${key}" into cache...`)
                            if (imageCache.has(key) === false) {
                                fetch(image.url)
                                    .then(res => res.buffer())
                                    .then(buffer => {
                                        console.log(buffer)
                                        imageCache.set(key, buffer)
                                        resolve2()
                                    })
                            } else {
                                resolve2()
                            }
                        }));
                    }, Promise.resolve());
                    requests2.then(() => resolve());
                }));
            }, Promise.resolve());
            requests.then(() => {
                imageKeys = []
                imageCache.forEach(function(bufferdata, key) {
                    imageKeys.push(key)
                })
                ready = true

                console.log(`Local Image Cache Is Ready! Loaded ${imageKeys.length} Images into Memory`)
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
app.get('/', function (req, res) {
    res.status(200).send('<b>BlackHeart API v0.1 - PERSONAL USE ONLY</b>')
});
app.get("/endpoint/getScreenshot", function(req, res) {
    res.contentType('image/jpeg');
    if ( ready === true ) {
        if ( req.query.key !== undefined && "" + req.query.key.substring(0, 32) === global.LoginKey ) {
            if (req.query.nimage !== null && req.query.nimage !== undefined) {
                const nImage = parseInt(req.query.nimage.substring(0, 2));
                console.log(nImage)
                if (!isNaN(nImage) && nImage <= imageKeys.length - 1) {
                    const imageWanted = imageCache.get(imageKeys[nImage])
                    console.log(imageWanted)
                    console.log(imageCache.keys())
                    console.log(imageKeys)
                    if (imageWanted !== undefined) {
                        res.status(200).end(imageWanted, 'binary');
                    } else {
                        res.status(500).end(defaultImages.get('readfailed.png'), 'binary');
                    }
                } else {
                    console.log("Returning a random image due to invalid number")
                    res.status(200).end(imageCache.get(imageKeys[Math.floor(Math.random() * imageKeys.length)]), 'binary');
                }
            } else {
                console.log("Returning a random image")
                res.status(200).end(imageCache.get(imageKeys[Math.floor(Math.random() * imageKeys.length)]), 'binary');
            }
        } else {
            console.log("Verification of World Failed")
            res.status(200).end(defaultImages.get('loginerror.png'), 'binary');
        }
    } else {
        console.log("Not Ready")
        res.status(200).end(defaultImages.get('notready.png'), 'binary');
    }
});
app.get("/endpoint/getPhotoFrame", function(req, res) {
    res.contentType('image/jpeg');
    if ( ready === true ) {
        if ( req.query.key !== undefined && "" + req.query.key.substring(0, 32) === global.LoginKey ) {
            if (req.query.nimage !== null && req.query.nimage !== undefined) {
                const nImage = parseInt(req.query.nimage.substring(0, 2));
                console.log(nImage)
                if (!isNaN(nImage) && nImage <= imageKeys.length - 1) {
                    const imageWanted = imageCache.get(imageKeys[nImage])
                    console.log(imageWanted)
                    console.log(imageCache.keys())
                    console.log(imageKeys)
                    if (imageWanted !== undefined) {
                        res.status(200).end(imageWanted, 'binary');
                    } else {
                        res.status(500).end(defaultImages.get('readfailed.png'), 'binary');
                    }
                } else {
                    console.log("Returning a random image due to invalid number")
                    res.status(200).end(imageCache.get(imageKeys[Math.floor(Math.random() * imageKeys.length)]), 'binary');
                }
            } else {
                console.log("Returning a random image")
                res.status(200).end(imageCache.get(imageKeys[Math.floor(Math.random() * imageKeys.length)]), 'binary');
            }
        } else {
            console.log("Verification of World Failed")
            res.status(200).end(defaultImages.get('loginerror.png'), 'binary');
        }
    } else {
        console.log("Not Ready")
        res.status(200).end(defaultImages.get('notready.png'), 'binary');
    }
});