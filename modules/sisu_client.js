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
var Rollbar = require('rollbar');
var rollbar = new Rollbar(process.env.ROLLBAR_ACCESS_TOKEN);

function sisuOrderPut(order_id, params) {
  var api_url = process.env.SISU_API_URL + "/api/orders/" + order_id + ".json";
  apiRequest
    .put(api_url, {
      'auth': {
        'bearer': process.env.SISU_API_TOKEN
      },
      form: params || {}
    })
    .on('error', function(err) {
      rollbar.error(new Date().toISOString(), ": Error sending data to Sisu API: " + err.message);
    });
  return exports;
}

exports.sisuOrderPut = sisuOrderPut;
