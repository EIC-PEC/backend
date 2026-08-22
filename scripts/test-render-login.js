async function testRenderLogin() {
  const res = await fetch('https://eic-backend-mmys.onrender.com/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@pecsummit.com',
      password: 'PecSummit@2026',
    }),
  });

  const status = res.status;
  const json = await res.json();
  console.log('Render Login HTTP Status:', status);
  console.log('Render Login Payload:', json);
}

testRenderLogin();
