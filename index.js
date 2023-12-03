const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//
//

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.t0jep8i.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const database = client.db("HomezDb");
    const advertisementsCollection = database.collection("advertisements");
    const propertiesCollection = database.collection("properties");
    const wishlistCollection = database.collection("wishlist");
    const offeredCollection = database.collection("offered");
    const usersCollection = database.collection("users");
    // await client.connect();

    // users api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const exist = await usersCollection.findOne(query);
      if (exist) {
        return res.send({ message: "already have this user" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/user/admin/:email" , async (req , res) => {
      const email = req?.params?.email;
      const query = { email : email};
      const user = await usersCollection.findOne(query);
      if(user){
        if(!user?.role){
          res.send({role : null})
        }else if(user?.role === "agent"){
          res.send({role : user?.role})
        }else if(user?.role === "admin"){
          res.send({role : user?.role})
        }else{
          res.send({message : "unauthorized access"})
        }
      }else{
        res.send({message : "user not found"})
      }
    })

    // advertise api
    app.get("/advertisements", async (req, res) => {
      const result = await advertisementsCollection.find().toArray();
      res.send(result);
    });
    // property api
    app.delete("/properties/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/properties", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { agent_email: email };
      }
      const result = await propertiesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/properties/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.findOne(query);
      res.send(result);
    });

    app.post("/properties", async (req, res) => {
      const property = req.body;
      const result = await propertiesCollection.insertOne(property);
      res.send(result);
    });

    app.patch("/properties/:id", async (req, res) => {
      const id = req.params.id;
      const property = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          title : property?.title,
          location : property?.location,
          price : property?.price,
          desc : property?.desc
        },
      };
      const result = await propertiesCollection.updateOne(filter, updateDoc , options);
      res.send(result)
    });

    app.get("/property/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.findOne(query);
      res.send(result);
    });

    // wishlist api

    app.post("/wishlist", async (req, res) => {
      const item = req.body;
      const result = await wishlistCollection.insertOne(item);
      res.send(result);
    });

    app.get("/wishlist", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.findOne(query);
      res.send(result);
    });
    app.delete("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });
    // app.get("/wishlistCount" , async (req , res) => {
    //   const count = await wishlistCollection.estimatedDocumentCount();
    //   res.send({count})
    // })

    app.post("/offeredProperties", async (req, res) => {
      const property = req.body;
      const result = await offeredCollection.insertOne(property);
      res.send(result);
    });

    app.get("/requestedProperties" , async (req , res) => {
      const email = req.query.email;
      let query = {};
      if(email){
        query = { agent_email : email };
      }
      const result = await offeredCollection.find(query).toArray();
      res.send(result); 
    })

    app.patch("/requested/accept/:id" , async (req , res) => {
      const id = req.params.id;
      const image = req.query.image;
      const title = req.query.title;
      const filter2 = { image : image , title : title};
      const options2 = { upsert : true };
      const updateDoc2 = {
        $set : {
          status : 'rejected',
        }
      }
      const result2 = await offeredCollection.updateMany(filter2 , updateDoc2 , options2)
      const filter = { _id : new ObjectId(id)};
      const options = { upsert : true };
      const updateDoc = {
        $set : {
          status : "accepted",
        }
      }
      const result = await offeredCollection.updateOne(filter , updateDoc , options);
      
      res.send(result);
    })
    app.patch("/requested/reject/:id" , async (req , res) => {
      const id = req.params.id;
      const filter = { _id : new ObjectId(id)};
      const options = { upsert : true };
      const updateDoc = {
        $set : {
          status : "rejected",
        }
      }
      const result = await offeredCollection.updateOne(filter , updateDoc , options);
      res.send(result);
    })

    app.get("/offeredProperties", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if(email){
        query = { email : email };
      }
      const result = await offeredCollection.find(query).toArray();
      res.send(result);
    });
    // Connect the client to the server	(optional starting in v4.7)
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Homez Server is Running...");
});

app.listen(port, () => {
  console.log(`Homez Server is running on port : ${port}`);
});
