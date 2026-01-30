const https = require('https');

const testCases = [
  {
    name: 'Test 1: 정확한 이메일과 비밀번호',
    email: 'ajinnovationpart@gmail.com',
    password: 'admin123'
  },
  {
    name: 'Test 2: 대문자 이메일',
    email: 'AJINNOVATIONPART@GMAIL.COM',
    password: 'admin123'
  },
  {
    name: 'Test 3: 공백이 있는 이메일',
    email: ' ajinnovationpart@gmail.com ',
    password: 'admin123'
  },
  {
    name: 'Test 4: 잘못된 비밀번호',
    email: 'ajinnovationpart@gmail.com',
    password: 'wrongpassword'
  }
];

function testLogin(email, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email, password });

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

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            response: json
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            response: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Login API 테스트 시작\n');
  
  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log(`  Email: "${testCase.email}"`);
    console.log(`  Password: "${testCase.password}"`);
    
    try {
      const result = await testLogin(testCase.email, testCase.password);
      console.log(`  Status: ${result.statusCode}`);
      console.log(`  Response:`, JSON.stringify(result.response, null, 2));
    } catch (error) {
      console.log(`  Error: ${error.message}`);
    }
    
    // 요청 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n✅ 테스트 완료');
}

runTests();
