const functions = require("firebase-functions");
const admin = require("firebase-admin");
const app = require("express")();

admin.initializeApp();

const config = {
  apiKey: "AIzaSyBvgdEXo3WWapvVLqO-OdA6SriH1gK3Bvs",
  authDomain: "socialmediaclone-f5653.firebaseapp.com",
  projectId: "socialmediaclone-f5653",
  storageBucket: "socialmediaclone-f5653.appspot.com",
  messagingSenderId: "586861615492",
  appId: "1:586861615492:web:5708db2b7ae6dd9a07a5d1",
};

const firebase = require("firebase");
const { object } = require("firebase-functions/lib/providers/storage");
const { ResultStorage } = require("firebase-functions/lib/providers/testLab");
firebase.initializeApp(config);

const db = admin.firestore();

// This route will pull from our posts database
app.get("/blasts", (req, res) => {
  db.collection("blasts")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      //Once we have the data, we can throw it into an array
      let blasts = [];
      data.forEach((doc) => {
        blasts.push({
          blastId: doc.id,
          body: doc.data().body,
          userName: doc.data().userName,
          createdAt: doc.data().createdAt,
        });
      });
      // Send our JSON object to the client
      return res.json(blasts);
    })
    // And of course, handle any errors
    .catch((err) => {
      console.error(err);
    });
});

// Middleware to validate user is authorized to post
const FBAuth = (req, res, next) => {
  let idToken
  if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
    idToken = req.headers.authorization.split('Bearer ')[1]
    console.error(idToken)
  } else {
    console.error('No token found')
    return res.status(403).json({ error: 'Please Log In'})
  }

  admin.auth().verifyIdToken(idToken)
  .then(decodedToken => {
    req.user = decodedToken
    console.log(decodedToken);
    return db.collection('users')
    .where('userId', '==', req.user.uid)
    .limit(1)
    .get()
  })
  .then(data => {
    req.user.userName = data.docs[0].data().userName
    return next()
  })
  .catch(err => {
    console.error('Error while verifying token ', err)
    return res.status(403).json(err)
  })

}

// Function to create posts
app.post("/blasts", FBAuth, (req, res) => {
  // using the request body to format our new post obect
  const newBlast = {
    body: req.body.body,
    userName: req.user.userName,
    createdAt: new Date().toISOString(),
  };

  // add the new post object as a fireStore document to the blasts collection
  db.collection("blasts")
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

// Helper Functions -

//testing to make sure that a field is not empty (used for validation)
const isEmpty = (entryString) => {
  if (entryString === '') return true;
  else return false;
};

// vaiading a valid email address
const isEmail = (email) => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(emailRegEx)) return true;
  else return false;
};

// user sign up
app.post("/signup", (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    userName: req.body.userName,
  };

  // Validation for user sign up from the client

  let errors = {};

  // checking for empty email
  if (isEmpty(newUser.email)) {
    errors.email = "must not be empty";
    // checking for valid email address
  } else if (!isEmail(newUser.email)) {
    errors.email = "Must be a valid email address";
  }
  // password field empty check
  if (isEmpty(newUser.password)) errors.password = "must not be empty";
  // password and confirm password match
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = "Passwords must match";
  // userName empty check
  if (isEmpty(newUser.userName)) errors.userName = "must not be empty";
  // if there is ANYTHING in the errors object, send the client a 400 and the list of errors
  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  let token, userId;
  // we need to make sure that the userName is unique
  db.doc(`/users/${newUser.userName}`)
  .get()
  .then((doc) => {
    if (doc.exists) {
      return res
      .status(400)
      .json({ userName: "This userName is already taken" });
    } else {
      // userName is uinique, so we can create it in the authentication store
      return firebase
      .auth()
      .createUserWithEmailAndPassword(newUser.email, newUser.password);
    }
  })
  // retrieve authentication token from google
  .then((data) => {
    userId = data.user.uid;
    return data.user.getIdToken();
  })
  // create new document in the users collection for the signup (Separate from authentication store, so we can add to it later)
  .then((idToken) => {
    token = idToken;
    const userCredentials = {
      userName: newUser.userName,
      email: newUser.email,
      createdAt: new Date().toISOString(),
      userId,
    };
    db.doc(`/users/${newUser.userName}`).set(userCredentials);
  })
  .then(() => {
    // return the token to the client
    return res.status(201).json({ token });
  })
  .catch((err) => {
    // instead of using googles error codes, we want to generate our own, to maintain continuity
    if (err.code === "auth/email-already-in-use") {
      return res.status(400).json({ email: "Email already in use" });
    } else {
      return res.status(500).json({ error: err.code });
    }
  });
});

// login route
app.post('/login', (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  }

  let errors = {}

  if (isEmpty(user.email)) errors.email = 'Must not be empty'
  if (!isEmail(user.email)) errors.email = 'Must be a valid email address'
  if (isEmpty(user.password)) errors.password = 'Must not be empty'

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);

  firebase
  .auth()
  .signInWithEmailAndPassword(user.email, user.password)
  .then((data) => {
    return data.user.getIdToken()
  })
  .then((token) => {
    return res.json({token})
  })
  .catch((err) => {
    console.error(err)
    if(err.code === 'auth/wrong-password'){
      return res.status(403).json({general: 'Invalid Credentials - Please try again'})
    } else return res.status(500).json({error: err.code})
  })


})


// create our generic route (https://baseurl.com/api/)

exports.api = functions.https.onRequest(app);
