import sjcl from "./external/sjcl";

export const isSuccessResponse = (data) => {
  return data.response === 'SUCCESS';
}

export const isEmptyObject = (obj) => {
  return Object.keys(obj).length === 0;
}

export function _slice(blob, start, end) {
  if(blob.content !== undefined) {
    blob = blob.content;
  }
  if (blob.webkitSlice) {
    return blob.webkitSlice(start, end);
  } else {
    return blob.slice(start, end);
  }
}

export function urlSafeBase64(base64String) {
  if( typeof base64String == "string"){
    base64String = base64String.replace(/\+/g, '-');
    base64String = base64String.replace(/\//g, '_');
    base64String = base64String.replace(/=/g, '');
    return base64String;
  }
}

export function createChecksumFalse (keyCode, packageCode) {
  keyCode = sjcl.codec.utf8String.toBits(urlSafeBase64(keyCode));
  packageCode = sjcl.codec.utf8String.toBits(urlSafeBase64(packageCode));
  return sjcl.codec.hex.fromBits(sjcl.misc.pbkdf2(keyCode, packageCode, 1024, 256));
}

export function createKeycode (callback) {
  if (sjcl.random.isReady(6) === 0) {
    console.log("isReady");
    sjcl.random.addEventListener("seeded", function () {
      callback(urlSafeBase64(sjcl.codec.base64.fromBits(sjcl.random.randomWords(8,6))));
    });
  } else {
    console.log("notReady");
    callback(urlSafeBase64(sjcl.codec.base64.fromBits(sjcl.random.randomWords(8,6))));
  }
}