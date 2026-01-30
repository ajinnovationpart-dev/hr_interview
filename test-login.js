const https = require('https');

const data = JSON.stringify({
  email: 'ajinnovationpart@gmail.com',
  password: 'admin123'
});

const options = {
  hostname: 'uncognizant-restrainedly-leila.ngrok-free.dev',
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'ngrok-skip-browser-warning': 'true'
  }
};

console.log('🔐 Testing login API...');
console.log('URL:', `https://${options.hostname}${options.path}`);
console.log('Body:', data);
console.log('');

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  console.log('');

  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Response:');
    try {
      const json = JSON.parse(responseData);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
