/* eslint-disable */
import { showAlert } from './alerts';
import axios from 'axios';

// type can be either password or data
// export const updateData = async (name, email) => {
export const updateSettings = async (data, type) => {
  try {
    const dataUpdate = type === 'password' ? 'updatePassword' : 'updateMe';
    const res = await axios({
      method: 'PATCH',
      url: `http://localhost:3000/api/v1/users/${dataUpdate}`,
      data,
      // data: {
      //   name,
      //   email,
      // },
    });
    if (res.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} updated successfully`);
    }
  } catch (err) {
    showAlert('error', err.response.data.message);
  }
};
