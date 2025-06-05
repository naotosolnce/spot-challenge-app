// src/Auth.jsx
import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import {
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

export default function Auth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 1) リダイレクト結果を取得（最初のレンダー時に）
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          setUser(result.user);
        }
      })
      .catch((error) => {
        console.error("【Firebase】リダイレクト結果取得エラー:", error);
      });

    // 2) 認証状態が変わるたびに user を更新
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return unsubscribe;
  }, []);

  // Google ログイン（常に Redirect 方式）
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // 画面を一度 Google 認証ページに遷移させる
      await signInWithRedirect(auth, provider);
    } catch (e) {
      console.error("【Firebase】Googleログインエラー:", e);
      alert("Google ログインに失敗しました。");
    }
  };

  // 匿名ログイン
  const loginAnonymous = async () => {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.error("【Firebase】匿名ログインエラー:", e);
      alert("匿名ログインに失敗しました。");
    }
  };

  // ログアウト
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("【Firebase】ログアウトエラー:", e);
    }
  };

  // ログイン済みなら小さくユーザー情報を表示
  if (user) {
    return (
      <div
        style={{
          padding: "4px 8px",
          fontSize: "0.85rem",
          backgroundColor: "#f0f0f0",
          borderBottom: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ marginRight: "8px" }}>
          ログイン中:{" "}
          <strong style={{ fontSize: "0.9rem" }}>
            {user.isAnonymous ? "匿名ユーザー" : user.displayName || user.email}
          </strong>
        </span>
        <button
          onClick={logout}
          style={{
            fontSize: "0.85rem",
            padding: "4px 8px",
            backgroundColor: "#e74c3c",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          ログアウト
        </button>
      </div>
    );
  }

  // 未ログインならボタンを表示
  return (
    <div
      style={{
        padding: "4px 8px",
        fontSize: "0.85rem",
        backgroundColor: "#f0f0f0",
        borderBottom: "1px solid #ddd",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <button
        onClick={loginWithGoogle}
        style={{
          fontSize: "0.85rem",
          padding: "4px 8px",
          backgroundColor: "#4285F4",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Google でログイン
      </button>
      <button
        onClick={loginAnonymous}
        style={{
          fontSize: "0.85rem",
          padding: "4px 8px",
          backgroundColor: "#95a5a6",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        匿名でログイン
      </button>
    </div>
  );
}
