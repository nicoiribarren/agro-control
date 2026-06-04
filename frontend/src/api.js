/**
 * apiFetch — wrapper de fetch que agrega el token JWT automáticamente.
 * Si el servidor responde 401, limpia la sesión y recarga la página
 * (lo que muestra la pantalla de login).
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('agro_token');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('agro_token');
    localStorage.removeItem('agro_user');
    window.location.reload();
    return res;
  }

  return res;
}
