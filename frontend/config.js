(function() {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  let apiUrl;
  let environment;

 
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    apiUrl = 'http://localhost:3000';
    environment = 'development';
    console.log('🔵 DESENVOLVIMENTO: localhost:3000');
  } else if (hostname === '10.0.2.2') {
    apiUrl = 'http://10.0.2.2:3000';
    environment = 'emulator';
    console.log('🟠 EMULADOR ANDROID: 10.0.2.2:3000');
  } else {
  
    apiUrl = window.location.origin;
    environment = 'production';
    console.log('🟢 PRODUÇÃO: ' + apiUrl);
  }

  
  window.CONFIG = {
    apiUrl: apiUrl,
    isDevelopment: environment === 'development',
    isProduction: environment === 'production',
    isEmulator: environment === 'emulator',
    environment: environment,
    tokenKey: 'auth_token',
    requestTimeout: 30000,
    debug: environment === 'development',
    logRequests: environment === 'development'
  };

  console.log('✅ Config carregado:', {
    environment: window.CONFIG.environment,
    apiUrl: window.CONFIG.apiUrl
  });

 
  testConnection();

  async function testConnection() {
  try {
    const response = await fetch(window.CONFIG.apiUrl + '/', {
      method: 'GET'
    });

    if (response.ok) {
      console.log('✅ Servidor acessível');
    }
  } catch (error) {
    console.warn('⚠️ Servidor inacessível (modo offline)');
  }
}
})();
