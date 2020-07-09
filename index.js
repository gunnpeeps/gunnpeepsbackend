let express = require("express");
let app = express();

let datastore = require("nedb");
let database = new datastore("data/posts.db");

app.use(express.static("public"));
app.use(express.json({
    limit: '1mb'
}))
