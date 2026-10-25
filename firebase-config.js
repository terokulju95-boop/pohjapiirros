// ============================================================
//  POHJAPIIRROS – ASETUKSET
// ============================================================

// 1) Firebase-projektin asetukset
//    Projekti: pohjapiirros-284f6
export const firebaseConfig = {
  apiKey: "AIzaSyCJd5eI4cfNjjCbdIYV_rq_41vFExppc1w",
  authDomain: "pohjapiirros-284f6.firebaseapp.com",
  projectId: "pohjapiirros-284f6",
  storageBucket: "pohjapiirros-284f6.firebasestorage.app",
  messagingSenderId: "474001598998",
  appId: "1:474001598998:web:4b7cb51c13da794d10e337"
};

// 2) Yhteinen Firebase-tunnus, jolla kaikki laitteet kirjautuvat.
//    Sama sähköposti luodaan Firebase Console → Authentication → Users → Add user.
export const LOGIN_EMAIL = "terokulju95@gmail.com";

// 3) Pääkäyttäjä ja aloituskäyttäjät. Jokainen kirjautuu omalla nimellään ja PIN-koodillaan.
//    Pääkäyttäjä lisää muut käyttäjät ja asettaa PIN-koodit sovelluksessa (oma nimi oikeassa yläkulmassa → Käyttäjät).
export const ADMIN_NAME = "Tero";
export const DEFAULT_USERS = ["Tero"];

// Sovelluksen nimi
export const APP_NAME = "Pohjapiirros";

// Kokoelmien etuliite Firestoressa (omassa projektissa ei tarvita)
export const COL_PREFIX = "";
