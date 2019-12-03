// Modified from the original PlasticPlayer

// Changes and Additions

// Adds a 'previous' button.

// Checks every second for the presence of an NFC tag.
// If it is the same tag as previously detected, no change is made
// If it is a new tag, the associated playlist is loaded from the albums
// database and sent to MusicBox.
// If no tag is detected, playback is stopped.

// Requests the music database file from the MusicBox Raspberry Pi on the local
// network instead of from a remote server.
// Delays database retrieval to allow time for the Raspberry Pi to fully boot.

// See MUSICBOX.md for information of using MusicBox locally-stored files.

// Set this to match your local network. 
var WIFI_NAME = "{wifi name}";
var WIFI_OPTIONS = { password : "{wifi password}" };

// Set this to your MusicBox's IP.
var PATH_TO_DATA = "http://{local ip}/music.json";

// Set this to your MusicBox's IP.
var host = "{local ip}";

var isPlaying = true;
var uris = [];
var nfc;
var g;
var spi;
var currentId = "";
var HTTP;
var PLAYER_NAME = "Slide Player";
var currentTrackName = "";
var currentAlbum = "";
var tagPresent = false;
var cardRemoved = -1;
var databaseLoaded = false;
var databaseLoader = -1;

// When MusicBox changes tracks, update the OLED.
function onGetTitle(data) {
  if (data.result !== null) {
    g.clear();
    g.setFont8x12();
    g.drawString(data.result.name, 0, 0);
    currentTrackName = data.result.name;
    var artist = JSON.stringify(data.result.artists[0]);
    artist = JSON.parse(artist);
    currentAlbum = artist.name;
    g.drawString(artist.name, 0, 16);
    g.flip();
  } else {
    g.clear();
    g.setFontVector(12);
    g.drawString(PLAYER_NAME, 16, 8);
    g.flip();
  }
}

function onCommand(data) {
  console.log(data);
}

function start() {
  console.log("starting");
  g.clear();
  g.setFontBitmap();
  g.drawString("Connecting to network", 0, 10);
  g.flip();
}

function databaseLoaderFunc() {
  if (databaseLoader != -1 && databaseLoaded == false) { 
    clearTimeout(databaseLoader); 
  }
  if (databaseLoaded == false) {
    databaseLoader = setTimeout(function() {
      g.clear();
      g.setFontBitmap();
      g.drawString("Initialising", 0, 10);
      g.flip();
      databaseLoader = -1;
      getDatabase();
    }, 2000);
  }
}

// Initial setup.
// Starts the NFC detector and the OLED.
function setup() {
  HTTP = require("http");

  I2C1.setup({scl:B8, sda:B9});
  nfc = require("PN532").connect(I2C1);
  nfc.SAMConfig();

  // Check the NFC every second and pass any detected tag into the player 
  // routines.
  // We also need to handle stopping if the tag is removed.
  setInterval(function() {
    nfc.findCards(function(card) {
      card = JSON.stringify(card);
      if (card == currentId) {
        tagPresent = true;
        checkTagPresent();

        if (cardRemoved != -1) { 
          clearTimeout(cardRemoved); 
        }
        cardRemoved = setTimeout(function() {
          cardRemoved = -1;
          tagPresent = false;
          checkTagPresent();
        }, 1100);
      } else {
        g.clear();
        g.drawString("" + card, 0, 0);
        g.flip();
        checkCard(card);        
      }
      return;
    });
  }, 1000);

  // Start the OLED.
  spi = new SPI();
  spi.setup({mosi: B6, sck: B5});
  g = require("SSD1306").connectSPI(spi, A0, B7, start,{ height : 32 });
  require("Font8x12").add(Graphics);
}

// Is there a tag being detected by the NFC?
// If not, issue a STOP to the player.
function checkTagPresent() {
  if (tagPresent === false) {
    sendData("core.playback.stop", null, function(e) {
      initPlayer();      
    });
  }
}

// Pass the detected NFC tag as a string and compare with the "tag" field in the 
// URIs list to see if there's a match.
function isCardInDatabase(tag) {
  for (var i=0; i < uris.length; i++) {
    var record = uris[i];
    if (record.tag == tag) {
      return record;
    }
  }
  return false;
}

// Called whenever a new NFC tag is detected.
// If there are no records, it loads the database.
// if the tag matches an entry it uses that URI as the new tracklist.
// otherwise it displays the default player name on the LCD.
// NOTE: NFC detection is continuous, so the NFC will be re-detected without 
// needing to remove the tag from the detector.
function checkCard(tag) {
  if (uris.length < 1) {
    getDatabase();
  } else {
    var record = isCardInDatabase(tag);
    if (record !== false && currentId != tag){
      currentId = tag;
      changeTracklist(record);
    }

    if (record === false) {
      g.clear();
      g.setFontBitmap();
      g.drawString(tag, 0, 10);
      g.flip();
      currentId = "";
    }
  }
}

// Start the WIFI and connect to it, then attempt to load the database.
function startWifi() {
  var wifi = require("EspruinoWiFi");
  wifi.connect(WIFI_NAME, WIFI_OPTIONS, function(err) {
    if (err) {
      g.clear();
      g.setFontBitmap();
      g.drawString("Connection error: " + err, 0, 10);
      g.flip();
      return;
    }
    g.clear();
    g.setFontBitmap();
    g.drawString("Connected to " + WIFI_NAME, 0, 10);
    g.flip();
    databaseLoaderFunc();
  });
}

// SlideBox initialisation.
function initPlayer() {
  cardRemoved = -1;
  isPlaying = false;
  currentId = "";
  currentAlbum = "";
  currentTrackName = "";
  sendData("core.playback.get_state", null, function(data) {
    if (data.result == "playing") {
      sendData("core.playback.stop", null, function(e) {
        isPlaying = false;
      });
    } else {
      isPlaying = false;
    }
    
    g.clear();
    g.setFontVector(16);
    g.drawString(PLAYER_NAME, 16, 8);
    g.flip();
  });
}

// Construct a mopidy command.
// This is a specific implementation, assuming the required parameter is `uri`.
function mopidyCommand(method, params) {
  var body = {
    method: method,
    id: 1,
    jsonrpc: "2.0"
  };

  if (params !== null) {

    body.params = {
      uri: params
    };

  }

  body = JSON.stringify(body);

  return body;
}

// Attempt to retrieve the database JSON file.
function getDatabase() {
	g.clear();
  g.setFontBitmap();
	g.drawString("Loading albums database", 0, 10);
	g.flip();
	var finalData = "";
	var req = HTTP.get(PATH_TO_DATA, function(res) {
	  res.on('data', function(data) {
  		finalData += data;
    });
    res.on('close', function(data) {
  		uris = [];
  		var json = JSON.parse(finalData);
  		for (var i=0; i < json.records.length; i++) {
  		  var record = json.records[i].fields;
  		  uris.push(record);
  		}

  		g.clear();
      g.setFontBitmap();
  		g.drawString(json.records.length + " albums read", 0, 10);
  		g.flip();
      databaseLoaded = true;
  		initPlayer();
    });
  });
    
  // This call might timeout if the MusicBox device is not ready, so show
  // a 'nice' message on the OLED.
  req.on('error', function(err) {
    g.clear();
    g.setFontBitmap();
    g.drawString("database error ", 0, 0);
    g.drawString("" + err.message, 0, 10);
    g.flip();
  });  
	// req.end();

  if (databaseLoaded == false) { 
    databaseLoaderFunc();
  }
}

// Send commands to the Mopidy interface on the MusicBox.
function sendData(method, params, callback) {
  var finalData = "";
  var body = mopidyCommand(method, params);
  var options = {
    host: host,
    port: 80,
    path: '/mopidy/rpc',
    method: 'POST',
    headers: {
      "Content-Type" : "application/json",
      "Content-Length": body.length
    }
  };

  var req = HTTP.request(options, function(res) {
    res.on('data', function(data) {
      finalData += data;
    });
    res.on('close', function(data) {
      var obj = JSON.parse(finalData);
      callback(obj);
    });
  });

  req.on('error',function(err) {
    g.clear();
    g.setFontBitmap();
    g.drawString("Mopidy error", 0, 0);
    g.drawString("" + err.message, 0, 10);
    g.flip();

    //req = null;
  });

  req.end(body);
}

// Change the tracklist when a new NFC tag is detected.
// Updates the OLED during the changover process with the database `note`.
function changeTracklist(album) {
  if (album.uri !== "") {
    g.clear();
    g.setFontBitmap();
    g.drawString("Changing to " + album.note, 0, 10);
    g.flip();
    sendData("core.tracklist.clear", null, function(e) {
      sendData("core.tracklist.add", album.uri, function(d) {
        sendData("core.playback.play", null, function(f) {
          sendData("core.playback.get_current_track", null, onGetTitle);
        });
      });
    });
  }
}

// Function called when the play/pause button is detected.
// When paused, the OLED shows 'paused', when playing, the display is updated 
// with the currently selected trackname.
function togglePlay() {
  if (isPlaying) {
    isPlaying = false;
    sendData("core.playback.pause", null, onCommand);
    g.clear();
    g.setFontVector(16);
    g.drawString("Paused", 40, 10);
    g.flip();
  } else {
    isPlaying = true;
	sendData("core.playback.resume", null, function(d) { 
		sendData("core.playback.get_current_track", null, onGetTitle);
    g.clear();
    g.setFont8x12();
    g.drawString(currentTrackName, 0, 0);
    g.drawString(currentAlbum, 0, 16);
    g.flip();
	});
  }
}

// Set the pin watch for Play/Pause button.
pinMode(B1, 'input_pulldown');
setWatch(
  function(e) {
    togglePlay();
  },
  B1,
  { repeat: true, edge: 'rising',debounce: 100 }
);

// Set the pin watch for the Previous button.
pinMode(B13, 'input_pulldown');
setWatch(
  function(e) {
    sendData("core.playback.previous", null, function(e) {
      sendData("core.playback.get_current_track", null, onGetTitle);
    });
  },
  B13,
  { repeat: true, edge: 'rising', debounce: 100 }
);

// Set the pin watch for the Next button.
pinMode(B14, 'input_pulldown');
setWatch(
  function(e) {
    sendData("core.playback.next", null, function(e) {
      sendData("core.playback.get_current_track", null, onGetTitle);
    });
  },
  B14,
  { repeat: true, edge: 'rising', debounce: 100 }
);

// Uncomment this line to prevent all console output.
// console.log = function(){};

// This function is required to ensure the Espruino loads the stored code when 
// powered on.
function onInit() {
  setup();
  startWifi();
}
