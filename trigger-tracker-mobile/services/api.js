// Central place for API-like calls. The web app relied on localStorage,
// so we mirror that using AsyncStorage helpers.
import {
  getMeals,
  saveMeal,
  deleteMeal,
  getSymptoms,
  saveSymptom,
  deleteSymptom,
  getUser,
  saveUser,
  createUser,
  clearAllData,
  getDaysSinceStart,
} from "./storage";

export const api = {
  getMeals,
  saveMeal,
  deleteMeal,
  getSymptoms,
  saveSymptom,
  deleteSymptom,
  getUser,
  saveUser,
  createUser,
  clearAllData,
  getDaysSinceStart,
};

export default api;
