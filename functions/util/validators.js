//testing to make sure that a field is not empty (used for validation)
const isEmpty = (entryString) => {
  if (entryString === '') return true;
  else return false;
};

// vaiading a valid email address
const isEmail = (email) => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(emailRegEx)) return true;
  else return false;
};

exports.validateSignupData = (data) => {
  let errors = {};

  // checking for empty email
  if (isEmpty(data.email)) {
    errors.email = "must not be empty";
    // checking for valid email address
  } else if (!isEmail(data.email)) {
    errors.email = "Must be a valid email address";
  }
  // password field empty check
  if (isEmpty(data.password)) errors.password = "must not be empty";
  // password and confirm password match
  if (data.password !== data.confirmPassword)
    errors.confirmPassword = "Passwords must match";
  // userName empty check
  if (isEmpty(data.userName)) errors.userName = "must not be empty";
 

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  }
}

exports.validateLoginData = (data) => {
  let errors = {}

  if (isEmpty(data.email)) errors.email = 'Must not be empty'
  if (!isEmail(data.email)) errors.email = 'Must be a valid email address'
  if (isEmpty(data.password)) errors.password = 'Must not be empty'

  return{
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
  }
}