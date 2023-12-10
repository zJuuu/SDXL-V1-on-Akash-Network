import express, { Request, Response } from 'express';
import axios from 'axios';
import mysql, { MysqlError } from 'mysql';
import 'dotenv/config';

const app = express();
app.use(express.json());
const port = 3002;

const middleware = process.env.SERVER_NAME || 'GPU-LB-MAIN';

console.log('Required environment variables:', {
  LOG_DB_HOST: process.env.LOG_DB_HOST,
  LOG_DB_PORT: process.env.LOG_DB_PORT,
  LOG_DB_USER: process.env.LOG_DB_USER,
  LOG_DB_PASSWORD: process.env.LOG_DB_PASSWORD,
  LOG_DB_NAME: process.env.LOG_DB_NAME,
  SERVER_NAME: process.env.SERVER_NAME,
  A1111_SERVERS: JSON.parse(process.env.A1111_SERVERS!),
});

const A1111Servers: { url: string, available: boolean }[] = JSON.parse(process.env.A1111_SERVERS!);

// create a connection to the MySQL database
const connection = mysql.createConnection({
  host: process.env.LOG_DB_HOST,
  port: parseInt(process.env.LOG_DB_PORT ?? '3306'),
  user: process.env.LOG_DB_USER,
  password: process.env.LOG_DB_PASSWORD,
  database: process.env.LOG_DB_NAME,
});

function connect() {
  // connect to the database
  connection.connect((err: MysqlError) => {
    if (err) {
      console.error('Error connecting to MySQL database:', err);
    } else {
      console.log('Connected to MySQL database');
    }
  });
}

connection.query('CREATE TABLE IF NOT EXISTS genlogs (timestamp DATETIME, status VARCHAR(10), server VARCHAR(50), prompt VARCHAR(100), middleware VARCHAR(50))');
connection.query('CREATE TABLE IF NOT EXISTS uptimelogs (timestamp DATETIME, status VARCHAR(10), server VARCHAR(50), middleware VARCHAR(50))');

// logging function that logs the request body and the server that handled the request
function logRequest(status: string, prompt: string, server: string) {
  // utc timestamp in YYYY-MM-DD HH:MM:SS format
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const log = { timestamp, status, server, prompt, middleware };
  connection.query('INSERT INTO genlogs SET ?', log, (err, result) => {
    if (err) {
      console.error('Error logging request:', err);
      connect();
    } else {
      console.log('Request logged:', log);
    }
  });
}


const forwardPostRequest = (req: Request, res: Response) => {
  // only forward requests to /sdapi/v1/options and /sdapi/v1/txt2img
  if (req.path === '/sdapi/v1/options' || req.path === '/sdapi/v1/txt2img') {
    // send to a server that is available
    const availableServer = A1111Servers.find((server: { available: boolean; url: string }) => server.available);
    if (availableServer) {
      console.log(availableServer.url + req.path);
      availableServer.available = false;

      if (req.path === '/sdapi/v1/txt2img') {
        axios.post(availableServer.url + req.path, req.body)
          .then((response) => {
            availableServer.available = true;
            logRequest('success', req.body.prompt, availableServer.url);
            res.send(response.data);
          })
          .catch((error) => {
            console.log(error);
            logRequest('error', req.body.prompt, availableServer.url);
            forwardPostRequest(req, res);
          });
      } else {
        axios.post(availableServer.url + req.path, req.body)
          .then((response) => {
            availableServer.available = true;
            res.send(response.data);
          })
          .catch((error) => {
            console.log(error);
            // retry on error, most likely server is unavailable
            forwardPostRequest(req, res);
          });
      }
    } else {
      // send to a random server
      const randomServer = A1111Servers[Math.floor(Math.random() * A1111Servers.length)];
      if (req.path === '/sdapi/v1/options' || req.path === '/sdapi/v1/txt2img') {
        axios.post(randomServer.url + req.path, req.body)
          .then((response) => {
            randomServer.available = true;
            if (req.path === '/sdapi/v1/txt2img') {
              logRequest('success', req.body.prompt, randomServer.url);
            }
            res.send(response.data);
          })
          .catch((error) => {
            if (req.path === '/sdapi/v1/txt2img') {
              logRequest('error', req.body.prompt, randomServer.url);
            }
            console.log(error);

            forwardPostRequest(req, res);
          });
      } else {
        res.sendStatus(503);
      }
    }
  } else {
    res.sendStatus(404);
  }
}

const forwardGetRequest = (req: Request, res: Response) => {
  if (req.path === '/sdapi/v1/options' || req.path === '/sdapi/v1/samplers') {
    const availableServer = A1111Servers.find((server: { available: boolean; url: string }) => server.available);
    if (availableServer) {
      console.log(availableServer.url + req.path);
      axios.get(availableServer.url + req.path, req.body)
        .then((response) => {
          res.send(response.data);
        })
        .catch((error) => {
          console.log(error);
          forwardGetRequest(req, res);
        });
    } else {
      const randomServer = A1111Servers[Math.floor(Math.random() * A1111Servers.length)];
      if (req.path === '/sdapi/v1/options' || req.path === '/sdapi/v1/samplers') {
        axios.get(randomServer.url + req.path, req.body)
          .then((response) => {
            res.send(response.data);
          })
          .catch((error) => {
            console.log(error);
            forwardGetRequest(req, res);
          });
      } else {
        res.sendStatus(503);
      }
    }
  } else {
    res.sendStatus(404);
  }
}

app.post('*', forwardPostRequest);
app.get('*', forwardGetRequest);

app.listen(port, () => {
  console.log(`App listening on port: ${port}`);
});