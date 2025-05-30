// backend/src/types/global.d.ts

// stubs for modules without shipped types
declare module 'ipfs-core';
declare module 'zod';

// some dependencies of ipfs-core
declare module 'multicast-dns';
declare module 'retry';

// form-data (we installed @types/form-data)
declare module 'form-data';