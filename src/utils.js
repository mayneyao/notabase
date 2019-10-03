const NOTION_BASE_URL = "https://www.notion.so"


const isPageId = (text) => {
    let re = new RegExp('^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$')
    return text.length === 36 && re.test(text)
}
const getBlockHashId = (blockId) => {
    return blockId.split('-').join('')
}
const getFullBlockId = (blockId) => {
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
const getBrowseableUrl = (blockID) => {
    return `${NOTION_BASE_URL}/${blockID.split('-').join('')}`
}
const getUrlPageId = (url) => {
    let pUrl
    if (!process.browser) {
        const parse = require('url').parse
        pUrl = parse(url)
    } else {
        pUrl = new URL(url)
    }
    let pathList = pUrl.pathname.split('/')
    let pagId = pathList[pathList.length - 1]
    return pagId
}
const parseImageUrl = (url, width) => {
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
const formatDate = (date) => {
    return `${date.getFullYear()}-${(date.getMonth() + 1 + "").padStart(2, "0")}-${(date.getDate() + "").padStart(2, "0")}`
}
const formatTime = (date) => {
    return `${(date.getHours() + "").padStart(2, "0")}:${(date.getMinutes() + "").padStart(2, "0")}`
}
const fixTimeZone = (dateAsString, timeZone) => {
    const shortTz = new Date().
        toLocaleString("en", { timeZoneName: "short", timeZone }).
        split(' ').
        pop()
    return new Date(dateAsString + " " + shortTz);
}
const unFixTimeZone = (date, timeZone) => {
    const adjustedTime = date.toLocaleString("en-US", { timeZone });
    return new Date(adjustedTime);
}

module.exports = { isPageId, getBlockHashId, getFullBlockId, getBrowseableUrl, getUrlPageId, parseImageUrl, formatDate, formatTime, fixTimeZone, unFixTimeZone }
