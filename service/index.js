import * as authService from './auth';
import * as packageService from './package';
import {calculateSignature} from "../common/sjcl";
import axios from "axios";
import {SS_API} from "../constants/api";
import {getStoreString, STORED_KEYS} from "../common/store";

export {
    authService,
    packageService
}

export const call = async (
    method,
    path,
    headers,
    params,
    data,
    apiKey,
    apiSecret
) => {
    let url = getStoreString(STORED_KEYS.SS_DOMAIN);
    url = url + path;
    let timestamp = new Date().toISOString().substr(0, 19) + "+0000";
    let signature = calculateSignature(apiKey, apiSecret, path, data, timestamp);

    console.log('url : ', url);
    console.log('apiKey : ', apiKey);
    console.log('apiSecret : ', apiSecret);
    console.log('timestamp : ', timestamp);
    console.log('signature : ', signature);
    console.log('path : ', path);
    console.log('data : ', data);

    return axios(url, {
        method: method,
        headers: {
            ...SS_API.HEADERS.BASE,
            'ss-api-key': apiKey,
            'ss-request-signature': signature,
            'ss-request-timestamp': timestamp,
            ...headers
        },
        params,
        data,
    });
}
