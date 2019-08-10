addEventListener('fetch', event => {
    event.respondWith(fetchAndApply(event.request))
})

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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
                "Allow": "GET, HEAD, POST, OPTIONS",
            }
        })
    }
}

async function fetchAndApply(request) {
    if (request.method === "OPTIONS") {
        return handleOptions(request)
    }

    console.log(request)
    let url = new URL(request.url)
    let response
    if (url.pathname === "/app-0281ea331cac4d0b02bc.js") {
        response = await fetch("https://raw.githubusercontent.com/mayneyao/blog/master/app.js")
        response = new Response(response.body, response)
        response.headers.set('Content-Type', "application/x-javascript")
        console.log("get rewrite app.js")
    } else if ((url.pathname.startsWith("/api"))) {
        response = await fetch(`https://www.notion.so${url.pathname}`, {
            body: request.body, // must match 'Content-Type' header
            headers: {
                'content-type': 'application/json;charset=UTF-8',
                'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36'
            },
            method: request.method, // *GET, POST, PUT, DELETE, etc.
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
    return response
}