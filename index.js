
/* Setup */

/* Express */
let express = require("express");
let app = express();

/* Nedb Promises */
let datastore = require("nedb-promises");

/* Databases */
let announcements = datastore.create("data/announcements.db");
announcements.load();
let users = datastore.create("data/users.db");
users.load();
let forumPosts = datastore.create("data/forums.db");
forumPosts.load();
let forums = datastore.create("data/forum-info.db");
forums.load();

require("dotenv").config();

// Google API
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client("760625180157-urki85i1c7u00coqe32g7hc372a5rk4t.apps.googleusercontent.com");

// Google API verify function
async function verify(token) {

    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: "760625180157-urki85i1c7u00coqe32g7hc372a5rk4t.apps.googleusercontent.com",  // Specify the CLIENT_ID of the app that accesses the backend
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });

    const payload = ticket.getPayload();
    const userid = payload['sub'];
    // If request specified a G Suite domain:
    // const domain = payload['hd'];
    payload.userid = userid;
    console.log(payload);
    return payload;
}

// Express App setup
app.use(express.static("public"));
app.use(express.json({
    limit: '1mb'
}))
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening at ${port}`))

async function formatDataQuery(docs) {

    for (let doc of docs) {
        let user = await users.find({ _id: doc.userID });
        user = user[0];
        doc.name = user.name;
        doc.imgurl = user.picture;
    }
    return docs;

}

function convertMarkdownToHTML(str){
    let lines = str.split(/<\/div><div>|<div>|<\/div>/);
    if (lines[lines.length-1] === ''){
        lines.splice(lines.length-1,1);
    }
    let olnum = 0;
    let ul = false;

    for(let i = 0; i < lines.length; i++){
        // Header
        if(lines[i][0] === "#"){
            let numHead = 0;
            while(lines[i][0] === "#"){
                numHead++;
                lines[i] = lines[i].slice(1,lines[i].length);
            }
            if(numHead < 7){
                lines[i] = "<h" + numHead + ">" + lines[i] + "</h" + numHead + ">";
            }
        }

        // OL
        let contOL = false;
        if(lines[i][1] === "." && lines[i][2] === " "){
            let currInt = parseInt(lines[i][0]);
            if(isNaN(currInt)){
                break;
            }
            if(olnum === currInt - 1){
                lines[i] = "<li>" + lines[i].slice(3,lines[i].length) + "</li>";
                contOL = true;
                if (olnum === 0) {
                    lines[i] = "<ol>" + lines[i];
                }
                olnum++;
            }
        }
        if(!contOL && olnum != 0){
            olnum = 0;
            lines[i-1] = lines[i-1] + "</ol>"
        }

        // UL
        let contUL = false;
        if(lines[i][0] === "*" && lines[i][1] === " "){
            contUL = true;
            lines[i] = "<li>" + lines[i].slice(2, lines[i].length) + "</li>";
            if(!ul){
                lines[i] = "<ul>" + lines[i];
            }
            ul = true;
        }
        if(!contUL && ul){
            lines[i-1] = lines[i-1] + "</ul>";
            ul = false;
        }

        // bold
        let index = lines[i].indexOf("**");
        while(index != -1){
            let begin = index;
            lines[i] = lines[i].slice(0,begin) + "<strong>" + lines[i].slice(begin+2,lines[i].length);
            let end = lines[i].indexOf("**");
            if(end == -1) break;
            lines[i] = lines[i].slice(0, end) + "</strong>" + lines[i].slice(end + 2, lines[i].length);
            index = lines[i].indexOf("**");
        }

        // italic
        index = lines[i].indexOf("*");
        while (index != -1) {
            let begin = index;
            lines[i] = lines[i].slice(0, begin) + "<i>" + lines[i].slice(begin + 1, lines[i].length);
            let end = lines[i].indexOf("*");
            if (end == -1) break;
            lines[i] = lines[i].slice(0, end) + "</i>" + lines[i].slice(end + 1, lines[i].length);
            index = lines[i].indexOf("*");
        }

        // links
        index = lines[i].indexOf("](");
        while(index != -1){
            let midIndex = index;
            let lastIndex = midIndex;
            while(lines[i][lastIndex] != ")"){
                lastIndex++;
                if(lastIndex == lines[i].length){
                    break;
                }
            }
            if (lastIndex == lines[i].length) {
                break;
            }
            let firstIndex = midIndex;
            while (lines[i][firstIndex] != "[") {
                firstIndex--;
                if (firstIndex == -1) {
                    break;
                }
            }
            if (firstIndex == -1) {
                break;
            }
            let content = lines[i].slice(firstIndex+1,midIndex);
            let link = lines[i].slice(midIndex+2,lastIndex);
            lines[i] = lines[i].slice(0, firstIndex) + `<a href=${link}>${content}</a>` + lines[i].slice(lastIndex + 1, lines[i].length);
            index = lines[i].indexOf("](");
        }
        
    }
    return lines.join('<br>');
}

function verifyHTML(str) {
    let allOK = true;

    let lowerpost = str.toLowerCase();
    let maliciousTags = ["<form", "<object", "<applet", "<embed", "&lt;script", "&lt;form", "&lt;object", "&lt;applet", "&lt;embed", "&lt;script"];
    for (let tag of maliciousTags) {
        if (lowerpost.indexOf(tag) !== -1) {
            allOK = false;
        }
    }
    return allOK;
}

class DEBUG {

    start() {
        //console.log("DEBUG SESSION START");
    }

    print(variable) {
        if (typeof variable == "object") {
            let keys = Object.keys(variable);
            for (let key of keys) {
                //console.log(key + ": " + variable[key]);
            }
        } else {
            //console.log(variable);
        }
    }

    error(variable) {
        //console.log("DEBUG ERROR START");
        this.print(variable);
        //console.log("DEBUG ERROR CLOSE");
        this.close();
    }

    close() {
        //console.log("DEBUG SESSION END");
    };
}

let D = new DEBUG();

async function verifyUser(req) {

    let user;
    try {

        let userdata = {};
        try {
            userdata = await verify(req.body.token);
        } catch (err) {
            throw err;
        }

        let docs = await users.find({ email: userdata.email })
        user = docs[0];

    } catch (error) {
        throw error;
    }

    return user;

}

// Get announcements, available to all
app.get("/announcements", async (req, res) => {

    D.start();
    D.print("Received get to /post.");

    // Query all announcements
    let docs = await announcements.find({});

    // Format announcements
    docs = await formatDataQuery(docs);

    // Send announcements
    res.send(docs);

    D.close();

})

app.post("/announcements", async (req, res) => {
    try {

        D.start();
        let returndata = {
            success: true
        };
        let user = await verifyUser(req);

        //if (!user.announcementsallowed) {
        if(false){
            throw ("Announcement not allowed by this user.");
        }

        let allOK = verifyHTML(req.body.post);
        let mdPost = req.body.post;
        let actualPost = convertMarkdownToHTML(mdPost);
        allOK = allOK && verifyHTML(actualPost);

        if (!allOK) {
            throw ("Malicious content detected");
        }

        if (allOK) {
            await announcements.insert({
                userID: user._id,
                post: actualPost,
                rawPost: mdPost,
                timestamp: Date.now()
            });
            D.print("Announcement added.");

            returndata.status = "success"
            res.send(returndata);
        } else {
            throw ("Announcement had potentially malicious content.")
        }
        D.close();


    } catch (err) {
        D.error(err);
        res.send({
            error: err,
            status: "error",
            success: false
        });
    }
})

app.post("/users", async (req, res) => {
    try {
        D.start();
        D.print("Received post to /users")

        let returndata = {
            success: true
        };

        let userdata;
        try {
            userdata = await verify(req.body.token);
        } catch (err) {
            throw err;
        }
        D.print("User verified.");

        let docs = await users.find({ email: userdata.email })

        if (docs.length == 0) {
            let insertion = userdata;
            insertion.announcementsallowed = false;
            insertion.createforumsallowed = true;
            insertion.admin = false;
            await users.insert(insertion, (err, docs) => {
                returndata.status = "user added and verified"
                D.print("Added")
            })
        } else {
            returndata.status = "user verified"
        }
        returndata.signedIn = true;

        res.send(returndata);
        D.print("Returned");

        D.close();

    } catch (err) {
        D.error(err);
        res.send({
            error: err,
            status: "error",
            success: false
        });
    }
})

app.post("/forums", async (req, res) => {
    try {
        D.start();
        let returndata = {
            success: true
        };

        let user = await verifyUser(req);

        if (req.body.create) {
            if (!user.createforumsallowed) {
                throw ("Creating forums not allowed by this user.");
            }
            let docs = await forums.find({ name: req.body.forum });
            if (docs.length != 0) {
                throw ("Forum already exists.");
            }


            if (!req.body.read || (req.body.read != "ALL" && (typeof req.body.read != "Object" || !req.body.read.isArray()))) {
                throw ("Invalid read permissions");
            }

            if (!req.body.write || (req.body.write != "ALL" && (typeof req.body.write != "Object" || !req.body.write.isArray()))) {
                throw ("Invalid write permissions");
            }

            let readList = [];
            if (typeof req.body.read === "Object" && req.body.read.isArray()){
                for(let email of req.body.read){
                    let users = users.find({email: email});
                    if(users.length > 0){
                        let user = users[0];
                        readList.push(user._id);
                    }
                }
                req.body.read = readList;
            }

            let writeList = [];
            if (typeof req.body.write === "Object" && req.body.write.isArray()) {
                for (let email of req.body.write) {
                    let users = users.find({ email: email });
                    if (users.length > 0) {
                        let user = users[0];
                        writeList.push(user._id);
                    }
                }
                req.body.write = writeList;
            }

            console.log({
                name: req.body.forum,
                read: req.body.read,
                write: req.body.write,
                created: Date.now(),
                createdByUserID: user._id
            });

            forums.insert({
                name: req.body.forum,
                read: req.body.read,
                write: req.body.write,
                created: Date.now(),
                createdByUserID: user._id
            })
            returndata.status = "added"

        } else {
            let docs = await forums.find({ name: req.body.forum });
            if (docs.length == 0) {
                throw ("Forum doesn't exist.");
            }
            let forum = docs[0];
            if (forum.write != "ALL" && forum.write.indexOf(user._id) == -1) {
                throw ("User doesn't have permissions to write in this forum");
            }

            let allOK = verifyHTML(req.body.post);
            if (!allOK) {
                throw ("Malicious content detected");
            }

            let mdPost = req.body.post;
            let actualPost = convertMarkdownToHTML(mdPost);
            allOK = allOK && verifyHTML(actualPost);

            if (!allOK) {
                throw ("Malicious content detected");
            }

            await forumPosts.insert({
                post: actualPost,
                rawPost: req.body.post,
                forumID: forum._id,
                timestamp: Date.now(),
                userID: user._id
            })
            returndata.status = "Added post"
            D.print("Post added")

        }
        res.send(returndata);
        D.close();
    } catch (err) {
        D.error(err);
        res.send({
            error: err,
            status: "error",
            success: false
        });
    }
})

app.post("/forums-get", async (req, res) => {
    try {

        D.start();

        let user = await verifyUser(req);

        if (typeof req.body.forum !== "string") {
            throw("Invalid forum name");
        }

        let docs = await forums.find({ name: req.body.forum });
        if (docs.length == 0) {
            throw ("Forum doesn't exist.");
        }
        let forum = docs[0];
        if (forum.read != "ALL" && forum.read.indexOf(user.email) == -1) {
            throw("User doesn't have permissions to read in this forum");
        }

        docs = await forumPosts.find({ forumID: forum._id })

        docs = await formatDataQuery(docs);

        res.send(docs);
        D.close();
    } catch (err) {
        D.error(err);
        res.send({
            error: err,
            status: "error",
            success: false
        });
    }
})

app.post("/admin", async (req,res) => {
    try {

        D.start();
        let user = await verifyUser(req);

        if(!user.admin){
            throw "user not admin";
        }

        let db = req.body.db;
       /* let change = req.body.change;
        let changeTo = req.body.changeTo;*/

        switch(db){
            case "user":
                let users = await users.find({});
                res.send(users);
                break;
        }
    
    } catch (err) {
        D.error(err);
        res.send({
            error: err,
            status: "error",
            success: false
        });
    }

})
