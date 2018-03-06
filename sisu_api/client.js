/**
 * @module Client
 *
 * @fileOverview
 * Initial development of some sort of client for interacting with the Sisu API.
 * The only method here at the moment is a PUT for Orders which updates the
 * print_url of a specific order in the Sisu db.
 */
var apiRequest = require("request");

// Bug tracking
// var Rollbar = require('rollbar');
// var rollbar = new Rollbar(process.env.ROLLBAR_ACCESS_TOKEN);

function sisuOrderPut(order_id, params) {
  var api_url = process.env.SISU_API_URL + "/api/orders/" + order_id + ".json";

  console.log("sisuOrderPut: ", order_id, params.print_url);
  console.log(new Date().toISOString(), ": Posting to Sisu API (#" + order_id + " -  " + params.print_url + ")");
  apiRequest
    .put(api_url, {
      'auth': {
        'bearer': process.env.SISU_API_TOKEN
      },
      form: params || {}
    })
    .on('response', function(response) {
      console.log(new Date().toISOString(), ": Sisu API - Response");
      if(response.statusCode == 200){
        console.log(new Date().toISOString(), ": Sisu API - Successful request");
      } else {
        rollbar.info(new Date().toISOString(), ": Sisu API: " + response.statusCode);
      }
    })
    .on('error', function(err) {
      console.log(new Date().toISOString(), ": Sisu API - Error");
      rollbar.error(new Date().toISOString(), ": Error sending data to Sisu API: " + err.message);
    });
  return exports;
}

exports.sisuOrderPut = sisuOrderPut;
