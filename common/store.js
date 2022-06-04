import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORED_KEYS = {
  SS_API_KEY: "SS_API_KEY",
  SS_API_SECRET: "SS_API_SECRET",
  SS_DOMAIN: "SS_DOMAIN",
  SS_EMAIL: "SS_EMAIL",
}

export const storeString = async (key, value) => {
  try {
    return await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.log(e);
  }
}

export const storeObject = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    return await AsyncStorage.setItem(key, jsonValue)
  } catch (e) {
    console.log(e);
  }
}

export const getStoreString = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value != null ? value : null;
  } catch(e) {
    console.log(e);
  }
}

export const getStoreObject = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key)
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch(e) {
    console.log(e);
  }
}

export const removeStore = async (key) => {
  try {
    return await AsyncStorage.removeItem(key);
  } catch (e) {
    console.log(e);
  }
}

export const isAuthorized = async () => {
  const domain = await getStoreString(STORED_KEYS.SS_DOMAIN);
  const apiKey = await getStoreString(STORED_KEYS.SS_API_KEY);
  const apiSecret = await getStoreString(STORED_KEYS.SS_API_SECRET);
  const email = await getStoreString(STORED_KEYS.SS_EMAIL);
  console.log("domain : " + domain);
  console.log("apiKey : " + apiKey);
  console.log("apiSecret : " + apiSecret);
  console.log("email : " + email);
  return domain && apiKey && apiSecret && email;
}

export const addStoredKeys = async (domain, apiKey, apiSecret, email) => {
  await storeString(STORED_KEYS.SS_DOMAIN, domain);
  await storeString(STORED_KEYS.SS_API_KEY, apiKey);
  await storeString(STORED_KEYS.SS_API_SECRET, apiSecret);
  await storeString(STORED_KEYS.SS_EMAIL, email);
}

export const removeStoredKeys = async () => {
  await removeStore(STORED_KEYS.SS_DOMAIN);
  await removeStore(STORED_KEYS.SS_API_KEY);
  await removeStore(STORED_KEYS.SS_API_SECRET);
  await removeStore(STORED_KEYS.SS_EMAIL);
}
