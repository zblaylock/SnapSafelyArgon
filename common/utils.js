export const isSuccessResponse = (data) => {
  return data.response === 'SUCCESS';
}

export const isEmptyObject = (obj) => {
  return Object.keys(obj).length === 0;
}