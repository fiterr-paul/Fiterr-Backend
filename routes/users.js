const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const Post = require('../models/Post')
const Profile = require('../models/Profile')

// @route       /api/users/register
// @desc        Register a user and log them in using passport
router.post('/register', async (req, res) => {

    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        
        if(user){
            return res.status(400).send('This user already exists');
        }
        
        const hash = await bcrypt.hash(password, 10);
        user = new User(req.body);
        user.password = hash;
        await user.save()

        req.login(user, (err) => {
          if (err) {
            return res.status(404).send('error')
          } else {
            return res.send(user)
          }
        })

    } catch (err) {
        console.error(err.message);
        res.status(400).send('Server error');
    }
});

// @route       /api/users/login
// @desc        Login as a user
router.post('/login', (req, res) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) { res.status(500).send(err) } // server error (eg. cant fetch data)
      else if (info) { return res.send(info) }   // login error messages from the local strategy (email not registered or password invalid)
      else {   
        // console.log('at this point a user has been found in the local strategy');
        req.login(user, (err) => {
          if(err) { return res.status(500).send(err) } // is this a different error to the 500 above?
        });    
        // now have access to req.user after logging in
        return res.status(200).json(req.user); 
      }
    })(req, res);
  }
)

// @route       /api/users/logout
// @desc        Logout
// NOTE: logout behaves strangely through Postman - probably related to express session in some way
router.get('/logout', (req, res) => {
  console.log('now logging out...');
  req.logout();
  console.log('req.user is now:', req.user);
  res.status(200).send('logged out')
});

// @route       /api/users/search-users
// @desc        search users in the database with the search term entered
// Note: this needs to be an authenticated route
router.post('/search-users', async(req, res) => {
  const { search } = req.body
  console.log('The search term is:', search);
  // this query checks whether the firstname or lastname contains the search term
  const searchRegex = {"$regex": search, "$options": "i" };
  let searchResults = await User.find({$or: [{"firstname": searchRegex}, {"lastname": searchRegex}]});
  // console.log(searchResults);  // log the users that you find in the search
  res.json({ searchedUsers: searchResults });
})

// @route       /api/users/get-user
// @desc        find both the user and their profile (for when their profile page is viewed on the frontend)
router.post('/get-viewing-user-profile', async(req, res) => {
  const ObjectId = require('mongoose').Types.ObjectId;
  const { id } = req.body;

  let user;
  if(ObjectId.isValid(id)){
    console.log('we have a mongoose id');
    user = await User.findOne({_id: id});
  } else {
    console.log('we have a username instead');
    user = await User.findOne({username: id});
  }
  // console.log(user);

  //then find the profile by the user id
  const profile = await Profile.findOne({ user: user._id });
  // console.log('The profile is:', profile);

  res.json({ user, profile });
});


module.exports = router;