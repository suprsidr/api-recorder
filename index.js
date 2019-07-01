const express = require('express');
const fetch = require('node-fetch');
cors = require('cors');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
require('dotenv').config();

const adapter = new FileSync('db.json');
const db = low(adapter);

db.defaults({ routes: [] })
  .write();

const app = express();

app.use(cors());

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

  fetch(`${forwardBaseUrl}${url}`, {
    method,
    body,
    headers: new fetch.Headers({
      authorization: headers.authorization
    })
  })
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
const port = process.env.APP_PORT || 3080;
app.listen(port);