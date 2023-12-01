const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// 
// 


const { MongoClient, ServerApiVersion , ObjectId} = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.t0jep8i.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const database = client.db("HomezDb");
    const advertisementsCollection = database.collection("advertisements");
    const propertiesCollection = database.collection("properties");

    app.get("/advertisements" , async (req , res) => {
        const result = await advertisementsCollection.find().toArray();
        res.send(result);
    })

    app.get("/properties" , async (req , res) => {
        const result = await propertiesCollection.find().toArray();
        res.send(result);
    })

    app.get("/property/:id" , async (req , res) => {
        const id = req.params.id;
        const query = { _id : new ObjectId(id)};
        const result = await propertiesCollection.findOne(query);
        res.send(result);
    })
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/" , (req , res) => {
    res.send("Homez Server is Running...")
})

app.listen(port , () => {
    console.log(`Homez Server is running on port : ${port}`)
})