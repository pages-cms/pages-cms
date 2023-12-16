/** Manage the GitHub Oauth token (stored in localStorage). */

import { ref } from 'vue';

export default function useToken() {
  const token = ref(localStorage.getItem('token') || null);

  const setToken = (value) => {
    token.value = value;
    localStorage.setItem('token', value);
  };

  const clearToken = () => {
    token.value = null;
    localStorage.removeItem('token');
  };

  return { token, setToken, clearToken };
}