const NOTION_BASE_URL = "https://www.notion.so"
const NOTION_PROXY_API_URL = "https://notion.gine.workers.dev"


let blockStore = {}
let collectionSchemaStore = {}


class Notabase {
    constructor(options = {}) {
        const { proxy, token } = options
        // proxy > browser env + cloudflare worker
        // token > node env

        if (proxy) {
            const { url, authCode } = proxy
            // browser env
            this.url = url // cloudflare worker url
            // auth code for cloudflare worker (nobody knows but you ,same to the code that config in cf-worker)
            // without authCode you can only retrieve and cannot creat/update/delete
            this.authCode = authCode

            this.reqeust = {
                async post(path, data) {
                    let r = await fetch(`${url}${path}?body=${JSON.stringify(data)}`, {
                        method: 'GET',
                        headers: {
                            'content-type': 'application/json;charset=UTF-8',
                            'x-auth-code': authCode, // custom header
                        }
                    })
                    return await r.json()
                }
            }
        } else {
            // node env
            this.token = token
            let tkHeader = token ? { 'cookies': token } : {}
            const fetch = require("node-fetch")
            this.reqeust = {
                async post(path, data) {
                    let r = await fetch(`${NOTION_BASE_URL}${path}`,
                        {
                            method: 'POST',
                            headers: {
                                'content-type': 'application/json;charset=UTF-8',
                                ...tkHeader
                            },
                            body: JSON.stringify(data)
                        })
                    return await r.json()
                }
            }
        }
    }

    getUrlBloackId(url) {
        let pUrl
        if (!process.browser) {
            const parse = require('url').parse
            pUrl = parse(url)
        } else {
            pUrl = new URL(url)
        }
        let pathList = pUrl.pathname.split('/')
        let blockID = pathList[pathList.length - 1]
        return blockID
    }


    async getBrowseableUrlByCollectionPageId(pageId) {
        let r = await this.getRecordValues([pageId], [])
        let viewId = r[0].value[pageId].view_ids[0]

        let browseableUrl = `${NOTION_BASE_URL}${this.getBlockHashId(pageId)}?v=${this.getBlockHashId(viewId)}`
        return browseableUrl
    }

    async getRecordValues(blockIds, collectionIds) {
        let requestsIds = [...blockIds.map(item => ({ "table": "block", "id": item })), ...collectionIds.map(item => ({ "table": "collection", "id": item }))]
        console.log(`>>>> getRecordValues:${requestsIds}`)
        let data = await this.reqeust.post(`/api/v3/getRecordValues`,
            {
                requests: requestsIds
            })
        return data.results
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

    async getPageCollectionInfo(pageId) {
        console.log(`>>>> getPageChunk:${pageId}`)
        let data = await this.reqeust.post(`/api/v3/loadPageChunk`,
            { "pageId": this.getFullBlockId(pageId), "limit": 50, "cursor": { "stack": [] }, "chunkNumber": 0, "verticalColumns": false }
        )
        let collectionId = Object.entries(data.recordMap.collection)[0][0]
        let collectionViewId = Object.entries(data.recordMap.collection_view)[0][0]
        return [collectionId, collectionViewId]
    }

    getBrowseableUrl(blockID) {
        return `${NOTION_BASE_URL}/${blockID.split('-').join('')}`
    }

    parseImageUrl(url, width) {
        let rUrl
        if (url.startsWith("https://s3")) {
            let [parsedOriginUrl] = url.split("?")
            rUrl = `${NOTION_BASE_URL}/image/${encodeURIComponent(parsedOriginUrl).replace("s3.us-west", "s3-us-west")}`
        } else if (url.startsWith("/image")) {
            rUrl = `${NOTION_BASE_URL}${url}`
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

        let data = await this.reqeust.post(`/api/v3/queryCollection`, {
            collectionId,
            collectionViewId,
            loader: { type: "table" }
        })
        console.log(`>>>> queryCollection:${collectionId}`)
        // prefetch relation  data 
        let schema = data.recordMap.collection[collectionId].value.schema
        collectionSchemaStore[collectionId] = schema
        return new Collection(collectionId, collectionViewId, data)
    }
    async _fetch(urlOrPageId) {
        let collectionId, collectionViewId
        if (urlOrPageId.match("^[a-zA-Z0-9-]+$")) {
            // pageId with '-' split
            [collectionId, collectionViewId] = await this.getPageCollectionInfo(this.getBlockHashId(urlOrPageId))
        } else if (urlOrPageId.startsWith("http")) {
            // url 
            let [base, params] = urlOrPageId.split('?')

            if (!process.browser) {
                const { URLSearchParams } = require('url')
            }
            let p = new URLSearchParams(params)

            let baseUrlList = base.split('/'); // 这里需要添加分号，否则编译出错。 参见 https://www.zhihu.com/question/20298345/answer/49551142
            [collectionId, collectionViewId] = await this.getPageCollectionInfo(baseUrlList[baseUrlList.length - 1])
        }
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
    constructor(collectionId, collectionViewId, rawData) {
        this.collectionId = collectionId
        this.collectionViewId = collectionViewId
        this.rawData = rawData

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
                            let rawValue = target.properties ? target.properties[key] : false
                            if (rawValue) {
                                switch (type) {
                                    case 'title':
                                    case 'url':
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
                                        res = rawValue.filter(item => {
                                            let content = item[1]
                                            return Boolean(content)
                                        }).map(item => {
                                            return item[1][0][1]
                                        })
                                        break
                                    case 'relation':
                                        res = rawValue.filter(item => item.length > 1).map(item => {
                                            let _schema = collectionSchemaStore[collection_id]
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
                            // if (res instanceof Array && res.length === 1) {
                            //     return res[0]
                            // } else {
                            //     return res
                            // }
                        }
                    } else {
                        return undefined
                    }
                }
            }
            let proxy = new Proxy(rowData, handlers)
            proxy.toString = Function.prototype.toString.bind(rowData)
            return proxy
        }
    }

    get rows() {
        const { blockIds } = this.rawData.result
        return blockIds.map(blockId => this.makeRow(blockId, this.schema))
    }
}

module.exports = Notabase