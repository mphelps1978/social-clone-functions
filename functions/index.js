require('dotenv').config()
const functions = require('firebase-functions')

const app = require('express')()

const FBAuth = require('./util/FBAuth')

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
