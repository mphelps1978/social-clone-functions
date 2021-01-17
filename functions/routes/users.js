const { db } = require("../util/admin");

const config = require("../util/config");

const firebase = require("firebase");
firebase.initializeApp(config);

const { validateSignupData, validateLoginData } = require("../util/validators");

exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    userName: req.body.userName,
  };

  // Validation for user sign up from the client
  const { valid, errors } = validateSignupData(newUser);

  if (!valid) return res.status(400).json(errors);

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
};

exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "Invalid Credentials - Please try again" });
      } else return res.status(500).json({ error: err.code });
    });
};
