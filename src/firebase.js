import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC8-FWyi0m-MvNCiRZp4FinNdGSUVbOV7U",


  authDomain: "dmonline-20f98.firebaseapp.com",


  projectId: "dmonline-20f98",


  storageBucket: "dmonline-20f98.firebasestorage.app",


  messagingSenderId: "663212186250",


  appId: "1:663212186250:web:1a7097e076d49aa2846b73"

};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
// ログイン状態を永続化（IndexedDB → localStorage の順でフォールバック）
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});

// ブラウザのストレージ自動削除（容量逼迫時の退避）からログイン情報を守る
if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
  navigator.storage.persist().catch(() => { /* ignore */ });
}

// オフライン永続化を有効にする
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // 複数のタブが開いている場合は、1つのタブでしか有効にできません
        console.warn('Firestore persistence failed: multiple tabs open');
      } else if (err.code === 'unimplemented') {
        // ブラウザが対応していない場合
        console.warn('Firestore persistence is not supported by this browser');
      }
    });
}
