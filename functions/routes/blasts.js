const {db} = require('../util/admin')

exports.getAllBlasts = (req, res) => {
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
}

exports.postNewBlast = (req, res) => {
  // using the request body to format our new post obect
  const newBlast = {
    body: req.body.body,
    userName: req.user.userName,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  };

  // add the new post object as a fireStore document to the blasts collection
  db.collection("blasts")
    .add(newBlast)
    .then((doc) => {
      // successful addition. Return the id of the document from fireStore
      const resBlast = newBlast
      resBlast.blastId = doc.id
      res.json(resBlast);
    })

    // error handling
    .catch((err) => {
      res.status(500).json({ error: "Something went wrong" });
      console.error(err);
    });
}

// fetch one blast with comments
exports.getBlast = (req, res) => {
  let blastData = {}
    db.doc(`/blasts/${req.params.blastId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({error: 'Blast not found'})
      }
      blastData = doc.data()
      blastData.blastId = doc.id
      return db.collection('comments').orderBy('createdAt', 'asc').where('blastId', '==', req.params.blastId).get()
    })
    .then((data) => {
      // console.log(data)
      blastData.comments = []
      data.forEach((doc) => {
        blastData.comments.push(doc.data())
      })
      return res.json(blastData)
    })
    .catch(err => {
      console.error(err)
      res.status(500).json({error: err.code})
    })
}

// comment on a blast
exports.commentOnBlast = (req, res) => {
  if(req.body.body === '') return res.status(400).json({ error: 'must not be empty'})

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    blastId: req.params.blastId,
    userName: req.user.userName,
    userImage: req.user.imageUrl
  }

  db.doc(`/blasts/${req.params.blastId}`).get()
  .then(doc => {
    if(!doc.exists){
      return res.status(404).json({error: "This blast no longer exists"})
    } else {
    return doc.ref.update({ commentCount: doc.data().commentCount + 1})
    }
  })
  .then(() => {
    return db.collection('comments').add(newComment)
  })
  .then(() => {
    res.json(newComment)
  })
  .catch(err => {
    console.error(err)
    res.status(500).json({error: 'Something went wrong'})
  })
}

// Like & Unlike blasts System

exports.likeBlast = (req, res) => {
  const likeDocument = db.collection('likes')
    .where('userName', '==', req.user.userName)
    .where('blastId', '==', req.params.blastId)
    .limit(1)

  const blastDocument = db.doc(`/blasts/${req.params.blastId}`)

  let blastData

  blastDocument.get()
  .then(doc => {
    console.log(doc);
    if(doc.exists){
      blastData = doc.data()
      blastData.blastId = doc.id
      return likeDocument.get()
    } else {
      res.status(404).json({ error: 'Blast not found'})
    }
  })
  .then(data => {
    if(data.empty){
      return db.collection('likes').add({
        blastId: req.params.blastId,
        userName: req.user.userName
      })
      .then(() => {
        blastData.likeCount++
        return blastDocument.update({likeCount: blastData.likeCount})
      })
      .then(() => {
        return res.json(blastData)
      })
    } else {
      return res.status(400).json({error: 'You already like this'})
    }
  })
  .catch(err => {
    console.error(err)
    res.status(500).json({error: err.code})
  })
}

exports.unlikeBlast = (req, res) => {
  const likeDocument = db.collection('likes')
  .where('userName', '==', req.user.userName)
  .where('blastId', '==', req.params.blastId)
  .limit(1)

const blastDocument = db.doc(`/blasts/${req.params.blastId}`)

let blastData

blastDocument.get()
.then(doc => {
  if(doc.exists){
    blastData = doc.data()
    blastData.blastId = doc.id
    return likeDocument.get()
  } else {
    res.status(404).json({ error: 'Blast not found'})
  }
})
.then(data => {
  if(data.empty){
    return res.status(400).json({error: 'you need to like before you can unlike'})
  } else {
    return db.doc(`/likes/${data.docs[0].id}`).delete()
      .then(() => {
        if(blastData.likeCount > 0){
        blastData.likeCount--
        }
        return blastDocument.update({likeCount: blastData.likeCount})
      })
      .then(() => {
        res.json(blastData)
      })
  }
})
.catch(err => {
  console.error(err)
  res.status(500).json({error: err.code})
})

}