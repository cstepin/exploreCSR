import './server.controller_optimized.mjs';
import { DSSimple } from './server.controller_optimized.mjs';

import http from "http";

function hash(value) {
  // Convert the value to a string representation
  const str = String(value);

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    // Get the Unicode value of the character
    const charCode = str.charCodeAt(i);
    // Update the hash value using bitwise operations
    hash = (hash << 5) - hash + charCode;
    // Convert the hash value to a 32-bit signed integer
    hash |= 0;
  }

  return hash;
}

const exampleDSSimple = new DSSimple(5, 3, function(a) {
  return hash(a)
});

const servers = [
  { host: 'localhost', port: 3000 },
  { host: 'localhost', port: 3001 },
  { host: 'localhost', port: 3002 }
];

servers.forEach((server) => {
  const serverInstance = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/data') {
      let body = [];

      req.on('data', (chunk) => {
        body.push(chunk);
      });

      req.on('end', () => {
        body = Buffer.concat(body).toString();
        const array = JSON.parse(body);
        // console.log(`[${server.port}] Received array`, array);

        let person = exampleDSSimple.get(array);

        // console.log(`[${server.port}] Got this person:`, person);
        // Process the person object as needed
        // Example: Saving the person object to a database

        const responseData = {
          message: 'This is the response data for the GET request',
        };
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(person));
      });
    } else if (req.method === 'PUT' && req.url === '/data') {
      let body = [];

      req.on('data', (chunk) => {
        body.push(chunk);
      });

      req.on('end', () => {
        body = Buffer.concat(body).toString();
        const person = JSON.parse(body);
        // console.log(`[${server.port}] Received person object:`, person);

        let newCoords = exampleDSSimple.put(person);

        // Process the person object as needed
        // Example: Saving the person object to a database

        const responseData = {
          message: 'This is the response data for the PUT request',
          receivedPerson: person,
        };
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify(newCoords));
      });
    } else {
      // Handle all other requests
      res.statusCode = 404;
      res.end('404 Not Found');
    }
  });

  serverInstance.listen(server.port, () => {
    console.log(`[${server.port}] Server running on port ${server.port}`);
  });
});