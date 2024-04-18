/* eslint-disable */
/* 
  remember that elements will be selected according to where this js file is called
*/
import axios from 'axios';
import { showAlert } from './alerts';

export const login = async (email, password) => {
  try {
    const res = await axios({
      method: 'POST',
      url: 'http://localhost:3000/api/v1/users/login',
      data: {
        email,
        password,
      },
    });
    showAlert('success', 'successfully logged in :)');
    window.location.assign('/');
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};

export const logout = async () => {
  try {
    const res = await axios({
      method: 'GET',
      url: 'http://localhost:3000/api/v1/users/logout',
    });
    // if (res.data.message === 'success') location.reload(true);
    location.reload(true);
  } catch (err) {
    // an error? when you have no internet
    showAlert('error', 'Error logging out! Please try again');
    // console.log(err.response);
  }
};
