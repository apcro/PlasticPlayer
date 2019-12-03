SlideBox Player
---------------

An implementation of [Brendan Dawes' Plastic Player](https://github.com/brendandawes/PlasticPlayer) inside a Wooden Slide Box.

![Image of SlideBox Player](slideboxplayer.jpg?raw=true)

An NFC based controller for playing local files from MusicBox using the Mopidy Server.

Materials
---------

* [ Raspberry Pi 3B ](http://raspberrypi.org) (Note: Raspberry Pi 4 will not work for this project if you want to use the JustBoom DAC HAT)
* [ Pi Musicbox ](http://www.pimusicbox.com)
* [ Espruino Wifi ](https://www.espruino.com)
* JustBoom [ DAC HAT ](https://www.justboom.co/product/justboom-dac-hat/) (Raspberry Pi A+, B+, 2B or 3B only)
* Adafruit [ 128 x 32 SPI OLED ](https://www.adafruit.com/product/661)
* [ PN532 NFC breakout ](https://www.espruino.com/PN532)
* 3 x [ TTP223 Capacitive Touch Sensors ](https://www.amazon.co.uk/DollaTek-Capacitive-Settable-Self-lock-No-lock/dp/B07DK3DFR2/)
* [ Adafruit half-sized breadboard ](https://www.adafruit.com/product/64)
* [Panel Mount Micro USB](https://uk.rs-online.com/web/p/micro-usb-connectors/9125114/)
* [ NFC Stickers ](http://zipnfc.com/nfc-stickers/nfc-sticker-midas-tiny-ntag213.html)
* 35mm Blank Slides - via eBay or other suppliers
* A wooden Slide Box - via eBay.

This player was built using an Adafruit breadboard, it could just as easily be built using a Perma Proto board.

How it Works
------------

SlideBox Player has two main components — A Raspberry Pi running the Musicbox system and an Espruino WiFi based controller. 

The Raspberry Pi manages and plays the music and it's this you'll connect to your stereo system. 

The controller is what you can build with this repo. The controller uses 35mm photographic slides with NFC stickers to play anything you have configured and stored on your MusicBox. This imlpementation uses an Espruino Wifi board to detect NFC cards and issue commands to MusicBox. Of course you don't have to use 35mm slides — it could be anything you can put an NFC sticker onto.

When you power up the SlideBox Player the Espruino connects to your WiFi network and pulls down data in the form of a JSON file from your MusicBox — see [MUSICBOX](MUSICBOX.md) for detailed instructions on storing your music file on your MusicBox Raspberry Pi. This JSON file contains a list of NFC tag ids with matching MusicBox URIs — these are your albums. When you place an album (slide) into the SlideBox Player, the Espruino sees the NFC tag and looks-up that tag in the JSON file.  When it finds a match it sends the corresponding MusicBox URI to the Musicbox over wifi and then starts that track list playing. SlideBox Player also includes controls for play/pause, skip (next track) and rewind (previous track).

Raspberry Pi
------------

Install Musicbox on a Raspberry Pi 3 following the instructions on the Musicbox site. Once you have this set up, check you can connect to it via your web browser — usually via musicbox.local. 

Make sure to note down the ip address of the Raspberry Pi as you'll need to enter this in the code for Espruino later. You can find this out via the Terminal by typing 'ping musicbox.local'. This will show the ip address of the Raspberry Pi you have running Musicbox.

This implementation uses the Raspberry Pi +/- pins to power the Espruino, NFC and OLED, so if you have installed a JustBoom DAC HAT, you will also need to extend the +5/GND pins with wires.

That’s all you need to do with the Raspberry Pi. 


Espruino
--------

Place the Espruino board in the centre of the breadboard.

Connect the + and - power wires from the Raspberry Pi/DAC HAT to the BreadBoard + rail and the - rail respectively.

Wire the components to the Espruino using the following pin connections. 

| OLED | Espruino Wifi |
|------|---------------|
| CS   | -             |
| RST  | B7            |
| DC   | A0            |
| CLK  | B5            |
| DATA | B6            |
| 3.3  | 3.3           |
| GND  | -             |

| NFC  | Espruino Wifi |
|------|---------------|
| 3.3  | +             |
| SCL  | B8            |
| SDA  | B9            |
| GND  | -             |

| Pause Button | Espruino Wifi |
|--------------|---------------|
| VCC          | +             |
| I/O          | B1            |
| GND          | -             |

| Next Button | Espruino Wifi |
|-------------|---------------|
| VCC         | +             |
| I/O         | B14           |
| GND         | -             |

| Prev Button | Espruino Wifi |
|-------------|---------------|
| VCC         | +             |
| I/O         | B13           |
| GND         | -             |


Code
----

Download the Javascript code from this repo. Plug-in your Espruino and using the Espruino Chrome app launch the Editor and load in the code you've just downloaded. Alter the wifi network name and password details to match your network settings and change the host to be the ip address you noted down earlier that locates the Raspberry Pi on your network. Change the PATH to be the web address of your json source.

Transfer the code to your Espruino. Hopefully it should start up and work as expected.

Common Espruino Issues
======================

* If you cannot connect to your Espruino via USB, make sure you are _not_ in Bootloader mode (pulsing red/green LEDs is bootloader mode).
* If your saved code does not automatically start, make sure to type `save()` in the Espruino console once you have uploaded your code.

Enclosure
---------

You can enclose this project in whatever you see fit, in this case a wooden Slide Box found on eBay.

To provide power to the SlideBox Player, I used a normal Raspberry Pi power supply, with an inline switch and drilled through the back of the Slide Box..

NFC Tags
--------

Place an NFC tag on a slide and place it into the SlideBox Player. Any unknown tags will display the tag ID on the OLED display. You can then use this information in the JSON file (see below).

Setting up the database of albums
---------------------------------

SlideBox Player consults a JSON file to match NFC tags with MusicBox albums URIs. An example JSON schema is included in this repo. See [ MUSICBOX ](MUSICBOX.md) for more details.

Construct your JSON file using the tag IDs and the corresponding MusicBox local URIs.

Once you have this JSON file done and existing on your MusicBox, and that location is in the PATH variable as detailed above, then when you place the relevant NFC tag into the SlideBox Player it should talk to the Musicbox and play!




