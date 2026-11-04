
const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
);

let db;

async function connectMongo() {
    if (!db) {
        await client.connect();

        db = client.db(
            process.env.MONGODB_DB || "evcharge_nosql"
        );

        console.log("MongoDB connected successfully");
    }

    return db;
}

function getMongoDB() {
    if (!db) {
        throw new Error("MongoDB is not connected");
    }

    return db;
}

module.exports = {
    connectMongo,
    getMongoDB
};
