
const isPageId = (text) => {
    let re = new RegExp('^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$')
    return text.length === 36 && re.test(text)
}

module.exports = { isPageId }