const { admin, db } = require("../util/admin");

// Image uploader imports
const BusBoy = require("busboy");
const path = require("path");
const os = require("os");
const fs = require("fs");

const config = require("../util/config");

const firebase = require("firebase");
firebase.initializeApp(config);

const { validateSignupData, validateLoginData, reduceUserDetails } = require("../util/validators");
const { response } = require("express");


// New User registration
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

  const noImg = 'no-image.png'

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
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
        userId
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


// Login
exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  // Run helper function to validate the data
  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);

  // call the firebase auth function to get the users idToken
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

// User Profile details

exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body)
  db.doc(`/users/${req.user.userName}`).update(userDetails)
  .then(() =>{
    return res.json({message: "Details updated"})
  })
  .catch(err => {
    console.error(err)
    return res.status(500).json({error: err.code})
  })
}

// Get own user details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {}
  db.doc(`/users/${req.user.userName}`).get()
  .then(doc => {
    if(doc.exists){
      userData.credentials = doc.data()
      return db.collection('likes').where('userName', '==', req.user.userName).get()
    }
  })
  .then(data => {
    userData.likes = []
    data.forEach((doc) => {
      userData.likes.push(doc.data())
    })
    return db
    .collection('notifications')
    .where('recipient', '==', req.user.userName)
    .orderBy('createdAt', 'desc').get()
  })
  .then(data => {
    userData.notifications = []
    data.forEach(doc => {
      userData.notifications.push({
        recipient: doc.data().recipient,
        sender: doc.data().sender,
        read: doc.data().read,
        blastId: doc.data().blastId,
        type: doc.data().type,
        createdAt: doc.data().createdAt,
        notificationId: doc.id
      })
    })
    return res.json(userData)
  })
  .catch(err => {
    console.error(err)
    return res.status(500).json({error: err.code})
  })
}

// get any users details
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.userName}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection("blasts")
          .where("userName", "==", req.params.userName)
          .orderBy("createdAt", "desc")
          .get();
      } else {

        return res.status(404).json({ error: "User not found" });
      }
    })
    .then((data) => {
      userData.blasts = [];
      data.forEach((doc) => {
        userData.blasts.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userName: doc.data().userName,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          blastId: doc.id,
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


// Image Uploader
exports.uploadImage = (req, res) => {
  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};


  busboy.on("file", (fieldName, file, filename, encoding, mimetype) => {

    // we want to avoid users uploading anything except a png or jpg
    if(mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
      return res.status(400).json({error: 'Invalid file type. Only PNG and JPEG are supported.'})
    }

    // to get the extension, we split the name into an array on the '.', and grab the last element in the array
    // (in the event of a scenario where we have something like 'filename.something.png')
    const imageExtension = filename.split(".")[filename.split(".").length - 1];

    // We re-assign the filename to something random (using math.random) and round it to avoid decimal places
    imageFileName = `${Math.round(Math.random() * 10000000)}.${imageExtension}`;

    // Now we set up the new path to the file, adding the filename
    const filepath = path.join(os.tmpdir(), imageFileName);

    // and create an upload stream to upload the image
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });

  // once the upload is finished, we need to store it in our FireBase bucket, giving it some metadata
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        return db.doc(`/users/${req.user.userName}`).update({ imageUrl });
      })
      .then(() => {
        return res.json({ message: "image uploaded successfully" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "something went wrong" });
      });
  });
  busboy.end(req.rawBody)
};
