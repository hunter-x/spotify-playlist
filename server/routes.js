'use strict';

const Spotify = require('spotify-web-api-node');
const querystring = require('querystring');
const express = require('express');
const router = new express.Router();
var request = require('request');
const mongoose = require('mongoose');
const Party = require('./model/party');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://test:hackthenorth18@ds257732.mlab.com:57732/spotify-playlist'); // connect to database

// configure the express server
const CLIENT_ID = '058622cd5fbc48f0be5988bc66af696f';
const CLIENT_SECRET = 'a046be5c2f884bd58d99f25bffd1db17';
const REDIRECT_URI = 'http://localhost:3000/callback';
const STATE_KEY = 'spotify_auth_state';
// your application requests authorization
const scopes = ['user-read-private', 'user-read-email', 'playlist-read-private', 'playlist-modify-public', 'playlist-modify-private'];

// configure spotify
const spotifyApi = new Spotify({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI
});

/** Generates a random string containing numbers and letters of N characters */
const generateRandomString = N => (Math.random().toString(36) + Array(N).join('0')).slice(2, N + 2);

/**
 * The /login endpoint
 * Redirect the client to the spotify authorize url, but first set that user's
 * state in the cookie.
 */
router.get('/login', (_, res) => {
  const state = generateRandomString(16);
  res.cookie(STATE_KEY, state);
  res.redirect(spotifyApi.createAuthorizeURL(scopes, state));
});

router.get('/parties/:userId', function(req, res, next) {
  Party.find({members: req.params.userId}, (err, partyDocs) => {
    
    res.json(partyDocs);
  });
});

router.post('/createParty', (req, res, next) => {
  var party = new Party();
  party.members = [req.body.email];
  party.name = "Test Party";
  party.save((err, result) => {
    console.log("new party");
  });
})

router.get('/getPlaylists/:partyId', (req, res, next) => {
  Party.find({_id: req.params.partyId}, (err, data) => {
    
    res.json(data);
  });

})



/**
 * The /callback endpoint - hit after the user logs in to spotifyApi
 * Verify that the state we put in the cookie matches the state in the query
 * parameter. Then, if all is good, redirect the user to the user page. If all
 * is not good, redirect the user to an error page
 */
router.get('/callback', (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies ? req.cookies[STATE_KEY] : null;
  // first do state validation
  if (state === null || state !== storedState) {
    res.redirect('/#/error/state mismatch');
    // if the state is valid, get the authorization code and pass it on to the client
  } else {
    res.clearCookie(STATE_KEY);
    // Retrieve an access token and a refresh token
    spotifyApi.authorizationCodeGrant(code).then(data => {
      const { expires_in, access_token, refresh_token } = data.body;

      // Set the access token on the API object to use it in later calls
      spotifyApi.setAccessToken(access_token);
      spotifyApi.setRefreshToken(refresh_token);

      // use the access token to access the Spotify Web API
      spotifyApi.getMe().then(({ body }) => {
        console.log(body);
      });

      // we can also pass the token to the browser to make requests from there
      res.redirect(`/#/user/${access_token}/${refresh_token}`);
    }).catch(err => {
      res.redirect('/#/error/invalid token');
    });
  }
});

module.exports = router;
