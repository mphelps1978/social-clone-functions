// design purposes only - No real functionality in the application will be found here

let db = {
// our users database with some basic profile information
// TODO: Add more details?
  users: [
    {
    userId: 'c9800j3p9048uurl;ksdjfl;3049uuj',
    email: 'user@email.com',
    userName: 'user',
    createdAt: '2021-01-18T15:35:40.215Z',
    imageUrl: 'image/slkdfjsadf/sljkdfhsf',
    bio: 'Hello, my name is user, nice to meet you',
    Location: 'USA'
    }
  ],

  // Our posts information. Barebones
  //TODO: Implement more features? (images, type of likes (FB-Style))
  blasts: [

    {
      userName: 'user',
      body: 'this is the blast body',
      createdAt: '2021-01-16T23:04:23.377Z',
      likeCount: 5,
      commentCount: 2
    }

  ],

  comments: [
    {
      userName: 'string',
      blastId: 'string',
      body: 'string',
      createdAt: 'timestamp'
    }
  ]
}

  const userDetails = {
    // Redux data (state)
    credentials: {
      userID: 'string',
      email: 'string',
      userName: 'string',
      createdAt: 'timestamp',
      imageUrl: 'string',
      bio: 'string',
      website: 'string',
      location: 'string',
    },
    likes: [
      {
        userName: 'string',
        blastId: 'string'
      },

      {
        userName: 'string',
        blastId: 'string'
      },

      {
        userName: 'string',
        blastId: 'string'
      },

    ]
}


