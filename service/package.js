// import {SS_API} from "../constants/api";
// import {call} from "./index";
// import {getStoreString, STORED_KEYS} from "../common/store";
// import * as FileSystem from "expo-file-system";

// /*
// * Request Body
// * vdr: boolean
// * packageUserEmail: string
// * */
// export const createPackage = async () => {
//   const email = await getStoreString(STORED_KEYS.SS_EMAIL);
//   let body = {
//     vdr: false,
//     packageUserEmail: email
//   }
//   return call(
//     'PUT',
//     SS_API.PATH.CREATE_PACKAGE,
//     SS_API.HEADERS,
//     null,
//     body
//   )
// }
//
// export const getSentPackages = (rowIndex, pageSize) => {
//   return call(
//     'GET',
//     SS_API.PATH.GET_PACKAGE,
//     SS_API.HEADERS,
//     {pageSize, rowIndex},
//     null
//   )
// }
//
// export const getReceivedPackages = (rowIndex, pageSize) => {
//   let path = SS_API.PATH.GET_RECEIVED_PACKAGE;
//   return call(
//     'GET', 
//     path,
//     SS_API.HEADERS,
//     {rowIndex, pageSize},
//     null
//   )
// }
//
// export const deletePackage = (packageId) => {
//   let path =  SS_API.PATH.GET_RECEIVED_PACKAGE;
//   path = path.replace('{packageId}', packageId);
//     return call(
//     'DELETE', 
//       path, 
//       SS_API.HEADERS,
//     null,
//     null
//   )
// }
//
// /*
// * Request Body
// * uploadType: boolean
// * filename: string
// * parts: string
// * filesize: string
// * */
// export const addFile = async (packageId, fileUri) => {
//   console.log(packageId)
//   let path = SS_API.PATH.CREATE_FILE;
//   path = path.replace("{packageId}", packageId);
//   console.log(path)
//   const fileInfo = await FileSystem.getInfoAsync(fileUri);
//   console.log("*** fileInfo ***");
//   console.log(fileInfo);
//   let body = {
//     uploadType: 'JS_API',
//     filename: fileInfo.uri,
//     parts: 1,
//     filesize: fileInfo.size,
//   }
//   return call(
//     'PUT',
//     path,
//     SS_API.HEADERS,
//     null,
//     body
//   );
// }
//
// /*
// * Request Body
// * email: string
// * phoneNumber: string (optional)
// * countryCode: string
// * */
// export const addRecipient = (packageId, email) => {
//   console.log("*** addRecipient ***");
//   let body = {
//     email: email
//   }
//   let path = SS_API.PATH.ADD_RECIPIENT;
//   path = path.replace('{packageId}', packageId);
//   return call(
//     'PUT',
//     path,
//     SS_API.HEADERS,
//     null,
//     body
//   )
// }
//
// export const deleteRecipient = (packageId, data) => {
//   let body = {
//     email: data.email,
//   }
//   let path = SS_API.PATH.GET_PACKAGE;
//   path = path.replace('{packageId}', packageId);
//   return call(
//     'PUT',
//     path,
//     SS_API.HEADERS,
//     null,
//     body
//   )
// }