
const axios = require('axios')
const dayjs = require('dayjs')
// const { URLSearchParams } = require('url')
const parse = require('url').parse


const NOTION_BASE_URL = "https://www.notion.so"
const NOTION_PROXY_API_URL = "https://notion.gine.workers.dev"


let blockStore = {

}

class Natabase {
    constructor(token) {
        this.token = token
        if (token) {
            this.reqeust = axios
        } else {
            this.reqeust = axios
        }
    }

    getUrlBloackId(url) {
        let pUrl = parse(url)
        let pathList = pUrl.pathname.split('/')
        let blockID = pathList[pathList.length - 1]
        return blockID
    }


    async getBrowseableUrlByCollectionPageId(pageId) {
        let r = await this.getRecordValues([pageId], [])
        let viewId = r[0].value[pageId].view_ids[0]

        let browseableUrl = `https://notion.so/${this.getBlockHashId(pageId)}?v=${this.getBlockHashId(viewId)}`
        return browseableUrl
    }

    async getRecordValues(blockIds, collectionIds) {
        let requestsIds = [...blockIds.map(item => ({ "table": "block", "id": item })), ...collectionIds.map(item => ({ "table": "collection", "id": item }))]
        let res = await this.reqeust.post(`${NOTION_PROXY_API_URL}/api/v3/getRecordValues`,
            {
                requests: requestsIds
            },
            {
                header: { 'content-type': 'application/json;charset=UTF-8' }
            })
        return res.data.results
    }

    getBlockHashId(blockId) {
        return blockId.split('-').join('')
    }
    getFullBlockId(blockId) {
        if (blockId.match("^[a-zA-Z0-9]+$")) {
            return blockId.substr(0, 8) + "-"
                + blockId.substr(8, 4) + "-"
                + blockId.substr(12, 4) + "-"
                + blockId.substr(16, 4) + "-"
                + blockId.substr(20, 32)
        } else {
            return blockId
        }
    }

    async getPageCollectionId(pageId) {
        let res = await this.reqeust.post(`${NOTION_PROXY_API_URL}/api/v3/loadPageChunk`,
            { "pageId": this.getFullBlockId(pageId), "limit": 50, "cursor": { "stack": [] }, "chunkNumber": 0, "verticalColumns": false },
            {
                header: { 'content-type': 'application/json;charset=UTF-8' }
            })
        let collectionId = Object.entries(res.data.recordMap.collection)[0][0]
        return collectionId
    }

    getBrowseableUrl(blockID) {
        return `${NOTION_BASE_URL}/${blockID.split('-').join('')}`
    }

    parseImageUrl(url, width) {
        let rUrl
        if (url.startsWith("https://s3")) {
            let [parsedOriginUrl] = url.split("?")
            rUrl = `${NOTION_PROXY_API_URL}/image/${encodeURIComponent(parsedOriginUrl).replace("s3.us-west", "s3-us-west")}`
        } else if (url.startsWith("/image")) {
            rUrl = `${NOTION_PROXY_API_URL}${url}`
        } else {
            rUrl = url
        }

        if (width) {
            return `${rUrl}?width=${width}`
        } else {
            return rUrl
        }
    }


    async fetchCollectionData(collectionId, collectionViewId) {
        let res = await this.reqeust.post(`${NOTION_PROXY_API_URL}/api/v3/queryCollection`, {
            collectionId,
            collectionViewId,
            loader: { type: "table" }
        }, {
                header: { 'content-type': 'application/json;charset=UTF-8' }
            })


        // prefetch relation  data 
        let schema = res.data.recordMap.collection[collectionId].value.schema
        let relationCollectionIds = []
        Object.entries(schema).map(item => {
            let [key, v] = item
            //|| v.type === 'rollup'
            if (v.type === 'relation') {
                if (v.collection_id) {
                    relationCollectionIds.push(v.collection_id)
                }
            }
        })

        let relationCollectionData = await this.getRecordValues([], relationCollectionIds)
        let relationMap = {}

        relationCollectionData.map(item => {
            relationMap[item.value.id] = item.value
        })

        return new Collection(collectionId, collectionViewId, res.data, relationMap)
    }
    async _fetch(url) {
        let [base, params] = url.split('?')
        let p = new URLSearchParams(params)
        let baseUrlList = base.split('/')
        let collectionId = await this.getPageCollectionId(baseUrlList[baseUrlList.length - 1])
        // console.log(collectionId)
        let collectionViewId = this.getFullBlockId(p.get('v'))
        let r = await this.fetchCollectionData(collectionId, collectionViewId)
        return r
    }

    async fetch(dbMap) {
        let db = {}
        let requests = Object.entries(dbMap).map(item => {
            let [tableName, url] = item
            db[tableName] = {}
            return this._fetch(url)
        })
        let res = await Promise.all(requests)
        Object.entries(dbMap).map((item, index) => {
            let [tableName, url] = item
            db[tableName] = res[index]
        })
        return db
    }
}
class Collection {
    constructor(collectionId, collectionViewId, rawData, relationMap) {
        this.collectionId = collectionId
        this.collectionViewId = collectionViewId
        this.rawData = rawData
        this.relationMap = relationMap

        this.schema = rawData.recordMap.collection[collectionId].value.schema
        this.total = rawData.result.total
        this.value = rawData.recordMap.collection[collectionId].value
        this.props = Object.entries(this.schema).map(item => {
            let [key, v] = item
            return v.name
        })
        this.props.push('_raw')
        this.propsKeyMap = {}
        Object.entries(this.schema).map(item => {
            let [key, v] = item
            this.propsKeyMap[v.name] = {
                key,
                ...v
            }
        })

        // 缓存
        blockStore = { ...blockStore, ...rawData.recordMap.block }
    }



    makeRow(rowBlockId, schema) {
        let rowData = blockStore[rowBlockId].value

        let props = Object.entries(schema).map(item => {
            let [key, v] = item
            return v.name
        })
        props.push('_raw')

        let propsKeyMap = {}
        Object.entries(schema).map(item => {
            let [key, v] = item
            propsKeyMap[v.name] = {
                key,
                ...v
            }
        })
        if (rowData) {
            let handlers = {
                get: (target, property) => {
                    if (props.indexOf(property) > -1) {
                        if (property === '_raw') {
                            return target
                        } else {
                            const { key, type, collection_id } = propsKeyMap[property]
                            let res
                            let rawValue = target.properties[key]
                            if (rawValue) {
                                switch (type) {
                                    case 'title':
                                    case 'number':
                                        res = rawValue[0][0]
                                        break
                                    case 'date':
                                        res = rawValue[0][0][0][1][0][1].start_date
                                        break
                                    case 'multi_select':
                                        res = rawValue[0][0].split(',')
                                        break
                                    case 'file':
                                        let r = rawValue.filter(item => {
                                            let content = item[1]
                                            return Boolean(content)
                                        }).map(item => {
                                            return item[1][0][1]
                                        })
                                        if (r.length === 1) {
                                            res = r[0]
                                        } else {
                                            res = r
                                        }
                                        break
                                    case 'relation':
                                        res = rawValue.filter(item => item.length > 1).map(item => {
                                            let _schema = this.relationMap[collection_id].schema
                                            let _blockId = item[1][0][1]
                                            return this.makeRow(_blockId, _schema)
                                        })
                                        break
                                    case 'rollup':
                                        res = rawValue.filter(item => item.length > 1).map(item => item[1][0])
                                        break
                                    default:
                                        res = rawValue
                                }
                            }

                            return res
                        }
                    } else {
                        return undefined
                    }
                }
            }
            return new Proxy(rowData, handlers)
        }
    }

    get rows() {
        const { blockIds } = this.rawData.result
        return blockIds.map(blockId => this.makeRow(blockId, this.schema))
    }
}


// let nb = new Natabase()

// t = async () => {
//     let db = await nb.fetch({
//         songs: "https://www.notion.so/2628769120ad41d998ec068d6e2eb410?v=e8e69ac68a8d483792c54541e4d8ba72",
//         albums: "https://www.notion.so/15f1759f38a34fedaa79262812b707f0?v=b385656739214101b2b8a159092a52e8",
//         artists: "https://www.notion.so/31b8544ffb034964b1aa56bfa78497c1?v=1d9cbfcd279d4534964acdd374c9824e"
//     })

//     // console.log(db.songs.rows.find(item => item.title === '风衣').album[0].Name)
//     // 孙燕姿No. 13作品：跳舞的梵谷

//     let song = db.songs.rows.find(item => item.title === "Tonight, I Feel Close To You")
//     song.artist.map(artist => {
//         console.log(artist.Name)
//     })
//     // 倉木麻衣
//     // 孙燕姿
// }
// t()

export { Natabase }