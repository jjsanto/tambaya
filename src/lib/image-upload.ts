export const imageUploadMaxBytes=5*1024*1024;
export const allowedImageTypes={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"} as const;
export type AllowedImageType=keyof typeof allowedImageTypes;

export function detectedImageType(buffer:ArrayBuffer):AllowedImageType|null{const bytes=new Uint8Array(buffer);if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return "image/jpeg";if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value))return "image/png";if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP")return "image/webp";if(bytes.length>=6&&["GIF87a","GIF89a"].includes(String.fromCharCode(...bytes.slice(0,6))))return "image/gif";return null;}
