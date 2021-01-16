const functions = require("firebase-functions");
const admin = require("firebase-admin");
const app = require('express')()

admin.initializeApp();

const config = {
  apiKey: "AIzaSyBvgdEXo3WWapvVLqO-OdA6SriH1gK3Bvs",
  authDomain: "socialmediaclone-f5653.firebaseapp.com",
  projectId: "socialmediaclone-f5653",
  storageBucket: "socialmediaclone-f5653.appspot.com",
  messagingSenderId: "586861615492",
  appId: "1:586861615492:web:5708db2b7ae6dd9a07a5d1"
}


const firebase = require('firebase')
firebase.initializeApp(config)

const db = admin.firestore()

// This route will pull from our posts database
app.get('/blasts', (req, res) => {
  db
  .firestore()
  .collection("blasts")
  .orderBy('createdAt', 'desc')
  .get()
  .then((data) => {
    //Once we have the data, we can throw it into an array
    let blasts = [];
    data.forEach((doc) => {
      blasts.push({
        blastId: doc.id,
        body: doc.data().body,
        userName: doc.data().userName,
        createdAt: doc.data().createdAt
      });
    });
    // Send our JSON object to the client
    return res.json(blasts);
  })
  // And of course, handle any errors
  .catch((err) => {
    console.error(err);
  });
})


// Function to create posts
app.post('/blasts',(req, res) => {

  // using the request body to format our new post obect
  const newBlast = {
    body: req.body.body,
    userName: req.body.userName,
    createdAt: new Date().toISOString()
  };

  // add the new post object as a fireStore document
  db
    .firestore()
    .collection("blasts")
    .add(newBlast)
    .then((doc) => {
      // successful addition. Return the id of the document from fireStore
      res.json({ message: `document ${doc.id} created` });
    })

    // error handling
    .catch((err) => {
      res.status(500).json({ error: "Something went wrong" });
      console.error(err);
    });
});

// user sign up

app.post('/signup', (req,res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    userName: req.body.userName,
  }

  //TODO: Validate Data

  db.doc(`/users/${newUser.userName}`).get()
  .then(doc => {
    if (doc.exists) {
      return res.status(400).json({userName: 'This userName is already taken'})
    } else {
      return firebase
      .auth()
      .createUserWithEmailAndPassword(newUser.email, newUser.password)
    }
  })
  .then(data => {
    return data.user.getIdToken()
  })
  .then(token => {
    return res.status(201).json({ token })
  })
  .catch(err => {
    if (err.code === 'auth/email-already-in-use') {
      return res.status(400).json({email: 'Email already in use'})
    } else {
      return res.status(500).json({ error: err.code})
    }
  })
})


// create our generic route (https://baseurl.com/api/)

exports.api = functions.https.onRequest(app)
