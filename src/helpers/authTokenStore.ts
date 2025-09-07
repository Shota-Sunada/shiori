// グローバルに保持するだけのシンプルなトークンストア (非SSR前提)
let _authToken: string | null = null;

export const setAuthToken = (t: string | null) => {
  _authToken = t;
};

export const getAuthToken = () => _authToken;
