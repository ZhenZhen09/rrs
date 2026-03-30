async function testLogin() {
  const email = 'admin@company.com';
  const password = 'password';
  
  try {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Data:', data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testLogin();
