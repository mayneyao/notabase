# Notabase
API Wrapper For Notion's Database

## Getting Started

### Installing

```
yarn add notabase
```


### Example

``` js
import Notabase from 'notabase'
let nb = new Notabase()

// get data

let db = await nb.fetch({
  songs: "https://www.notion.so/2628769120ad41d998ec068d6e2eb410?v=e8e69ac68a8d483792c54541e4d8ba72",
  albums: "https://www.notion.so/15f1759f38a34fedaa79262812b707f0?v=b385656739214101b2b8a159092a52e8",
  artists: "https://www.notion.so/31b8544ffb034964b1aa56bfa78497c1?v=1d9cbfcd279d4534964acdd374c9824e"
})

// get table rows 
let rows = db.songs.rows
 
// get one row
let song = rows[0]

// get base props
console.log(`${song.tile}`)

// get relation props
console.log(`${song.artist[0].Name}`) // a song maybe has two or more artists

// search row
let searchSongByTitle = rows.find(song=> song.title === "Bad Guy")

let searchSongByArtist = rows.find(song=> song.artist[0].name === "someone")
// or 
searchSongByArtist = db.artists.rows.find(a=> a.name === "someone").songs

// 

```
