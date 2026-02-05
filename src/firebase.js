import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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
export const auth = getAuth(app);

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
