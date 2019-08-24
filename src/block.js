// just for code block

class CodeBlock {
    constructor(data) {
        this._raw = data
        this.type = data.type
        const { title, language } = data.properties
        this.title = title[0][0]
        this.language = language[0][0]
    }
}