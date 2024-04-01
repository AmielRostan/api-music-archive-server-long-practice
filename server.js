const http = require('http');
const fs = require('fs');
const { format, basename } = require('path');

/* ============================ SERVER DATA ============================ */
let artists = JSON.parse(fs.readFileSync('./seeds/artists.json'));
let albums = JSON.parse(fs.readFileSync('./seeds/albums.json'));
let songs = JSON.parse(fs.readFileSync('./seeds/songs.json'));

let nextArtistId = 2;
let nextAlbumId = 2;
let nextSongId = 2;

// returns an artistId for a new artist
function getNewArtistId() {
  const newArtistId = nextArtistId;
  nextArtistId++;
  return newArtistId;
}

// returns an albumId for a new album
function getNewAlbumId() {
  const newAlbumId = nextAlbumId;
  nextAlbumId++;
  return newAlbumId;
}

// returns an songId for a new song
function getNewSongId() {
  const newSongId = nextSongId;
  nextSongId++;
  return newSongId;
}

/* ======================= PROCESS SERVER REQUESTS ======================= */
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // assemble the request body
  let reqBody = "";
  req.on("data", (data) => {
    reqBody += data;
  });

  req.on("end", () => { // finished assembling the entire request body
    // Parsing the body of the request depending on the "Content-Type" header
    if (reqBody) {
      switch (req.headers['content-type']) {
        case "application/json":
          req.body = JSON.parse(reqBody);
          break;
        case "application/x-www-form-urlencoded":
          req.body = reqBody
            .split("&")
            .map((keyValuePair) => keyValuePair.split("="))
            .map(([key, value]) => [key, value.replace(/\+/g, " ")])
            .map(([key, value]) => [key, decodeURIComponent(value)])
            .reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
            }, {});
          break;
        default:
          break;
      }
      console.log(req.body);
    }

    /* ========================== ROUTE HANDLERS ========================== */

    // Your code here
    if (req.method === 'GET' && req.url === '/artists') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      return res.end(JSON.stringify(artists))
    }

    if(req.method === 'GET' && req.url.startsWith('/artists/')) {
      const urlParts = req.url.split('/');
      const artistId = urlParts[2];
      if (urlParts.length === 3) {
        const artist = artists[artistId];

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        return res.end(JSON.stringify(artist));
      }
    }

    if (req.method === 'POST' && req.url === '/artists') {
      const artist = {
        artistId: getNewArtistId(),
        name: req.body.name
      }

      artists[artist.artistId] = artist;

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(201);
      return res.end(JSON.stringify(artist));
    }

    if (req.method === 'PUT' && req.url.startsWith('/artists/')) {
      const urlParts = req.url.split('/');
      const artistId = urlParts[2];
      const artist = artists[artistId];

      artist.name = req.body.name;
      artist.updatedAt = Date().toString();

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      return res.end(JSON.stringify(artist));
    }

    if (req.method === 'DELETE' && req.url.startsWith('/artists/')) {
      const urlParts = req.url.split('/');
      const artistId = urlParts[2];

      if (artists.hasOwnProperty(artistId)) {
        delete artists[artistId];

        const deleted = {
        message: "Successfully deleted"
      };

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        return res.end(JSON.stringify(deleted));
      } else {
        res.writeHead(404);
        return res.end();
      }
    }

    if (req.method === 'GET' && req.url.startsWith('/artists/')) {
      const urlParts = req.url.split('/');
      const artistId = urlParts[2];

      if(urlParts.length === 4 && urlParts[3] === 'albums') {
        const albums = getAlbumsByArtistId(artistId);

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        return res.end(JSON.stringify(albums));
      }
    }

    if (req.method === 'GET' && req.url.startsWith('/albums/')) {
      const urlParts = req.url.split('/');
      const albumId = urlParts[2];

      if(urlParts.length < 4) {
        const album = albums[albumId];
        album.artist = artists[album.artistId];
        album.songs = getSongsByAlbum(albumId);

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        return res.end(JSON.stringify(album));
      }
    }

    if (req.method === 'POST' && req.url.startsWith('/artists/')) {
      const urlParts = req.url.split('/');
      const artistId = urlParts[2];

      if(urlParts[3] === 'albums') {
        const album = {
          "name": req.body.name,
          "albumId": getNewAlbumId(),
          "artistId": artistId,
          "artist": artists[artistId]
        }

        for(const song of req.body.songs) {
          song.albumId = album.albumId;
          song.songId = getNewSongId();
          songs[song.songId] = song;
        }

        console.log(songs)

        albums[album.albumId] = album;
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(201);
        const response = {
          "name": album.name,
          "albumId": album.albumId,
          "artistId": album.artistId
        }
        return res.end(JSON.stringify(response));
      }
    }

    if (req.method === 'PUT' && req.url.startsWith('/albums/')) {
      const urlParts = req.url.split('/');
      const albumId = urlParts[2];

      if(albums[albumId] !== undefined) {
        const album = albums[albumId];
        const { name, artistId } = req.body;

        album.name = name;
        album.artistId = artistId;

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        const response = {
          "name": album.name,
          "albumId": albumId,
          "artistId": album.artistId,
          "artist": artists[album.artistId],
          "songs": getSongsByAlbum(albumId)
        }
        return res.end(JSON.stringify(response));
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(404);
        const message = {
          "message": "album not found"
        }
        return res.end(JSON.stringify(message));
      }

    }

    if (req.method === 'DELETE' && req.url.startsWith('/albums/')) {
      const urlParts = req.url.split('/');
      const albumId = urlParts[2];

      albums[albumId] = undefined;

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      const message = {
        "message": "Succesfully deleted"
      }
      return res.end(JSON.stringify(message));
    }

    if(req.method === 'GET' && req.url.startsWith('/artists/')) {
      const urlParts = req.url.split('/');
      const artistId = urlParts[2];
      let songsArray;

      if(urlParts[3] === 'songs') {
        songsArray = getSongsByArtist(artistId);
      }

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      return res.end(JSON.stringify(songsArray));
    }

    if(req.method === 'GET' && req.url.startsWith('/albums/')) {
      const urlParts = req.url.split('/');
      const albumId = urlParts[2];
      let songsArray;

      if(urlParts[3] === 'songs') {
        songsArray = getSongsByAlbum(albumId);
      }

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      return res.end(JSON.stringify(songsArray));
    }

    if(req.method === 'GET' && req.url.startsWith('/trackNumbers/')) {
      const urlParts = req.url.split('/');
      const trackNumber = urlParts[2];
      let songsArray;

      if(urlParts[3] === 'songs') {
        songsArray = getSongsByTrackNumber(trackNumber);
      }

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      return res.end(JSON.stringify(songsArray));
    }

    if(req.method === 'GET' && req.url.startsWith('/songs/')) {
      const urlParts = req.url.split('/');
      const songId = urlParts[2];

      const song = songs[songId];

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      return res.end(JSON.stringify(song));
    }

    if(req.method === 'POST' && req.url.startsWith('/albums/')) {
      const urlParts = req.url.split('/');
      const albumId = urlParts[2];

      const { name, lyrics, trackNumber } = req.body;

      const song = {
        "name": name,
        "lyrics": lyrics,
        "trackNumber": trackNumber,
        "songId": getNewSongId(),
        "albumId": albumId,
        "createdAt": Date().toString(),
        "updatedAt": Date().toString()
      }

      songs[song.songId] = song;

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(201);
      const response = {
        "name": song.name,
        "lyrics": song.lyrics,
        "trackNumber": song.trackNumber,
        "songId": song.songId,
        "albumId": song.albumId,
      }
      return res.end(JSON.stringify(response));
    }

    if(req.method === 'PUT' && req.url.startsWith('/songs/')) {
      const urlParts = req.url.split('/');
      const songId = urlParts[2];

      const song = songs[songId];
      const { name, lyrics, trackNumber } = req.body;

      song.name = name;
      song.lyrics = lyrics;
      song.trackNumber = trackNumber;
      song.updatedAt = Date().toString();

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(201);
      const response = {
        "name": song.name,
        "lyrics": song.lyrics,
        "trackNumber": song.trackNumber,
        "songId": song.songId,
        "albumId": song.albumId,
        "updatedAt": song.updatedAt
      }
      return res.end(JSON.stringify(response));
    }

    if(req.method === 'DELETE' && req.url.startsWith('/songs/')) {
      const urlParts = req.url.split('/');
      const songId = urlParts[2];

      songs[songId] = undefined;

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      const message = {
        "message": "Succesfully deleted"
      }
      return res.end(JSON.stringify(message));
    }


    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.write("Endpoint not found");
    return res.end();
  });
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));



// Helpers
function getAlbumsByArtistId(artistId) {
  const albumsByArtist = {};

  for (const albumId in albums) {
      if (albums.hasOwnProperty(albumId)) {
          const album = albums[albumId];
          if (album.artistId === parseInt(artistId)) {
              albumsByArtist[albumId] = album;
          }
      }
  }

  return albumsByArtist;
}

function getSongsByAlbum(albumId) {
  const songsArray = [];

  for(const songId in songs) {
    const song = songs[songId];
    if(parseInt(albumId) === song.albumId) {
      songsArray.push(song);
    }
  }

  return songsArray;
}

function getSongsByArtist(artistId) {
  const songsArray = [];

  const albums = getAlbumsByArtistId(artistId);

  for(const albumId in albums) {
    for(const songId in songs) {
      const song = songs[songId];
      if(song.albumId === parseInt(albumId)) {
        songsArray.push(song);
      }
    }
  }


  return songsArray;
}

function getSongsByTrackNumber(trackNumber) {
  const songsArray = [];

  for(const songId in songs) {
    const song = songs[songId];
    if(song.trackNumber === parseInt(trackNumber)) {
      songsArray.push(song);
    }
  }

  return songsArray;
}
