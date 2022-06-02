import {SS_API} from "../constants/api";
import axios from "axios";

export const authenticate = (domain, email, password) => {
    let url = `https://${domain}${SS_API.PATH.GENERATE_KEY}`;
    console.log(url);
    console.log(email);
    console.log(password);
    return axios(url, {
        method: 'PUT',
        header: { ...SS_API.HEADERS.BASE },
        data: {
            email: email,
            password: password,
            keyDescription: SS_API.KEY_DESCRIPTION
        }
    });
}