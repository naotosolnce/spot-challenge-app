// src/Auth.jsx
import React, { useEffect, useState } from 'react';
import { auth } from './firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';

export default function Auth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Googleログインエラー:', error);
    }
  };

  const loginAnonymouslyHandler = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('匿名ログインエラー:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  if (user) {
    return (
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 w-60 z-50">
        <p className="text-gray-700 text-sm mb-2">
          <span className="font-semibold">ログイン中: </span>
          <span className="text-green-600">
            {user.isAnonymous ? '匿名ユーザー' : user.displayName || user.email}
          </span>
        </p>
        <button
          onClick={logout}
          className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition"
        >
          ログアウト
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-4 w-60 z-50">
      <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
        ログイン
      </h2>
      <button
        onClick={loginWithGoogle}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg mb-2 transition flex items-center justify-center"
      >
        <svg
          className="w-5 h-5 mr-2"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M21.35 11.1h-9.15v2.6h5.25c-.225 1.25-1.1375 2.775-2.4375 3.675l3.525 2.7c2.0625-1.9125 3.375-4.6875 3.375-8.475 0-.725-.0625-1.375-.1625-2z" />
          <path d="M12.2 22c2.925 0 5.3875-1.0875 7.175-2.95l-3.525-2.7c-.975.65-2.2375 1.0875-3.65 1.0875-2.8 0-5.175-1.8875-6.0125-4.425h-3.5875v2.7875c1.7875 3.55 5.5 6.2 9.6 6.2z" />
          <path d="M6.1875 12.0125c0-.775.1375-1.525.3875-2.2375v-2.7875h-3.5875c-.75 1.475-1.1875 3.1125-1.1875 4.975s.4375 3.5 1.1875 4.975l3.5875-2.7875c-.25-.7125-.3875-1.4625-.3875-2.2375z" />
          <path d="M12.2 4.925c1.625 0 3.0875.5625 4.2375 1.6625l3.175-3.175c-1.8-1.65-4.0125-2.6125-7.4125-2.6125-4.1 0-7.8125 2.65-9.6 6.2l3.5875 2.7875c.8375-2.5375 3.2125-4.425 6.0125-4.425z" />
        </svg>
        Googleでログイン
      </button>
      <button
        onClick={loginAnonymouslyHandler}
        className="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg transition flex items-center justify-center"
      >
        <svg
          className="w-5 h-5 mr-2"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2a5 5 0 00-5 5v2.1a7 7 0 000 13.8V22h10v1.9a7 7 0 000-13.8V7a5 5 0 00-5-5z" />
        </svg>
        匿名でログイン
      </button>
    </div>
  );
}
