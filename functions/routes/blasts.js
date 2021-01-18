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
}

exports.getBlast = (req, res) => {
  let blastData = {}
    db.doc(`/blasts/${req.params.blastId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({error: 'Blast not found'})
      }
      blastData = doc.data()
      blastData.blastId = doc.id
      return db.collection('comments').orderBy('createdAt', 'desc').where('blastId', '==', req.params.blastId).get()
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
