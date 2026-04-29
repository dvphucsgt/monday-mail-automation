import CryptoJS from 'crypto-js'

const SECRET_KEY = 'your-secret-key-change-in-production'

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString()
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

export function encodeBase64(text: string): string {
  return btoa(text)
}

export function decodeBase64(encoded: string): string {
  return atob(encoded)
}
