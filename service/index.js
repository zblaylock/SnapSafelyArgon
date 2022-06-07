import axios from "axios";
import {SS_API} from "../constants/api";
import {getStoreString, STORED_KEYS} from "../common/store";
import sjcl from "../common/external/sjcl";
import {createChecksumFalse} from "../common/utils";

/*
* Request Body
* vdr: boolean
* packageUserEmail: string
* */
export async function createPackage() {
  console.log("*** createPackage ***");
  const email = SS_API.DEBUG.MODE ? SS_API.DEBUG.EMAIL : await getStoreString(STORED_KEYS.SS_EMAIL);
  return call(
    'PUT',
    SS_API.PATH.CREATE_PACKAGE,
    SS_API.HEADERS.JSON,
    null,
    JSON.stringify({
      vdr: false,
      packageUserEmail: email
    })
  )
}

/*
* Request Body
* vdr: boolean
* packageUserEmail: string
* */
export async function deletePackage(packageId) {
  console.log("*** deletePackage ***");
  const path = SS_API.PATH.DELETE_PACKAGE
    .replace('{packageId}', packageId);
  return call(
    'DELETE',
    path,
    SS_API.HEADERS.JSON,
    null,
    null,
  )
}

/*
* Request Body
* vdr: boolean
* packageUserEmail: string
* */
export async function finalizePackage(ssPackage, keyCode) {
  console.log("*** finalizePackage ***");
  const path = SS_API.PATH.FINALIZE_PACKAGE
    .replace('{packageId}', ssPackage.packageId);
  let checksum = createChecksumFalse(keyCode, ssPackage.packageCode);
  return call(
    'POST',
    path,
    SS_API.HEADERS.JSON,
    null,
    JSON.stringify({
      checksum: checksum,
      notifyRecipients: true,
      readOnlyPdf: false,
      undisclosedRecipients: false
    }),
  )
}

export async function getSentPackages(rowIndex, pageSize) {
  console.log("*** getSentPackages ***");
  return call(
    'GET',
    SS_API.PATH.GET_PACKAGE,
    SS_API.HEADERS.JSON,
    {pageSize, rowIndex},
    null
  )
}

/*
* Request Body
* uploadType: boolean
* filename: string
* parts: string
* filesize: string
* */
export async function createFile(packageId, fileUri, fileInfo) {
  console.log("*** createFile ***");
  const path = SS_API.PATH.CREATE_FILE
    .replace("{packageId}", packageId);
  // const fileInfo = await FileSystem.getInfoAsync(fileUri);
  console.log(fileInfo);
  let index = fileInfo.uri.lastIndexOf('.');
  let codex = fileInfo.uri.substring(index, fileInfo.uri.length);
  return call(
    'PUT',
    path,
    SS_API.HEADERS.JSON,
    null,
    JSON.stringify({
      filename: encodeURI(`SnapSafely${codex}`),
      uploadType: "JS_API",
      parts: 1,
      filesize: fileInfo.size
    })
  );
}

export async function addMessage(packageId, message) {
  console.log("*** uploadUrls ***");
  const path = SS_API.PATH.ADD_MESSAGE
    .replace("{packageId}", packageId)
  return call(
    'PUT',
    path,
    SS_API.HEADERS.JSON,
    null,
    JSON.stringify({
      uploadType: "JS_API",
      message: message
    })
  )
}


export async function uploadUrls(packageId, file) {
  console.log("*** uploadUrls ***");
  const path = SS_API.PATH.UPLOAD_URLS
    .replace("{packageId}", packageId)
    .replace("{fileId}", fileId);
  return call(
    'POST',
    path,
    SS_API.HEADERS.JSON,
    null,
    JSON.stringify({
      forceProxy: false,
      part: 1
    })
  )
}

/*
* Request Body
* email: string
* phoneNumber: string (optional)
* countryCode: string
* */
export async function addRecipient(email, packageId) {
  console.log("*** addRecipient ***");
  const path = SS_API.PATH.ADD_RECIPIENT
    .replace('{packageId}', packageId);
  return call(
    'PUT',
    path,
    SS_API.HEADERS.JSON,
    null,
    JSON.stringify({
      email: email
    })
  )
}

export async function deleteRecipient(packageId, recipient) {
  let path = SS_API.PATH.DELETE_RECIPIENT
    .replace('{packageId}', packageId)
    .replace('{recipientId}', recipient.recipientId);
  return call(
    'DELETE',
    path,
    SS_API.HEADERS.JSON,
    null,
    JSON.stringify({
      email: recipient.email,
    })
  )
}

export async function call(
  method,
  path,
  headers,
  params,
  body
) {
  let url = await getStoreString(STORED_KEYS.SS_DOMAIN);
  let apiKey = await getStoreString(STORED_KEYS.SS_API_KEY);
  let apiSecret = await getStoreString(STORED_KEYS.SS_API_SECRET);
  url = SS_API.PROTOCOL + url + path;
  let timestamp = new Date().toISOString().substr(0, 19) + "+0000";
  let signature = await calculateSignature(apiKey, apiSecret, path, body, timestamp);
  
  console.log('method : ', method);
  console.log('url : ', url);
  console.log('apiKey : ', apiKey);
  console.log('apiSecret : ', apiSecret);
  console.log('timestamp : ', timestamp);
  console.log('path : ', path);
  console.log('body : ', body);
  console.log('signature : ', signature);

  return axios({
    url: url,
    method: method,
    headers: {
      'ss-api-key': apiKey,
      'ss-request-signature': signature,
      'ss-request-timestamp': timestamp,
      ...headers
    },
    params: params,
    data: body,
  });
}

export function calculateSignature(apiKey, apiSecret, path, body, timestamp) {
  console.log('*** calculateSignature ***');
  let data = apiKey + path + timestamp + body;
  console.log(data);
  let hmacFunction = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(apiSecret), sjcl.hash.sha256); // Key, Hash
  return sjcl.codec.hex.fromBits(hmacFunction.encrypt(data));
}