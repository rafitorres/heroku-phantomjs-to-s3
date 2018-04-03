require('dotenv').config({silent: true});
import timesLimit from 'async/timesLimit';

// Express
var express = require('express');
var bodyParser = require('body-parser');

// Sisu
var sisuClient = require('./sisu_api/client');

// Bug tracking
var Rollbar = require('rollbar');
var rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
  captureUncaught: true,
  captureUnhandledRejections: true
});

rollbar.log("Initiated Rollbar 🎉");

var childProcess = require('child_process');
var AWS = require('aws-sdk');
var fs = require('fs');
var rimraf = require('rimraf');
var s3 = new AWS.S3({region: process.env.AWS_REGION});

var fileTypes = ['jpg', 'png'];

var app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// support parsing of application/json type post data
app.use(bodyParser.json());

app.use(rollbar.errorHandler());

app.get('/', function(req, res){
  res.send('<html><head><title>Screenshots!</title></head><body><h1>Screenshots!</h1><form action="/render" method="POST">URL: <input name="order_id" value="" placeholder="http://"><br>Size:<input name="size" value="" placeholder="1024px or 1024px*1000px"><br><input type="hidden" name="redirect" value="true"><input type="submit" value="Get Screenshot!"></form></body></html>');
});

app.post('/v1/render', function(request, response) {
  if(process.env.SISU_RENDERER_ACCESS_TOKEN){
    if(!request.body.access_token || request.body.access_token != process.env.SISU_RENDERER_ACCESS_TOKEN){
      return response.status(401).json({ 'unauthorized': ' _|_ ' });
    }
  }

  if (fileTypes.indexOf(request.body.file_type) === -1){
    return response.status(500).json({
      'error': 'call /render/[fileType] where fileType is either jpg or png'
    });
  }

  if(!request.body.filename) {
    return response.status(400).json({
      'error': 'You need to provide a filename.'
    });
  }

  if(!request.body.aws_directory) {
    return response.status(400).json({
      'error': 'You need to provide an AWS location for the print.'
    });
  }

  if(!request.body.order_id) {
    return response.status(400).json({
      'error': 'You need to provide an order id.'
    });
  }

  var renderRequest = {
    orderId: request.body.order_id,
    filename: request.body.filename,
    fileType: request.body.file_type,
    remoteDir: request.body.aws_directory
  };
  // return true if successful
  var runPhantomJs = Crawler.startCrawler(renderRequest);
  // response for the http request
  var crawlAnswer;

  if (runPhantomJs == true) {
    crawlAnswer = "Start to make Screenshots of: " + websites;
  } else {
    crawlAnswer = "Phantom JS is too busy. :( Please try later";
  }
  // Respond as quickly as possible
  // to say we're handling this request
  response.status(200).json({
    'status': crawlAnswer
  });
});

var port = process.env.PORT || 8000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
