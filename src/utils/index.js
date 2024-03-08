import axios from "axios";
import { ref } from "vue";

const token = ref(localStorage.getItem("token") || null);

export const githubApiGet = async (url, additionalParams) => {
  try {
    const response = await axios.get(url, {
      params: {
        timestamp: Date.now(),
        ...(additionalParams && additionalParams)
      },
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
