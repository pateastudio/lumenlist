// Calls the Lambda handler in an unzipped OpenNext bundle with a Function URL event, the way AWS
// does, and checks that GET /api/health answers 200 {"status":"ok"}. Used by check-bundle.sh.
//
//   node scripts/lib/invoke-bundle.mjs <unzipped-bundle-dir>
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"

const dir = resolve(process.argv[2] ?? "")
const fail = (message) => {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

process.env.NODE_ENV = "production"

let handler
try {
  ;({ handler } = await import(pathToFileURL(`${dir}/index.mjs`).href))
} catch (error) {
  fail(`the bundle does not load: ${error instanceof Error ? error.message.split("\n")[0] : error}`)
}

const event = {
  version: "2.0",
  routeKey: "$default",
  rawPath: "/api/health",
  rawQueryString: "",
  headers: { host: "bundle.test", "x-forwarded-host": "bundle.test", "x-forwarded-proto": "https", "x-forwarded-for": "203.0.113.1" },
  requestContext: {
    http: { method: "GET", path: "/api/health", sourceIp: "203.0.113.1", protocol: "HTTP/1.1", userAgent: "check-bundle" },
    domainName: "bundle.lambda-url.us-west-1.on.aws",
    requestId: "check-bundle",
    stage: "$default",
    time: "",
    timeEpoch: 0,
    accountId: "0",
    apiId: "0",
    domainPrefix: "bundle",
  },
  isBase64Encoded: false,
}
const context = { awsRequestId: "check-bundle", getRemainingTimeInMillis: () => 30000, callbackWaitsForEmptyEventLoop: false }

const timer = setTimeout(() => fail("the handler did not answer within 60 seconds"), 60_000)
const response = await handler(event, context).catch((error) => fail(`the handler threw: ${error instanceof Error ? error.message : error}`))
clearTimeout(timer)

if (response.statusCode !== 200) fail(`/api/health answered ${response.statusCode}: ${String(response.body).slice(0, 200)}`)
if (!String(response.body).includes('"status":"ok"')) fail(`/api/health body was not ok: ${String(response.body).slice(0, 200)}`)
console.log("ok   the handler loads and answers /api/health with 200")
process.exit(0)
