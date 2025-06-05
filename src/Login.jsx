import React from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

export default function Login({ user, setUser }) {
  const auth = getAuth();

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
    } catch (error) {
      console.error('ログイン失敗:', error);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (user) {
    return (
      <div>
        <p>こんにちは、{user.displayName} さん</p>
        <button onClick={logout}>ログアウト</button>
      </div>
    );
  }

  return <button onClick={login}>Googleでログイン</button>;
}
