
/* Setup */

/* Express */
let express = require("express");
let app = express();

let cors = require("cors");
app.use(cors());

/* Crypto */
let crypto = require("crypto");

/* Nodemailer */
let nodemailer = require("nodemailer");

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'romger.fletcher@gmail.com',
        pass: '!momo4113!'
    }
});

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
const client = new OAuth2Client("89861449366-vs15a690emufecfurb11275vb9e31h63.apps.googleusercontent.com");

// Google API verify function
async function verify(token) {

    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: "89861449366-vs15a690emufecfurb11275vb9e31h63.apps.googleusercontent.com",  // Specify the CLIENT_ID of the app that accesses the backend
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });

    const payload = ticket.getPayload();
    const userid = payload['sub'];
    // If request specified a G Suite domain:
    // const domain = payload['hd'];
    payload.userid = userid;
    //console.log(payload.email);
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
        if(user){
            doc.name = user.name;
            doc.imgurl = user.picture;
        }
    }
    return docs;

}

function convertMarkdownToHTML(str){
    let lines = str.split(/<br>|<\/div><div>|<div>|<\/div>/);
    if (lines[lines.length-1] === ''){
        lines.splice(lines.length-1,1);
    }
    let olnum = 0;
    let ul = false;

    let image = false;

    for(let i = 0; i < lines.length; i++){

        let p = true;

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
            p = false;
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
                p = false;
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
            p = false;
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

        // Img
        if(lines[i][0] === "-" && lines[i][1] === "-" && !image){
            image = true;
            lines[i] = `<img src=${lines[i].slice(2,lines[i].length)} style="max-width: 500px; height: auto">`;
            p = false;
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

        if(p){
            lines[i] = "<p>" + lines[i] + "</p>";
        }
        
    }
    return lines.join('');
}

function verifyHTML(str) {
    let allOK = true;

    if(str.length > 1000){
        allOK = false;
    }

    let lowerpost = str.toLowerCase();
    let maliciousTags = ["<form", "<img", "<iframe", "<object", "<applet", "<embed", "&lt;script", "&lt;form", "&lt;object", "&lt;applet", "&lt;embed", "&lt;script"];
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
        console.log(variable);
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

        if(req.body.signingwithgoogle){
            try {
                userdata = await verify(req.body.token);
            } catch (err) {
                throw err;
            }

            let docs = await users.find({ email: userdata.email })
            if(docs.length == 0){
                throw "USER NOT FOUND";
            }
            user = docs[0];
        } else {
            let docs = await users.find({ ssid: req.body.ssid});
            if(docs.length == 0){
                throw "WRONG SESSION ID";
            }
            user = docs[0];
        }

        

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

        if (!user.announcementsallowed) {
            throw ("Announcement not allowed by this user.");
        }

        let allOK = verifyHTML(req.body.post);
        let mdPost = req.body.post;
        let actualPost = convertMarkdownToHTML(mdPost);

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

let randomStr = function(strLen){
    let token = crypto.randomBytes(strLen);
    token = token.toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
    return token;
}

let signIn = async function(id){
    let ssid = randomStr(32);
    let user = await users.find({_id: id});
    if(user.length == 0){
        throw "USER NOT FOUND";
    }
    await users.update({_id: id},  {$set: {ssid: ssid}}, {});
    await users.persistence.compactDatafile();
    return {
        ssid: ssid,
        user: user,
        success: true,
        signedIn: true,
        status: "SIGNED IN"
    }
}

app.post("/user-create", async (req,res) => {
    try {
        let returndata = {
            success: true
        };

        if(req.body.signingwithgoogle){
            try {
                userdata = await verify(req.body.token);
            } catch (err) {
                throw err;
            }

            let docs = await users.find({ email: userdata.email })
            if (docs.length > 0) {
                throw "EMAIL TAKEN";
            }
            docs = await users.find({
                atname: req.body.atname
            })
            if (docs.length > 0) {
                throw "USERNAME TAKEN";
            }
            await users.insert({
                name: req.body.fn + " " + req.body.ln,
                picture: userdata.picture,
                given_name: req.body.fn,
                family_name: req.body.ln,
                announcementsallowed: true,
                createforumsallowed: false,
                admin: false,
                email: userdata.email,
                atname: req.body.atname,
                password: req.body.password
            });
            returndata.status = "ADDED";
        } else {
            let docs = await users.find({ email: req.body.email })
            if (docs.length > 0) {
                throw "EMAIL TAKEN";
            }
            docs = await users.find({
                atname: userdata.atname
            })
            if (docs.length > 0) {
                throw "USERNAME TAKEN";
            }
            await users.insert({
                name: req.body.fn + " " + req.body.ln,
                picture: "https://lh3.googleusercontent.com/-o1_zE5csJ7Y/Xw52dJlTjYI/AAAAAAAAR9A/WkogcoTxaTIS1crjWTRbG-tptm1KR8pNQCK8BGAsYHg/s0/2020-07-14.jpgs",
                given_name: req.body.fn,
                family_name: req.body.ln,
                announcementsallowed: true,
                createforumsallowed: false,
                admin: false,
                email: req.body.email,
                atname: req.body.atname,
                password: req.body.password
            });
            returndata.status = "ADDED";
        }
        res.send(returndata);
    } catch (err) {
        D.error(err);
        res.send({
            error: err,
            status: "error",
            success: false
        });
    }
});

app.post("/user-sign-in", async (req,res) => {
    try {
        if (req.body.signingwithgoogle) {
            try {
                userdata = await verify(req.body.token);
            } catch (err) {
                throw err;
            }

            let docs = await users.find({
                email: userdata.email
            })
            if (docs.length > 0) {
                let returndata = await signIn(docs[0]._id);
                res.send(returndata);
            } else {
                throw "USER NOT FOUND";
            }
            
        } else {
            if(req.body.username){
                let docs = await users.find({
                    username: req.body.username
                })
                if(docs.length == 0){
                    throw "NOT FOUND";
                }

            } else {
                let docs = await users.find({
                    email: req.body.email
                })
                if (docs.length == 0) {
                    throw "NOT FOUND";
                }
            }
        }
    } catch (err) {
        D.error(err);
        res.send({
            error: err,
            status: "ERROR",
            success: false
        });
    }
});

/*app.post("/users", async (req, res) => {
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
            insertion.announcementsallowed = true;
            insertion.createforumsallowed = false;
            insertion.admin = false;
            await users.insert(insertion, (err, docs) => {
                returndata.status = "user added and verified"
                D.print("Added")
            })
            returndata.success = false;
            returndata.status = "user not found";
        } else {
            returndata.status = "user verified"
        }
        returndata.signedIn = true;

        res.send(returndata);
        D.print("Returned");

        console.log(userdata.email);

        D.close();

    } catch (err) {
        D.error(err);
        res.send({
            error: err,
            status: "error",
            success: false
        });
    }
})*/

app.post("/forums", async (req, res) => {
    try {
        D.start();
        let returndata = {
            success: true
        };

        let user = await verifyUser(req);
        
        console.log(user.name);

        if (req.body.create) {
            if (!user.createforumsallowed) {
                throw ("CREATING FORUMS NOT ALLOWED BY THIS USER");
            }
            let docs = await forums.find({ name: req.body.forum });
            if (docs.length != 0) {
                throw ("FORUM ALREADY EXISTS.");
            }


            if (!req.body.read || (req.body.read != "ALL" && (typeof req.body.read != "Object" || !req.body.read.isArray()))) {
                throw ("INVALID READ PERMISSIONS");
            }

            if (!req.body.write || (req.body.write != "ALL" && (typeof req.body.write != "Object" || !req.body.write.isArray()))) {
                throw ("INVALID WRITE PERMISSIONS");
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

            console.log(`Forum ${req.body.forum} created`);

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
                throw ("FORUM DOESN'T EXIST");
            }
            let forum = docs[0];
            if (forum.write != "ALL" && forum.write.indexOf(user._id) == -1) {
                throw ("USER DOESN'T HAVE PERMISSIONS TO WRITE IN THIS FORUM");
            }

            let allOK = verifyHTML(req.body.post);
            if (!allOK) {
                throw ("MALICIOUS CONTENT DETECTED");
            }

            let mdPost = req.body.post;
            let actualPost = convertMarkdownToHTML(mdPost);

            console.log(`Posted in ${forum.name}: ${actualPost}`);

            await forumPosts.insert({
                post: actualPost,
                rawPost: req.body.post,
                forumID: forum._id,
                timestamp: Date.now(),
                userID: user._id
            })
            returndata.status = "ADDED POST"
            D.print("POST ADDED")

        }
        res.send(returndata);
        D.close();
    } catch (err) {
        D.error(err);
        res.send({
            error: err,
            status: "ERROR",
            success: false
        });
    }
})

app.post("/forums-get", async (req, res) => {
    try {

        D.start();

        let user = await verifyUser(req);

        if (typeof req.body.forum !== "string") {
            throw("INVALID FORUM NAME");
        }

        let docs = await forums.find({ name: req.body.forum });
        if (docs.length == 0) {
            throw ("FORUM DOESN'T EXIST");
        }
        let forum = docs[0];
        if (forum.read != "ALL" && forum.read.indexOf(user.email) == -1) {
            throw("USER DOESN'T HAVE PERMISSIONS TO READ IN THIS FORUM");
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
            throw "USER NOT ADMIN";
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

app.post("/users-get",async (req,res) => {

    let user = await verifyUser(req);

    if(user.email !== "rogerjoeyfan@gmail.com"){
        return;
    }

    let stuff = await users.find({});

    var mailOptions = {
        from: 'romger.fletcher@gmail.com',
        to: 'rogerjoeyfan@gmail.com',
        subject: 'Haha users go brrrr',
        text: JSON.stringify(stuff)
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
})
