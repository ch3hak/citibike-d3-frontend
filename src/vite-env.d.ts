/// <reference types="vite/client" />

declare module '*.topojson' {
    const data: any;
    export default data;
}