export function saveToken(token, remember) {
  if (remember) {
    localStorage.setItem('customer_token', token);
    sessionStorage.removeItem('customer_token');
  } else {
    sessionStorage.setItem('customer_token', token);
    localStorage.removeItem('customer_token');
  }
}

export function getToken() {
  return localStorage.getItem('customer_token') || sessionStorage.getItem('customer_token');
}

export function clearToken() {
  localStorage.removeItem('customer_token');
  sessionStorage.removeItem('customer_token');
}
