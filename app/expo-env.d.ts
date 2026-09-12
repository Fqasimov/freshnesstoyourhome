/// <reference types="expo/types" />

// Metro resolves image requires to an opaque asset id at build time; this is
// what tells TypeScript that `require('./x.jpg')` is legal and returns one.
declare module '*.jpg' {
  const asset: number
  export default asset
}
declare module '*.png' {
  const asset: number
  export default asset
}
