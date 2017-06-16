const fs = require('fs')
const restClient = require('./rest_client')
const EM = require('events').EventEmitter
const ev = new EM()

// Confluence login credentials
const username = 'admin'
const password = 'admin'
const basicAuthCredentials = restClient.getBasicAuthCredentials(username, password)

const template = `<ac:structured-macro 	ac:name="live-template" ac:schema-version="1"><ac:parameter ac:name="template">Product</ac:parameter><ac:parameter ac:name="type">template</ac:parameter></ac:structured-macro>`

let remainder = null
// Read form csv line by line
fs.createReadStream('./sample_data/products.csv').on('data', (data) => {
    if (remainder !== null) {
        const tmp = new Buffer(remainder.length + data.length)
        remainder.copy(tmp)
        data.copy(tmp, remainder.length)
        data = tmp
    }

    // Login to split the csv into line by line
    let start = 0;
    let header;
    for (let i = 0; i < data.length; i++) {
        if (data[i] === 10) { //\n new line
            const cells = data.slice(start, i).toString().split('|')
            if (start === 0) {
                header = cells
            } else {
                // Construct the record into key-value pair
                const row = cells.reduce((acc, value, index) => Object.assign(acc, {[header[index]]: value}), {})

                // Emit the `row` event on each row data being split
                ev.emit('row', row)
            }
            start = i + 1;
        }
    }

    if (start < data.length) {
        remainder = data.slice(start);
    } else {
        remainder = null;
    }
})

// Event handler for `row` event.
ev.on('row', (row) => {
    const pageTitle = `${row['Product No']} - ${row['Product Name']}`

    // Create page within 'TEST' space using constructed page title and live-template macro
    restClient.createPageWithTemplate(basicAuthCredentials, template, 'TEST', pageTitle).then(async (res) => {
        if (res.statusCode !== 200) {
            console.error(">> Fail to create page.")
            console.error(`>> Error ${res.statusCode}:`, res.data.message)
            return
        }

        // Get page id for newly created page
        const pageId = res.data.id

        // Fetch Scaffolding form and construct payload using the form
        const payload = await restClient.fetchForm(basicAuthCredentials, pageId)
            .then(form => {
                return form.data.map(field => {
                    const value = row[field.name]
                    return Object.assign(field, {value})
                })
            })
            .catch(err => console.error(err))

        // Insert data to the form.
        restClient.createRecord(basicAuthCredentials, pageId, payload)
            .then((res) => {
                console.log(res)
            })
            .catch((err) => console.error(err))
    })
})
