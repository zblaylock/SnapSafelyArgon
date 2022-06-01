import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORED_KEYS = {
  SS_API_KEY: "SS_API_KEY",
  SS_API_SECRET: "SS_API_SECRET",
  SS_DOMAIN: "SS_DOMAIN",
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
