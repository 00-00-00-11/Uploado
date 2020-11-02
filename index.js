const express = require("express")
const fUpload = require('express-fileupload');
const fs = require("fs")
var imgur = require('imgur')
var db = require("quick.db")

const app = express()

app.use(fUpload());
app.set('trust proxy', true);
app.set('view engine', 'ejs');
app.use("/assets", express.static(__dirname + '/assets'))

app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] === 'http')
    return res.redirect(301, `https://${req.headers.host}/${req.url}`)

  next();
});

const date = new Date()

function generateID() {
    var length = 8,
        charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        retVal = "";
    for (var i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

imgur.setClientId(process.env.g)

app.post("/upload", async(req, res) => {
    var embed;
    var files = fs.readdirSync(__dirname + '/files');
    
    // WITH SHAREX
    if(req.header("user-agent").startsWith("ShareX/")) {
        if(req.header("secret") !== process.env.secret) return res.status(400).json({error: "Bad secret key"})
        if(!req.files.file) return res.status(400).json({error: "No provided file"})

        req.files.file.mv(__dirname + `/files/${date}`, (err) => {
            if(err) return res.status(400).json({error: "Unexpected error occured while trying to upload file"});
    
            imgur.uploadFile("./files/"+date)
            .then(function(json) {
                var id = generateID()
                if(!req.header("embed") || req.header("embed") === "false") embed = "false"
                if(req.header("embed") === "true") embed = "true"
                if(!req.header("user")) var user = "Anonym"
                if(req.header("user")) var user = req.header("user")
                db.set("up_" + id, {
                    rdate: date,
                    rname: req.files.file.name,
                    rlink: json.data.link,
                    rembed: embed,
                    ruser: user
                })
                db.add("size", 1)
                res.status(200).json({url: process.env.url +"/"+ id})
                fs.unlinkSync(__dirname + "/files/"+date)
            })
            .catch(function (err) {
                var erro;
                res.status(400).json({error: err.message.message});
                console.error(err.message);
            });        
        })
        return;
    }

    // NORMAL WITH BUTTON
    req.files.foo.mv(__dirname + `/files/${date}`, (err) => {
        if(err) return res.status(400).json({error: "Unexpected error occured while trying to upload file"});

        imgur.uploadFile("./files/"+date)
        .then(function(json) {
            var id = generateID()

            db.set("up_" + id, {
                rdate: date,
                rname: req.files.foo.name,
                rlink: json.data.link,
                rembed: false,
                ruser: "Anonym"
            })
            db.add("size", 1)
            res.redirect("/" + id)
            fs.unlinkSync(__dirname + "/files/"+date)
        })
        .catch(function (err) {
            var erro;
            res.status(400).json({error: err.message.message});
            console.error(err.message);
        });        
    })
})

app.get("/", async(req, res) => {
    var size = db.get("size");

    res.render("index", {
        files: size,
        urltoupload: process.env.url
    })
})

app.get("/:id", async(req, res) => {
    var r = db.get("up_" + req.params.id)

    if(!r) return res.status(400).json({error: "Not valid ID"})
    console.log(r)
    res.render("imgindex", {
        date: r.rdate,
        name: r.rname,
        link: r.rlink,
        embed: r.rembed,
        user: r.ruser,
        urltoupload: process.env.url
    })
})

app.listen(5000, () => {
    console.log("Web Started : 5000")
})
