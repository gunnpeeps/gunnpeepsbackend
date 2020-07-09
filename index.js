let express = require("express");
let app = express();

let datastore = require("nedb-promises");
let posts = datastore.create("data/posts.db");
posts.load();
let users = datastore.create("data/users.db");
users.load();

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client("760625180157-urki85i1c7u00coqe32g7hc372a5rk4t.apps.googleusercontent.com");

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
    console.log(payload.email);
    return payload;
}

app.use(express.static("public"));
app.use(express.json({
    limit: '1mb'
}))
app.listen(3000, () => console.log("listening at 3000"))

app.get("/post", async (req,res) => {
    console.log("DEBUG BEGIN");
    console.log("Received get to /post.");
    let docs = await posts.find({});
    console.log(`docs: ${docs}`);

    for (let doc of docs) {
        let user = await users.find({email: doc.email});
        user = user[0];
        doc.name = user.name;
        doc.imgurl = user.picture;
        doc._id = undefined;
    }

    console.log(`new docs: ${docs}`);
    res.send(docs);
    console.log("DEBUG END");
})

app.post("/post", async (req,res) => {
    console.log("DEBUG BEGIN");
    console.log("Received post to /post: ");
    console.log(req.body.post);

    let returndata = {
    };

    let userdata;
    try {
        userdata = await verify(req.body.token);
    } catch (err) {
        console.log("There was an error:")
        console.log(err);
        returndata.err = err;
        returndata.status = "error";
        res.send(returndata);
        return;
    }
    console.log("User verified.");

    let docs = await users.find({email: userdata.email})
    let query = docs[0];
    await posts.insert({
        email: query.email,
        post: req.body.post,
        timestamp: Date.now()
    });
    console.log("Post added.");
    console.log("DEBUG END");


})

app.post("/users", async (req,res) => {

    console.log("DEBUG BEGIN");
    console.log("Received post to /users")

    let returndata = {
    };

    let userdata;
    try {
        userdata = await verify(req.body.token);
    } catch(err){
        console.log("There was an error:")
        console.log(err);
        returndata.err = err;
        returndata.status = "error";
        res.send(returndata);
        return;
    }
    console.log("User verified.");

    let docs = await users.find({email: userdata.email})
        
    if(docs.length == 0){
        await users.insert(userdata, (err,docs) =>{
            returndata.status = "user added and verified"
            console.log("Added")
        })
    } else {
        returndata.status = "user verified"
    }
    returndata.signedIn = true;

    res.send(returndata);
    console.log("Returned")

    console.log("DEBUG END");
    
})
