    var livetxTemplate = {{#def.loadfile('/views/livetx.js')}}
    var liveblockTemplate = {{#def.loadfile('/views/liveblock.js')}}

    var livetx;
    var liveblock;
    var websocket;
    
    function setupLiveIndex(data)
    {
        closeLiveIndex();
    
        livetx = document.getElementById("livetx");
        liveblock = document.getElementById("liveblock");
{{ if ({{#!def.static}}) { }}
        var l = window.location;
        var livetx_url = "ws://" + l.hostname + (((l.port != 80) && (l.port != 443)) ? ":" + l.port : "") + "{{=it.script_name_base}}/{{=it.currency_api}}/livetx";
{{ } else { }}
        var livetx_url = "ws://bkchain.org/" + data['currency_api'] + "/livetx";
{{ } }}
        websocket = new WebSocket(livetx_url);
        websocket.onopen = function(evt) { websocket.send(JSON.stringify({ subscribe: 'livetx' })); };
        websocket.onerror = function(evt) { };
        websocket.onmessage = function(evt) { writeToScreen(data, JSON.parse(evt.data)); };
        
        // Remove text nodes to have a clean childNodes list
        for(var i=0;i<livetx.childNodes.length;i++)
        {
          if(livetx.childNodes[i].nodeType==3)
            livetx.removeChild(livetx.childNodes[i--]);
          else
            continue;
        }

        // Remove text nodes to have a clean childNodes list
        for(var i=0;i<liveblock.childNodes.length;i++)
        {
          if(liveblock.childNodes[i].nodeType==3)
            liveblock.removeChild(liveblock.childNodes[i--]);
          else
            continue;
        }
    }
    function closeLiveIndex()
    {
      // Close previous connection (if any)
      if (websocket !== undefined)
        websocket.close();
    }
 function writeToScreen(data, message)
 {
   var pre = document.createElement("tr");
   
   var itemtype = message['item'];
   var output;
   var maxItems;
   
{{ if ({{#!def.static}}) { }}
   var data2 = {
     coin_factor: '{{=it.coin_factor}}',
     script_name: '{{=it.script_name}}',
   };
{{ } else { }}
   var data2 = {
     coin_factor: data.coin_factor,
     script_name: data.script_name,
   };
{{ } }}

   // TODO: Switch to jquery
   if (itemtype == 'tx')
   {
     data2.tx = message;
     pre.innerHTML = livetxTemplate(data2);
     output = livetx;
     maxItems = 10;
   }
//{% if (page == 0) %}   
   else if (itemtype == 'block')
   {
     data2.block = message;
     pre.innerHTML = liveblockTemplate(data2);
     output = liveblock;
     maxItems = 20;
   }
//{% endif %}
   else
   {
     return;
   }
   
   while (output.childNodes.length >= maxItems)
    output.removeChild(output.childNodes[output.childNodes.length - 1]);

   // If last row was not grey, this one will be
   //var classAttributes = "blocklist-row";
   //if (output.childNodes.length > 1 && output.childNodes[1].getAttribute("class").indexOf('row-grey') == -1)
   //  classAttributes += " row-grey";
   //pre.setAttribute("class", classAttributes);
   
   
   if (output.childNodes.length > 1)
    output.insertBefore(pre, output.childNodes[0]);
   else
    output.appendChild(pre);
    
   $("abbr.timeago").timeago();
 }
{{ if ({{#!def.static}}) { }}
window.addEventListener("load", setupLiveIndex, false);
{{ } }}