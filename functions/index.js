const functions = require('firebase-functions')

const app = require('express')()

const FBAuth = require('./util/FBAuth')

const {getAllBlasts, postNewBlast} = require('./routes/blasts')
const {signup, login} = require('./routes/users')


// Blasts routes
app.get('/blasts', getAllBlasts)
app.post('/blast', FBAuth, postNewBlast)

// Users routes
app.post('/register', signup)
app.post('/login', login)


// create our generic route (https://baseurl.com/api/)

exports.api = functions.https.onRequest(app);
