const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use(bodyParser.json());

function forwardRequest(req, res) {
  const { headers, body, method, url } = req;

  const getHeaders = () => {
    return new fetch.Headers(Object.assign({}, headers));
  }

  const options = {
    method,
    headers: getHeaders()
  }

  if (body && Object.keys(body).length > 0) {
    options.body = JSON.stringify(body);
  }

  fetch(`${process.env.FORWARD_BASE_URL}${url}`, options)
    .then(resp => {
      for (const [ key, value ] of resp.headers.entries()) {
        if (['content-length', 'content-type'].includes(key)) {
          res.set(key, value);
        }
      }
      return resp.text().then(resp => {
        return res.end(resp);
      })
    })
    .catch(e => {
      return res.end('<h1>Error</h1>');
    });
}

app.get('*', forwardRequest);
app.post('*', forwardRequest);
const port = process.env.APP_PORT || 3080;
app.listen(port);