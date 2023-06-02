// I tested latency of just put -- it's around ~124ms on average. I can test gets + puts + deletes. I have a weird error though with just the puts.
// Im' not really sure what combinations I should be testing?
// Where should i go next?

// latency individual level -- percentage of requests and cdf -- on average a put request takes howeevr long
// 

// throughput -- across a window. # of requests / time. vary the number of servers -- x axis is number of servers
// 1 2 4 8 16 - schedule as many requests as possible.


const http = require('http');

const servers = [
  { host: 'localhost', port: 3000, responses: [] },
  { host: 'localhost', port: 3001, responses: [] },
  { host: 'localhost', port: 3002, responses: [] }
];

const sendData = (server, method, data) => {
  return new Promise((resolve, reject) => {
    const options = {
      host: server.host,
      port: server.port,
      path: '/data',
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': JSON.stringify(data || '').length
      },
      agent: false
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (responseData === '[null]') {
            // Exclude response "[null]"
            resolve();
            return;
          }
        if (responseData.startsWith('[') && responseData.endsWith(']')) {
          // Convert responseData to an array
        //   server.responses.push(JSON.parse(responseData));
            serverData.push(JSON.parse(responseData));
        }
        //  else {
        //   // Keep responseData as a string
        //   server.responses.push(responseData);
        // }
        console.log(`Response (${method}, ${server.port}):`, responseData);
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error(`Error (${method}, ${server.port}):`, error.message);
      reject(error);
    });

    req.write(JSON.stringify(data || ''));
    req.end();
  });
};

// Rest of the code...

function generateRandomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
}

async function sleep() {
  await new Promise((resolve) => setTimeout(resolve, 1500));
}

const coords = [0, 0, null];

// Initialize an empty responses array for each server
// servers.forEach((server) => {
//   server.responses = [];
// });

// serverData = [];

// (async function () {
//   for (let i = 0; i < 1000; i++) {
//     if (i % 2 === 0) {
//         await Promise.all(
//           servers.map((server) => {
//             const myFirstName = generateRandomString(Math.floor(Math.random() * 25));
//             const myLastName = generateRandomString(Math.floor(Math.random() * 25));
//             const myAge = Math.floor(Math.random() * 100);
      
//             return sendData(server, 'PUT', { firstName: myFirstName, lastName: myLastName, age: myAge });
//           })
//         );
//         sleep();
//       }

//     if (i % 2 === 1) {
//       await Promise.all(
//         servers.map((server) => {
//           const randomIndex = Math.floor(Math.random() * serverData.length);
//           const randomData = serverData[randomIndex];
//         //   console.log("here", serverData);
//           return sendData(server, 'GET', randomData);
//         })
//       );
//       sleep();
//     }

//     sleep();
//   }
// })();

let sum = 0;

for (let j = 0; j < 100; j++){
const startTime = Date.now(); // Start time of the operation

for (let i = 0; i < 1000; i++) {
  let myFirstName = generateRandomString(Math.floor(Math.random() * 25));
  let myLastName = generateRandomString(Math.floor(Math.random() * 25));
  let myAge = Math.floor(Math.random() * 100);

  servers.forEach((server) => {
    const pingStartTime = Date.now(); // Start time of the ping
    sendData(server, 'PUT', { firstName: myFirstName, lastName: myLastName, age: myAge });
    const pingEndTime = Date.now(); // End time of the ping

    const latency = pingEndTime - pingStartTime; // Latency of the request in milliseconds
    // console.log(`Ping to ${server}: ${latency}ms`);
  });

  sleep();
}

const endTime = Date.now(); // End time of the operation
const totalLatency = endTime - startTime; // Total latency of the operation in milliseconds
console.log(`Total latency: ${totalLatency}ms`);
sum += totalLatency;
}

console.log(`Average latency over 100 runs of 1000 put calls is: ${sum/100}ms`);
