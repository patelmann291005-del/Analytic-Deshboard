(async () => {
  try {
    const registerRes = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: 'testuser+1@example.com', password: '123456' })
    });
    console.log('REGISTER status:', registerRes.status);
    console.log('REGISTER body:', await registerRes.text());

    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testuser+1@example.com', password: '123456' })
    });
    console.log('LOGIN status:', loginRes.status);
    console.log('LOGIN body:', await loginRes.text());

    if (loginRes.ok) {
      const json = await loginRes.json();
      const token = json.token;
      const meRes = await fetch('http://localhost:5000/api/auth/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('ME status:', meRes.status);
      console.log('ME body:', await meRes.text());
    }
  } catch (err) {
    console.error('Test error:', err);
  }
})();
