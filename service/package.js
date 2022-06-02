import {SS_API} from "../constants/api";
import {call} from "./index";

export const getSentPackages = (apiKey, apiSecret, rowIndex, pageSize) => {
  return call(
    'GET',
    SS_API.PATH.GET_PACKAGE,
    null,
    {
      pageSize,
      rowIndex
    },
    null,
    apiKey,
    apiSecret
  )
}

export const getReceivedPackages = (apiKey, apiSecret, rowIndex, pageSize) => {
  let path = SS_API.PATH.GET_RECEIVED_PACKAGE;
  return call(
    'GET', 
    path,
    null,
    {rowIndex, pageSize},
    null,
    apiKey,
    apiSecret
  )
}

export const deletePackage = (apiKey, apiSecret, packageId) => {
  let path =  SS_API.PATH.GET_RECEIVED_PACKAGE;
  path = path.replace('{packageId}', packageId);
    return call(
    'DELETE',
    path,
    null,
    null,
    null,
    apiKey,
    apiSecret
  )
}