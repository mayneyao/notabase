import { isPageId } from './utils'

class Row {

}

export default class Collection {
    constructor(collectionId, collectionViewId, rawData, client) {
        this.collectionId = collectionId
        this.collectionViewId = collectionViewId
        this.rawData = rawData
        this.client = client

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
        this.client.blockStore = { ...this.client.blockStore, ...rawData.recordMap.block }
    }

    addRow() {

    }

    makeRow(rowBlockId, schema) {
        let rowData = this.client.blockStore[rowBlockId].value

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
                                    case 'text':
                                    case 'url':
                                    case 'number':
                                        res = rawValue[0][0]
                                        break
                                    case 'checkbox':
                                        res = Boolean(rawValue[0][0] === 'Yes')
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
                                            let _schema = this.client.collectionSchemaStore[collection_id]
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
                },
                set: (target, prop, value, _self) => {
                    if (props.indexOf(prop) > -1) {
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
                            case 'multi_select':
                                if (value instanceof Array) {
                                    newV = [[value.join(',')]]
                                }
                                break
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

                        let postData = {
                            "operations": [
                                { "id": target.id, "table": "block", "path": ["properties", key], "command": "set", "args": newV },
                                { "id": target.id, "table": "block", "path": [], "command": "update", "args": { "last_edited_time": (new Date()).getTime() } }
                            ]
                        }
                        this.client.reqeust.post('/api/v3/submitTransaction', postData)
                        _self = Reflect.set(target, prop, value)
                        return _self
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
        return blockIds.map(blockId => this.makeRow(blockId, this.schema))
    }
}