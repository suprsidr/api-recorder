const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
require('dotenv').config();
const bodyParser = require('body-parser');

const adapter = new FileSync('db.json');
const db = low(adapter);

const passThru = process.argv.includes('--passthru');

db.defaults({ routes: [] })
  .write();

const app = express();

app.use(cors({ credentials: true, origin: 'http://localhost:8888' }));
app.use(bodyParser.json());

app.use(bodyParser.json());

const forwardBaseUrl = process.env.FORWARD_BASE_URL;

function forwardRequest(req, res) {
  const { headers, body, method, url } = req;
  let storeKey = '';
  if (body && Object.keys(body).length > 0) {
    storeKey = new Buffer(JSON.stringify(body).slice(0, 40)).toString('base64');
  }

 if (!passThru) {
  const result = db.get('routes')
    .find(url + storeKey)
    .value();

  if(result) {
    console.log('found it, returning stored value.');
    return res.json(result[url + storeKey]);
  }
 }
  const getHeaders = () => {
    if (headers.authorization) return new fetch.Headers({
      'Content-Type': 'application/json;charset=UTF-8',
      'Authorization': headers.authorization
    });

    return new fetch.Headers({
      'Content-Type': 'application/json;charset=UTF-8'
    })
  }

  const options = {
    method,
    headers: getHeaders()
  }

  if (body && Object.keys(body).length > 0) {
    options.body = JSON.stringify(body);
  }

  fetch(`${forwardBaseUrl}${url}`, options)
  .then(resp => resp.json())
  .then(json => {
    if (!passThru) {
      db.get('routes')
        .push({ [url + storeKey]: json })
        .write();
      console.log('wrote new route to db.');
    }
    return res.json(json);
  })
  .catch(e => {
    // simply return an empty object for ngen
    return res.json({});
  });
}

app.get('*', forwardRequest);
app.post('*', forwardRequest);
const port = process.env.APP_PORT || 3080;
app.listen(port);