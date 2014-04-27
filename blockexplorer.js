var async = require('async');
var fs = require('fs');
var request = require('request');
var express = require('express'),
    app = express(),
    doT = require('dot'),
    pub = __dirname + '/public',
    view =  __dirname + '/views';
    
var defs = {
    loadfile:function(path){return fs.readFileSync(__dirname + path, 'utf8');},
    savefile:function(path, data){return fs.writeFileSync(__dirname + path, data, 'utf8');},
    static: false,
};

doT.templateSettings.strip = false;

function generateTemplate(input, output, defs) {
  var template = doT.template(fs.readFileSync(__dirname + '/views/' + input, 'utf8'), null, defs);
  fs.writeFileSync(__dirname + '/views/' + output, template.toString());
}

// Generate dynamic website templates
generateTemplate('livetx.html', 'livetx.js', defs);
generateTemplate('liveblock.html', 'liveblock.js', defs);

// Include router.js content
eval(fs.readFileSync(__dirname + '/views/router.js') + '');

var engines = require('consolidate');

app.set('views', view);
app.set('view options', {layout: false});
app.set("view engine", "html");
app.engine('.html', engines.dot);

app.use('/static', express.static(__dirname + '/static'));

var query_api = function(req,cb){
     var payload = {'method': req['method'], 'id': 1, 'jsonrpc': 1, 'params': req['params']};
     request.post({ url: 'http://bkchain.org/api/raw/' + req['currency'], body: JSON.stringify(payload) }, function(err,response,body){
           if (err){
                 cb(err);
           } else {
                 cb(null, JSON.parse(body)); // First param indicates error, null=> no error
           }
     });
};

function route_api_query(data, payload, json_callback) {
  async.map([payload], query_api, function(e, r) {
    // Request template engine to display our block
    data['result'] = r[0]['result'];
    json_callback('api', data);
  });
}

function route_api(data, url_parts, req, json_callback) {
    // TODO: Error handling
    var api_version = url_parts[2];
    if (api_version == 'v1') {
      var api1 = url_parts[3];
      switch (api1)
      {
      case 'block':
        var api2 = url_parts[4];
        var parameter = url_parts[5];
        switch (api2)
        {
        case 'hash':
          route_api_query(data, {'currency': data['currency_api'], 'method': 'block_hash', 'params': { 'hash': parameter }}, json_callback);
          break;
        case 'index':
          route_api_query(data, {'currency': data['currency_api'], 'method': 'block_index', 'params': { 'index': Number(parameter) }}, json_callback);
          break;
        case 'height':
          route_api_query(data, {'currency': data['currency_api'], 'method': 'block_height', 'params': { 'height': Number(parameter) }}, json_callback);
          break;
        }
        break;
      case 'tx':
        var api2 = url_parts[4];
        var parameter = url_parts[5];
        switch (api2)
        {
        case 'hash':
          route_api_query(data, {'currency': data['currency_api'], 'method': 'tx_hash', 'params': { 'hash': parameter }}, json_callback);
          break;
        case 'index':
          route_api_query(data, {'currency': data['currency_api'], 'method': 'tx_index', 'params': { 'index': Number(parameter) }}, json_callback);
          break;
        case 'push':
          break;
        }
        break;
      case 'address':
        var api2 = url_parts[4];
        var address = url_parts[5];
        var confirmations = (req.param('confirmations') !== undefined) ? Number(req.param('confirmations')) : 1;
        switch (api2)
        {
        case 'balance':
          route_api_query(data, {'currency': data['currency_api'], 'method': 'address_balance', 'params': { 'address': address, 'confirmations': confirmations }}, json_callback);
          break;
        case 'unspent':
          route_api_query(data, {'currency': data['currency_api'], 'method': 'address_unspent', 'params': { 'address': address, 'confirmations': confirmations }}, json_callback);
          break;
        }
        break;
      }
    }
}

// JSON API pretty print
app.set('json spaces', 1);

// Page selector
app.get(/^(.*)$/, function(req, res) {
    var data = { _def: defs, layout: false, strip: false, title_details: 'bkchain.org', script_name_base: '', source_base: '' };
    var url = req.params[0];
    var url_parts = url.split('/').filter(function(e){return e});
    
    // Transform /btc/search?search=XXX into /btc/search/XXX
    if (url_parts.length == 2 && url_parts[1] == 'search' && req.param('search') !== undefined)
      url_parts.push(req.param('search'));
      
    // Defer routing to shared client/server url parser system
    if (!route_prepare_data(data, '/', url_parts))
      return;
      
    if (url_parts.length >= 2 && url_parts[1] == 'api') {
      // API
      route_api(data, url_parts, req, function(request_type, data) { res.json(data['result']); });
    } else {
      route_url(data, url_parts, function(request_type, data) { res.render(request_type + '.html', data); }, function(url) { res.redirect('/' + url); });
    }
});

// Start server
var server = app.listen(3000, function() {
    console.log('Listening on port %d', server.address().port);
});