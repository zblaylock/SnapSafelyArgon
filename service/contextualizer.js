import React, {useContext} from "react";
const SendSafely = require('@sendsafely/sendsafely');
const contexts = new Map();

export const Contextualizer = {
  createContext: (service, sendSafely) => {
    const context = React.createContext(sendSafely);
    contexts.set(service, context);
    return context;
  },
  use: (services) => {
    const context = contexts.get(services);
    if (context === undefined) {
      throw new Error("Service was not created!");
    }
    const service = useContext(context);
    if (service === undefined) {
      throw new Error("You must use services within its service");
    }
    return service;
  },
  clear() {
    contexts.clear();
  }
}

export const initializeSendSafely = (domain, apiKey, apiSecret) => {
  const sendSafely = new SendSafely(domain, apiKey, apiSecret);
  Contextualizer.createContext("sendSafely", sendSafely);
}

export const verifyCredentials = async () => {
  const sendSafely = Contextualizer.use("sendSafely");
  await sendSafely.verifyCredentials(function(email)  {
    console.log("Connected to SendSafely as user "  +  email);
    return email;
  });
}