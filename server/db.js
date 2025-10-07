const { MongoClient, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';
if (!MONGO_URI) {
  console.warn('MONGO_URI not set - scenarios will not persist');
}

let client;
let db;

async function connect() {
  if (db) return db;
  if (!MONGO_URI) return null;
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(process.env.MONGO_DB || 'roisimulator');
  return db;
}

async function getCollection() {
  const database = await connect();
  if (!database) return null;
  return database.collection('scenarios');
}

module.exports = { connect, getCollection, ObjectId };
