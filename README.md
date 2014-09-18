js-exif
=======

Yet another javascript library to read exif metadata from jpeg files. BUT ! this lib can also WRITE metadata to jpeg files.
 This lib has been made at IGN (French institution responsible for the management of all geographical datas of the territory), in MATIS lab. (http://recherche.ign.fr/labos/matis/accueilMATIS.php)


The primary usage of this lib is for the geotagging of printscreen made in web GIS application at IGN: iTowns (http://www.itowns.fr/).


Usage (first draft, not completed yet):

the librarie is a requirejs module returning a parser. let the return variable be JpegParser (depending on your code), you can parse a picture that way:

1/ first get a picture from the web as an arraybuffer
2/ pass this array buffer to the parser:

var j = new JpegParser(myArrayBuffer);

3/ a jpeg picture is composed of several markers. The one we are intereseted in is the FFE1 (contains tiff headers and exif data)

var FFe1s = j.getMarkersByHex("FFE1") // this return a list.

4/ some FFE1 markers contains tiff headers, some other XMP metadata in the xml form.

if (FFe1[0].tiffHeader) {
  // we have some tiff data
  
}
