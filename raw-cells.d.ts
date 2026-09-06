// Vite hands a `?raw` import the file's text. The shipped patterns are read that way in tests so a
// change to patterns/*.cells fails a test rather than passing unnoticed.
declare module '*.cells?raw' {
  const content: string;
  export default content;
}
