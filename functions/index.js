require('dotenv').config()
const functions = require('firebase-functions')

const app = require('express')()

const FBAuth = require('./util/FBAuth')

const {db} = require('./util/admin')

const {getAllBlasts, postNewBlast, getBlast, commentOnBlast, likeBlast, unlikeBlast, deleteBlast} = require('./routes/blasts')
const {signup, login, uploadImage, addUserDetails, getAuthenticatedUser} = require('./routes/users')


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
    if(doc.exists){
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
  .then(() => {
    return
  })
  .catch(err => {
    console.error(err)
    return
  })
})

exports.deleteNotificationOnUnlike = functions.region('us-central1').firestore.document('likes/{id}')
.onDelete((snapshot) => {
  return db.doc(`/notifications/${snapshot.id}`).delete()
  .then(() => {
    return
  })
  .catch(err => {
    console.error(err)
    return
  })
})


exports.createNotificationOnComment = functions.region('us-central1').firestore.document('comments/{id}')
.onCreate((snapshot) => {
  return db.doc(`/blasts/${snapshot.data().blastId}`).get()
  .then(doc => {
    if(doc.exists){
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
  .then(() => {
    return
  })
  .catch(err => {
    console.error(err)
    return
  })
})

