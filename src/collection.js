const utils = require('./utils')
class Row {

}

class Collection {
    constructor(collectionId, collectionViewId, rawData, client) {
        this.collectionId = collectionId
        this.collectionViewId = collectionViewId
        this.rawData = rawData
        this.client = client

        this._schema = rawData.recordMap.collection[collectionId].value.schema
        this.total = rawData.result.total
        this.value = rawData.recordMap.collection[collectionId].value
        this.props = Object.entries(this._schema).map(item => {
            let [key, v] = item
            return v.name
        })
        this.props.push('_raw')
        this.propsKeyMap = {}
        Object.entries(this._schema).map(item => {
            let [key, v] = item
            this.propsKeyMap[v.name] = {
                key,
                ...v
            }
        })

        // cache
        this.client.blockStore = { ...this.client.blockStore, ...rawData.recordMap.block }
    }
    addRow(data) {
        const newId = this.client.genId()

        let args = {}
        let updateData
        if (data) {
            Object.entries(data).map(item => {
                let [prop, value] = item
                let notionData = this.js2notion(prop, value, this.propsKeyMap)
                const { key, type } = this.propsKeyMap[prop]
                args[key] = notionData
            })

            updateData = { "id": newId, "table": "block", "path": ["properties"], "command": "set", "args": args }
        }

        let postData = {
            "operations": [
                {
                    args: { type: "page", id: newId, version: 1 },
                    command: "set",
                    id: newId,
                    path: [],
                    table: "block"
                }, // create new row block
                {
                    args: { parent_id: this.collectionId, parent_table: "collection", alive: true },
                    command: "update",
                    id: newId,
                    path: [],
                    table: "block"
                }, // set parent node
                {
                    args: {
                        // created_by: "c8e68ca2-a84d-4792-a6d6-1e7716982001",
                        created_time: (new Date()).getTime(),
                        // last_edited_by: "c8e68ca2-a84d-4792-a6d6-1e7716982001",
                        last_edited_time: (new Date()).getTime()
                    },
                    command: "update",
                    id: newId,
                    path: [],
                    table: "block"
                } // [fixme] set create/edit time
            ]
        }
        if (updateData) {
            postData.operations.push(updateData)
        }
        this.client.reqeust.post('/api/v3/submitTransaction', postData)
        this.client.blockStore[newId] = {
            value: {
                id: newId,
                parent_id: this.collectionId,
                parent_table: "collection",
                alive: true,
                created_time: (new Date()).getTime(),
                last_edited_time: (new Date()).getTime(),
                properties: args
            }
        }
        return this.makeRow(newId, this._schema)
    }

    checkOrCreateSelectOptions(prop, value, type) {
        if (type === "select") {
            if (!this.schema[prop].options.find(o => o.value === value)) {
                // if select value is not exists,create it & update schema
                this.schema[prop].options.push({
                    id: this.client.genId(),
                    value
                })
                this.updateSchema()
            }
        } else if (type === "multi_select") {
            value.map(v => {
                if (!this.schema[prop].options.find(o => o.value === v)) {
                    // if select value is not exists,create it & update schema
                    this.schema[prop].options.push({
                        id: this.client.genId(),
                        value: v
                    })
                }
            })
            this.updateSchema()
        }
    }

    js2notion(prop, value, propsKeyMap) {
        const { key, type } = propsKeyMap[prop]
        let newV
        switch (type) {
            case 'title':
            case 'text':
            case 'url':
            case 'number':
                newV = [[value]]
                break
            case 'checkbox':
                newV = value ? [['Yes']] : [['No']]
                break
            case 'file':
                if (value.length === 1 && value[0]) {
                    newV = [[value[0], [["a", value[0]]]]]
                } else if (value.length === 0) {
                    newV = []
                } else {
                    newV = value.reduce((a, b, index) => {
                        if (index === 1) {
                            return [[a, [["a", a]]]].concat([
                                [","],
                                [b, [["a", b]]]
                            ])
                        } else {
                            return a.concat([
                                [","],
                                [b, [["a", b]]]
                            ])
                        }
                    })
                }
                break
            case 'select':
                this.checkOrCreateSelectOptions(prop, value, 'select')
                newV = [[value]]
                break
            case 'multi_select':
                this.checkOrCreateSelectOptions(prop, value, 'multi_select')
                if (value instanceof Array) {
                    value.map(v => { })
                    newV = [[value.join(',')]]
                }
                break
            case 'person':
                if (value instanceof Array) {
                    if (value.length === 1) {
                        newV = [["‣", [["u", value[0]]]]]
                    } else if (value.length === 0) {
                        newV = []
                    } else {
                        newV = value.reduce((a, b, index) => {
                            if (index === 1) {
                                return [["‣", [["u", a]]]].concat([
                                    [","],
                                    ["‣", [["u", b]]]
                                ])
                            } else {
                                return a.concat([
                                    [","],
                                    ["‣", [["u", b]]]
                                ])
                            }
                        })
                    }
                }
                else {
                    throw Error()
                }
                break
            case 'date':
                let type = 'date';
                if (value.includeTime) {
                    type += 'time'
                }
                if (value.endDate) {
                    type += 'range'
                }
                const timeZone = value.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
                const startDate = value.startDate;
                const endDate = value.endDate;
                newV = [["‣", [["d", {
                    time_zone: timeZone,
                    type,
                    start_date: startDate ? utils.formatDate(utils.unFixTimeZone(startDate, timeZone)) : undefined,
                    start_time: startDate && value.includeTime ? utils.formatTime(utils.unFixTimeZone(startDate, timeZone)) : undefined,
                    end_date: endDate ? utils.formatDate(utils.unFixTimeZone(endDate, timeZone)) : undefined,
                    end_time: endDate && value.includeTime ? utils.formatTime(utils.unFixTimeZone(endDate, timeZone)) : undefined,
                }]]]]
                break;
            case 'relation':
                // check value type , should be Row
                if (value instanceof Array) {
                    if (value.length === 1 && value[0] instanceof Row) {
                        newV = [["‣", [["p", value[0].id]]]]
                    } else if (value.length === 0) {
                        newV = []
                    } else {
                        newV = value.filter(v => v instanceof Row).reduce((a, b, index) => {
                            if (index === 1) {
                                return [["‣", [["p", a.id]]]].concat([
                                    [","],
                                    ["‣", [["p", b.id]]]
                                ])
                            } else {
                                return a.concat([
                                    [","],
                                    ["‣", [["p", b.id]]]
                                ])
                            }
                        })
                    }
                    // fixme check (schema[key].collection_id === value.parent_id && value.parent_table === "collection")
                    // throw Error()
                }
                else {
                    throw Error()
                }
                break
            default:
                newV = [[value]]
        }
        return newV
    }

    makeRow(rowBlockId, schema) {
        if (!schema) return undefined
        let rowData = rowBlockId in this.client.blockStore ? this.client.blockStore[rowBlockId].value : undefined
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
                getPrototypeOf: (target) => {
                    return new Row()
                },
                get: (target, property) => {
                    if (target.hasOwnProperty(property)) {
                        return target[property]
                    }
                    else if (props.indexOf(property) > -1) {
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
                                    case 'select':
                                    case 'number':
                                        res = rawValue[0][0]
                                        break
                                    case 'text':
                                        res = rawValue[0][0]
                                        if (res === "‣") {
                                            res = rawValue[0][1][0][1]
                                        }
                                        break
                                    case 'checkbox':
                                        res = Boolean(rawValue[0][0] === 'Yes')
                                        break
                                    case 'date': {
                                        const date = rawValue[0][1][0][1];
                                        res = {
                                            startDate: date.start_date ? utils.fixTimeZone(`${date.start_date} ${date.start_time || '00:00'}`, date.time_zone) : undefined,
                                            endDate: date.end_date ? utils.fixTimeZone(`${date.end_date} ${date.end_time || '00:00'}`, date.time_zone) : undefined,
                                            includeTime: date.type.indexOf("time") !== -1,
                                            timeZone: date.time_zone
                                        }
                                        break
                                    }
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
                                    case 'person':
                                        res = rawValue.filter(item => item.length > 1).map(item => item[1][0][1])
                                        break
                                    case 'relation':
                                        res = rawValue.filter(item => item.length > 1).map(item => {
                                            let _schema = this.client.collectionSchemaStore[collection_id]
                                            let _blockId = item[1][0][1]
                                            if (_schema) {
                                                return this.makeRow(_blockId, _schema)
                                            } else {
                                                console.log(`failed to get relation of ${_blockId}`)
                                                return undefined
                                            }
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
                },
                set: (target, prop, value, _self) => {
                    if (props.indexOf(prop) > -1) {
                        let newV = this.js2notion(prop, value, propsKeyMap)
                        const { key, type } = propsKeyMap[prop]
                        let postData = {
                            "operations": [
                                { "id": target.id, "table": "block", "path": ["properties", key], "command": "set", "args": newV },
                                { "id": target.id, "table": "block", "path": [], "command": "update", "args": { "last_edited_time": (new Date()).getTime() } }
                            ]
                        }
                        this.client.reqeust.post('/api/v3/submitTransaction', postData)
                        _self = Reflect.set(target, prop, value)
                        return _self
                    } else if (["formatPageIcon", "formatPageCover", "formatPageCoverPosition"].includes(prop)) {
                        // 设置头图和 icon
                        let path
                        switch (prop) {
                            case "formatPageIcon":
                                path = ["format", "page_icon"]
                                break
                            case "formatPageCover":
                                path = ["format", "page_cover"]
                                break
                            case "formatPageCoverPosition":
                                path = ["format", "page_cover_position"]
                                break
                        }
                        let postData = {
                            "operations": [
                                { "id": target.id, "table": "block", "path": path, "command": "set", "args": value },
                                { "id": target.id, "table": "block", "path": [], "command": "update", "args": { "last_edited_time": (new Date()).getTime() } }
                            ]
                        }
                        this.client.reqeust.post('/api/v3/submitTransaction', postData)
                        return
                    }
                }
            }
            let proxy = new Proxy(rowData, handlers)
            // proxy.toString = Function.prototype.toString.bind(rowData)
            return proxy
        }
    }

    get rows() {
        const { blockIds } = this.rawData.result
        return blockIds.map(blockId => this.makeRow(blockId, this._schema))
    }

    get schema() {
        //
        let handlers = {
            get: (target, prop) => {
                let key = this.propsKeyMap[prop].key
                return this._schema[key]
            },
            // set: (target, prop, value) => {
            //     let key = this.propsKeyMap[prop].key
            //     this._schema[key] = value

            //     let postData = {
            //         "operations": [
            //             { "id": this.collectionId, "table": "collection", "path": [], "command": "update", "args": { schema: this._schema } },
            //         ]
            //     }
            //     this.client.reqeust.post('/api/v3/submitTransaction', postData)
            //     return
            // }
        }
        let proxy = new Proxy(this._schema, handlers)
        return proxy
    }
    updateSchema() {
        let postData = {
            "operations": [
                { "id": this.collectionId, "table": "collection", "path": [], "command": "update", "args": { schema: this._schema } },
            ]
        }
        this.client.reqeust.post('/api/v3/submitTransaction', postData)
    }
}

module.exports = Collection
