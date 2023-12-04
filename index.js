const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
    const paymentsCollection = database.collection("payments");
    const soldPropertiesCollection = database.collection("soldProperties");
    // await client.connect();

    // api for jwt authorize 
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: '10h' });
      res.send({ token });
    })

    // middlewares 

    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.SECRET_TOKEN, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.user = decoded;
        next();
      })
    }

    const verifyAgent = async (req, res, next) => {
      const email = req.user.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAgent = user?.role === 'agent';
      if (!isAgent) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    const verifyAdmin = async (req, res, next) => {
      const email = req.user.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }


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

    app.patch("/user/makeAgent/:id", verifyToken , verifyAdmin , async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "agent",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    app.patch("/user/makeAdmin/:id", verifyToken, verifyAdmin , async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    app.patch("/user/makeFraud/:id", verifyToken , verifyAdmin , async (req, res) => {
      const id = req.params.id;
      const email = req.query.email;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "fraud",
        },
      };
      const query = { agent_email: email };
      const deleteProperties = await propertiesCollection.deleteMany(query);
      const deleteOffered = await offeredCollection.deleteMany(query);
      const deleteWishlist = await wishlistCollection.deleteMany(query);
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.delete("/users/:id", verifyToken , verifyAdmin , async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/users", verifyToken , async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/user/admin/:email", verifyToken , async (req, res) => {
      const email = req?.params?.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        if (!user?.role) {
          res.send({ role: null });
        } else if (user?.role === "agent") {
          res.send({ role: user?.role });
        } else if (user?.role === "admin") {
          res.send({ role: user?.role });
        } else {
          res.send({ message: "unauthorized access" });
        }
      } else {
        res.send({ message: "user not found" });
      }
    });

    // advertise api
    app.get("/advertisements", async (req, res) => {
      const result = await advertisementsCollection.find().toArray();
      res.send(result);
    });
    // property api
    app.delete("/properties/:id", verifyToken , verifyAgent , async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/unverifiedProperties", verifyToken , verifyAdmin , async (req, res) => {
      const query = {
        verification_status: { $in: ["unverified", "rejected"] },
      };
      const result = await propertiesCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/properties", verifyToken , async (req, res) => {
      const email = req.query.email;
      let query = { verification_status: "verified" };
      if (email) {
        query = { agent_email: email };
      }
      const result = await propertiesCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/properties/:id", verifyToken , async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.findOne(query);
      res.send(result);
    });

    app.post("/properties", verifyToken , verifyAgent , async (req, res) => {
      const property = req.body;
      const result = await propertiesCollection.insertOne(property);
      res.send(result);
    });

    app.patch("/properties/:id", verifyToken , verifyAgent , async (req, res) => {
      const id = req.params.id;
      const property = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          title: property?.title,
          location: property?.location,
          price: property?.price,
          desc: property?.desc,
        },
      };
      const result = await propertiesCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.get("/property/:id" , async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await propertiesCollection.findOne(query);
      res.send(result);
    });

    // wishlist api

    app.post("/wishlist", verifyToken , async (req, res) => {
      const item = req.body;
      const result = await wishlistCollection.insertOne(item);
      res.send(result);
    });

    app.get("/wishlist", verifyToken , async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/wishlist/:id" , async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.findOne(query);
      res.send(result);
    });
    app.delete("/wishlist/:id", verifyToken , async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });
    // app.get("/wishlistCount" , async (req , res) => {
    //   const count = await wishlistCollection.estimatedDocumentCount();
    //   res.send({count})
    // })

    app.post("/offeredProperties/:id", verifyToken , async (req, res) => {
      const id = req.params.id;
      const property = req.body;
      const query = { _id : new ObjectId(id)};
      const deleteResult = await wishlistCollection.deleteOne(query);
      const result = await offeredCollection.insertOne(property);
      const soldResult = await soldPropertiesCollection.insertOne(property);
      res.send(result);
    });

    app.get("/requestedProperties", verifyToken  , async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { agent_email: email };
      }
      const result = await soldPropertiesCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/requested/accept/:id", verifyToken , verifyAgent , async (req, res) => {
      const id = req.params.id;
      const image = req.query.image;
      const title = req.query.title;
      const filter2 = { image: image, title: title };
      const options2 = { upsert: true };
      const updateDoc2 = {
        $set: {
          status: "rejected",
        },
      };
      const result2 = await soldPropertiesCollection.updateMany(
        filter2,
        updateDoc2,
        options2
      );
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: "accepted",
        },
      };
      const result = await soldPropertiesCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      res.send(result);
    });
    app.patch("/requested/verify/property/:id", verifyToken , verifyAdmin , async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          verification_status: "verified",
        },
      };
      const result = await propertiesCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    app.patch("/requested/reject/:id", verifyToken , verifyAgent , async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: "rejected",
        },
      };
      const result = await soldPropertiesCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    app.patch("/requested/reject/property/:id", verifyToken , verifyAdmin , async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          verification_status: "rejected",
        },
      };
      const result = await propertiesCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.get("/offeredProperties", verifyToken , async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { email: email };
      }
      const result = await offeredCollection.find(query).toArray();
      res.send(result);
    });

    // payment intent

    app.post("/create-payment-intent", verifyToken , async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount : amount,
        currency : "usd",
        payment_method_types : ['card']
      })
      res.send({
        clientSecret : paymentIntent.client_secret
      })
    });

    app.post('/payments' , verifyToken , async (req , res) => {
      const payment = req.body;
      const paymentResult = await paymentsCollection.insertOne(payment);
      const query = { _id: {
        $in : payment?.propertyBoughtIds?.map(id => new ObjectId(id))
      }}
      const deleteResult = await offeredCollection.deleteMany(query);

      res.send(paymentResult);
    })

    app.get("/payments" , verifyToken , verifyAgent , async (req ,res) => {
      const email = req.query.email;
      const allPayments = await paymentsCollection.find({}).toArray();
      const allIds = allPayments.reduce((acc , doc) => acc.concat(doc.propertyBoughtIds || []),[]);
      const objectIds = allIds.map(id => new ObjectId(id));
      const allPropertiesByPaymentIds = await soldPropertiesCollection.find({ _id : { $in : objectIds}}).toArray();
      const mySoldProperties = await allPropertiesByPaymentIds.filter(item => item.agent_email === email);
      // console.log(mySoldProperties)
      res.send({mySoldProperties});
    })
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
