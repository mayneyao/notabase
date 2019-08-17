const token_v2 = undefined
const cookies = `token_v2=${token_v2}`

addEventListener('fetch', event => {
    event.respondWith(fetchAndApply(event.request))
})

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST,PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,auth-code",
}

function handleOptions(request) {
    if (request.headers.get("Origin") !== null &&
        request.headers.get("Access-Control-Request-Method") !== null &&
        request.headers.get("Access-Control-Request-Headers") !== null) {
        // Handle CORS pre-flight request.
        return new Response(null, {
            headers: corsHeaders
        })
    } else {
        // Handle standard OPTIONS request.
        return new Response(null, {
            headers: {
                "Allow": "GET, HEAD, POST, PUT, OPTIONS",
            }
        })
    }
}

async function fetchAndApply(request) {
    if (request.method === "OPTIONS") {
        return handleOptions(request)
    }
    let url = new URL(request.url)
    let response
    if (url.pathname === "/app-0281ea331cac4d0b02bc.js") {
        response = await fetch("https://raw.githubusercontent.com/mayneyao/blog/master/app.js")
        response = new Response(response.body, response)
        response.headers.set('Content-Type', "application/x-javascript")
        console.log("get rewrite app.js")
    } else if ((url.pathname.startsWith("/api"))) {

        // 因为 SW 中无法缓存 POST 请求，但是 notion 获取数据全是用的 POST 请求
        // 解决办法是把 POST 请求中的 body 转字符串，放在 url的查询参数中，在这里转换为 POST 请求

        body = url.searchParams.get("body")

        // todo 针对 CUD 请求添加 cookies
        response = await fetch(`https://www.notion.so${url.pathname}`, {
            body: body, // must match 'Content-Type' header
            headers: {
                'content-type': 'application/json;charset=UTF-8',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36'
            },
            method: "POST", // *GET, POST, PUT, DELETE, etc.
        })
        response = new Response(response.body, response)
        response.headers.set('Access-Control-Allow-Origin', "*")
    } else {
        response = await fetch(`https://www.notion.so${url.pathname}`, {
            body: request.body, // must match 'Content-Type' header
            headers: request.headers,
            method: request.method, // *GET, POST, PUT, DELETE, etc.
        })
    }


    // const randomStuff = `randomcookie=${Math.random()}; Expires=Wed, 21 Oct 2018 07:28:00 GMT; Path='/';`

    // // Make the headers mutable by re-constructing the Response.
    // response = new Response(response.body, response)
    // response.headers.set('Set-Cookie', randomStuff)

    return response
}