/**
 * @module Storage
 *
 * @fileOverview
 * Initial development of some sort of client for interacting with the Sisu API.
 * The only method here at the moment is a PUT for Orders which updates the
 * print_url of a specific order in the Sisu db.
 */
 var AWS = require('aws-sdk');
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
    s3.putObject(upload_params, function(err, s3_data) {
    if(err != null){
      rollbar.error(new Date().toISOString(), ": Error uploading to s3: " + err.message);

      return response.status(500).json({
        'error': 'Problem uploading to S3.' + err.message
      });
    } else {
      var s3Region = process.env.AWS_REGION? 's3-' + process.env.AWS_REGION : 's3'
      var s3Url = 'https://' + process.env.AWS_BUCKET_NAME + '.' + s3Region + ".amazonaws.com/" + upload_params.Key;

      console.log(new Date().toISOString(), ": Uploaded to s3!");
      console.log(new Date().toISOString(), ": URL => ", s3Url);

      // Send a request back to Sisu.
      sisuClient.sisuOrderPut(printObject.orderId, {
        print_url: s3Url
      });
    }
  });
  return exports;
}

exports.upload = upload;
