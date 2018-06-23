/**
 * @module Storage
 *
 * @fileOverview
 * Initial development of some sort of client for interacting with the Sisu API.
 * The only method here at the moment is a PUT for Orders which updates the
 * print_url of a specific order in the Sisu db.
 */
var AWS = require('aws-sdk');
AWS.config.setPromisesDependency(require('bluebird'));

var sisuClient = require("../modules/sisu_client");

// Bug tracking
var Rollbar = require('rollbar');
var rollbar = new Rollbar(process.env.ROLLBAR_ACCESS_TOKEN);

function upload(printObject) {
  var s3 = new AWS.S3({region: process.env.AWS_REGION});

  console.log(new Date().toISOString(), ": Uploading to s3 (#" + printObject.orderId + ")");
  var imageBuffer = new Buffer(printObject.renderBase64, 'base64');

  upload_params = {
    Body: imageBuffer,
    Key: printObject.remoteDir + "/" + printObject.filename,
    ACL: "public-read",
    Bucket: process.env.AWS_BUCKET_NAME
  };

  //start uploading
  var putObjectPromise = s3.upload(upload_params).promise();
  putObjectPromise.catch(function(err) {
    rollbar.error(new Date().toISOString(), ": Error uploading to s3: " + err.message);
  });

  var s3Region = process.env.AWS_REGION? 's3-' + process.env.AWS_REGION : 's3'
  var s3Url = 'https://' + process.env.AWS_BUCKET_NAME + '.' + s3Region + ".amazonaws.com/" + upload_params.Key;
  return s3Url;
}

exports.upload = upload;
