import Collection from './collection'
import { getBlockHashId, getFullBlockId, getUrlPageId } from './utils'


const NOTION_BASE_URL = "https://www.notion.so"

export default class Notabase {
    constructor(options = {}) {
        this.blockStore = {}
        this.collectionSchemaStore = {}
        this.collectionStore = {}
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
            // token node env 
            this.token = token
            let tkHeader = token ? { 'cookie': `token_v2=${token}` } : {}
            const fetch = require("node-fetch")

            // non-token browse ext env
            let credentials = !token ? { credentials: 'include' } : {}
            this.reqeust = {
                async post(path, data) {
                    let r = await fetch(`${NOTION_BASE_URL}${path}`,
                        {
                            method: 'POST',
                            headers: {
                                'accept-encoding': 'gzip, deflate',
                                'content-length': JSON.stringify(data).length,
                                'content-type': 'application/json;charset=UTF-8',
                                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36',
                                ...tkHeader
                            },
                            body: JSON.stringify(data),
                            ...credentials
                        })
                    return await r.json()
                }
            }
        }
    }


    async getBrowseableUrlByCollectionPageId(pageId) {
        let r = await this.getRecordValues([pageId], [])
        let viewId = r[0].value[pageId].view_ids[0]

        let browseableUrl = `${NOTION_BASE_URL}${getBlockHashId(pageId)}?v=${getBlockHashId(viewId)}`
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

    async loadPageChunk(pageId) {
        let data = await this.reqeust.post(`/api/v3/loadPageChunk`,
            { "pageId": getFullBlockId(pageId), "limit": 50, "cursor": { "stack": [] }, "chunkNumber": 0, "verticalColumns": false }
        )
    }
    async getPageCollectionInfo(pageId) {
        console.log(`>>>> getPageChunk:${pageId}`)
        let data = await this.reqeust.post(`/api/v3/loadPageChunk`,
            { "pageId": getFullBlockId(pageId), "limit": 50, "cursor": { "stack": [] }, "chunkNumber": 0, "verticalColumns": false }
        )
        let collectionId = Object.entries(data.recordMap.collection)[0][0]
        let collectionViewId = Object.entries(data.recordMap.collection_view)[0][0]
        return [collectionId, collectionViewId]
    }

    async fetchCollectionData(collectionId, collectionViewId) {

        let data = await this.reqeust.post(`/api/v3/queryCollection`, {
            collectionId,
            collectionViewId,
            loader: {
                "type": "table",
                "limit": 1000,
                "userTimeZone": "Asia/Shanghai",
                "userLocale": "zh-tw",
                "loadContentCover": true
            }
        })
        console.log(`>>>> queryCollection:${collectionId}`)
        // prefetch relation  data 
        let schema = data.recordMap.collection[collectionId].value.schema
        this.collectionSchemaStore[collectionId] = schema
        return new Collection(collectionId, collectionViewId, data, this)
    }
    async fetch(urlOrPageId) {
        let collectionId, collectionViewId, pageId
        if (urlOrPageId.match("^[a-zA-Z0-9-]+$")) {
            // pageId with '-' split
            pageId = getBlockHashId(urlOrPageId)

            if (pageId && pageId in this.collectionStore) {
                return this.collectionStore[pageId]
            } else {
                [collectionId, collectionViewId] = await this.getPageCollectionInfo(getBlockHashId(urlOrPageId))
            }
        } else if (urlOrPageId.startsWith("http")) {
            // url 
            pageId = getUrlPageId(urlOrPageId)
            if (pageId && pageId in this.collectionStore) {
                return this.collectionStore[pageId]
            } else {
                let [base, params] = urlOrPageId.split('?')
                let baseUrlList = base.split('/'); // 这里需要添加分号，否则编译出错。 参见 https://www.zhihu.com/question/20298345/answer/49551142
                [collectionId, collectionViewId] = await this.getPageCollectionInfo(baseUrlList[baseUrlList.length - 1])
            }
        }
        let r = await this.fetchCollectionData(collectionId, collectionViewId)
        this.collectionStore[pageId] = r
        return r
    }

    async fetchAll(dbMap) {
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