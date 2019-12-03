Using Musicbox as a JSON host
-----------------------------

In this implementation, we use MusicBox itself to host the `music.json` database file. The following assumes the MusicBox Raspberry Pi is configured and viewable on the local network

Storing Music Files
===================

Create your library of files and place them on a USB stick plugged in to your MusicBox Raspberry Pi. This can be in any of the slots. Make sure all the associated metadata is correct so that albums are grouped together properly.

Schema Description
==================
`id`: Can be anything. Not used.
`fields`
  `note`: String used for display when switching albums. Can be anything. The
          display during actual playback is taken from track metadata.
  `uri` : Local MusicBox filepath for the album folder. See below for more 
          information.
  `tag` : Tag of the desired NFC card. This is shown on the player display if 
          the card is unknown, as well as in the Espruino console.

Obtaining the necessary Album URIs
==================================

Since the files are being played from a local source rather than remote, the path that needs to be passed across the Mopidy API from the Espruino to MusicBox needs to be in the form `local:album:md5:{string}`. 

To find this for each album you want to include in your library, open `http://musicbox.local` on your network. Select `Browse`, then `Local media`, then `Albums`.

Then, using your browser's Dev Tools Element Inspector, inspect the list item for the album you want to include. Copy the value of the ID field for the `<li>` element. This is the `uri` you need for an album in your `music.json` file.

JSON File location
==================

Once you have made the JSON file, upload the file to `/mb/webclient/` on your MusicBox Raspberry PI and set `PATH_TO_DATA` in your Espruino source to `http://{musicbox ip}/music.json`.
