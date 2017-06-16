const restClient = require('./rest_client')

// Confluence login credentials
const username = 'admin'
const password = 'admin'
const basicAuthCredentials = restClient.getBasicAuthCredentials(username, password)

// Confluence Page Id that contains Scaffolding form
const pageId = 950282;

// Fetch Scaffolding form
restClient.fetchForm(basicAuthCredentials, pageId)
    .then(res => {
        const form = res.data.find(f => f.macro === 'table-data' && f.name === 'Applicants');
        const fields = form.rows;

        // Upload attachment to Confluence page
        restClient.uploadAttachment(basicAuthCredentials, pageId, './products.csv', 'reuaae.docx')
            .then((res) => {
                if (res.statusCode !== 200) {
                    console.error(">> Fail to upload attachment")
                    console.error(`>> Error ${res.statusCode}:`, res.data.message)
                    return
                }

                // Retrieve the attachment title
                const attachmentId = res.data.results[0].title

                // Craft a single record to be inserted to table-data
                const record = fields.map(f => {
                    if (f.name === 'Name') {
                        return Object.assign({}, f, {value: 'Ted Mahsun'});
                    }
                    if (f.name === 'Resume') {
                        return Object.assign({}, f, {value: attachmentId});
                    }
                });

                // Craft values for table-data. Only 1 record for this example
                const tableDataValues = [record];

                form.value = tableDataValues.reduce((acc, value, index) => {
                    return Object.assign(acc, { [index]: value })
                }, {});

                // Payload must be in array
                const payload = [form];

                // Insert data to Scaffolding form
                restClient.createRecord(basicAuthCredentials, pageId, payload)
                    .then(res => console.log('>>', res))
                    .catch(err => console.error(">> Fail to insert data.", err))
            })
            .catch((err) => console.error(err))
    })
    .catch(err => console.error(err));

