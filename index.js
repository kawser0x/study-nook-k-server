const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const db = client.db("studynook");
const roomCollection = db.collection("roomcollections");

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/rooms", async (req, res) => {
  const { search, floor, maxPrice } = req.query;
  const query = {};

  if (search && search.trim() !== "") {
    const searchRegex = { $regex: search.trim(), $options: "i" };
    query.$or = [
      { name: searchRegex },
      { shortDescription: searchRegex },
      { amenities: searchRegex },
    ];
  }

  if (floor && floor !== "all") {
    const floorNumber = floor.replace(/\D/g, "");

    if (floorNumber) {
      query.floor = { $regex: floorNumber, $options: "i" };
    } else {
      query.floor = floor;
    }
  }

  if (maxPrice && !isNaN(Number(maxPrice))) {
    query.hourlyRate = { $lte: Number(maxPrice) };
  }

  const result = await roomCollection.find(query).toArray();
  res.json(result);
});

app.post("/rooms", async (req, res) => {
  const roomData = req.body;
  const result = await roomCollection.insertOne(roomData);
  res.status(201).json(result);
});

app.get("/rooms/:id", async (req, res) => {
  const { id } = req.params;
  const result = await roomCollection.findOne({ _id: new ObjectId(id) });

  res.json(result);
});

app.patch("/rooms/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Room ID format" });
  }

  const updatedData = { ...req.body };
  delete updatedData._id;

  const filter = { _id: new ObjectId(id) };
  const updateDoc = {
    $set: updatedData,
  };

  const result = await roomCollection.updateOne(filter, updateDoc);

  if (result.matchedCount === 0) {
    return res.status(404).json({ error: "Room not found" });
  }

  res.json({
    message: "Room updated successfully",
    modifiedCount: result.modifiedCount,
  });
});

app.delete("/rooms/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid Room ID format" });
  }

  const result = await roomCollection.deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "Room not found" });
  }

  res.json({
    message: "Room deleted successfully",
    deletedCount: result.deletedCount,
  });
});

async function run() {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("Connected to MongoDB!");

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

run();
