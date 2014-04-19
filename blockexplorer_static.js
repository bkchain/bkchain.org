var fs = require('fs');
var express = require('express'),
    doT = require('dot'),
    pub = __dirname + '/public',
    view =  __dirname + '/views';
    
var defs = {
    loadfile:function(path){return fs.readFileSync(__dirname + path, 'utf8');},
    savefile:function(path, data){return fs.writeFileSync(__dirname + path, data, 'utf8');},
    static: true,
};

doT.templateSettings.strip = false;

function generateTemplate(input, output, defs) {
  var template = doT.template(fs.readFileSync(__dirname + '/views/' + input, 'utf8'), null, defs);
  fs.writeFileSync(__dirname + '/views/' + output, template.toString());
}

function writeTemplate(input, output, defs, data) {
  var template = doT.template(fs.readFileSync(__dirname + '/views/' + input, 'utf8'), null, defs);
  fs.writeFileSync(__dirname + '/' + output, template(data));
}

// Generate dynamic website templates
generateTemplate('livetx.html', 'livetx.js', defs);
generateTemplate('liveblock.html', 'liveblock.js', defs);

// Generate dynamic parts templates
generateTemplate('navbar.html', 'navbar_template.js', defs);
generateTemplate('index_template.html', 'index_template.js', defs);
generateTemplate('block_template.html', 'block_template.js', defs);
generateTemplate('tx_template.html', 'tx_template.js', defs);
generateTemplate('address_template.html', 'address_template.js', defs);

// Include router.js content
eval(fs.readFileSync(__dirname + '/views/router.js') + '');

// Static block explorer
var data = { title_details: 'bkchain.org', script_name: '#/btc', script_name_base: '#', source_base: '.', currency_short: 'BTC' };
writeTemplate('index_static.html', 'bkchain.html', defs, data);
defs.wallet = true;

// BTC Wallet
data['script_name_base'] = 'bkchain.html#';
route_prepare_data(data, 'bkchain.html#/', ['btc']);
writeTemplate('wallet.html', 'wallet_btc.html', defs, data);

// PPC Wallet
route_prepare_data(data, 'bkchain.html#/', ['ppc']);
writeTemplate('wallet.html', 'wallet_ppc.html', defs, data);

// LTC Wallet
route_prepare_data(data, 'bkchain.html#/', ['ltc']);
writeTemplate('wallet.html', 'wallet_ltc.html', defs, data);

// DOGE Wallet
route_prepare_data(data, 'bkchain.html#/', ['doge']);
writeTemplate('wallet.html', 'wallet_doge.html', defs, data);

