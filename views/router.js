// Parse URL, perform API requests and route results to appropriate page (using callback). Shared by both backend and frontend.
function route_prepare_data(data, script_name_prefix, url_parts)
{
    var currency = url_parts[0] || 'btc';

    data['coin_factor'] = '100000000';
    data['currency_api'] = currency;
   
    // Parse currency (first part of URL -- default to BTC)
    switch (currency)
    {
    case 'ltc':
      data['currency'] = 'Litecoin';
      data['currency_short'] = 'LTC';
      data['script_name'] = script_name_prefix + 'ltc';
      data['default_fees'] = 0.001;
      data['address_version'] = 48;
      data['donation_address'] = "LXzHvrRMQVEHj6gvK4rsZ7HGopgqfxS7PS";
      break;
    case 'doge':
      data['currency'] = 'Dogecoin';
      data['currency_short'] = 'DOGE';
      data['script_name'] = script_name_prefix + 'doge';
      data['default_fees'] = 1.0;
      data['address_version'] = 30;
      data['donation_address'] = "DLm1XX5JcxQeGL5nXmkFCMJXCorcFQXRnT";
      break;
    case 'ppc':
      data['currency'] = 'Peercoin';
      data['currency_short'] = 'PPC';
      data['coin_factor'] = '1000000';
      data['script_name'] = script_name_prefix + 'ppc';
      data['default_fees'] = 0.01;
      data['address_version'] = 55;
      data['donation_address'] = "PEiZ7r4KR85izAhfzQKJgJxdQkQ6PPXXEX";
      data['proofofstake'] = true;
      break;
    case 'btc':
      data['currency'] = 'Bitcoin';
      data['currency_short'] = 'BTC';
      data['script_name'] = script_name_prefix + 'btc';
      data['default_fees'] = 0.0001;
      data['address_version'] = 0;
      data['donation_address'] = "1LLqMFskaSaZ3w2LuH6dbQaULcy1Bu1b2R";
      break;
    default:
      return false;
    }
  return true;
}

function route_url(data, url_parts, display_callback, redirect_callback)
{
    var request_type = url_parts[1] || 'index';
   
    if (request_type == 'search') {
      var error_message = route_search(data['currency_api'], url_parts[2], redirect_callback);
      if (error_message == null) {
        // No error
        return;
      } else {
        request_type = 'index';
        data['error_message'] = error_message;
      }
    }

    if (request_type == 'index') {
      var payload1 = {'currency': data['currency_api'], 'method': 'getlatesttransactions', 'params': {}};
      var payload2 = {'currency': data['currency_api'], 'method': 'getblocks', 'params': { 'page': 0 }};
      
      // Query for latest blocks and tx asynchronously
      async.map([payload1, payload2], query_api, function(e, r) {
        // Request template engine to display index
        data['latest_transactions'] = r[0]['result'];
        data['blocks'] = r[1]['result'];
        data['title_details'] = 'Block Explorer';
        display_callback(request_type, data);
      });
    } else if (request_type == 'block') {
      var block_hash = url_parts[2];
      var payload1 = {'currency': data['currency_api'], 'method': 'getblock', 'params': { 'hash': block_hash }};
      
      // Query for block asynchronously
      async.map([payload1], query_api, function(e, r) {
        // Request template engine to display our block
        data['block'] = r[0]['result'];
        data['title_details'] = 'Block #' + data['block']['height'];
        display_callback(request_type, data);
      });
    } else if (request_type == 'tx') {
      var tx_hash = url_parts[2];
      var payload1 = {'currency': data['currency_api'], 'method': 'getrawtx', 'params': { 'hash': tx_hash }};
      
      // Query for transaction asynchronously
      async.map([payload1], query_api, function(e, r) {
        // Request template engine to display our block
        data['transaction'] = r[0]['result'];
        data['title_details'] = 'Transaction ' + data['transaction']['hash'];
        display_callback(request_type, data);
      });
    } else if (request_type == 'address') {
      var address = url_parts[2];
      var payload1 = {'currency': data['currency_api'], 'method': 'getaddress', 'params': { 'address': address }};

      // Query for address asynchronously
      async.map([payload1], query_api, function(e, r) {
        // Request template engine to display our block
        data['address'] = r[0]['result'];
        data['title_details'] = 'Address ' + data['address']['addr'];
        display_callback(request_type, data);
      });
    }
}

// TODO: Work in progress
function route_search(currency, search_value, redirect_callback) {
  // Try to parse block height
  var height = Number(search_value);
  if (!isNaN(height)) {
    var payload1 = {'currency': currency, 'method': 'getblockhash', 'params': { 'height': height }};
    async.map([payload1], query_api, function(e, r) {
      redirect_callback(currency + '/block/' + r[0]['result']['hash']);
    });
    return null;
  }
  
  // Try to get block and tx
  if (search_value.match(/^[0-9A-Fa-f]+$/) && search_value.length == 64) {
    // TODO: Special RPC for hash search
    var payload1 = {'currency': currency, 'method': 'getblock', 'params': { 'hash': search_value }};
    var payload2 = {'currency': currency, 'method': 'getrawtx', 'params': { 'hash': search_value }};
    
    // Query for both at the same time
    async.map([payload1, payload2], query_api, function(e, r) {
      // TODO
      var block = r[0]['result'];
      var tx = r[1]['result'];
      if (block['hash'] !== undefined) {
        redirect_callback(currency + '/block/' + block['hash']);
      } else if (tx['hash'] !== undefined) {
        redirect_callback(currency + '/tx/' + tx['hash']);
      }
    });

    return null;
  }
  
  // Try to parse address
  if (search_value.match(/^[a-zA-Z0-9]{27,34}/)) {
    try
    {
      // Try to decode address in base58
      //var bytes = Bitcoin.Base58.decode(search_value);
      
      // Try to be "intelligent" and redirect address by their prefix
      switch (search_value[0]) {
      case '1':
        redirect_callback('btc/address/' + search_value);
        break;
      case 'P':
        redirect_callback('ppc/address/' + search_value);
        break;
      case 'L':
        redirect_callback('ltc/address/' + search_value);
        break;
      case 'D':
        redirect_callback('doge/address/' + search_value);
        break;
      default:
        throw 'Invalid address type';
      }
      
      return null;
    }
    catch(err)
    {}
  }
  
  return 'Could not find any matching result.';
}