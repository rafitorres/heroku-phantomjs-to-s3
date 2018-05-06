require('dotenv').config({silent: true});
var express = require('express');
var fs = require('fs');
var rimraf = require('rimraf');
var app = express();
var bodyParser = require('body-parser');
var logger = require('morgan');
var path = require('path');

// AWS
var AWS = require('aws-sdk');
var s3 = new AWS.S3({region: process.env.AWS_REGION});

// Sisu
var sisuClient = require('./modules/sisu_client');

// Bug tracking
var Rollbar = require('rollbar');
var rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true
});
rollbar.log("Initiated Rollbar 🎉");
app.use(rollbar.errorHandler());

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// support parsing of application/json type post data
app.use(bodyParser.json({limit: '50mb'}));

// http logging
app.use(logger(':remote-addr'));
app.use(logger('dev'));

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
