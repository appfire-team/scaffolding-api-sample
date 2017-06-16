const https = require('http')
// const https = require('https') // use this instead of http if your instance is having https
const fs = require('fs')

const host = '10.90.0.27' // Change this to match your instance domain name
const port = '8090' // Change to port 80 for http or port 443 for https

/**
 * Helper method to fetch Scaffolding form structure.
 * @param basicAuth HTTP basic auth credentials
 * @param pageId Id of Page that contains Scaffolding form
 * @returns {Promise}
 */
function fetchForm(basicAuth, pageId) {
    const options = createRequestOptions(basicAuth, `/rest/scaffolding/1.0/api/form/meta/${pageId}`, 'GET')
    return sendRequest(options)
}

/**
 * Helper method to add data to Scaffolding form.
 * @param basicAuth HTTP basic auth credentials
 * @param pageId Id of Page that contains Scaffolding form
 * @param payload Payload to be inserted to Scaffolding form
 * @returns {Promise}
 */
function createRecord(basicAuth, pageId, payload) {
    const options = createRequestOptions(basicAuth, `/rest/scaffolding/1.0/api/form/${pageId}`, 'PUT')
    return sendRequest(options, payload)
}

/**
 * Helper method to create a new Confluence page with provided template.
 * @param basicAuth HTTP basic auth credentials
 * @param template Confluence Storage format
 * @param spaceKey SpaceKey of the space for the page to reside in
 * @param pageTitle Page title of the new page
 * @returns {Promise}
 */
function createPageWithTemplate(basicAuth, template, spaceKey, pageTitle) {
    const options = createRequestOptions(basicAuth, '/rest/api/content', 'POST')
    const payload = {
        "type": "page",
        "title": pageTitle,
        "space": {
            "key": spaceKey
        },
        "body": {
            "storage": {
                "value": template,
                "representation": "storage"
            }
        }
    }

    return sendRequest(options, payload)
}

/**
 * Helper method to upload attachment to Confluence instance
 * @param basicAuth HTTP basic auth credentials
 * @param pageId Id of Page that contains Scaffolding form
 * @param filePath Path to the file
 * @param fileName Optional filename. If unspecified, the file's name will be used.
 * @returns {Promise}
 */
function uploadAttachment(basicAuth, pageId, filePath, fileName) {
    const crlf = '\r\n'
    const boundaryKey = Math.random().toString(16)
    const boundary = `------${boundaryKey}`
    const delimeter = `${crlf}--${boundary}`
    const closeDelimeter = `${delimeter}--`

    const filedata = fs.readFileSync(filePath)

    const headers = {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'X-Atlassian-Token': 'no-check'
    }

    const options = createRequestOptions(basicAuth, `/rest/api/content/${pageId}/child/attachment`, 'POST', headers)

    return new Promise((resolve, reject) => {
        const request = https.request(options, (res) => {
            let responseData = ""

            res.setEncoding('utf8')
            res.on('data', (chunk) => responseData += chunk)
            res.on('end', () => resolve({statusCode: res.statusCode, data: JSON.parse(responseData)}))
        })
        request.on('error', e => reject(e))

        request.write(`${delimeter}${crlf}`)
        request.write(`Content-Disposition: form-data; name="file"; filename="${fileName ? fileName : path.basename(filePath)}" ${crlf}${crlf}`)
        request.write(filedata)
        request.write(crlf)
        request.write(closeDelimeter)

        request.end()
    })
}

/**
 * Helper method to create options for HTTP request.
 * @param basicAuth HTTP basic auth credentials
 * @param path Endpoint of send request to
 * @param method HTTP method
 * @param headers Optional HTTP headers to be added to request
 * @returns {{host: string, port: string, path: *, method: *, headers: {Authorization: string, Content-Type: string}}}
 */
function createRequestOptions(basicAuth, path, method, headers = {}) {
    return {
        host, port, path, method,
        headers: Object.assign({
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/json',
        }, headers)
    }
}

/**
 * Method to send HTTP request to server.
 * @param options HTTP request options
 * @param payload Optional JSON payload to be send to endpoint
 * @returns {Promise}
 */
function sendRequest(options, payload) {
    return new Promise((resolve, reject) => {
        const request = https.request(options, res => {
            let responseData = ""

            res.setEncoding('utf8')
            res.on('data', chunk => responseData += chunk)
            res.on('end', () => resolve({statusCode: res.statusCode, data: responseData ? JSON.parse(responseData) : {}}))
        })
        request.on('error', e => reject(e))

        if (payload) {
            request.write(JSON.stringify(payload))
        }
        request.end()
    })
}

/**
 * Create HTTP http basic auth
 * @param username Confluence username
 * @param password Confluence password
 */
function getBasicAuthCredentials(username, password) {
    return new Buffer(`${username}:${password}`).toString('base64')
}

module.exports = {
    fetchForm,
    createRecord,
    createPageWithTemplate,
    getBasicAuthCredentials,
    uploadAttachment
}
