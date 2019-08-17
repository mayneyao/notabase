const Notabase = require('././src/notabase')


// node env
let nb = new Notabase()

t = async () => {
    let db = await nb.fetch({
        songs: "https://www.notion.so/2628769120ad41d998ec068d6e2eb410?v=e8e69ac68a8d483792c54541e4d8ba72",
        artists: "https://www.notion.so/15f1759f38a34fedaa79262812b707f0?v=b385656739214101b2b8a159092a52e8",
        albums: "https://www.notion.so/31b8544ffb034964b1aa56bfa78497c1?v=1d9cbfcd279d4534964acdd374c9824e"
    })

    // console.log(db.songs.rows.find(item => item.title === '风衣').album[0].Name)
    // 孙燕姿No. 13作品：跳舞的梵谷

    let song = db.songs.rows.find(item => item.title === "Tonight, I Feel Close To You")
    song.artist.map(a => {
        console.log(a.Name)
        console.log(a.songs)
    })
    // 倉木麻衣
    // 孙燕姿
}
t()
