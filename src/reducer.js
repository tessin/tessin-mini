import { combineReducers } from "redux";

function reducerA(state = {}, action) {
  switch (action.type) {
    case "test": {
      return state;
    }
  }
  return state;
}

function reducerB(state = {}, action) {
  return state;
}

export default combineReducers({ reducerA, reducerB });
