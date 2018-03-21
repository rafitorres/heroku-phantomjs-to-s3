/**
 * @module Storage
 *
 * @fileOverview
 * Initial development of some sort of client for interacting with the Sisu API.
 * The only method here at the moment is a PUT for Orders which updates the
 * print_url of a specific order in the Sisu db.
 */
 var AWS = require('aws-sdk');
 var fs = require('fs');
 var rimraf = require('rimraf');

// Custom consts
const FILE_TYPES = ['jpg', 'png'];

// Bug tracking
var Rollbar = require('rollbar');
var rollbar = new Rollbar(env.ROLLBAR_ACCESS_TOKEN);

function upload(order, env) {
  var s3 = new AWS.S3({region: env.AWS_REGION});

  var filename = request.body.filename + "." + file_type;
  var parent_dir = "./" + request.body.aws_directory.split("/")[0];
  var filenameFull = "./" + request.body.aws_directory + "/" + filename;
  console.log(new Date().toISOString(), ": Filename -> ", filenameFull);
  var canvas_url = process.env.SISU_API_URL + "/render/prints/" + request.body.order_id + "?render_token=" + process.env.SISU_RENDER_TOKEN;

  fs.readFile(order.filenameFull, function(err, temp_png_data){
    if(err != null){
      console.log(new Date().toISOString(), ": Error loading saved screenshot: " + err.message);
      rollbar.error(new Date().toISOString(), ": Error loading saved screenshot: " + err.message);

      return response.status(500).json({
        'error': 'Problem loading saved page.'
      });
    } else {
      console.log(new Date().toISOString(), ": Uploading to s3 (#" + order.id + ")");

      upload_params = {
        Body: temp_png_data,
        Key: order.awsDirectory + "/" + order.filename,
        ACL: "public-read",
        Bucket: env.AWS_BUCKET_NAME
      };

      //start uploading
      s3.putObject(upload_params, function(err, s3_data) {
        console.log(new Date().toISOString(), ": S3 (#" + order.id + "): ", err);
        if(err != null){
          console.log(new Date().toISOString(), ": Error uploading to s3: " + err.message);
          rollbar.error(new Date().toISOString(), ": Error uploading to s3: " + err.message);

          return response.status(500).json({
            'error': 'Problem uploading to S3.' + err.message
          });
        } else {
          //clean up and respond
          rimraf(parent_dir, function () {
            console.log(new Date().toISOString(), ': Done');
          });

          var s3Region = env.AWS_REGION? 's3-' + env.AWS_REGION : 's3'
          var s3Url = 'https://' + env.AWS_BUCKET_NAME + '.' + s3Region + ".amazonaws.com/" + upload_params.Key;

          console.log(new Date().toISOString(), ": Uploaded to s3!");
          console.log(new Date().toISOString(), ": URL => ", s3Url);

          // Upload complete
          if (order.redirect == 'true') {
            return response.redirect(302, s3Url);
          } else {
            // Send a request back to Sisu.
            sisuClient.sisuOrderPut(order.id, {
              print_url: s3Url
            });
          }
        }
      });
    }
  });
  return exports;
}

exports.upload = upload;
