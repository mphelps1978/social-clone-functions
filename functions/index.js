require('dotenv').config()
const functions = require('firebase-functions')

const app = require('express')()

const FBAuth = require('./util/FBAuth')

const {db} = require('./util/admin')

const {
  getAllBlasts,
  postNewBlast,
  getBlast,
  commentOnBlast,
  likeBlast,
  unlikeBlast,
  deleteBlast
} = require('./routes/blasts')

const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead
} = require('./routes/users')


// Blasts routes
app.get('/blasts', getAllBlasts)
app.post('/blast', FBAuth, postNewBlast)
app.get('/blast/:blastId', getBlast)
app.post('/blast/:blastId/comment', FBAuth, commentOnBlast)
app.get('/blast/:blastId/like', FBAuth, likeBlast)
app.get('/blast/:blastId/unlike', FBAuth, unlikeBlast)
app.delete('/blast/:blastId', FBAuth, deleteBlast)


// Users routes
app.post('/register', signup)
app.post('/login', login)
app.post('/user/image', FBAuth, uploadImage)
app.post('/user', FBAuth, addUserDetails)
app.get('/user', FBAuth, getAuthenticatedUser)
app.get('/user/:userName', getUserDetails)
// app.post('/notifications', FBAuth, markNotificationsRead)


// create our generic route (https://baseurl.com/api/)

exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions
.region('us-central1')
.firestore.document('likes/{id}')
.onCreate((snapshot) => {
  return db
  .doc(`/blasts/${snapshot.data().blastId}`)
  .get()
  .then(doc => {
    if(doc.exists && doc.data().userName !== snapshot.data().userName){
      return db.doc(`/notifications/${snapshot.id}`).set({
        createdAt: new Date().toISOString(),
        recipient: doc.data().userName,
        sender: snapshot.data().userName,
        type: 'like',
        read: false,
        blastId: doc.id
      })
    }
  })
  .catch(err => {
    console.error(err)
  })
})

exports.deleteNotificationOnUnlike = functions.region('us-central1').firestore.document('likes/{id}')
.onDelete((snapshot) => {
  return db.doc(`/notifications/${snapshot.id}`).delete()

  .catch(err => {
    console.error(err)
  })
})


exports.createNotificationOnComment = functions.region('us-central1').firestore.document('comments/{id}')
.onCreate((snapshot) => {
  return db.doc(`/blasts/${snapshot.data().blastId}`).get()
  .then(doc => {
    if(doc.exists && doc.data().userName !== snapshot.data().userName){
      return db.doc(`/notifications/${snapshot.id}`).set({
        createdAt: new Date().toISOString(),
        recipient: doc.data().userName,
        sender: snapshot.data().userName,
        type: 'comment',
        read: false,
        blastId: doc.id
      })
    }
  })
  .catch(err => {
    console.error(err)
  })
})


// Update user Image on posts and comments if the user changes their profile picture

exports.onUserImageChange = functions.region('us-central1').firestore.document('/users/{userId}').onUpdate((change) => {
  if(change.before.data().imageUrl !== change.after.data().imageUrl) {
    console.log('image has changed');
    const batch = db.batch()
    return db.collection('blasts').where('userName', '==', change.before.data().userName).get()
      .then((data) => {
        data.forEach(doc => {
          const blast = db.doc(`/blasts/${doc.id}`)
          batch.update(blast, {userImage: change.after.data().imageUrl})
        })
        return batch.commit()
      })
  } else return true
})

// remove any notifications, comments, likes, etc..  if a post has been deleted

exports.onScreamDelete = functions.region('us-central1').firestore.document('/blasts/{blastId}').onDelete((snapshot, context) => {
    const blastId = context.params.blastId;
    const batch = db.batch();
    return db
      .collection('comments')
      .where('blastId', '==',blastId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db
          .collection('likes')
          .where('blastId', '==',blastId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection('notifications')
          .where('blastId', '==',blastId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });