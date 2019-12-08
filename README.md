# Notabase (WIP)
API Wrapper For Notion's Database

## Getting Started

### Installing

```
yarn add notabase
```

### Use

You can use notabse in browser, browser extension, and node. But there is a difference when initializing the notabase instance.

#### Node

| Env  | Token | Read | Write | Note|
| ------------- | ------------- | ------------- | ------------- | ------------- |
| node  | ❌  | public data | ❌ | you can only read public data without token|
| node  | ✔  | private data | ✔ | you can read and modify private data with token |

```js
import Notabase from 'notabase'

// node env
// just Read public data
let nb = new Notabase()
// CRUD support
let nb = new Notabase({
  token: "token_v2 from cookies"
})

```

#### Browser

If you want to use Notabase in your web pages, you need to handle CORS. You can solve this problem with a cloudflare worker.Generate a cloudflare-worker using the code from [`src/cf-worker.js`](src/cf-worker.js)

In the browser environment, we don't use `token` directly, instead we use `authcode` to handle identity checks. You need to set an `authcode` that only you know in your `cf-worker` , and then we use it when initializing the notabase instance.

| Env  | authCode | Read | Write | Note
| ------------- | ------------- | ------------- | ------------- | ------------- |
| browser  | ❌  | public data | ❌ | just read public data without `authCode`|
| browser  | ✔  | private data | ✔ | you can read and modify private data with `authCode` |


```js
import Notabase from 'notabase'

// browser env
// without authCode Read public data
// with authCode CRUD support
let nb = new Notabase({
  proxy: {
    url: "cloudflare worker url",
    authCode: "nobody knows it but you"
  }
})

```

#### Browser Extension

```js
import Notabase from 'notabase'

// browser extension env
// CRUD support without setting anything
let nb = new Notabase()

```

[withCredentials](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/withCredentials)


#### Fetch Data

| Method  |  Note|
| ------------- | ------------- |
| fetch  | fetch data from one table, but you can't query relation data|
| fetchAll  | fetch data from multiple tables, you can query relation data if relation table has been fetched|

``` js

// fetch one table
let songs = await nb.fetch("https://www.notion.so/2628769120ad41d998ec068d6e2eb410?v=e8e69ac68a8d483792c54541e4d8ba72")


// fetch all tables about music
// get my music data
let db = await nb.fetchAll({
  songs: "https://www.notion.so/2628769120ad41d998ec068d6e2eb410?v=e8e69ac68a8d483792c54541e4d8ba72",
  albums: "https://www.notion.so/15f1759f38a34fedaa79262812b707f0?v=b385656739214101b2b8a159092a52e8",
  artists: "https://www.notion.so/31b8544ffb034964b1aa56bfa78497c1?v=1d9cbfcd279d4534964acdd374c9824e"
})

```

#### Query 

Data in Notion table will be mapped to JavaScript Array

``` js
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
#### Write

```js
let aSong = allSongs.find(song=> song.title === "Bad Guy")
aSong.title = "new title"
```

#### Create

```js
// create then modify
let newRow = collection.addRow()
// if tag1 is not exists, it will be auto created. 
newRow.Tags = ["tag1"]


// create with value
collection.addRow({title:"",Tags:["tag1"]}) 

```

#### Delete
```js
// delete row 
aSong.delete()
```


#### Update Table Schema
```js
// change
collection.schema.Tags.options.push({
  id:nb.genId(),
  value: "new tag",
  color: "pink"
})

// commit
collection.updateSchema()
```

## Todos

### collection
+ [x] collection.addRow({title:"",Tags:["tag1"]}) // add new row
+ [x] updateSchema // update schema

### row
+ [x] row.delete()  // delete a row

### all
+ [ ] Rewrite in TypeScript