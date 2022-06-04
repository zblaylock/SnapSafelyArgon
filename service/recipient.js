// import {call} from "./index";
// import {SS_API} from "../constants/api";

/*
* Request Body
* email: string
* phoneNumber: string (optional)
* countryCode: string
* */
// export function addRecipient(packageId, email) {
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