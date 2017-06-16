const fs = require('fs');
const restClient = require('./rest_client.js');

// Confluence login credentials
const username = 'admin';
const password = 'admin';
const basicAuthCredentials = restClient.getBasicAuthCredentials(username, password);

// Confluence Page Id that contains Scaffolding form
const pageId = 950278;

restClient.fetchForm(basicAuthCredentials, pageId)
    .then(res => {
        const form = res.data.find(f => f.macro === 'table-data' && f.name === 'Employees');
        const fields = form.rows;

        // Read from CSV file
        readCsv('./sample_data/employees.csv', (csvData) => {

            // Crafting payload
            const values = csvData.map(record => {
                return fields.map(f => {

                    // Parse date into acceptable format
                    if (f.macro === 'date-data') {
                        return Object.assign({}, f, {value: parseDate(record[f.name])})
                    }
                    // `list-data` value must be an array
                    if (f.macro === 'list-data') {
                        return Object.assign({}, f, {value: [record[f.name]]})
                    }
                    return Object.assign({}, f, {value: record[f.name]})
                })
            });

            // Convert array into object
            form.value = values.reduce((acc, val, index) => {
                return Object.assign(acc, {[index]: val})
            }, {});

            // Payload must be an array
            const payload = [form];

            // Insert data from CSV to Scaffolding table-data form.
            restClient.createRecord(basicAuthCredentials, pageId, payload)
                .then((res) => console.log('result >>', res))
                .catch((err) => console.error('>>', err))
        })
    })
    .catch((err) => console.log('this is error', err));

function readCsv(filePath, callback) {
    let csvData = [];
    let remainder = null;
    fs.createReadStream(filePath)
        .on('data', (data) => {
            if (remainder !== null) {
                let tmp = new Buffer(remainder.length + data.length);
                remainder.copy(tmp);
                data.copy(tmp, remainder.length);
                data = tmp
            }

            let start = 0;
            let header;
            for (let i = 0; i < data.length; i++) {
                if (data[i] === 10) { //\n new line
                    const cells = data.slice(start, i).toString().split('|');
                    if (start === 0) {
                        header = cells
                    } else {
                        // Construct the record into key-value pair
                        const row = cells.reduce((acc, value, index) => Object.assign(acc, {[header[index]]: value}), {});
                        csvData.push(row)
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
        .on('end', () => callback(csvData))
}

function parseDate(dateString) {
    let date = new Date(dateString);
    return `${date.getYear() + 1900}-${date.getMonth() + 1}-${date.getDate()} 00:00:00`
}
