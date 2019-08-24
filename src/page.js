// just for collection row page

class CollectionRowPage {
    constructor(data) {
        this._raw = data
    }

    get children() {
        Object.entries(this._raw.recordMap).map(block => {
            let [id, value] = block
            
        })
    }
}