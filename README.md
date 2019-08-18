# Notabase (WIP)
API Wrapper For Notion's Database

## Getting Started

### Installing

```
yarn add notabase
```


### Example

``` js
import Notabase from 'notabase'

// node env
let nb = new Notabase()

// with token
let nb = new Notabase({
  token: <token_v2>
})

// browser env
let nb = new Notabase({
  proxy: {
    url: <cloudflare worker url>,
    authCode: <>
  }
})
 

// get my music data
let db = await nb.fetch({
  songs: "https://www.notion.so/2628769120ad41d998ec068d6e2eb410?v=e8e69ac68a8d483792c54541e4d8ba72",
  albums: "https://www.notion.so/15f1759f38a34fedaa79262812b707f0?v=b385656739214101b2b8a159092a52e8",
  artists: "https://www.notion.so/31b8544ffb034964b1aa56bfa78497c1?v=1d9cbfcd279d4534964acdd374c9824e"
})

// get all songs
let allSongs = db.songs.rows
 
// get song by index
let song = allSongs[0]

// get one song's title (base props)
console.log(`${song.tile}`)

// get artist's name of the song (related props)
console.log(`${song.artist[0].Name}`) // a song maybe has two or more artists

// search song by title in song's table
let aSong = allSongs.find(song=> song.title === "Bad Guy")

// search all song by artist's name in song's table
let songByArtistName = allSongs.filter(song=> song.artist[0].name === "someone")
// search all song by artist's name in artist's table
songByArtistName = db.artists.rows.filter(a=> a.name === "someone").songs


```
