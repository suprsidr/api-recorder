const express = require('express');
const fetch = require('node-fetch');
cors = require('cors');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
require('dotenv').config();
const bodyParser = require('body-parser');

const adapter = new FileSync('db.json');
const db = low(adapter);

db.defaults({ routes: [] })
  .write();

const app = express();

app.use(cors());

app.use(bodyParser.json());

const forwardBaseUrl = process.env.FORWARD_BASE_URL;

function forwardRequest(req, res) {
  const { headers, body, method, url } = req;

  const result = db.get('routes')
    .find(url)
    .value();

  if(result) {
    console.log('found it, returning stored value.');
    return res.json(result[url]);
  }

  const options = {
    method,
    headers: new fetch.Headers({
      'Content-Type': 'application/json;charset=UTF-8',
      'Authorization': headers.authorization
    })
  }

  if (body && Object.keys(body).length > 0) {
    options.body = JSON.stringify(body);
  }

  fetch(`${forwardBaseUrl}${url}`, options)
  .then(resp => resp.json())
  .then(json => {
    db.get('routes')
      .push({ [url]: json })
      .write();
    console.log('wrote new route to db.');
    return res.json(json);
  });
}

app.get('*', forwardRequest);
app.post('*', forwardRequest);
const port = process.env.APP_PORT || 3080;
app.listen(port);